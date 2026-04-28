import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Dịch vụ cung cấp dữ liệu thống kê cho dashboard admin
 */
@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Lấy tổng quan thống kê hệ thống
   */
  async getOverview() {
    const [totalUsers, totalProducts, totalOrders, revenueResult] =
      await Promise.all([
        this.prisma.user.count({ where: { role: 'USER' } }),
        this.prisma.product.count(),
        this.prisma.order.count(),
        this.prisma.order.aggregate({
          _sum: { totalPrice: true },
          where: { status: 'DELIVERED' },
        }),
      ]);

    return {
      totalUsers,
      totalProducts,
      totalOrders,
      totalRevenue: revenueResult._sum.totalPrice ?? 0,
    };
  }

  /**
   * Lấy dữ liệu doanh thu theo tháng (12 tháng gần nhất)
   */
  async getMonthlySales() {
    const now = new Date();
    const months: { month: string; revenue: number; orders: number }[] = [];

    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const nextDate = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);

      const result = await this.prisma.order.aggregate({
        _sum: { totalPrice: true },
        _count: { id: true },
        where: {
          status: 'DELIVERED',
          createdAt: { gte: date, lt: nextDate },
        },
      });

      months.push({
        month: date.toLocaleDateString('vi-VN', { month: 'short', year: 'numeric' }),
        revenue: result._sum.totalPrice ?? 0,
        orders: result._count.id,
      });
    }

    return months;
  }

  /**
   * Lấy top sản phẩm bán chạy
   */
  async getTopProducts(limit: number = 5) {
    const topItems = await this.prisma.orderItem.groupBy({
      by: ['productId'],
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: limit,
    });

    const productIds = topItems.map((item) => item.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true, images: true, price: true, brand: true },
    });

    const productMap = new Map(products.map((p) => [p.id, p]));

    return topItems.map((item) => ({
      product: productMap.get(item.productId),
      totalSold: item._sum.quantity ?? 0,
    }));
  }

  /**
   * Lấy đơn hàng gần đây
   */
  async getRecentOrders(limit: number = 10) {
    return this.prisma.order.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, fullName: true, email: true } },
        items: { include: { product: { select: { name: true } } } },
      },
    });
  }
}
