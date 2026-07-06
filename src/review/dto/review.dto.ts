import {
  IsString,
  IsOptional,
  IsInt,
  IsBoolean,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateReviewDto {
  @ApiProperty({ description: 'ID sản phẩm' })
  @IsString()
  readonly productId: string;

  @ApiProperty({ example: 5, minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  @Type(() => Number)
  readonly rating: number;

  @ApiPropertyOptional({ description: 'Nội dung đánh giá' })
  @IsOptional()
  @IsString()
  readonly comment?: string;
}

export class UpdateReviewDto {
  @ApiPropertyOptional({ example: 4, minimum: 1, maximum: 5 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  @Type(() => Number)
  readonly rating?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  readonly comment?: string;
}

export class ReviewQueryDto {
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

  @ApiPropertyOptional({ description: 'Lọc trạng thái duyệt (Admin)' })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  readonly approved?: boolean;
}
