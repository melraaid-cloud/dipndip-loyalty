import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { Customer, CustomerTier } from '../../database/entities/customer.entity';
import { Transaction, TransactionType, TransactionStatus } from '../../database/entities/transaction.entity';
import { LoyaltyRule } from '../../database/entities/loyalty-rule.entity';
import { Reward, RewardStatus } from '../../database/entities/reward.entity';
import { Campaign, CampaignStatus } from '../../database/entities/campaign.entity';
import { Visit } from '../../database/entities/visit.entity';
import { EarnPointsDto } from './dto/earn-points.dto';
import { RedeemPointsDto } from './dto/redeem-points.dto';

@Injectable()
export class LoyaltyService {
  constructor(
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
    @InjectRepository(Transaction)
    private readonly transactionRepo: Repository<Transaction>,
    @InjectRepository(LoyaltyRule)
    private readonly loyaltyRuleRepo: Repository<LoyaltyRule>,
    @InjectRepository(Reward)
    private readonly rewardRepo: Repository<Reward>,
    @InjectRepository(Campaign)
    private readonly campaignRepo: Repository<Campaign>,
    @InjectRepository(Visit)
    private readonly visitRepo: Repository<Visit>,
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
    @InjectQueue('notifications') private readonly notificationsQueue: Queue,
    @InjectQueue('wallet') private readonly walletQueue: Queue,
  ) {}

  async earnPoints(dto: EarnPointsDto): Promise<Transaction> {
    return this.dataSource.transaction(async (manager) => {
      const customer = await manager.findOne(Customer, {
        where: { id: dto.customerId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!customer) throw new NotFoundException('Customer not found');

      const rule = await this.getActiveRule();
      let pointsToEarn = Math.floor(dto.spendAmount * rule.pointsPerLyd);

      const multiplier = await this.getActiveCampaignMultiplier(dto.customerId, dto.branchId, dto.campaignId);
      pointsToEarn = Math.floor(pointsToEarn * multiplier);

      const tierMultiplier = this.getTierMultiplier(customer.tier, rule);
      pointsToEarn = Math.floor(pointsToEarn * tierMultiplier);

      const balanceBefore = customer.pointsBalance;
      customer.pointsBalance += pointsToEarn;
      customer.totalPointsEarned += pointsToEarn;
      customer.totalSpend = Number(customer.totalSpend) + Number(dto.spendAmount);
      customer.totalVisits += 1;
      customer.lastVisitAt = new Date();
      customer.lastVisitBranchId = dto.branchId;

      await manager.save(Customer, customer);

      const visit = manager.create(Visit, {
        customerId: customer.id,
        branchId: dto.branchId,
        spendAmount: dto.spendAmount,
        pointsEarned: pointsToEarn,
        staffId: dto.staffId,
        receiptNumber: dto.receiptNumber,
        items: dto.items,
      });
      await manager.save(Visit, visit);

      const tx = manager.create(Transaction, {
        customerId: customer.id,
        branchId: dto.branchId,
        staffId: dto.staffId,
        campaignId: dto.campaignId,
        type: TransactionType.EARN,
        status: TransactionStatus.COMPLETED,
        points: pointsToEarn,
        balanceBefore,
        balanceAfter: customer.pointsBalance,
        spendAmount: dto.spendAmount,
        description: `Earned ${pointsToEarn} points for ${dto.spendAmount} LYD spend`,
        receiptNumber: dto.receiptNumber,
      });
      const savedTx = await manager.save(Transaction, tx);

      await this.checkAndUpdateTier(manager, customer);
      await this.walletQueue.add('update-pass', { customerId: customer.id }, { delay: 1000 });
      await this.notificationsQueue.add('points-earned', {
        customerId: customer.id,
        points: pointsToEarn,
        balance: customer.pointsBalance,
        tier: customer.tier,
      });

      return savedTx;
    });
  }

  async redeemPoints(dto: RedeemPointsDto): Promise<Transaction> {
    return this.dataSource.transaction(async (manager) => {
      const customer = await manager.findOne(Customer, {
        where: { id: dto.customerId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!customer) throw new NotFoundException('Customer not found');

      const reward = await manager.findOne(Reward, { where: { id: dto.rewardId } });
      if (!reward) throw new NotFoundException('Reward not found');
      if (reward.status !== RewardStatus.ACTIVE) throw new BadRequestException('Reward is not available');

      if (customer.pointsBalance < reward.pointsCost) {
        throw new BadRequestException(
          `Insufficient points. Need ${reward.pointsCost}, have ${customer.pointsBalance}`,
        );
      }

      if (reward.applicableTiers?.length && !reward.applicableTiers.includes(customer.tier)) {
        throw new BadRequestException('Reward not available for your tier');
      }

      const balanceBefore = customer.pointsBalance;
      customer.pointsBalance -= reward.pointsCost;
      customer.totalPointsRedeemed += reward.pointsCost;
      await manager.save(Customer, customer);

      reward.totalRedeemed += 1;
      await manager.save(Reward, reward);

      const tx = manager.create(Transaction, {
        customerId: customer.id,
        branchId: dto.branchId,
        staffId: dto.staffId,
        type: TransactionType.REDEEM,
        status: TransactionStatus.COMPLETED,
        points: -reward.pointsCost,
        balanceBefore,
        balanceAfter: customer.pointsBalance,
        rewardId: reward.id,
        description: `Redeemed: ${reward.name}`,
      });
      const savedTx = await manager.save(Transaction, tx);

      await this.walletQueue.add('update-pass', { customerId: customer.id }, { delay: 1000 });
      await this.notificationsQueue.add('points-redeemed', {
        customerId: customer.id,
        reward: reward.name,
        points: reward.pointsCost,
        balance: customer.pointsBalance,
      });

      return savedTx;
    });
  }

  async verifyMembership(membershipNumber: string): Promise<{
    customer: Partial<Customer>;
    isValid: boolean;
    qrData: string;
  }> {
    const customer = await this.customerRepo.findOne({ where: { membershipNumber } });
    if (!customer) {
      return { customer: null, isValid: false, qrData: null };
    }
    return {
      customer: {
        id: customer.id,
        firstName: customer.firstName,
        lastName: customer.lastName,
        membershipNumber: customer.membershipNumber,
        tier: customer.tier,
        pointsBalance: customer.pointsBalance,
        totalVisits: customer.totalVisits,
        status: customer.status,
      },
      isValid: customer.status === 'active',
      qrData: JSON.stringify({ id: customer.id, mn: customer.membershipNumber }),
    };
  }

  async getActiveRewards(tier?: CustomerTier): Promise<Reward[]> {
    const qb = this.rewardRepo.createQueryBuilder('reward')
      .where('reward.status = :status', { status: RewardStatus.ACTIVE })
      .andWhere('reward.isActive = true')
      .orderBy('reward.sortOrder', 'ASC');

    if (tier) {
      qb.andWhere(
        '(reward.applicableTiers IS NULL OR reward.applicableTiers = \'{}\' OR :tier = ANY(reward.applicableTiers))',
        { tier },
      );
    }

    const now = new Date();
    qb.andWhere(
      '(reward.startDate IS NULL OR reward.startDate <= :now)',
      { now },
    ).andWhere(
      '(reward.endDate IS NULL OR reward.endDate >= :now)',
      { now },
    );

    return qb.getMany();
  }

  private async getActiveRule(): Promise<LoyaltyRule> {
    const rule = await this.loyaltyRuleRepo.findOne({
      where: { isActive: true, type: 'earn_rate' as any },
      order: { createdAt: 'DESC' },
    });

    if (!rule) {
      return {
        pointsPerLyd: this.configService.get('loyalty.defaultPointsPerLyd', 1),
        tierMultipliers: { bronze: 1, silver: 1.1, gold: 1.2, platinum: 1.5 },
      } as any;
    }
    return rule;
  }

  private getTierMultiplier(tier: CustomerTier, rule: LoyaltyRule): number {
    const multipliers = rule.tierMultipliers || { bronze: 1, silver: 1.1, gold: 1.2, platinum: 1.5 };
    return multipliers[tier] || 1;
  }

  private async getActiveCampaignMultiplier(
    customerId: string,
    branchId: string,
    campaignId?: string,
  ): Promise<number> {
    const now = new Date();
    const qb = this.campaignRepo.createQueryBuilder('campaign')
      .where('campaign.status = :status', { status: CampaignStatus.ACTIVE })
      .andWhere('(campaign.startDate IS NULL OR campaign.startDate <= :now)', { now })
      .andWhere('(campaign.endDate IS NULL OR campaign.endDate >= :now)', { now });

    if (campaignId) qb.andWhere('campaign.id = :campaignId', { campaignId });

    const campaigns = await qb.getMany();
    let maxMultiplier = 1;

    for (const campaign of campaigns) {
      if (campaign.branchIds?.length && !campaign.branchIds.includes(branchId)) continue;
      if (campaign.pointsMultiplier > maxMultiplier) {
        maxMultiplier = Number(campaign.pointsMultiplier);
      }
    }

    return maxMultiplier;
  }

  private async checkAndUpdateTier(manager: any, customer: Customer): Promise<boolean> {
    const points = customer.totalPointsEarned;
    let newTier = CustomerTier.BRONZE;

    if (points >= 4000) newTier = CustomerTier.PLATINUM;
    else if (points >= 1500) newTier = CustomerTier.GOLD;
    else if (points >= 500) newTier = CustomerTier.SILVER;

    if (newTier !== customer.tier) {
      const oldTier = customer.tier;
      customer.tier = newTier;
      await manager.save(Customer, customer);
      await this.notificationsQueue.add('tier-upgrade', {
        customerId: customer.id,
        oldTier,
        newTier,
      });
      return true;
    }
    return false;
  }

  async getLoyaltyRules(): Promise<LoyaltyRule[]> {
    return this.loyaltyRuleRepo.find({ order: { createdAt: 'DESC' } });
  }

  async createLoyaltyRule(data: Partial<LoyaltyRule>): Promise<LoyaltyRule> {
    await this.loyaltyRuleRepo.update({ isActive: true, type: data.type as any }, { isActive: false });
    const rule = this.loyaltyRuleRepo.create({ ...data, isActive: true });
    return this.loyaltyRuleRepo.save(rule);
  }
}
