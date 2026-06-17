import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  ManyToOne, JoinColumn, Index,
} from 'typeorm';
import { Customer } from './customer.entity';

export enum NotificationChannel {
  PUSH = 'push',
  EMAIL = 'email',
  SMS = 'sms',
  WALLET = 'wallet',
}

export enum NotificationType {
  WELCOME = 'welcome',
  BIRTHDAY = 'birthday',
  TIER_UPGRADE = 'tier_upgrade',
  POINTS_EARNED = 'points_earned',
  POINTS_REDEEMED = 'points_redeemed',
  NEARBY_BRANCH = 'nearby_branch',
  CAMPAIGN = 'campaign',
  INACTIVE_REMINDER = 'inactive_reminder',
  REFERRAL = 'referral',
  CUSTOM = 'custom',
}

export enum NotificationStatus {
  PENDING = 'pending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  FAILED = 'failed',
  READ = 'read',
}

@Entity('notifications')
@Index(['customerId', 'createdAt'])
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  customerId: string;

  @ManyToOne(() => Customer, (c) => c.notifications)
  @JoinColumn({ name: 'customerId' })
  customer: Customer;

  @Column({ type: 'enum', enum: NotificationChannel })
  channel: NotificationChannel;

  @Column({ type: 'enum', enum: NotificationType })
  type: NotificationType;

  @Column({ type: 'enum', enum: NotificationStatus, default: NotificationStatus.PENDING })
  status: NotificationStatus;

  @Column()
  title: string;

  @Column({ type: 'text' })
  body: string;

  @Column({ nullable: true })
  imageUrl: string;

  @Column({ type: 'jsonb', nullable: true })
  data: Record<string, any>;

  @Column({ nullable: true })
  campaignId: string;

  @Column({ nullable: true })
  sentAt: Date;

  @Column({ nullable: true })
  deliveredAt: Date;

  @Column({ nullable: true })
  readAt: Date;

  @Column({ nullable: true })
  failureReason: string;

  @Column({ nullable: true })
  externalId: string;

  @CreateDateColumn()
  createdAt: Date;
}
