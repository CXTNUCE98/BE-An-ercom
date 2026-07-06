import { IsString, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

export class CreateAddressDto {
  @ApiProperty({ example: 'Nguyễn Văn A' })
  @IsString()
  readonly fullName: string;

  @ApiProperty({ example: '0901234567' })
  @IsString()
  readonly phone: string;

  @ApiProperty({ example: '123 Nguyễn Huệ' })
  @IsString()
  readonly line: string;

  @ApiPropertyOptional({ example: 'Phường Bến Nghé' })
  @IsOptional()
  @IsString()
  readonly ward?: string;

  @ApiPropertyOptional({ example: 'Quận 1' })
  @IsOptional()
  @IsString()
  readonly district?: string;

  @ApiProperty({ example: 'TP.HCM' })
  @IsString()
  readonly province: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  readonly isDefault?: boolean;
}

export class UpdateAddressDto extends PartialType(CreateAddressDto) {}
