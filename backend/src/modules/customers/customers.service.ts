import {
  Injectable, NotFoundException, ConflictException, BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Like, Between, ILike } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import {
  Customer, CustomerTier, CustomerStatus, CustomerSegment,
} from '../../database/entities/customer.entity';
import { Transaction } from '../../database/entities/transaction.entity';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { ListCustomersDto } from './dto/list-customers.dto';

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
  ) {}

  async create(dto: CreateCustomerDto): Promise<Customer> {
    const existing = await this.customerRepository.findOne({
      where: [
        dto.email ? { email: dto.email } : null,
        dto.phone ? { phone: dto.phone } : null,
      ].filter(Boolean),
    });

    if (existing) {
      throw new ConflictException('Customer with this email or phone already exists');
    }

    const customer = this.customerRepository.create({
      ...dto,
      membershipNumber: await this.generateMembershipNumber(),
      referralCode: this.generateReferralCode(),
      tier: CustomerTier.BRONZE,
      status: CustomerStatus.ACTIVE,
      segments: [CustomerSegment.NEW],
      pointsBalance: 0,
      totalPointsEarned: 0,
      totalPointsRedeemed: 0,
      totalSpend: 0,
      totalVisits: 0,
      monthlyVisits: 0,
      consecutiveVisits: 0,
      preferences: {
        emailNotifications: true,
        smsNotifications: true,
        pushNotifications: true,
        marketingEmails: true,
      },
    });

    if (dto.password) {
      customer.passwordHash = await bcrypt.hash(dto.password, 12);
    }

    const saved = await this.customerRepository.save(customer);

    if (dto.referralCode) {
      await this.processReferral(saved.id, dto.referralCode);
    }

    return saved;
  }

  async findAll(dto: ListCustomersDto) {
    const {
      page = 1, limit = 20, search, tier, status, segment,
      sortBy = 'createdAt', sortOrder = 'DESC',
    } = dto;

    const qb = this.customerRepository.createQueryBuilder('customer');

    if (search) {
      qb.andWhere(
        '(customer.firstName ILIKE :search OR customer.lastName ILIKE :search OR customer.email ILIKE :search OR customer.phone ILIKE :search OR customer.membershipNumber ILIKE :search)',
        { search: `%${search}%` },
      );
    }
    if (tier) qb.andWhere('customer.tier = :tier', { tier });
    if (status) qb.andWhere('customer.status = :status', { status });
    if (segment) qb.andWhere(':segment = ANY(customer.segments)', { segment });

    const total = await qb.getCount();

    qb.orderBy(`customer.${sortBy}`, sortOrder as 'ASC' | 'DESC');
    qb.skip((page - 1) * limit).take(limit);

    const customers = await qb.getMany();

    return {
      data: customers,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string): Promise<Customer> {
    const customer = await this.customerRepository.findOne({
      where: { id },
      relations: ['walletPasses'],
    });
    if (!customer) throw new NotFoundException('Customer not found');
    return customer;
  }

  async findByMembershipNumber(membershipNumber: string): Promise<Customer> {
    const customer = await this.customerRepository.findOne({ where: { membershipNumber } });
    if (!customer) throw new NotFoundException('Customer not found');
    return customer;
  }

  async findByEmail(email: string): Promise<Customer | null> {
    return this.customerRepository.findOne({ where: { email } });
  }

  async findByPhone(phone: string): Promise<Customer | null> {
    return this.customerRepository.findOne({ where: { phone } });
  }

  async update(id: string, dto: UpdateCustomerDto): Promise<Customer> {
    const customer = await this.findOne(id);
    Object.assign(customer, dto);
    return this.customerRepository.save(customer);
  }

  async adjustPoints(
    id: string,
    points: number,
    reason: string,
    staffId: string,
  ): Promise<Customer> {
    return this.dataSource.transaction(async (manager) => {
      const customer = await manager.findOne(Customer, { where: { id }, lock: { mode: 'pessimistic_write' } });
      if (!customer) throw new NotFoundException('Customer not found');

      const balanceBefore = customer.pointsBalance;
      const newBalance = Math.max(0, balanceBefore + points);

      customer.pointsBalance = newBalance;
      if (points > 0) {
        customer.totalPointsEarned += points;
      } else {
        customer.totalPointsRedeemed += Math.abs(points);
      }

      await manager.save(Customer, customer);

      const tx = manager.create(Transaction, {
        customerId: id,
        type: 'manual' as any,
        points,
        balanceBefore,
        balanceAfter: newBalance,
        description: reason,
        staffId,
        status: 'completed' as any,
      });
      await manager.save(Transaction, tx);

      await this.updateTier(manager, customer);
      return customer;
    });
  }

  async search(q: string): Promise<Customer[]> {
    if (!q || q.length < 2) return [];
    return this.customerRepository.createQueryBuilder('c')
      .where('c.firstName ILIKE :q OR c.lastName ILIKE :q OR c.phone ILIKE :q OR c.membershipNumber ILIKE :q', { q: `%${q}%` })
      .orderBy('c.createdAt', 'DESC')
      .take(10)
      .getMany();
  }

  async getCard(id: string) {
    const customer = await this.customerRepository.findOne({ where: { id } });
    if (!customer) throw new NotFoundException('Customer not found');
    const transactions = await this.transactionRepository.find({
      where: { customerId: id },
      order: { createdAt: 'DESC' },
      take: 10,
    });
    return { ...customer, transactions };
  }

  async getTransactionHistory(customerId: string, page = 1, limit = 20) {
    const [data, total] = await this.transactionRepository.findAndCount({
      where: { customerId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
      relations: ['branch', 'staff'],
    });
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async updateTier(manager: any, customer: Customer): Promise<void> {
    const points = customer.totalPointsEarned;
    let newTier = CustomerTier.BRONZE;

    if (points >= 4000) newTier = CustomerTier.PLATINUM;
    else if (points >= 1500) newTier = CustomerTier.GOLD;
    else if (points >= 500) newTier = CustomerTier.SILVER;

    if (newTier !== customer.tier) {
      customer.tier = newTier;
      await manager.save(Customer, customer);
    }
  }

  async updateSegments(customerId: string): Promise<void> {
    const customer = await this.findOne(customerId);
    const segments: CustomerSegment[] = [];
    const daysSinceLastVisit = customer.lastVisitAt
      ? (Date.now() - customer.lastVisitAt.getTime()) / (1000 * 60 * 60 * 24)
      : Infinity;

    if (customer.totalVisits === 0) segments.push(CustomerSegment.NEW);
    else if (daysSinceLastVisit < 30) segments.push(CustomerSegment.ACTIVE);
    else if (daysSinceLastVisit > 90) segments.push(CustomerSegment.DORMANT);

    if (customer.tier === CustomerTier.GOLD || customer.tier === CustomerTier.PLATINUM) {
      segments.push(CustomerSegment.VIP);
    }
    if (Number(customer.totalSpend) > 1000) segments.push(CustomerSegment.HIGH_SPENDER);
    if (daysSinceLastVisit > 45 && daysSinceLastVisit < 90) segments.push(CustomerSegment.AT_RISK);

    customer.segments = segments.length ? segments : [CustomerSegment.NEW];
    await this.customerRepository.save(customer);
  }

  async getStats() {
    const total = await this.customerRepository.count();
    const active = await this.customerRepository.count({ where: { status: CustomerStatus.ACTIVE } });
    const byTier = await this.customerRepository
      .createQueryBuilder('c')
      .select('c.tier', 'tier')
      .addSelect('COUNT(*)', 'count')
      .groupBy('c.tier')
      .getRawMany();

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const newThisMonth = await this.customerRepository.count({
      where: { createdAt: Between(thirtyDaysAgo, new Date()) },
    });

    return { total, active, byTier, newThisMonth };
  }

  private async generateMembershipNumber(): Promise<string> {
    const prefix = 'DND';
    const year = new Date().getFullYear().toString().slice(-2);
    let attempts = 0;
    while (attempts < 10) {
      const number = Math.floor(100000 + Math.random() * 900000).toString();
      const membershipNumber = `${prefix}${year}${number}`;
      const existing = await this.customerRepository.findOne({ where: { membershipNumber } });
      if (!existing) return membershipNumber;
      attempts++;
    }
    throw new Error('Failed to generate unique membership number');
  }

  private generateReferralCode(): string {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  private async processReferral(newCustomerId: string, referralCode: string): Promise<void> {
    const referrer = await this.customerRepository.findOne({ where: { referralCode } });
    if (!referrer || referrer.id === newCustomerId) return;
    // Referral processing is handled by ReferralsService
  }

  async updateFcmToken(customerId: string, token: string): Promise<void> {
    await this.customerRepository.update(customerId, { fcmToken: token });
  }

  async updateApnsToken(customerId: string, token: string): Promise<void> {
    await this.customerRepository.update(customerId, { apnsToken: token });
  }
}
