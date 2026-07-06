import { IsString, IsEmail, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ForgotPasswordDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  readonly email: string;
}

export class ResetPasswordDto {
  @ApiProperty({ description: 'Token nhận từ email' })
  @IsString()
  readonly token: string;

  @ApiProperty({ example: 'matkhaumoi123', minLength: 6 })
  @IsString()
  @MinLength(6)
  readonly newPassword: string;
}
