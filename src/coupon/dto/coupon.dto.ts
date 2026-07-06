import {
  IsString,
  IsOptional,
  IsInt,
  IsBoolean,
  IsEnum,
  Min,
  IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { CouponType } from '@prisma/client';

export class CreateCouponDto {
  @ApiProperty({ example: 'IRONMAN10' })
  @IsString()
  readonly code: string;

  @ApiProperty({ enum: CouponType, default: CouponType.PERCENT })
  @IsEnum(CouponType)
  readonly type: CouponType;

  @ApiProperty({ example: 10, description: 'PERCENT: %, FIXED: số tiền VND' })
  @IsInt()
  @Min(0)
  @Type(() => Number)
  readonly value: number;

  @ApiPropertyOptional({ example: 500000, description: 'Giá trị đơn tối thiểu' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  readonly minOrder?: number;

  @ApiPropertyOptional({ example: 100000, description: 'Giảm tối đa (cho PERCENT)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  readonly maxDiscount?: number;

  @ApiPropertyOptional({ example: 100, description: 'Số lần dùng tối đa' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  readonly usageLimit?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  readonly startsAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  readonly expiresAt?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  readonly isActive?: boolean;
}

export class UpdateCouponDto extends PartialType(CreateCouponDto) {}

export class ApplyCouponDto {
  @ApiProperty({ example: 'IRONMAN10' })
  @IsString()
  readonly code: string;

  @ApiProperty({ example: 1200000, description: 'Tạm tính giỏ hàng (VND)' })
  @IsInt()
  @Min(0)
  @Type(() => Number)
  readonly subtotal: number;
}
