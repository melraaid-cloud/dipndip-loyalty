import {
  Controller, Get, Post, Param, Body, Header, Res,
  UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { WalletService } from './wallet.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { StaffRole } from '../../database/entities/staff.entity';

@ApiTags('Wallet')
@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get('apple/:customerId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(StaffRole.SUPER_ADMIN, StaffRole.ADMIN, StaffRole.MANAGER)
  @ApiOperation({ summary: 'Generate Apple Wallet pass' })
  async generateApplePass(@Param('customerId') customerId: string, @Res() res: Response) {
    const passBuffer = await this.walletService.generateApplePass(customerId);
    res.set({
      'Content-Type': 'application/vnd.apple.pkpass',
      'Content-Disposition': `attachment; filename="dipndip-loyalty.pkpass"`,
    });
    res.send(passBuffer);
  }

  @Get('google/:customerId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(StaffRole.SUPER_ADMIN, StaffRole.ADMIN, StaffRole.MANAGER)
  @ApiOperation({ summary: 'Generate Google Wallet pass URL' })
  async generateGooglePass(@Param('customerId') customerId: string) {
    const url = await this.walletService.generateGooglePassUrl(customerId);
    return { url };
  }

  @Post('apple/v1/devices/:deviceLibraryIdentifier/registrations/:passTypeIdentifier/:serialNumber')
  @Public()
  @HttpCode(HttpStatus.CREATED)
  async registerDevice(
    @Param('deviceLibraryIdentifier') deviceLibraryIdentifier: string,
    @Param('passTypeIdentifier') passTypeIdentifier: string,
    @Param('serialNumber') serialNumber: string,
    @Body('pushToken') pushToken: string,
  ) {
    await this.walletService.registerAppleDevice(
      deviceLibraryIdentifier, pushToken, passTypeIdentifier, serialNumber,
    );
  }

  @Get('customer/:customerId/passes')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get all passes for a customer' })
  getCustomerPasses(@Param('customerId') customerId: string) {
    return this.walletService.getPassesForCustomer(customerId);
  }

  @Post('update/:customerId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(StaffRole.SUPER_ADMIN, StaffRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Force update wallet pass' })
  async forceUpdate(@Param('customerId') customerId: string) {
    await this.walletService.updatePass(customerId);
    return { success: true };
  }
}
