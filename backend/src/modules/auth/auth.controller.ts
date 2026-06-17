import { Controller, Post, Body, HttpCode, HttpStatus, Get, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { Public } from '../../common/decorators/public.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('staff/login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Staff / Admin login' })
  staffLogin(@Body() body: { email: string; password: string }) {
    return this.authService.staffLogin(body.email, body.password);
  }

  @Public()
  @Post('customer/login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Customer login' })
  customerLogin(@Body() body: { identifier: string; password: string }) {
    return this.authService.customerLogin(body.identifier, body.password);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  refresh(@Body('refreshToken') token: string) {
    return this.authService.refreshToken(token);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current authenticated user' })
  getMe(@Request() req) {
    return req.user;
  }

  @Public()
  @Post('setup')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create initial super admin (one-time setup)' })
  setup(
    @Body() body: { firstName: string; lastName: string; email: string; password: string; setupKey: string },
  ) {
    return this.authService.createSuperAdmin(body.email, body.password, body.firstName, body.lastName, body.setupKey);
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change password' })
  changePassword(
    @Request() req,
    @Body() body: { currentPassword: string; newPassword: string },
  ) {
    return this.authService.changePassword(req.user.id, body.currentPassword, body.newPassword);
  }
}
