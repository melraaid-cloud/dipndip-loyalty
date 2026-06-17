import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, Between } from 'typeorm';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { Customer, CustomerStatus } from '../../database/entities/customer.entity';
import { CampaignsService } from '../campaigns/campaigns.service';

@Injectable()
export class ScheduledTasksService {
  private readonly logger = new Logger(ScheduledTasksService.name);

  constructor(
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
    private readonly campaignsService: CampaignsService,
    @InjectQueue('notifications') private readonly notificationsQueue: Queue,
    @InjectQueue('wallet') private readonly walletQueue: Queue,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async sendBirthdayRewards() {
    this.logger.log('Running birthday rewards job');
    const today = new Date();
    const month = today.getMonth() + 1;
    const day = today.getDate();
    const year = today.getFullYear();

    const customers = await this.customerRepo
      .createQueryBuilder('c')
      .where('EXTRACT(MONTH FROM c.birthday) = :month', { month })
      .andWhere('EXTRACT(DAY FROM c.birthday) = :day', { day })
      .andWhere('c.status = :status', { status: CustomerStatus.ACTIVE })
      .andWhere('(c."birthdayRewardSentThisYear" = false OR c."birthdayRewardSentYear" != :year)', { year })
      .getMany();

    this.logger.log(`Found ${customers.length} customers with birthdays today`);

    const BIRTHDAY_BONUS = 200;
    for (const customer of customers) {
      await this.notificationsQueue.add('birthday', {
        customerId: customer.id,
        bonusPoints: BIRTHDAY_BONUS,
      });

      await this.customerRepo.update(customer.id, {
        pointsBalance: customer.pointsBalance + BIRTHDAY_BONUS,
        totalPointsEarned: customer.totalPointsEarned + BIRTHDAY_BONUS,
        birthdayRewardSentThisYear: true,
        birthdayRewardSentYear: year,
      });

      await this.walletQueue.add('update-pass', { customerId: customer.id }, { delay: 2000 });
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_NOON)
  async processScheduledCampaigns() {
    this.logger.log('Processing scheduled campaigns');
    await this.campaignsService.processScheduledCampaigns();
  }

  @Cron(CronExpression.EVERY_WEEK)
  async sendInactiveReminders() {
    this.logger.log('Sending inactive customer reminders');
    const fortyFiveDaysAgo = new Date();
    fortyFiveDaysAgo.setDate(fortyFiveDaysAgo.getDate() - 45);

    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const atRiskCustomers = await this.customerRepo.find({
      where: {
        status: CustomerStatus.ACTIVE,
        lastVisitAt: Between(ninetyDaysAgo, fortyFiveDaysAgo),
      },
    });

    for (const customer of atRiskCustomers) {
      const daysSinceLastVisit = Math.floor(
        (Date.now() - customer.lastVisitAt.getTime()) / (1000 * 60 * 60 * 24),
      );
      await this.notificationsQueue.add('inactive-reminder', {
        customerId: customer.id,
        daysSinceLastVisit,
      }, { delay: Math.random() * 3600000 });
    }

    this.logger.log(`Queued reminders for ${atRiskCustomers.length} at-risk customers`);
  }

  @Cron('0 0 1 * *')
  async resetMonthlyVisits() {
    this.logger.log('Resetting monthly visit counts');
    await this.customerRepo.update({}, { monthlyVisits: 0 });
  }
}
