import {
  IsString,
  IsArray,
  IsInt,
  IsEnum,
  IsOptional,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { OrderStatus, PaymentMethod } from '@prisma/client';

export class OrderItemDto {
  @ApiPropertyOptional({ description: 'ID sản phẩm (nếu là sản phẩm lẻ)' })
  @IsOptional()
  @IsString()
  readonly productId?: string;

  @ApiPropertyOptional({ description: 'ID combo (nếu là combo)' })
  @IsOptional()
  @IsString()
  readonly comboId?: string;

  @ApiProperty({ example: 2 })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  readonly quantity: number;
}

export class CreateOrderDto {
  @ApiProperty({ type: [OrderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  readonly items: OrderItemDto[];

  @ApiProperty({ example: '123 Nguyễn Huệ, Q1, TP.HCM' })
  @IsString()
  readonly shippingAddress: string;

  @ApiProperty({ example: '0901234567' })
  @IsString()
  readonly phone: string;

  @ApiPropertyOptional({ description: 'Ghi chú đơn hàng' })
  @IsOptional()
  @IsString()
  readonly note?: string;

  @ApiPropertyOptional({ enum: PaymentMethod, default: PaymentMethod.COD })
  @IsOptional()
  @IsEnum(PaymentMethod)
  readonly paymentMethod?: PaymentMethod;

  @ApiPropertyOptional({ description: 'Mã giảm giá (tuỳ chọn)' })
  @IsOptional()
  @IsString()
  readonly couponCode?: string;
}

export class UpdateOrderStatusDto {
  @ApiProperty({ enum: OrderStatus })
  @IsEnum(OrderStatus)
  readonly status: OrderStatus;
}

export class OrderQueryDto {
  @ApiPropertyOptional({ enum: OrderStatus })
  @IsOptional()
  @IsEnum(OrderStatus)
  readonly status?: OrderStatus;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  readonly page?: number = 1;

  @ApiPropertyOptional({ example: 10, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  readonly pageSize?: number = 10;
}
