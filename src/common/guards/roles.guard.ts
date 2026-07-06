import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import type { AuthenticatedRequest } from '../interfaces/request.interface';

/**
 * Guard kiểm tra quyền hạn của người dùng dựa trên vai trò
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  /**
   * Xác định xem người dùng có quyền truy cập vào endpoint hay không
   */
  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest<AuthenticatedRequest>();
    // Phòng trường hợp RolesGuard chạy mà chưa qua JwtAuthGuard → user undefined
    if (!user) {
      throw new ForbiddenException('Không xác định được người dùng');
    }
    return requiredRoles.includes(user.role);
  }
}
