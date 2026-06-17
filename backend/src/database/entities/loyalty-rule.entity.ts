import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
} from 'typeorm';

export enum LoyaltyRuleType {
  EARN_RATE = 'earn_rate',
  TIER_THRESHOLD = 'tier_threshold',
  EXPIRY = 'expiry',
  BIRTHDAY_BONUS = 'birthday_bonus',
  REFERRAL_BONUS = 'referral_bonus',
  WELCOME_BONUS = 'welcome_bonus',
}

@Entity('loyalty_rules')
export class LoyaltyRule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: LoyaltyRuleType })
  type: LoyaltyRuleType;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({ type: 'decimal', precision: 10, scale: 4, default: 1 })
  pointsPerLyd: number;

  @Column({ type: 'int', nullable: true })
  bronzeThreshold: number;

  @Column({ type: 'int', nullable: true })
  silverThreshold: number;

  @Column({ type: 'int', nullable: true })
  goldThreshold: number;

  @Column({ type: 'int', nullable: true })
  platinumThreshold: number;

  @Column({ type: 'int', nullable: true })
  birthdayBonusPoints: number;

  @Column({ type: 'int', nullable: true })
  referrerBonusPoints: number;

  @Column({ type: 'int', nullable: true })
  referredBonusPoints: number;

  @Column({ type: 'int', nullable: true })
  welcomeBonusPoints: number;

  @Column({ type: 'int', nullable: true })
  pointsExpiryDays: number;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'jsonb', nullable: true })
  tierMultipliers: {
    bronze: number;
    silver: number;
    gold: number;
    platinum: number;
  };

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
