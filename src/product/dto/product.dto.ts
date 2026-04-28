import {
  IsString,
  IsOptional,
  IsInt,
  IsBoolean,
  IsArray,
  Min,
  IsEnum,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ProductStatus } from '@prisma/client';

export class CreateProductDto {
  @ApiProperty({ example: 'Seiko 5 Xanh Lá' })
  @IsString()
  readonly name: string;

  @ApiProperty({ example: 'seiko-5-xanh-la' })
  @IsString()
  readonly slug: string;

  @ApiProperty({ example: 'Seiko' })
  @IsString()
  readonly brand: string;

  @ApiProperty({ example: 300000 })
  @IsInt()
  @Min(0)
  @Type(() => Number)
  readonly price: number;

  @ApiPropertyOptional({ example: 155000 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  readonly salePrice?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  readonly description?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  readonly tags?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  readonly highlights?: string[];

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  readonly stock?: number;

  @ApiPropertyOptional({ enum: ProductStatus })
  @IsOptional()
  @IsEnum(ProductStatus)
  readonly status?: ProductStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  readonly isNew?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  readonly isBestSeller?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  readonly isLuxury?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  readonly videoUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  readonly videoPoster?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  readonly categoryId?: string;
}

export class UpdateProductDto extends PartialType(CreateProductDto) {}

export class ProductQueryDto {
  @ApiPropertyOptional({ description: 'Tìm kiếm theo tên/brand' })
  @IsOptional()
  @IsString()
  readonly search?: string;

  @ApiPropertyOptional({ description: 'Lọc theo categoryId' })
  @IsOptional()
  @IsString()
  readonly categoryId?: string;

  @ApiPropertyOptional({ description: 'Lọc theo slug danh mục' })
  @IsOptional()
  @IsString()
  readonly categorySlug?: string;

  @ApiPropertyOptional({ description: 'Lọc theo brand' })
  @IsOptional()
  @IsString()
  readonly brand?: string;

  @ApiPropertyOptional({ enum: ProductStatus })
  @IsOptional()
  @IsEnum(ProductStatus)
  readonly status?: ProductStatus;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  readonly page?: number = 1;

  @ApiPropertyOptional({ example: 12 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  readonly pageSize?: number = 12;

  @ApiPropertyOptional({ example: 'newest', enum: ['newest', 'price-asc', 'price-desc', 'rating', 'best-seller'] })
  @IsOptional()
  @IsString()
  readonly sort?: string;
}
