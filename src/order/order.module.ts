import { Module } from '@nestjs/common';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { CouponModule } from '../coupon/coupon.module';

/**
 * Module quản lý đơn hàng
 */
@Module({
  imports: [CouponModule],
  controllers: [OrderController],
  providers: [OrderService],
  exports: [OrderService],
})
export class OrderModule {}
