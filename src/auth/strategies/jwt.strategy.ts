import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

/**
 * Chiến lược xác thực sử dụng JSON Web Token
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly configService: ConfigService) {
    const secret = configService.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error(
        'JWT_SECRET chưa được cấu hình. Vui lòng đặt biến môi trường JWT_SECRET.',
      );
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  /**
   * Giải mã và xác thực payload của token
   */
  async validate(
    payload: any,
  ): Promise<{ userId: string; email: string; role: string }> {
    return { userId: payload.sub, email: payload.email, role: payload.role };
  }
}
