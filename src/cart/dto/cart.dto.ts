import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CartItemDto {
  @ApiPropertyOptional({ description: 'ID sản phẩm (nếu là sản phẩm lẻ)' })
  @IsOptional()
  @IsString()
  readonly productId?: string;

  @ApiPropertyOptional({ description: 'ID combo (nếu là combo)' })
  @IsOptional()
  @IsString()
  readonly comboId?: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  readonly quantity: number;
}

/** Thay toàn bộ giỏ hàng bằng danh sách item gửi lên. */
export class ReplaceCartDto {
  @ApiProperty({ type: [CartItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CartItemDto)
  readonly items: CartItemDto[];
}
