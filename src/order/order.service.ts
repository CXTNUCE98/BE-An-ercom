import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { Prisma, OrderStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CouponService } from '../coupon/coupon.service';
import { MailService } from '../mail/mail.service';
import type { OrderEmailData } from '../mail/mail.templates';
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
      combo: {
        select: {
          id: true,
          name: true,
          slug: true,
          image: true,
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
  constructor(
    private readonly prisma: PrismaService,
    private readonly couponService: CouponService,
    private readonly mailService: MailService,
  ) {}

  /**
   * Tạo đơn hàng mới. Mỗi dòng đơn là sản phẩm lẻ (productId) hoặc combo (comboId).
   * BE tự tính lại giá, giữ giá combo ưu đãi, và trừ kho từng sản phẩm con của combo.
   */
  async create(userId: string, dto: CreateOrderDto) {
    // Mỗi item phải là product HOẶC combo, không cả hai / không rỗng.
    for (const item of dto.items) {
      const hasProduct = !!item.productId;
      const hasCombo = !!item.comboId;
      if (hasProduct === hasCombo) {
        throw new BadRequestException(
          'Mỗi dòng đơn phải là một sản phẩm hoặc một combo',
        );
      }
    }

    const productIds = [
      ...new Set(dto.items.filter((i) => i.productId).map((i) => i.productId!)),
    ];
    const comboIds = [
      ...new Set(dto.items.filter((i) => i.comboId).map((i) => i.comboId!)),
    ];

    const [products, combos] = await Promise.all([
      this.prisma.product.findMany({ where: { id: { in: productIds } } }),
      this.prisma.combo.findMany({
        where: { id: { in: comboIds } },
        include: { items: true },
      }),
    ]);

    if (products.length !== productIds.length) {
      throw new NotFoundException('Một hoặc nhiều sản phẩm không tồn tại');
    }
    if (combos.length !== comboIds.length) {
      throw new NotFoundException('Một hoặc nhiều combo không tồn tại');
    }

    const productMap = new Map(products.map((p) => [p.id, p]));
    const comboMap = new Map(combos.map((c) => [c.id, c]));

    // Gộp tổng số lượng cần trừ kho theo từng sản phẩm (kể cả từ combo).
    const stockNeeded = new Map<string, number>();
    const addStock = (pid: string, qty: number) =>
      stockNeeded.set(pid, (stockNeeded.get(pid) ?? 0) + qty);

    let subtotal = 0;
    const itemsData: {
      productId: string | null;
      comboId: string | null;
      quantity: number;
      price: number;
    }[] = [];

    for (const item of dto.items) {
      if (item.productId) {
        const product = productMap.get(item.productId)!;
        const price = product.salePrice ?? product.price;
        subtotal += price * item.quantity;
        addStock(product.id, item.quantity);
        itemsData.push({
          productId: product.id,
          comboId: null,
          quantity: item.quantity,
          price,
        });
      } else {
        const combo = comboMap.get(item.comboId!)!;
        if (!combo.isActive) {
          throw new BadRequestException(`Combo "${combo.name}" không còn bán`);
        }
        subtotal += combo.comboPrice * item.quantity;
        // Trừ kho từng sản phẩm con theo số lượng combo.
        for (const ci of combo.items) {
          addStock(ci.productId, ci.quantity * item.quantity);
        }
        itemsData.push({
          productId: null,
          comboId: combo.id,
          quantity: item.quantity,
          price: combo.comboPrice,
        });
      }
    }

    // Kiểm tra tồn kho tổng hợp trước (thông báo lỗi rõ ràng).
    for (const [pid, qty] of stockNeeded) {
      const product = productMap.get(pid);
      const stock = product?.stock ?? (await this.getStock(pid));
      if (stock < qty) {
        throw new BadRequestException(
          `Sản phẩm "${product?.name ?? pid}" không đủ số lượng trong kho`,
        );
      }
    }

    // Áp mã giảm giá (nếu có) — BE tự tính lại, không tin client.
    let discount = 0;
    if (dto.couponCode) {
      const applied = await this.couponService.apply(dto.couponCode, subtotal);
      discount = applied.discount;
    }
    const totalPrice = Math.max(0, subtotal - discount);

    const order = await this.prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          userId,
          subtotal,
          discount,
          shippingFee: 0,
          totalPrice,
          couponCode: dto.couponCode ?? null,
          shippingAddress: dto.shippingAddress,
          phone: dto.phone,
          note: dto.note,
          paymentMethod: dto.paymentMethod,
          items: { create: itemsData },
        },
        include: ORDER_INCLUDE,
      });

      // Trừ kho có điều kiện để chống oversell khi tải cao.
      for (const [pid, qty] of stockNeeded) {
        const res = await tx.product.updateMany({
          where: { id: pid, stock: { gte: qty } },
          data: { stock: { decrement: qty } },
        });
        if (res.count === 0) {
          const product = productMap.get(pid);
          throw new BadRequestException(
            `Sản phẩm "${product?.name ?? pid}" không đủ số lượng trong kho`,
          );
        }
      }

      return newOrder;
    });

    // Tăng lượt dùng coupon sau khi đơn tạo thành công.
    if (dto.couponCode) {
      await this.couponService.incrementUsage(dto.couponCode);
    }

    // Gửi email xác nhận đơn (không chặn luồng nếu email lỗi).
    if (order.user?.email) {
      await this.mailService.sendOrderConfirmation(
        order.user.email,
        this.toEmailData(order),
      );
    }

    return order;
  }

  /** Dựng dữ liệu email từ đơn hàng (dùng chung cho confirmation/status/payment). */
  private toEmailData(
    order: Prisma.OrderGetPayload<{ include: typeof ORDER_INCLUDE }>,
  ): OrderEmailData {
    return {
      id: order.id,
      subtotal: order.subtotal,
      discount: order.discount,
      shippingFee: order.shippingFee,
      totalPrice: order.totalPrice,
      couponCode: order.couponCode,
      shippingAddress: order.shippingAddress,
      phone: order.phone,
      paymentMethod: order.paymentMethod,
      items: order.items.map((it) => ({
        name: it.product?.name ?? it.combo?.name ?? 'Sản phẩm',
        quantity: it.quantity,
        price: it.price,
      })),
    };
  }

  /** Lấy tồn kho hiện tại của một sản phẩm (dùng cho sản phẩm con của combo). */
  private async getStock(productId: string): Promise<number> {
    const p = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { stock: true },
    });
    if (!p) {
      throw new NotFoundException(`Sản phẩm ${productId} trong combo không tồn tại`);
    }
    return p.stock;
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
   * Lấy chi tiết đơn hàng.
   * Chủ đơn chỉ được xem đơn của chính mình; ADMIN xem được mọi đơn.
   */
  async findOne(
    id: string,
    requester?: { userId: string; role: string },
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: ORDER_INCLUDE,
    });
    if (!order) {
      throw new NotFoundException('Không tìm thấy đơn hàng');
    }
    if (
      requester &&
      requester.role !== 'ADMIN' &&
      order.userId !== requester.userId
    ) {
      throw new ForbiddenException('Bạn không có quyền xem đơn hàng này');
    }
    return order;
  }

  /**
   * Cập nhật trạng thái đơn hàng (Admin).
   * Ép luồng chuyển trạng thái hợp lệ và hoàn kho khi huỷ đơn.
   */
  async updateStatus(id: string, dto: UpdateOrderStatusDto) {
    const order = await this.findOne(id);
    return this.transitionStatus(order, dto.status);
  }

  /**
   * Các trạng thái được phép chuyển tiếp từ một trạng thái cho trước.
   * Huỷ chỉ khi đơn chưa giao (PENDING/CONFIRMED); đã giao/đã huỷ là trạng thái cuối.
   */
  private static readonly ALLOWED_TRANSITIONS: Record<
    OrderStatus,
    OrderStatus[]
  > = {
    PENDING: ['CONFIRMED', 'CANCELLED'],
    CONFIRMED: ['SHIPPING', 'CANCELLED'],
    SHIPPING: ['DELIVERED'],
    DELIVERED: [],
    CANCELLED: [],
  };

  /**
   * Thực hiện chuyển trạng thái đơn hàng sau khi kiểm tra tính hợp lệ.
   * Khi chuyển sang CANCELLED, hoàn lại tồn kho cho từng sản phẩm trong đơn
   * (chạy trong cùng transaction để tránh lệch kho).
   */
  private async transitionStatus(
    order: Prisma.OrderGetPayload<{ include: typeof ORDER_INCLUDE }>,
    next: OrderStatus,
  ) {
    if (order.status === next) {
      throw new BadRequestException('Đơn hàng đã ở trạng thái này');
    }
    const allowed = OrderService.ALLOWED_TRANSITIONS[order.status] ?? [];
    if (!allowed.includes(next)) {
      throw new BadRequestException(
        `Không thể chuyển đơn từ "${order.status}" sang "${next}"`,
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      if (next === 'CANCELLED') {
        // Gộp số lượng cần hoàn theo sản phẩm (item lẻ + sản phẩm con của combo).
        const restore = new Map<string, number>();
        const add = (pid: string, qty: number) =>
          restore.set(pid, (restore.get(pid) ?? 0) + qty);

        for (const item of order.items) {
          if (item.productId) {
            add(item.productId, item.quantity);
          } else if (item.comboId) {
            const comboItems = await tx.comboItem.findMany({
              where: { comboId: item.comboId },
            });
            for (const ci of comboItems) {
              add(ci.productId, ci.quantity * item.quantity);
            }
          }
        }

        for (const [pid, qty] of restore) {
          await tx.product.update({
            where: { id: pid },
            data: { stock: { increment: qty } },
          });
        }
      }
      return tx.order.update({
        where: { id: order.id },
        data: { status: next },
        include: ORDER_INCLUDE,
      });
    });

    // Gửi email báo trạng thái mới (ngoài transaction — email lỗi không rollback đơn).
    if (updated.user?.email) {
      await this.mailService.sendOrderStatus(
        updated.user.email,
        this.toEmailData(updated),
        next,
      );
    }

    return updated;
  }

  /**
   * Người dùng tự huỷ đơn của mình (chỉ khi đơn còn PENDING/CONFIRMED).
   * Hoàn kho như luồng huỷ của admin.
   */
  async cancelByUser(id: string, userId: string) {
    const order = await this.findOne(id, { userId, role: 'USER' });
    return this.transitionStatus(order, 'CANCELLED');
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
