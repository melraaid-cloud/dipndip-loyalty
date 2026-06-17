import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { Customer } from './customer.entity';

export enum WalletPassType {
  APPLE = 'apple',
  GOOGLE = 'google',
}

export enum WalletPassStatus {
  ACTIVE = 'active',
  VOIDED = 'voided',
  EXPIRED = 'expired',
}

@Entity('wallet_passes')
export class WalletPass {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  customerId: string;

  @ManyToOne(() => Customer, (c) => c.walletPasses)
  @JoinColumn({ name: 'customerId' })
  customer: Customer;

  @Column({ type: 'enum', enum: WalletPassType })
  type: WalletPassType;

  @Column({ type: 'enum', enum: WalletPassStatus, default: WalletPassStatus.ACTIVE })
  status: WalletPassStatus;

  @Column({ nullable: true })
  serialNumber: string;

  @Column({ nullable: true })
  passTypeIdentifier: string;

  @Column({ nullable: true })
  authenticationToken: string;

  @Column({ nullable: true })
  googlePassObjectId: string;

  @Column({ nullable: true })
  googlePassUrl: string;

  @Column({ nullable: true })
  passFilePath: string;

  @Column({ nullable: true })
  pushToken: string;

  @Column({ nullable: true })
  deviceLibraryIdentifier: string;

  @Column({ nullable: true })
  lastUpdatedTag: string;

  @Column({ nullable: true })
  lastPushedAt: Date;

  @Column({ type: 'int', default: 0 })
  updateCount: number;

  @Column({ type: 'jsonb', nullable: true })
  passData: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
