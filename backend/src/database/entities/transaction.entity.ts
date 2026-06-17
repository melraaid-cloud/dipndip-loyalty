import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  ManyToOne, JoinColumn, Index,
} from 'typeorm';
import { Customer } from './customer.entity';
import { Branch } from './branch.entity';
import { Campaign } from './campaign.entity';
import { Staff } from './staff.entity';

export enum TransactionType {
  EARN = 'earn',
  REDEEM = 'redeem',
  ADJUST = 'adjust',
  EXPIRE = 'expire',
  BONUS = 'bonus',
  REFERRAL = 'referral',
  BIRTHDAY = 'birthday',
  CAMPAIGN = 'campaign',
  MANUAL = 'manual',
}

export enum TransactionStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  REVERSED = 'reversed',
}

@Entity('transactions')
@Index(['customerId', 'createdAt'])
@Index(['branchId', 'createdAt'])
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  customerId: string;

  @ManyToOne(() => Customer, (c) => c.transactions)
  @JoinColumn({ name: 'customerId' })
  customer: Customer;

  @Column({ nullable: true })
  branchId: string;

  @ManyToOne(() => Branch, { nullable: true })
  @JoinColumn({ name: 'branchId' })
  branch: Branch;

  @Column({ nullable: true })
  campaignId: string;

  @ManyToOne(() => Campaign, { nullable: true })
  @JoinColumn({ name: 'campaignId' })
  campaign: Campaign;

  @Column({ nullable: true })
  staffId: string;

  @ManyToOne(() => Staff, { nullable: true })
  @JoinColumn({ name: 'staffId' })
  staff: Staff;

  @Column({ type: 'enum', enum: TransactionType })
  type: TransactionType;

  @Column({ type: 'enum', enum: TransactionStatus, default: TransactionStatus.COMPLETED })
  status: TransactionStatus;

  @Column({ type: 'int' })
  points: number;

  @Column({ type: 'int' })
  balanceBefore: number;

  @Column({ type: 'int' })
  balanceAfter: number;

  @Column({ type: 'decimal', precision: 10, scale: 3, nullable: true })
  spendAmount: number;

  @Column({ nullable: true })
  description: string;

  @Column({ nullable: true })
  referenceNumber: string;

  @Column({ nullable: true })
  receiptNumber: string;

  @Column({ nullable: true })
  rewardId: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @Column({ nullable: true })
  reversedAt: Date;

  @Column({ nullable: true })
  reversedByStaffId: string;

  @Column({ nullable: true })
  reversalReason: string;

  @CreateDateColumn()
  createdAt: Date;
}
