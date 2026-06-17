import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import {
  Notification, NotificationChannel, NotificationType, NotificationStatus,
} from '../../database/entities/notification.entity';
import { Customer } from '../../database/entities/customer.entity';
import { Branch } from '../../database/entities/branch.entity';

export interface SendNotificationDto {
  customerId: string;
  channel: NotificationChannel;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, any>;
  imageUrl?: string;
  campaignId?: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private firebaseApp: admin.app.App;

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
    @InjectRepository(Branch)
    private readonly branchRepo: Repository<Branch>,
    private readonly configService: ConfigService,
  ) {
    this.initFirebase();
  }

  private initFirebase() {
    try {
      const firebaseConfig = this.configService.get('firebase');
      if (firebaseConfig.projectId && !admin.apps.length) {
        this.firebaseApp = admin.initializeApp({
          credential: admin.credential.cert({
            projectId: firebaseConfig.projectId,
            privateKey: firebaseConfig.privateKey,
            clientEmail: firebaseConfig.clientEmail,
          }),
        });
      }
    } catch (err) {
      this.logger.warn('Firebase not configured, push notifications disabled');
    }
  }

  async send(dto: SendNotificationDto): Promise<Notification> {
    const notification = this.notificationRepo.create({
      customerId: dto.customerId,
      channel: dto.channel,
      type: dto.type,
      title: dto.title,
      body: dto.body,
      data: dto.data,
      imageUrl: dto.imageUrl,
      campaignId: dto.campaignId,
      status: NotificationStatus.PENDING,
    });

    await this.notificationRepo.save(notification);

    try {
      switch (dto.channel) {
        case NotificationChannel.PUSH:
          await this.sendPushNotification(dto.customerId, dto.title, dto.body, dto.data);
          break;
        case NotificationChannel.EMAIL:
          await this.sendEmail(dto.customerId, dto.title, dto.body);
          break;
        case NotificationChannel.SMS:
          await this.sendSms(dto.customerId, dto.body);
          break;
      }

      notification.status = NotificationStatus.SENT;
      notification.sentAt = new Date();
    } catch (err) {
      this.logger.error(`Failed to send ${dto.channel} notification`, err);
      notification.status = NotificationStatus.FAILED;
      notification.failureReason = err.message;
    }

    return this.notificationRepo.save(notification);
  }

  async sendWelcome(customerId: string): Promise<void> {
    const customer = await this.customerRepo.findOne({ where: { id: customerId } });
    if (!customer) return;

    await this.send({
      customerId,
      channel: NotificationChannel.PUSH,
      type: NotificationType.WELCOME,
      title: `Welcome to dipndip, ${customer.firstName}! 🍫`,
      body: `Your loyalty card is ready. You\'re a Bronze member. Start earning points today!`,
      data: { type: 'welcome', membershipNumber: customer.membershipNumber },
    });
  }

  async sendBirthdayReward(customerId: string, bonusPoints: number): Promise<void> {
    const customer = await this.customerRepo.findOne({ where: { id: customerId } });
    if (!customer) return;

    await this.send({
      customerId,
      channel: NotificationChannel.PUSH,
      type: NotificationType.BIRTHDAY,
      title: `Happy Birthday, ${customer.firstName}! 🎂`,
      body: `We\'ve added ${bonusPoints} bonus points to your account as a birthday gift!`,
      data: { type: 'birthday', bonusPoints },
    });
  }

  async sendTierUpgrade(customerId: string, oldTier: string, newTier: string): Promise<void> {
    const tierEmojis = { silver: '⭐', gold: '🌟', platinum: '💎' };
    const emoji = tierEmojis[newTier] || '🎉';

    await this.send({
      customerId,
      channel: NotificationChannel.PUSH,
      type: NotificationType.TIER_UPGRADE,
      title: `Congratulations! You\'re now ${newTier.toUpperCase()} ${emoji}`,
      body: `You\'ve been upgraded from ${oldTier} to ${newTier}. Enjoy your new exclusive benefits!`,
      data: { type: 'tier_upgrade', oldTier, newTier },
    });
  }

  async sendNearbyBranchNotification(customerId: string, branchId: string): Promise<void> {
    const [customer, branch] = await Promise.all([
      this.customerRepo.findOne({ where: { id: customerId } }),
      this.branchRepo.findOne({ where: { id: branchId } }),
    ]);
    if (!customer || !branch) return;

    const message = this.buildGeofenceMessage(customer, branch);

    await this.send({
      customerId,
      channel: NotificationChannel.PUSH,
      type: NotificationType.NEARBY_BRANCH,
      title: `You\'re near ${branch.name} 🍫`,
      body: message,
      data: { type: 'nearby_branch', branchId, branchName: branch.name },
    });
  }

  async sendInactiveReminder(customerId: string, daysSinceLastVisit: number): Promise<void> {
    const customer = await this.customerRepo.findOne({ where: { id: customerId } });
    if (!customer) return;

    await this.send({
      customerId,
      channel: NotificationChannel.PUSH,
      type: NotificationType.INACTIVE_REMINDER,
      title: `We miss you, ${customer.firstName}! 😢`,
      body: `It\'s been ${daysSinceLastVisit} days since your last visit. Come in and earn ${customer.pointsBalance} points waiting for you!`,
      data: { type: 'inactive_reminder', daysSinceLastVisit, points: customer.pointsBalance },
    });
  }

  async sendCampaignNotification(
    customerIds: string[],
    title: string,
    body: string,
    campaignId: string,
  ): Promise<void> {
    const customers = await this.customerRepo.findByIds(customerIds);
    await Promise.all(
      customers.map((c) =>
        this.send({
          customerId: c.id,
          channel: NotificationChannel.PUSH,
          type: NotificationType.CAMPAIGN,
          title,
          body,
          campaignId,
          data: { type: 'campaign', campaignId },
        }),
      ),
    );
  }

  async getNotificationHistory(customerId: string, page = 1, limit = 20) {
    const [data, total] = await this.notificationRepo.findAndCount({
      where: { customerId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, meta: { total, page, limit } };
  }

  private buildGeofenceMessage(customer: Customer, branch: Branch): string {
    const messages = [
      `You\'re near ${branch.name}! You have ${customer.pointsBalance} points. Come in for a treat! 🍫`,
      `${branch.name} is close by! ${this.getProgressMessage(customer)}`,
      branch.geofenceConfig?.message || `Stop by ${branch.name} and earn points on your purchase!`,
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  }

  private getProgressMessage(customer: Customer): string {
    const tierThresholds = { bronze: 500, silver: 1500, gold: 4000 };
    const nextTierThreshold = tierThresholds[customer.tier];
    if (nextTierThreshold) {
      const pointsNeeded = nextTierThreshold - customer.totalPointsEarned;
      if (pointsNeeded > 0 && pointsNeeded <= 100) {
        return `Only ${pointsNeeded} points away from the next tier!`;
      }
    }
    return `You have ${customer.pointsBalance} points to redeem!`;
  }

  private async sendPushNotification(
    customerId: string,
    title: string,
    body: string,
    data?: Record<string, any>,
  ): Promise<void> {
    const customer = await this.customerRepo.findOne({ where: { id: customerId } });
    if (!customer || (!customer.fcmToken && !customer.apnsToken)) return;
    if (!this.firebaseApp || !customer.fcmToken) return;

    await admin.messaging(this.firebaseApp).send({
      token: customer.fcmToken,
      notification: { title, body },
      data: data ? Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])) : undefined,
      android: { priority: 'high', notification: { channelId: 'dipndip_loyalty' } },
      apns: { payload: { aps: { badge: 1, sound: 'default' } } },
    });
  }

  private async sendEmail(customerId: string, subject: string, body: string): Promise<void> {
    this.logger.log(`Sending email to customer ${customerId}: ${subject}`);
  }

  private async sendSms(customerId: string, message: string): Promise<void> {
    this.logger.log(`Sending SMS to customer ${customerId}`);
  }
}
