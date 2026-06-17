import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, OneToMany,
} from 'typeorm';
import { Visit } from './visit.entity';

export enum BranchStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  TEMPORARILY_CLOSED = 'temporarily_closed',
}

@Entity('branches')
export class Branch {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  nameAr: string;

  @Column({ nullable: true })
  code: string;

  @Column({ nullable: true })
  address: string;

  @Column({ nullable: true })
  addressAr: string;

  @Column({ nullable: true })
  city: string;

  @Column({ type: 'decimal', precision: 10, scale: 8, nullable: true })
  latitude: number;

  @Column({ type: 'decimal', precision: 11, scale: 8, nullable: true })
  longitude: number;

  @Column({ type: 'int', default: 200 })
  geofenceRadius: number;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  email: string;

  @Column({ nullable: true })
  openingHours: string;

  @Column({ nullable: true })
  imageUrl: string;

  @Column({ type: 'enum', enum: BranchStatus, default: BranchStatus.ACTIVE })
  status: BranchStatus;

  @Column({ type: 'jsonb', nullable: true })
  geofenceConfig: {
    radius: number;
    message: string;
    messageAr: string;
    enabled: boolean;
  };

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @Column({ type: 'int', default: 0 })
  totalVisits: number;

  @Column({ type: 'int', default: 0 })
  totalTransactions: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Visit, (v) => v.branch)
  visits: Visit[];
}
