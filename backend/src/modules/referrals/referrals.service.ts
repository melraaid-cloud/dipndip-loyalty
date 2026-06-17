import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Referral, ReferralStatus } from '../../database/entities/referral.entity';
import { Customer } from '../../database/entities/customer.entity';
import { Transaction, TransactionType } from '../../database/entities/transaction.entity';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

@Injectable()
export class ReferralsService {
  constructor(
    @InjectRepository(Referral)  private referralRepo: Repository<Referral>,
    @InjectRepository(Customer)  private customerRepo: Repository<Customer>,
    @InjectRepository(Transaction) private txRepo: Repository<Transaction>,
    @InjectQueue('notifications') private notificationsQueue: Queue,
    private dataSource: DataSource,
  ) {}

  async applyReferralCode(newCustomer: Customer, referralCode: string): Promise<void> {
    const referrer = await this.customerRepo.findOne({
      where: { referralCode },
    });
    if (!referrer) return; // silently ignore invalid code

    const existing = await this.referralRepo.findOne({
      where: { referred: { id: newCustomer.id } },
    });
    if (existing) return;

    const referral = this.referralRepo.create({
      referrer,
      referred: newCustomer,
      status: ReferralStatus.PENDING,
      referralCode,
    });
    await this.referralRepo.save(referral);
  }

  async completeReferral(referredCustomerId: string): Promise<void> {
    const referral = await this.referralRepo.findOne({
      where: { referred: { id: referredCustomerId }, status: ReferralStatus.PENDING },
      relations: ['referrer', 'referred'],
    });
    if (!referral) return;

    const REFERRER_BONUS = 150;
    const REFERRED_BONUS = 100;

    await this.dataSource.transaction(async (em) => {
      // Award referrer
      const referrerBefore = referral.referrer.pointsBalance;
      referral.referrer.pointsBalance = Number(referrerBefore) + REFERRER_BONUS;
      referral.referrer.totalPointsEarned = Number(referral.referrer.totalPointsEarned) + REFERRER_BONUS;
      await em.save(Customer, referral.referrer);

      await em.save(Transaction, em.create(Transaction, {
        customer: referral.referrer,
        type: TransactionType.REFERRAL,
        points: REFERRER_BONUS,
        balanceBefore: referrerBefore,
        balanceAfter: referral.referrer.pointsBalance,
        description: `Referral bonus: referred ${referral.referred.firstName}`,
      }));

      // Award referred
      const referredBefore = referral.referred.pointsBalance;
      referral.referred.pointsBalance = Number(referredBefore) + REFERRED_BONUS;
      referral.referred.totalPointsEarned = Number(referral.referred.totalPointsEarned) + REFERRED_BONUS;
      await em.save(Customer, referral.referred);

      await em.save(Transaction, em.create(Transaction, {
        customer: referral.referred,
        type: TransactionType.REFERRAL,
        points: REFERRED_BONUS,
        balanceBefore: referredBefore,
        balanceAfter: referral.referred.pointsBalance,
        description: 'Welcome referral bonus',
      }));

      referral.status = ReferralStatus.COMPLETED;
      referral.completedAt = new Date();
      referral.referrerPointsAwarded = REFERRER_BONUS;
      referral.referredPointsAwarded = REFERRED_BONUS;
      await em.save(Referral, referral);
    });

    await this.notificationsQueue.add('points-earned', {
      customerId: referral.referrer.id,
      points: REFERRER_BONUS,
      description: `You earned ${REFERRER_BONUS} points for referring a friend!`,
    });
  }

  async getReferrals(customerId: string) {
    return this.referralRepo.find({
      where: [
        { referrer: { id: customerId } },
        { referred: { id: customerId } },
      ],
      relations: ['referrer', 'referred'],
      order: { createdAt: 'DESC' },
    });
  }

  async getStats() {
    const [total, completed, pending] = await Promise.all([
      this.referralRepo.count(),
      this.referralRepo.count({ where: { status: ReferralStatus.COMPLETED } }),
      this.referralRepo.count({ where: { status: ReferralStatus.PENDING } }),
    ]);
    return { total, completed, pending, conversionRate: total > 0 ? (completed / total) * 100 : 0 };
  }
}
