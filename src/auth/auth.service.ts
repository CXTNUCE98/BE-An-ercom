import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

/**
 * Dịch vụ xử lý xác thực người dùng
 */
@Injectable()
export class AuthService {
  private readonly saltRounds: number = 10;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
  ) {}

  /**
   * Đăng ký người dùng mới
   */
  async register(dto: RegisterDto): Promise<{ message: string }> {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('Email đã tồn tại trong hệ thống');
    }

    const hashedPassword = await bcrypt.hash(dto.password, this.saltRounds);
    await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        fullName: dto.fullName,
      },
    });

    return { message: 'Đăng ký thành công' };
  }

  /**
   * Đăng nhập và trả về JWT token
   */
  async login(dto: LoginDto): Promise<{ accessToken: string }> {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) {
      throw new UnauthorizedException('Email hoặc mật khẩu không chính xác');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Email hoặc mật khẩu không chính xác');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Tài khoản đã bị vô hiệu hoá');
    }

    const payload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = await this.jwtService.signAsync(payload);
    return { accessToken };
  }

  /**
   * Lấy thông tin người dùng hiện tại
   */
  async getMe(userId: string): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        address: true,
        avatar: true,
        role: true,
        isActive: true,
      },
    });

    if (!user) throw new NotFoundException('Không tìm thấy người dùng');
    return user;
  }

  /**
   * Yêu cầu đặt lại mật khẩu: tạo token có hạn 1h.
   * Luôn trả message chung để tránh lộ email tồn tại hay không.
   * TODO(email): gửi link `/reset-password?token=...` qua email.
   * Hiện chưa tích hợp SMTP → dev/non-production trả token trong response để test.
   */
  async forgotPassword(email: string): Promise<{ message: string; token?: string }> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    const genericMsg = {
      message: 'Nếu email tồn tại, hướng dẫn đặt lại mật khẩu đã được gửi.',
    };
    if (!user) return genericMsg;

    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1h
    await this.prisma.passwordResetToken.create({
      data: { email, token, expiresAt },
    });

    // Gửi link đặt lại mật khẩu qua email (Resend). Nuốt lỗi bên trong service.
    await this.mailService.sendPasswordReset(email, token);

    // Chỉ lộ token ngoài production để tiện test khi chưa cấu hình email thật.
    if (process.env.NODE_ENV !== 'production' && !process.env.RESEND_API_KEY) {
      return { ...genericMsg, token };
    }
    return genericMsg;
  }

  /**
   * Đặt lại mật khẩu bằng token.
   */
  async resetPassword(
    token: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    const record = await this.prisma.passwordResetToken.findUnique({
      where: { token },
    });
    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw new BadRequestException('Token không hợp lệ hoặc đã hết hạn');
    }

    const hashedPassword = await bcrypt.hash(newPassword, this.saltRounds);
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { email: record.email },
        data: { password: hashedPassword },
      }),
      this.prisma.passwordResetToken.update({
        where: { token },
        data: { usedAt: new Date() },
      }),
    ]);

    return { message: 'Đặt lại mật khẩu thành công' };
  }
}
