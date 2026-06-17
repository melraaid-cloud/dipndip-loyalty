import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
} from 'typeorm';

export enum StaffRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  MANAGER = 'manager',
  CASHIER = 'cashier',
  MARKETING = 'marketing',
  ANALYTICS = 'analytics',
  SUPPORT = 'support',
}

export enum StaffStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
}

@Entity('staff')
export class Staff {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column({ unique: true })
  email: string;

  @Column()
  passwordHash: string;

  @Column({ type: 'enum', enum: StaffRole, default: StaffRole.CASHIER })
  role: StaffRole;

  @Column({ type: 'enum', enum: StaffStatus, default: StaffStatus.ACTIVE })
  status: StaffStatus;

  @Column({ type: 'simple-array', nullable: true })
  branchIds: string[];

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  avatarUrl: string;

  @Column({ nullable: true })
  lastLoginAt: Date;

  @Column({ nullable: true })
  refreshToken: string;

  @Column({ type: 'jsonb', nullable: true })
  permissions: string[];

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }
}
