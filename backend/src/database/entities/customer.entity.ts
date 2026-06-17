import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, OneToMany, Index,
} from 'typeorm';
import { Transaction } from './transaction.entity';
import { Visit } from './visit.entity';
import { Referral } from './referral.entity';
import { WalletPass } from './wallet-pass.entity';
import { Notification } from './notification.entity';

export enum CustomerTier {
  BRONZE = 'bronze',
  SILVER = 'silver',
  GOLD = 'gold',
  PLATINUM = 'platinum',
}

export enum CustomerStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  PENDING = 'pending',
}

export enum CustomerSegment {
  NEW = 'new',
  ACTIVE = 'active',
  VIP = 'vip',
  DORMANT = 'dormant',
  HIGH_SPENDER = 'high_spender',
  DESSERT_LOVER = 'dessert_lover',
  COFFEE_LOVER = 'coffee_lover',
  AT_RISK = 'at_risk',
}

@Entity('customers')
@Index(['email'], { unique: true, where: '"email" IS NOT NULL' })
@Index(['phone'], { unique: true, where: '"phone" IS NOT NULL' })
@Index(['membershipNumber'], { unique: true })
export class Customer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  membershipNumber: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column({ nullable: true })
  @Index()
  email: string;

  @Column({ nullable: true })
  @Index()
  phone: string;

  @Column({ nullable: true })
  birthday: Date;

  @Column({ nullable: true })
  avatarUrl: string;

  @Column({ type: 'enum', enum: CustomerTier, default: CustomerTier.BRONZE })
  tier: CustomerTier;

  @Column({ type: 'enum', enum: CustomerStatus, default: CustomerStatus.PENDING })
  status: CustomerStatus;

  @Column({ type: 'simple-array', nullable: true })
  segments: CustomerSegment[];

  @Column({ type: 'int', default: 0 })
  pointsBalance: number;

  @Column({ type: 'int', default: 0 })
  totalPointsEarned: number;

  @Column({ type: 'int', default: 0 })
  totalPointsRedeemed: number;

  @Column({ type: 'decimal', precision: 10, scale: 3, default: 0 })
  totalSpend: number;

  @Column({ type: 'int', default: 0 })
  totalVisits: number;

  @Column({ type: 'int', default: 0 })
  monthlyVisits: number;

  @Column({ type: 'int', default: 0 })
  consecutiveVisits: number;

  @Column({ nullable: true })
  lastVisitAt: Date;

  @Column({ nullable: true })
  lastVisitBranchId: string;

  @Column({ nullable: true })
  referralCode: string;

  @Column({ nullable: true })
  referredById: string;

  @Column({ nullable: true })
  fcmToken: string;

  @Column({ nullable: true })
  apnsToken: string;

  @Column({ type: 'jsonb', nullable: true })
  preferences: {
    emailNotifications: boolean;
    smsNotifications: boolean;
    pushNotifications: boolean;
    marketingEmails: boolean;
  };

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @Column({ default: false })
  birthdayRewardSentThisYear: boolean;

  @Column({ nullable: true })
  birthdayRewardSentYear: number;

  @Column({ nullable: true })
  passwordHash: string;

  @Column({ nullable: true })
  emailVerifiedAt: Date;

  @Column({ nullable: true })
  phoneVerifiedAt: Date;

  @Column({ nullable: true })
  suspendedAt: Date;

  @Column({ nullable: true })
  suspendedReason: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Transaction, (t) => t.customer)
  transactions: Transaction[];

  @OneToMany(() => Visit, (v) => v.customer)
  visits: Visit[];

  @OneToMany(() => Referral, (r) => r.referrer)
  referrals: Referral[];

  @OneToMany(() => WalletPass, (w) => w.customer)
  walletPasses: WalletPass[];

  @OneToMany(() => Notification, (n) => n.customer)
  notifications: Notification[];

  get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }
}
