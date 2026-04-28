import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateOrderDto,
  UpdateOrderStatusDto,
  OrderQueryDto,
} from './dto/order.dto';

const ORDER_INCLUDE = {
  items: {
    include: {
      product: {
        select: {
          id: true,
          name: true,
          slug: true,
          images: true,
          brand: true,
        },
      },
    },
  },
  user: {
    select: { id: true, fullName: true, email: true, phone: true },
  },
} satisfies Prisma.OrderInclude;

/**
 * Dịch vụ quản lý đơn hàng
 */
@Injectable()
export class OrderService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Tạo đơn hàng mới
   */
  async create(userId: string, dto: CreateOrderDto) {
    const productIds = dto.items.map((item) => item.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
    });

    if (products.length !== productIds.length) {
      throw new NotFoundException('Một hoặc nhiều sản phẩm không tồn tại');
    }

    const productMap = new Map(products.map((p) => [p.id, p]));

    for (const item of dto.items) {
      const product = productMap.get(item.productId)!;
      if (product.stock < item.quantity) {
        throw new BadRequestException(
          `Sản phẩm "${product.name}" không đủ số lượng trong kho`,
        );
      }
    }

    const totalPrice = dto.items.reduce((sum, item) => {
      const product = productMap.get(item.productId)!;
      const price = product.salePrice ?? product.price;
      return sum + price * item.quantity;
    }, 0);

    const order = await this.prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          userId,
          totalPrice,
          shippingAddress: dto.shippingAddress,
          phone: dto.phone,
          note: dto.note,
          paymentMethod: dto.paymentMethod,
          items: {
            create: dto.items.map((item) => {
              const product = productMap.get(item.productId)!;
              return {
                productId: item.productId,
                quantity: item.quantity,
                price: product.salePrice ?? product.price,
              };
            }),
          },
        },
        include: ORDER_INCLUDE,
      });

      for (const item of dto.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        });
      }

      return newOrder;
    });

    return order;
  }

  /**
   * Lấy danh sách đơn hàng của người dùng
   */
  async findByUser(userId: string, query: OrderQueryDto) {
    const { status, page = 1, pageSize = 10 } = query;
    const where: Prisma.OrderWhereInput = {
      userId,
      ...(status && { status }),
    };
    const skip = (page - 1) * pageSize;

    const [items, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: ORDER_INCLUDE,
      }),
      this.prisma.order.count({ where }),
    ]);

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  /**
   * Lấy tất cả đơn hàng (Admin)
   */
  async findAll(query: OrderQueryDto) {
    const { status, page = 1, pageSize = 10 } = query;
    const where: Prisma.OrderWhereInput = {
      ...(status && { status }),
    };
    const skip = (page - 1) * pageSize;

    const [items, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: ORDER_INCLUDE,
      }),
      this.prisma.order.count({ where }),
    ]);

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  /**
   * Lấy chi tiết đơn hàng
   */
  async findOne(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: ORDER_INCLUDE,
    });
    if (!order) {
      throw new NotFoundException('Không tìm thấy đơn hàng');
    }
    return order;
  }

  /**
   * Cập nhật trạng thái đơn hàng (Admin)
   */
  async updateStatus(id: string, dto: UpdateOrderStatusDto) {
    await this.findOne(id);
    return this.prisma.order.update({
      where: { id },
      data: { status: dto.status },
      include: ORDER_INCLUDE,
    });
  }

  /**
   * Lấy thống kê đơn hàng cho dashboard
   */
  async getStats() {
    const [total, pending, confirmed, shipping, delivered, cancelled] =
      await Promise.all([
        this.prisma.order.count(),
        this.prisma.order.count({ where: { status: 'PENDING' } }),
        this.prisma.order.count({ where: { status: 'CONFIRMED' } }),
        this.prisma.order.count({ where: { status: 'SHIPPING' } }),
        this.prisma.order.count({ where: { status: 'DELIVERED' } }),
        this.prisma.order.count({ where: { status: 'CANCELLED' } }),
      ]);

    const revenueResult = await this.prisma.order.aggregate({
      _sum: { totalPrice: true },
      where: { status: 'DELIVERED' },
    });

    return {
      total,
      pending,
      confirmed,
      shipping,
      delivered,
      cancelled,
      totalRevenue: revenueResult._sum.totalPrice ?? 0,
    };
  }
}
