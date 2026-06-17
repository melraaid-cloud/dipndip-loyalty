import { IsOptional, IsString, IsInt, Min, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CustomerTier, CustomerStatus, CustomerSegment } from '../../../database/entities/customer.entity';

export class ListCustomersDto {
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number = 1;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) limit?: number = 20;
  @ApiPropertyOptional() @IsOptional() @IsString() search?: string;
  @ApiPropertyOptional({ enum: CustomerTier }) @IsOptional() @IsEnum(CustomerTier) tier?: CustomerTier;
  @ApiPropertyOptional({ enum: CustomerStatus }) @IsOptional() @IsEnum(CustomerStatus) status?: CustomerStatus;
  @ApiPropertyOptional({ enum: CustomerSegment }) @IsOptional() @IsEnum(CustomerSegment) segment?: CustomerSegment;
  @ApiPropertyOptional() @IsOptional() @IsString() sortBy?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() sortOrder?: 'ASC' | 'DESC';
}
