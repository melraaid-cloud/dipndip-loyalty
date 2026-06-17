import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { StaffRole } from '../../database/entities/staff.entity';

@ApiTags('Analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(StaffRole.SUPER_ADMIN, StaffRole.ADMIN, StaffRole.ANALYTICS)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Executive dashboard KPIs' })
  getDashboard() {
    return this.analyticsService.getExecutiveDashboard();
  }

  @Get('member-growth')
  @ApiOperation({ summary: 'Member growth over time' })
  getMemberGrowth(@Query('period') period: 'week' | 'month' | 'year' = 'month') {
    return this.analyticsService.getMemberGrowth(period);
  }

  @Get('points-activity')
  @ApiOperation({ summary: 'Points earned vs redeemed over time' })
  getPointsActivity(@Query('days') days = 30) {
    return this.analyticsService.getPointsActivity(+days);
  }

  @Get('retention')
  @ApiOperation({ summary: 'Customer retention metrics' })
  getRetention() {
    return this.analyticsService.getRetentionMetrics();
  }

  @Get('campaigns')
  @ApiOperation({ summary: 'Campaign performance metrics' })
  getCampaignPerformance(@Query('campaignId') campaignId?: string) {
    return this.analyticsService.getCampaignPerformance(campaignId);
  }

  @Get('visit-frequency')
  @ApiOperation({ summary: 'Customer visit frequency distribution' })
  getVisitFrequency() {
    return this.analyticsService.getVisitFrequency();
  }

  @Get('customer-ltv')
  @ApiOperation({ summary: 'Customer lifetime value by tier' })
  getCustomerLtv() {
    return this.analyticsService.getCustomerLifetimeValue();
  }
}
