import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CampaignsService } from './campaigns.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { StaffRole } from '../../database/entities/staff.entity';
import { CampaignStatus, CampaignType } from '../../database/entities/campaign.entity';

@ApiTags('Campaigns')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('campaigns')
export class CampaignsController {
  constructor(private readonly campaignsService: CampaignsService) {}

  @Post()
  @Roles(StaffRole.SUPER_ADMIN, StaffRole.ADMIN, StaffRole.MARKETING)
  @ApiOperation({ summary: 'Create campaign' })
  create(@Body() body: any, @Request() req) {
    return this.campaignsService.create(body, req.user.id);
  }

  @Get()
  @Roles(StaffRole.SUPER_ADMIN, StaffRole.ADMIN, StaffRole.MARKETING, StaffRole.ANALYTICS)
  @ApiOperation({ summary: 'List campaigns' })
  findAll(
    @Query('status') status?: CampaignStatus,
    @Query('type') type?: CampaignType,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.campaignsService.findAll({ status, type, page: +page, limit: +limit });
  }

  @Get('active')
  @Roles(StaffRole.SUPER_ADMIN, StaffRole.ADMIN, StaffRole.MARKETING, StaffRole.CASHIER, StaffRole.MANAGER)
  @ApiOperation({ summary: 'Get currently active campaigns' })
  getActive(@Query('branchId') branchId?: string) {
    return this.campaignsService.getActiveCampaigns(branchId);
  }

  @Get(':id')
  @Roles(StaffRole.SUPER_ADMIN, StaffRole.ADMIN, StaffRole.MARKETING)
  @ApiOperation({ summary: 'Get campaign details' })
  findOne(@Param('id') id: string) {
    return this.campaignsService.findOne(id);
  }

  @Patch(':id')
  @Roles(StaffRole.SUPER_ADMIN, StaffRole.ADMIN, StaffRole.MARKETING)
  @ApiOperation({ summary: 'Update campaign' })
  update(@Param('id') id: string, @Body() body: any) {
    return this.campaignsService.update(id, body);
  }

  @Post(':id/activate')
  @Roles(StaffRole.SUPER_ADMIN, StaffRole.ADMIN, StaffRole.MARKETING)
  @ApiOperation({ summary: 'Activate campaign' })
  activate(@Param('id') id: string) {
    return this.campaignsService.activate(id);
  }

  @Post(':id/pause')
  @Roles(StaffRole.SUPER_ADMIN, StaffRole.ADMIN, StaffRole.MARKETING)
  @ApiOperation({ summary: 'Pause campaign' })
  pause(@Param('id') id: string) {
    return this.campaignsService.pause(id);
  }

  @Post(':id/cancel')
  @Roles(StaffRole.SUPER_ADMIN, StaffRole.ADMIN)
  @ApiOperation({ summary: 'Cancel campaign' })
  cancel(@Param('id') id: string) {
    return this.campaignsService.cancel(id);
  }
}
