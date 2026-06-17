import {
  Controller, Get, Post, Patch, Body, Param, Query,
  UseGuards, Request, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { ListCustomersDto } from './dto/list-customers.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { StaffRole } from '../../database/entities/staff.entity';

@ApiTags('Customers')
@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post('self-register')
  @Public()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Public self-registration for customers (no auth required)' })
  selfRegister(@Body() dto: CreateCustomerDto) {
    return this.customersService.create(dto);
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(StaffRole.SUPER_ADMIN, StaffRole.ADMIN, StaffRole.MANAGER, StaffRole.CASHIER)
  @ApiOperation({ summary: 'Register new customer (staff)' })
  create(@Body() dto: CreateCustomerDto) {
    return this.customersService.create(dto);
  }

  @Get()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(StaffRole.SUPER_ADMIN, StaffRole.ADMIN, StaffRole.MANAGER, StaffRole.ANALYTICS)
  @ApiOperation({ summary: 'List all customers' })
  findAll(@Query() dto: ListCustomersDto) {
    return this.customersService.findAll(dto);
  }

  @Get('stats')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(StaffRole.SUPER_ADMIN, StaffRole.ADMIN, StaffRole.MANAGER, StaffRole.ANALYTICS)
  @ApiOperation({ summary: 'Customer statistics' })
  getStats() {
    return this.customersService.getStats();
  }

  @Get('search')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(StaffRole.SUPER_ADMIN, StaffRole.ADMIN, StaffRole.MANAGER, StaffRole.CASHIER, StaffRole.SUPPORT)
  @ApiOperation({ summary: 'Search customers by name, phone, or membership number' })
  search(@Query('q') q: string) {
    return this.customersService.search(q || '');
  }

  @Get(':id/card')
  @Public()
  @ApiOperation({ summary: 'Public card data for customer wallet page' })
  getCard(@Param('id') id: string) {
    return this.customersService.getCard(id);
  }

  @Get(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(StaffRole.SUPER_ADMIN, StaffRole.ADMIN, StaffRole.MANAGER, StaffRole.CASHIER, StaffRole.SUPPORT)
  @ApiOperation({ summary: 'Get customer by ID' })
  findOne(@Param('id') id: string) {
    return this.customersService.findOne(id);
  }

  @Get(':id/transactions')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(StaffRole.SUPER_ADMIN, StaffRole.ADMIN, StaffRole.MANAGER, StaffRole.CASHIER, StaffRole.SUPPORT)
  @ApiOperation({ summary: 'Customer transaction history' })
  getTransactions(
    @Param('id') id: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.customersService.getTransactionHistory(id, +page, +limit);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(StaffRole.SUPER_ADMIN, StaffRole.ADMIN, StaffRole.MANAGER, StaffRole.SUPPORT)
  @ApiOperation({ summary: 'Update customer' })
  update(@Param('id') id: string, @Body() dto: UpdateCustomerDto) {
    return this.customersService.update(id, dto);
  }

  @Post(':id/adjust-points')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(StaffRole.SUPER_ADMIN, StaffRole.ADMIN, StaffRole.MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Manually adjust customer points' })
  adjustPoints(
    @Param('id') id: string,
    @Body() body: { points: number; reason: string },
    @Request() req,
  ) {
    return this.customersService.adjustPoints(id, body.points, body.reason, req.user.id);
  }

  @Post(':id/update-fcm-token')
  @HttpCode(HttpStatus.OK)
  updateFcmToken(@Param('id') id: string, @Body('token') token: string) {
    return this.customersService.updateFcmToken(id, token);
  }
}
