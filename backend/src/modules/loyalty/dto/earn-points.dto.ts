import { IsString, IsNumber, IsOptional, IsUUID, Min, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class EarnPointsDto {
  @ApiProperty() @IsUUID() customerId: string;
  @ApiProperty() @IsUUID() branchId: string;
  @ApiProperty() @IsNumber() @Min(0.001) spendAmount: number;
  @ApiPropertyOptional() @IsOptional() @IsUUID() staffId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() receiptNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() campaignId?: string;
  @ApiPropertyOptional() @IsOptional() @IsArray() items?: Array<{
    name: string; category: string; price: number; quantity: number;
  }>;
}
