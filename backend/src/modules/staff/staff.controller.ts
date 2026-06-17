import { Controller, Get, Post, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { StaffService } from './staff.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { StaffRole } from '../../database/entities/staff.entity';

@ApiTags('Staff')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(StaffRole.SUPER_ADMIN, StaffRole.ADMIN)
@Controller('staff')
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  @Post()
  @ApiOperation({ summary: 'Create staff member' })
  create(@Body() body: any) {
    return this.staffService.create(body);
  }

  @Get()
  @ApiOperation({ summary: 'List all staff' })
  findAll() {
    return this.staffService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get staff member' })
  findOne(@Param('id') id: string) {
    return this.staffService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update staff member' })
  update(@Param('id') id: string, @Body() body: any) {
    return this.staffService.update(id, body);
  }

  @Post(':id/reset-password')
  @ApiOperation({ summary: 'Reset staff member password' })
  resetPassword(@Param('id') id: string, @Body('password') password: string) {
    return this.staffService.resetPassword(id, password);
  }

  @Post(':id/deactivate')
  @ApiOperation({ summary: 'Deactivate staff member' })
  deactivate(@Param('id') id: string) {
    return this.staffService.deactivate(id);
  }
}
