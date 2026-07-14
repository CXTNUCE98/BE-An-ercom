import { Injectable, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CartItemDto } from './dto/cart.dto';

const CART_INCLUDE = {
  items: {
    orderBy: { createdAt: 'asc' },
    include: {
      product: {
        select: {
          id: true,
          slug: true,
          name: true,
          brand: true,
          price: true,
          salePrice: true,
          images: true,
          stock: true,
        },
      },
      combo: {
        select: {
          id: true,
          slug: true,
          name: true,
          image: true,
          comboPrice: true,
          isActive: true,
        },
      },
    },
  },
} satisfies Prisma.CartInclude;

/**
 * Dịch vụ giỏ hàng đồng bộ theo user.
 * Giỏ khách vẫn ở localStorage phía FE; khi đăng nhập, FE đẩy giỏ lên đây.
 */
@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}

  /** Lấy (hoặc tạo rỗng) giỏ của user, kèm chi tiết sản phẩm/combo. */
  async getCart(userId: string) {
    const cart = await this.prisma.cart.upsert({
      where: { userId },
      update: {},
      create: { userId },
      include: CART_INCLUDE,
    });
    return this.shape(cart);
  }

  /** Thay toàn bộ giỏ bằng danh sách item gửi lên (nguồn: FE store). */
  async replaceCart(userId: string, items: CartItemDto[]) {
    const normalized = await this.validateRefs(this.normalize(items));

    const cart = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.cart.upsert({
        where: { userId },
        update: {},
        create: { userId },
        select: { id: true },
      });
      await tx.cartItem.deleteMany({ where: { cartId: existing.id } });
      if (normalized.length) {
        await tx.cartItem.createMany({
          data: normalized.map((i) => ({
            cartId: existing.id,
            productId: i.productId ?? null,
            comboId: i.comboId ?? null,
            quantity: i.quantity,
          })),
        });
      }
      return tx.cart.findUniqueOrThrow({
        where: { id: existing.id },
        include: CART_INCLUDE,
      });
    });
    return this.shape(cart);
  }

  /**
   * Gộp giỏ khách (guest) vào giỏ user rồi trả giỏ đã gộp.
   * Item trùng (cùng productId/comboId) cộng dồn số lượng.
   */
  async mergeCart(userId: string, items: CartItemDto[]) {
    const incoming = await this.validateRefs(this.normalize(items));

    const cart = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.cart.upsert({
        where: { userId },
        update: {},
        create: { userId },
        include: { items: true },
      });
      for (const item of incoming) {
        const match = existing.items.find(
          (it) =>
            (item.productId && it.productId === item.productId) ||
            (item.comboId && it.comboId === item.comboId),
        );
        if (match) {
          await tx.cartItem.update({
            where: { id: match.id },
            data: { quantity: match.quantity + item.quantity },
          });
        } else {
          await tx.cartItem.create({
            data: {
              cartId: existing.id,
              productId: item.productId ?? null,
              comboId: item.comboId ?? null,
              quantity: item.quantity,
            },
          });
        }
      }
      return tx.cart.findUniqueOrThrow({
        where: { id: existing.id },
        include: CART_INCLUDE,
      });
    });
    return this.shape(cart);
  }

  /** Xoá sạch giỏ của user. */
  async clearCart(userId: string) {
    const cart = await this.prisma.cart.findUnique({ where: { userId } });
    if (cart) {
      await this.prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    }
    return { success: true };
  }

  /** Chuẩn hoá: mỗi item đúng 1 loại, gộp trùng, bỏ số lượng <= 0. */
  private normalize(items: CartItemDto[]): CartItemDto[] {
    const merged = new Map<string, CartItemDto>();
    for (const item of items) {
      const hasProduct = !!item.productId;
      const hasCombo = !!item.comboId;
      if (hasProduct === hasCombo) {
        throw new BadRequestException(
          'Mỗi dòng giỏ phải là một sản phẩm hoặc một combo',
        );
      }
      if (item.quantity <= 0) continue;
      const key = item.productId ? `p:${item.productId}` : `c:${item.comboId}`;
      const prev = merged.get(key);
      if (prev) {
        merged.set(key, { ...prev, quantity: prev.quantity + item.quantity });
      } else {
        merged.set(key, { ...item });
      }
    }
    return [...merged.values()];
  }

  /** Kiểm tra product/combo tồn tại; bỏ qua tham chiếu chết để không kẹt giỏ. */
  private async validateRefs(items: CartItemDto[]) {
    const productIds = items.filter((i) => i.productId).map((i) => i.productId!);
    const comboIds = items.filter((i) => i.comboId).map((i) => i.comboId!);
    const [products, combos] = await Promise.all([
      this.prisma.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true },
      }),
      this.prisma.combo.findMany({
        where: { id: { in: comboIds } },
        select: { id: true },
      }),
    ]);
    const okProducts = new Set(products.map((p) => p.id));
    const okCombos = new Set(combos.map((c) => c.id));
    // Loại bỏ item trỏ tới sản phẩm/combo không còn tồn tại.
    return items.filter((i) =>
      i.productId ? okProducts.has(i.productId) : okCombos.has(i.comboId!),
    );
  }

  /** Rút gọn shape trả về FE. */
  private shape(cart: Prisma.CartGetPayload<{ include: typeof CART_INCLUDE }>) {
    return {
      id: cart.id,
      updatedAt: cart.updatedAt,
      items: cart.items.map((it) => ({
        id: it.id,
        quantity: it.quantity,
        productId: it.productId,
        comboId: it.comboId,
        product: it.product,
        combo: it.combo,
      })),
    };
  }
}
