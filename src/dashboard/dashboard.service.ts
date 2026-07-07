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
   * Lấy dữ liệu doanh thu theo tháng (12 tháng gần nhất).
   * Gộp thành 1 query duy nhất (date_trunc) thay vì 12 query tuần tự
   * → giảm mạnh độ trễ, đặc biệt khi DB ở xa.
   */
  async getMonthlySales() {
    const now = new Date();
    // Mốc đầu: ngày 1 của tháng cách đây 11 tháng.
    const start = new Date(now.getFullYear(), now.getMonth() - 11, 1);

    const rows = await this.prisma.$queryRaw<
      { month: Date; revenue: bigint | number | null; orders: bigint | number }[]
    >`
      SELECT date_trunc('month', "createdAt") AS month,
             SUM("totalPrice")               AS revenue,
             COUNT(*)                         AS orders
      FROM "orders"
      WHERE "status" = 'DELIVERED'
        AND "createdAt" >= ${start}
      GROUP BY 1
    `;

    // Map kết quả theo key YYYY-M để tra cứu nhanh.
    const byKey = new Map<string, { revenue: number; orders: number }>();
    for (const r of rows) {
      const d = new Date(r.month);
      byKey.set(`${d.getFullYear()}-${d.getMonth()}`, {
        revenue: Number(r.revenue ?? 0),
        orders: Number(r.orders ?? 0),
      });
    }

    // Dựng đủ 12 tháng (kể cả tháng không có đơn = 0).
    const months: { month: string; revenue: number; orders: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const hit = byKey.get(`${date.getFullYear()}-${date.getMonth()}`);
      months.push({
        // Định dạng MM/YYYY, ví dụ tháng 8 năm 2025 -> "08/2025".
        month: `${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`,
        revenue: hit?.revenue ?? 0,
        orders: hit?.orders ?? 0,
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
