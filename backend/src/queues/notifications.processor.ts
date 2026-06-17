import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { NotificationsService } from '../modules/notifications/notifications.service';
import { NotificationChannel, NotificationType } from '../database/entities/notification.entity';

@Processor('notifications')
export class NotificationsProcessor {
  private readonly logger = new Logger(NotificationsProcessor.name);

  constructor(private readonly notificationsService: NotificationsService) {}

  @Process('welcome')
  async handleWelcome(job: Job<{ customerId: string }>) {
    await this.notificationsService.sendWelcome(job.data.customerId);
  }

  @Process('birthday')
  async handleBirthday(job: Job<{ customerId: string; bonusPoints: number }>) {
    await this.notificationsService.sendBirthdayReward(job.data.customerId, job.data.bonusPoints);
  }

  @Process('tier-upgrade')
  async handleTierUpgrade(job: Job<{ customerId: string; oldTier: string; newTier: string }>) {
    await this.notificationsService.sendTierUpgrade(
      job.data.customerId, job.data.oldTier, job.data.newTier,
    );
  }

  @Process('points-earned')
  async handlePointsEarned(job: Job<{ customerId: string; points: number; balance: number; tier: string }>) {
    this.logger.log(`Points earned notification for ${job.data.customerId}: ${job.data.points} pts`);
  }

  @Process('points-redeemed')
  async handlePointsRedeemed(job: Job<{ customerId: string; reward: string; points: number; balance: number }>) {
    this.logger.log(`Points redeemed notification for ${job.data.customerId}`);
  }

  @Process('nearby-branch')
  async handleNearbyBranch(job: Job<{ customerId: string; branchId: string }>) {
    await this.notificationsService.sendNearbyBranchNotification(
      job.data.customerId, job.data.branchId,
    );
  }

  @Process('inactive-reminder')
  async handleInactiveReminder(job: Job<{ customerId: string; daysSinceLastVisit: number }>) {
    await this.notificationsService.sendInactiveReminder(
      job.data.customerId, job.data.daysSinceLastVisit,
    );
  }

  @Process('campaign-batch')
  async handleCampaignBatch(job: Job<{
    customerIds: string[];
    title: string;
    body: string;
    campaignId: string;
  }>) {
    await this.notificationsService.sendCampaignNotification(
      job.data.customerIds, job.data.title, job.data.body, job.data.campaignId,
    );
  }
}
