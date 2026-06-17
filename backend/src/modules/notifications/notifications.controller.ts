import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { StaffRole } from '../../database/entities/staff.entity';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post('send')
  @Roles(StaffRole.SUPER_ADMIN, StaffRole.ADMIN, StaffRole.MARKETING)
  @ApiOperation({ summary: 'Send notification to customer' })
  send(@Body() body: any) {
    return this.notificationsService.send(body);
  }

  @Post('campaign')
  @Roles(StaffRole.SUPER_ADMIN, StaffRole.ADMIN, StaffRole.MARKETING)
  @ApiOperation({ summary: 'Send campaign notification to multiple customers' })
  sendCampaign(@Body() body: { customerIds: string[]; title: string; body: string; campaignId: string }) {
    return this.notificationsService.sendCampaignNotification(
      body.customerIds, body.title, body.body, body.campaignId,
    );
  }

  @Post('nearby/:customerId/:branchId')
  @Roles(StaffRole.SUPER_ADMIN, StaffRole.ADMIN)
  @ApiOperation({ summary: 'Send nearby branch notification' })
  sendNearby(@Param('customerId') customerId: string, @Param('branchId') branchId: string) {
    return this.notificationsService.sendNearbyBranchNotification(customerId, branchId);
  }

  @Get(':customerId/history')
  @Roles(StaffRole.SUPER_ADMIN, StaffRole.ADMIN, StaffRole.SUPPORT)
  @ApiOperation({ summary: 'Get notification history for customer' })
  getHistory(
    @Param('customerId') customerId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.notificationsService.getNotificationHistory(customerId, +page, +limit);
  }
}
