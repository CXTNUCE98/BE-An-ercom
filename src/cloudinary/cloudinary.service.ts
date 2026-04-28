import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { Readable } from 'stream';

/**
 * Dịch vụ xử lý upload ảnh lên Cloudinary
 */
@Injectable()
export class CloudinaryService {
  constructor(private readonly configService: ConfigService) {
    cloudinary.config({
      cloud_name: this.configService.get<string>('CLOUDINARY_CLOUD_NAME'),
      api_key: this.configService.get<string>('CLOUDINARY_API_KEY'),
      api_secret: this.configService.get<string>('CLOUDINARY_API_SECRET'),
    });
  }

  /**
   * Upload một file ảnh lên Cloudinary
   */
  async uploadImage(
    file: Express.Multer.File,
    folder: string = 'an-ercom/products',
  ): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder, resource_type: 'image' },
        (error, result) => {
          if (error) return reject(error);
          resolve(result as UploadApiResponse);
        },
      );
      const readable = new Readable();
      readable.push(file.buffer);
      readable.push(null);
      readable.pipe(uploadStream);
    });
  }

  /**
   * Upload nhiều ảnh cùng lúc
   */
  async uploadImages(
    files: Express.Multer.File[],
    folder: string = 'an-ercom/products',
  ): Promise<string[]> {
    const results = await Promise.all(
      files.map((file) => this.uploadImage(file, folder)),
    );
    return results.map((result) => result.secure_url);
  }

  /**
   * Xóa ảnh khỏi Cloudinary theo public_id
   */
  async deleteImage(publicId: string): Promise<void> {
    await cloudinary.uploader.destroy(publicId);
  }

  /**
   * Lấy public_id từ URL Cloudinary
   */
  extractPublicId(url: string): string {
    const parts = url.split('/');
    const fileWithExt = parts[parts.length - 1];
    const file = fileWithExt.split('.')[0];
    const folder = parts.slice(parts.indexOf('upload') + 1, -1).join('/');
    return folder ? `${folder}/${file}` : file;
  }
}
