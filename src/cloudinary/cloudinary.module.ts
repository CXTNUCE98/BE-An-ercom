import { Module } from '@nestjs/common';
import { CloudinaryService } from './cloudinary.service';

/**
 * Module quản lý upload ảnh Cloudinary
 */
@Module({
  providers: [CloudinaryService],
  exports: [CloudinaryService],
})
export class CloudinaryModule {}
