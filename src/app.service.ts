import { Injectable } from '@nestjs/common';

/**
 * Dịch vụ gốc của ứng dụng An-ercom
 */
@Injectable()
export class AppService {
  getStatus(): string {
    return 'An-ercom API đang hoạt động';
  }
}
