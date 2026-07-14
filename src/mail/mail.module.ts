import { Global, Module } from '@nestjs/common';
import { MailService } from './mail.service';

/**
 * Module email dùng chung toàn ứng dụng (Global — không cần import lại ở nơi dùng).
 */
@Global()
@Module({
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
