import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ReferralsService } from './referrals.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Referrals')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('referrals')
export class ReferralsController {
  constructor(private readonly referralsService: ReferralsService) {}

  @Roles('super_admin', 'admin', 'loyalty_manager')
  @Get('stats')
  getStats() {
    return this.referralsService.getStats();
  }

  @Roles('super_admin', 'admin', 'loyalty_manager', 'cashier')
  @Get('customer/:customerId')
  getCustomerReferrals(@Param('customerId') customerId: string) {
    return this.referralsService.getReferrals(customerId);
  }
}
