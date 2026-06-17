import { Controller, Get, Post, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RewardsService } from './rewards.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { StaffRole } from '../../database/entities/staff.entity';

@ApiTags('Rewards')
@Controller('rewards')
export class RewardsController {
  constructor(private readonly rewardsService: RewardsService) {}

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(StaffRole.SUPER_ADMIN, StaffRole.ADMIN)
  @ApiOperation({ summary: 'Create reward' })
  create(@Body() body: any) {
    return this.rewardsService.create(body);
  }

  @Get()
  @Public()
  @ApiOperation({ summary: 'Get all rewards catalog' })
  findAll() {
    return this.rewardsService.findAll();
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get reward details' })
  findOne(@Param('id') id: string) {
    return this.rewardsService.findOne(id);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(StaffRole.SUPER_ADMIN, StaffRole.ADMIN)
  @ApiOperation({ summary: 'Update reward' })
  update(@Param('id') id: string, @Body() body: any) {
    return this.rewardsService.update(id, body);
  }
}
