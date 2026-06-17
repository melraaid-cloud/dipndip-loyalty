import { Controller, Get, Post, Body, Param, Query, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { LoyaltyService } from './loyalty.service';
import { EarnPointsDto } from './dto/earn-points.dto';
import { RedeemPointsDto } from './dto/redeem-points.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { StaffRole } from '../../database/entities/staff.entity';

@ApiTags('Loyalty')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('loyalty')
export class LoyaltyController {
  constructor(private readonly loyaltyService: LoyaltyService) {}

  @Post('earn')
  @Roles(StaffRole.SUPER_ADMIN, StaffRole.ADMIN, StaffRole.MANAGER, StaffRole.CASHIER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Earn points via QR scan / POS' })
  earnPoints(@Body() dto: EarnPointsDto, @Request() req) {
    return this.loyaltyService.earnPoints({ ...dto, staffId: req.user.id });
  }

  @Post('redeem')
  @Roles(StaffRole.SUPER_ADMIN, StaffRole.ADMIN, StaffRole.MANAGER, StaffRole.CASHIER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Redeem points for a reward' })
  redeemPoints(@Body() dto: RedeemPointsDto, @Request() req) {
    return this.loyaltyService.redeemPoints({ ...dto, staffId: req.user.id });
  }

  @Get('verify/:membershipNumber')
  @Roles(StaffRole.SUPER_ADMIN, StaffRole.ADMIN, StaffRole.MANAGER, StaffRole.CASHIER)
  @ApiOperation({ summary: 'Verify membership by number or QR scan' })
  verifyMembership(@Param('membershipNumber') membershipNumber: string) {
    return this.loyaltyService.verifyMembership(membershipNumber);
  }

  @Get('rewards')
  @Roles(StaffRole.SUPER_ADMIN, StaffRole.ADMIN, StaffRole.MANAGER, StaffRole.CASHIER, StaffRole.MARKETING)
  @ApiOperation({ summary: 'Get available rewards' })
  getRewards(@Query('tier') tier?: string) {
    return this.loyaltyService.getActiveRewards(tier as any);
  }

  @Get('rules')
  @Roles(StaffRole.SUPER_ADMIN, StaffRole.ADMIN)
  @ApiOperation({ summary: 'Get loyalty rules' })
  getRules() {
    return this.loyaltyService.getLoyaltyRules();
  }

  @Post('rules')
  @Roles(StaffRole.SUPER_ADMIN, StaffRole.ADMIN)
  @ApiOperation({ summary: 'Create / update loyalty rule' })
  createRule(@Body() body: any) {
    return this.loyaltyService.createLoyaltyRule(body);
  }
}
