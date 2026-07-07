import { IsString, IsOptional, IsBoolean, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

export class CreateAddressDto {
  @ApiProperty({ example: 'Nguyễn Văn A' })
  @IsString()
  readonly fullName: string;

  @ApiProperty({ example: '0901234567' })
  @IsString()
  @Matches(/^(0|\+84)\d{9,10}$/, { message: 'Số điện thoại không hợp lệ' })
  readonly phone: string;

  @ApiProperty({ example: '123 Nguyễn Huệ', description: 'Số nhà, tên đường' })
  @IsString()
  readonly line: string;

  @ApiProperty({ example: '79', description: 'Mã tỉnh/thành (GET /locations/provinces)' })
  @IsString()
  readonly provinceCode: string;

  @ApiProperty({ example: '26740', description: 'Mã phường/xã (GET /locations/provinces/:code/wards)' })
  @IsString()
  readonly wardCode: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  readonly isDefault?: boolean;
}

export class UpdateAddressDto extends PartialType(CreateAddressDto) {}
