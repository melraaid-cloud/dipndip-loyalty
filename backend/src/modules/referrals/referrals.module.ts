import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { ReferralsService } from './referrals.service';
import { ReferralsController } from './referrals.controller';
import { Referral } from '../../database/entities/referral.entity';
import { Customer } from '../../database/entities/customer.entity';
import { Transaction } from '../../database/entities/transaction.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Referral, Customer, Transaction]),
    BullModule.registerQueue({ name: 'notifications' }),
  ],
  controllers: [ReferralsController],
  providers: [ReferralsService],
  exports: [ReferralsService],
})
export class ReferralsModule {}
