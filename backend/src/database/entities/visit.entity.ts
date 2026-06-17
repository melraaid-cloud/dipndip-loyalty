import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  ManyToOne, JoinColumn, Index,
} from 'typeorm';
import { Customer } from './customer.entity';
import { Branch } from './branch.entity';

@Entity('visits')
@Index(['customerId', 'createdAt'])
@Index(['branchId', 'createdAt'])
export class Visit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  customerId: string;

  @ManyToOne(() => Customer, (c) => c.visits)
  @JoinColumn({ name: 'customerId' })
  customer: Customer;

  @Column()
  branchId: string;

  @ManyToOne(() => Branch, (b) => b.visits)
  @JoinColumn({ name: 'branchId' })
  branch: Branch;

  @Column({ nullable: true })
  transactionId: string;

  @Column({ type: 'decimal', precision: 10, scale: 3, nullable: true })
  spendAmount: number;

  @Column({ type: 'int', default: 0 })
  pointsEarned: number;

  @Column({ nullable: true })
  staffId: string;

  @Column({ nullable: true })
  receiptNumber: string;

  @Column({ type: 'jsonb', nullable: true })
  items: Array<{
    name: string;
    category: string;
    price: number;
    quantity: number;
  }>;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;
}
