import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
} from 'typeorm';

export enum RewardType {
  FREE_ITEM = 'free_item',
  DISCOUNT = 'discount',
  PERCENTAGE_DISCOUNT = 'percentage_discount',
  UPGRADE = 'upgrade',
  EXPERIENCE = 'experience',
  CUSTOM = 'custom',
}

export enum RewardStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SOLD_OUT = 'sold_out',
}

@Entity('rewards')
export class Reward {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  nameAr: string;

  @Column({ nullable: true })
  description: string;

  @Column({ nullable: true })
  descriptionAr: string;

  @Column({ type: 'enum', enum: RewardType })
  type: RewardType;

  @Column({ type: 'enum', enum: RewardStatus, default: RewardStatus.ACTIVE })
  status: RewardStatus;

  @Column({ type: 'int' })
  pointsCost: number;

  @Column({ nullable: true })
  discountValue: number;

  @Column({ nullable: true })
  discountPercentage: number;

  @Column({ nullable: true })
  freeItemName: string;

  @Column({ nullable: true })
  imageUrl: string;

  @Column({ nullable: true })
  category: string;

  @Column({ type: 'simple-array', nullable: true })
  applicableTiers: string[];

  @Column({ type: 'simple-array', nullable: true })
  applicableBranchIds: string[];

  @Column({ nullable: true })
  validityDays: number;

  @Column({ type: 'int', default: 0 })
  totalRedeemed: number;

  @Column({ nullable: true })
  maxRedemptions: number;

  @Column({ nullable: true })
  startDate: Date;

  @Column({ nullable: true })
  endDate: Date;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  isFeatured: boolean;

  @Column({ type: 'int', default: 0 })
  sortOrder: number;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
