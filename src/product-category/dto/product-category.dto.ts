import { IsString, IsOptional, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

export class CreateProductCategoryDto {
  @ApiProperty({ example: 'Đồng hồ', description: 'Tên danh mục sản phẩm' })
  @IsString()
  @MinLength(2)
  readonly name: string;

  @ApiProperty({ example: 'watches', description: 'Slug danh mục (duy nhất)' })
  @IsString()
  readonly slug: string;

  @ApiPropertyOptional({ description: 'Mô tả danh mục' })
  @IsOptional()
  @IsString()
  readonly description?: string;

  @ApiPropertyOptional({ description: 'URL ảnh đại diện danh mục' })
  @IsOptional()
  @IsString()
  readonly image?: string;
}

export class UpdateProductCategoryDto extends PartialType(CreateProductCategoryDto) {}
