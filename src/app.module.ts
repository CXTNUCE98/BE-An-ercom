import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { ProductCategoryModule } from './product-category/product-category.module';
import { ProductModule } from './product/product.module';
import { OrderModule } from './order/order.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { UploadModule } from './upload/upload.module';

/**
 * Module gốc của ứng dụng An-ercom
 */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // Rate limiting toàn cục: mặc định 100 request / 60 giây / IP
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 100,
      },
    ]),
    PrismaModule,
    AuthModule,
    UserModule,
    ProductCategoryModule,
    ProductModule,
    OrderModule,
    DashboardModule,
    UploadModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Áp ThrottlerGuard cho toàn bộ route
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
