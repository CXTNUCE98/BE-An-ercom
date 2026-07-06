import {
  IsString,
  IsOptional,
  IsInt,
  IsBoolean,
  IsArray,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class ComboItemDto {
  @ApiProperty({ description: 'ID sản phẩm' })
  @IsString()
  readonly productId: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  readonly quantity: number;
}

export class CreateComboDto {
  @ApiProperty({ example: 'Combo Quý Ông' })
  @IsString()
  readonly name: string;

  @ApiProperty({ example: 'combo-quy-ong' })
  @IsString()
  readonly slug: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  readonly description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  readonly image?: string;

  @ApiProperty({ example: 1500000, description: 'Giá combo (VND)' })
  @IsInt()
  @Min(0)
  @Type(() => Number)
  readonly comboPrice: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  readonly isActive?: boolean;

  @ApiProperty({ type: [ComboItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ComboItemDto)
  readonly items: ComboItemDto[];
}

export class UpdateComboDto extends PartialType(CreateComboDto) {}
