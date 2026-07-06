import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const WISHLIST_INCLUDE = {
  product: {
    select: {
      id: true,
      slug: true,
      name: true,
      brand: true,
      price: true,
      salePrice: true,
      images: true,
      rating: true,
      category: { select: { slug: true, name: true } },
    },
  },
} satisfies Prisma.WishlistInclude;

/**
 * Dịch vụ danh sách yêu thích
 */
@Injectable()
export class WishlistService {
  constructor(private readonly prisma: PrismaService) {}

  async findByUser(userId: string) {
    const items = await this.prisma.wishlist.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: WISHLIST_INCLUDE,
    });
    return items.map((w) => ({
      id: w.id,
      createdAt: w.createdAt,
      product: {
        ...w.product,
        categorySlug: w.product.category?.slug ?? null,
        categoryName: w.product.category?.name ?? null,
      },
    }));
  }

  /** Thêm vào wishlist (idempotent theo unique userId+productId). */
  async add(userId: string, productId: string) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, deletedAt: null },
    });
    if (!product) throw new NotFoundException('Không tìm thấy sản phẩm');

    return this.prisma.wishlist.upsert({
      where: { userId_productId: { userId, productId } },
      update: {},
      create: { userId, productId },
    });
  }

  async remove(userId: string, productId: string) {
    await this.prisma.wishlist.deleteMany({ where: { userId, productId } });
    return { success: true };
  }
}
