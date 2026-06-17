import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  ManyToOne, JoinColumn,
} from 'typeorm';
import { Customer } from './customer.entity';

export enum ReferralStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FRAUD_DETECTED = 'fraud_detected',
  EXPIRED = 'expired',
}

@Entity('referrals')
export class Referral {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  referrerId: string;

  @ManyToOne(() => Customer, (c) => c.referrals)
  @JoinColumn({ name: 'referrerId' })
  referrer: Customer;

  @Column()
  referredId: string;

  @ManyToOne(() => Customer)
  @JoinColumn({ name: 'referredId' })
  referred: Customer;

  @Column()
  referralCode: string;

  @Column({ type: 'enum', enum: ReferralStatus, default: ReferralStatus.PENDING })
  status: ReferralStatus;

  @Column({ type: 'int', nullable: true })
  referrerPointsAwarded: number;

  @Column({ type: 'int', nullable: true })
  referredPointsAwarded: number;

  @Column({ nullable: true })
  completedAt: Date;

  @Column({ nullable: true })
  fraudReason: string;

  @Column({ nullable: true })
  ipAddress: string;

  @Column({ nullable: true })
  deviceFingerprint: string;

  @CreateDateColumn()
  createdAt: Date;
}
