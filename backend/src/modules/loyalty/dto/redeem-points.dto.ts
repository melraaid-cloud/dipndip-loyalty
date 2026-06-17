import { IsUUID, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RedeemPointsDto {
  @ApiProperty() @IsUUID() customerId: string;
  @ApiProperty() @IsUUID() rewardId: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() branchId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() staffId?: string;
}
