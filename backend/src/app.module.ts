import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import configuration from './config/configuration';

// Entities
import { Customer } from './database/entities/customer.entity';
import { Staff } from './database/entities/staff.entity';
import { Transaction } from './database/entities/transaction.entity';
import { Branch } from './database/entities/branch.entity';
import { Visit } from './database/entities/visit.entity';
import { Campaign } from './database/entities/campaign.entity';
import { Reward } from './database/entities/reward.entity';
import { WalletPass } from './database/entities/wallet-pass.entity';
import { Referral } from './database/entities/referral.entity';
import { Notification } from './database/entities/notification.entity';
import { LoyaltyRule } from './database/entities/loyalty-rule.entity';

// Services
import { AuthService } from './modules/auth/auth.service';
import { JwtStrategy } from './modules/auth/jwt.strategy';
import { CustomersService } from './modules/customers/customers.service';
import { LoyaltyService } from './modules/loyalty/loyalty.service';
import { WalletService } from './modules/wallet/wallet.service';
import { NotificationsService } from './modules/notifications/notifications.service';
import { AnalyticsService } from './modules/analytics/analytics.service';
import { CampaignsService } from './modules/campaigns/campaigns.service';

// Controllers
import { AuthController } from './modules/auth/auth.controller';
import { CustomersController } from './modules/customers/customers.controller';
import { LoyaltyController } from './modules/loyalty/loyalty.controller';
import { WalletController } from './modules/wallet/wallet.controller';
import { NotificationsController } from './modules/notifications/notifications.controller';
import { AnalyticsController } from './modules/analytics/analytics.controller';
import { CampaignsController } from './modules/campaigns/campaigns.controller';
import { BranchesController } from './modules/locations/branches.controller';
import { BranchesService } from './modules/locations/branches.service';
import { StaffController } from './modules/staff/staff.controller';
import { StaffService } from './modules/staff/staff.service';
import { RewardsController } from './modules/rewards/rewards.controller';
import { RewardsService } from './modules/rewards/rewards.service';

// Guards
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';

// Queue Processors
import { NotificationsProcessor } from './queues/notifications.processor';
import { WalletProcessor } from './queues/wallet.processor';

// Scheduled Tasks
import { ScheduledTasksService } from './modules/scheduled-tasks/scheduled-tasks.service';

// Health & Referrals
import { HealthController } from './modules/health/health.controller';
import { ReferralsService } from './modules/referrals/referrals.service';
import { ReferralsController } from './modules/referrals/referrals.controller';
import { RegisterController } from './modules/register/register.controller';
import { PagesController } from './modules/pages/pages.controller';

const ENTITIES = [
  Customer, Staff, Transaction, Branch, Visit,
  Campaign, Reward, WalletPass, Referral, Notification, LoyaltyRule,
];

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('database.host'),
        port: config.get('database.port'),
        username: config.get('database.username'),
        password: config.get('database.password'),
        database: config.get('database.name'),
        entities: ENTITIES,
        synchronize: config.get('app.nodeEnv') !== 'production',
        logging: config.get('app.nodeEnv') === 'development',
        ssl: config.get('database.ssl') ? { rejectUnauthorized: false } : false,
      }),
      inject: [ConfigService],
    }),

    TypeOrmModule.forFeature(ENTITIES),

    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        redis: {
          host: config.get('redis.host'),
          port: config.get('redis.port'),
          password: config.get('redis.password'),
          tls: config.get('redis.tls') ? {} : undefined,
        },
      }),
      inject: [ConfigService],
    }),

    BullModule.registerQueue(
      { name: 'notifications' },
      { name: 'wallet' },
    ),

    ScheduleModule.forRoot(),

    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => [
        {
          ttl: config.get('throttle.ttl', 60),
          limit: config.get('throttle.limit', 100),
        },
      ],
      inject: [ConfigService],
    }),

    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        secret: config.get('jwt.secret'),
        signOptions: { expiresIn: config.get('jwt.expiresIn') },
      }),
      inject: [ConfigService],
    }),

    PassportModule.register({ defaultStrategy: 'jwt' }),
  ],

  controllers: [
    AuthController,
    CustomersController,
    LoyaltyController,
    WalletController,
    NotificationsController,
    AnalyticsController,
    CampaignsController,
    BranchesController,
    StaffController,
    RewardsController,
    HealthController,
    ReferralsController,
    RegisterController,
    PagesController,
  ],

  providers: [
    // Auth
    AuthService,
    JwtStrategy,
    JwtAuthGuard,
    RolesGuard,

    // Services
    CustomersService,
    LoyaltyService,
    WalletService,
    NotificationsService,
    AnalyticsService,
    CampaignsService,
    BranchesService,
    StaffService,
    RewardsService,
    ScheduledTasksService,

    // Queue Processors
    NotificationsProcessor,
    WalletProcessor,

    // Referrals
    ReferralsService,
  ],
})
export class AppModule {}
