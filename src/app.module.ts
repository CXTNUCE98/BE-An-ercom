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
import { CouponModule } from './coupon/coupon.module';
import { ReviewModule } from './review/review.module';
import { WishlistModule } from './wishlist/wishlist.module';
import { AddressModule } from './address/address.module';
import { ComboModule } from './combo/combo.module';
import { LocationModule } from './location/location.module';
import { CartModule } from './cart/cart.module';
import { MailModule } from './mail/mail.module';

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
    CouponModule,
    ReviewModule,
    WishlistModule,
    AddressModule,
    ComboModule,
    LocationModule,
    CartModule,
    MailModule,
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
