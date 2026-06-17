import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { BranchesService } from './branches.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { StaffRole } from '../../database/entities/staff.entity';

@ApiTags('Branches')
@Controller('branches')
export class BranchesController {
  constructor(private readonly branchesService: BranchesService) {}

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(StaffRole.SUPER_ADMIN, StaffRole.ADMIN)
  @ApiOperation({ summary: 'Create branch' })
  create(@Body() body: any) {
    return this.branchesService.create(body);
  }

  @Get()
  @Public()
  @ApiOperation({ summary: 'Get all active branches' })
  findActive() {
    return this.branchesService.findActive();
  }

  @Get('all')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(StaffRole.SUPER_ADMIN, StaffRole.ADMIN, StaffRole.MANAGER)
  @ApiOperation({ summary: 'Get all branches (admin)' })
  findAll() {
    return this.branchesService.findAll();
  }

  @Get('nearby')
  @Public()
  @ApiOperation({ summary: 'Find nearby branches (geofencing)' })
  findNearby(
    @Query('lat') lat: number,
    @Query('lng') lng: number,
    @Query('radius') radius = 5,
  ) {
    return this.branchesService.findNearby(+lat, +lng, +radius);
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get branch details' })
  findOne(@Param('id') id: string) {
    return this.branchesService.findOne(id);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(StaffRole.SUPER_ADMIN, StaffRole.ADMIN, StaffRole.MANAGER)
  @ApiOperation({ summary: 'Update branch' })
  update(@Param('id') id: string, @Body() body: any) {
    return this.branchesService.update(id, body);
  }

  @Patch(':id/geofence')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(StaffRole.SUPER_ADMIN, StaffRole.ADMIN)
  @ApiOperation({ summary: 'Update branch geofence configuration' })
  updateGeofence(@Param('id') id: string, @Body() body: any) {
    return this.branchesService.updateGeofenceConfig(id, body);
  }
}
