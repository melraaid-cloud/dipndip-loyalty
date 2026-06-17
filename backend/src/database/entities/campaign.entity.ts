import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { Staff } from './staff.entity';

export enum CampaignType {
  DOUBLE_POINTS = 'double_points',
  MULTIPLIER = 'multiplier',
  BONUS_POINTS = 'bonus_points',
  FREE_REWARD = 'free_reward',
  DISCOUNT = 'discount',
  HAPPY_HOUR = 'happy_hour',
  BIRTHDAY = 'birthday',
  REFERRAL = 'referral',
  TIER_BONUS = 'tier_bonus',
  BRANCH_SPECIFIC = 'branch_specific',
  PRODUCT_LAUNCH = 'product_launch',
  WEEKEND = 'weekend',
  CUSTOM = 'custom',
}

export enum CampaignStatus {
  DRAFT = 'draft',
  SCHEDULED = 'scheduled',
  ACTIVE = 'active',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum CampaignTargetAudience {
  ALL = 'all',
  NEW = 'new',
  ACTIVE = 'active',
  VIP = 'vip',
  DORMANT = 'dormant',
  BRONZE = 'bronze',
  SILVER = 'silver',
  GOLD = 'gold',
  PLATINUM = 'platinum',
  CUSTOM_SEGMENT = 'custom_segment',
}

@Entity('campaigns')
export class Campaign {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({ type: 'enum', enum: CampaignType })
  type: CampaignType;

  @Column({ type: 'enum', enum: CampaignStatus, default: CampaignStatus.DRAFT })
  status: CampaignStatus;

  @Column({ type: 'enum', enum: CampaignTargetAudience, default: CampaignTargetAudience.ALL })
  targetAudience: CampaignTargetAudience;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 1 })
  pointsMultiplier: number;

  @Column({ type: 'int', nullable: true })
  bonusPoints: number;

  @Column({ nullable: true })
  rewardId: string;

  @Column({ nullable: true })
  startDate: Date;

  @Column({ nullable: true })
  endDate: Date;

  @Column({ type: 'jsonb', nullable: true })
  schedule: {
    daysOfWeek: number[];
    startTime: string;
    endTime: string;
    timezone: string;
  };

  @Column({ type: 'simple-array', nullable: true })
  branchIds: string[];

  @Column({ type: 'simple-array', nullable: true })
  productCategories: string[];

  @Column({ type: 'jsonb', nullable: true })
  conditions: {
    minSpend: number;
    minVisits: number;
    specificProducts: string[];
    excludeRedemptions: boolean;
  };

  @Column({ nullable: true })
  notificationTitle: string;

  @Column({ nullable: true })
  notificationBody: string;

  @Column({ nullable: true })
  imageUrl: string;

  @Column({ default: false })
  sendPushNotification: boolean;

  @Column({ default: false })
  sendEmail: boolean;

  @Column({ default: false })
  sendSms: boolean;

  @Column({ type: 'int', default: 0 })
  totalRedemptions: number;

  @Column({ type: 'int', default: 0 })
  totalPointsIssued: number;

  @Column({ nullable: true })
  maxRedemptionsPerCustomer: number;

  @Column({ nullable: true })
  maxTotalRedemptions: number;

  @Column({ nullable: true })
  createdByStaffId: string;

  @ManyToOne(() => Staff, { nullable: true })
  @JoinColumn({ name: 'createdByStaffId' })
  createdBy: Staff;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
