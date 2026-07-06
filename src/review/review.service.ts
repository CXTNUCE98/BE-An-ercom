import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateReviewDto,
  UpdateReviewDto,
  ReviewQueryDto,
} from './dto/review.dto';

const REVIEW_INCLUDE = {
  user: { select: { id: true, fullName: true, avatar: true } },
} satisfies Prisma.ReviewInclude;

/**
 * Dịch vụ quản lý đánh giá sản phẩm
 */
@Injectable()
export class ReviewService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Tạo đánh giá — yêu cầu đã mua (có OrderItem) & chưa đánh giá sản phẩm này.
   */
  async create(userId: string, dto: CreateReviewDto) {
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
    });
    if (!product) throw new NotFoundException('Không tìm thấy sản phẩm');

    const purchased = await this.prisma.orderItem.findFirst({
      where: { productId: dto.productId, order: { userId } },
    });
    if (!purchased) {
      throw new ForbiddenException('Bạn cần mua sản phẩm trước khi đánh giá');
    }

    const existing = await this.prisma.review.findUnique({
      where: { userId_productId: { userId, productId: dto.productId } },
    });
    if (existing) {
      throw new ConflictException('Bạn đã đánh giá sản phẩm này');
    }

    const review = await this.prisma.review.create({
      data: {
        userId,
        productId: dto.productId,
        rating: dto.rating,
        comment: dto.comment,
        // Tự động duyệt; đổi thành false nếu muốn kiểm duyệt trước.
        isApproved: true,
      },
      include: REVIEW_INCLUDE,
    });

    await this.recomputeRating(dto.productId);
    return review;
  }

  /** Danh sách đánh giá của 1 sản phẩm (chỉ đã duyệt). */
  async findByProduct(productId: string, query: ReviewQueryDto) {
    const { page = 1, pageSize = 10 } = query;
    const where: Prisma.ReviewWhereInput = { productId, isApproved: true };
    const skip = (page - 1) * pageSize;

    const [items, total] = await Promise.all([
      this.prisma.review.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: REVIEW_INCLUDE,
      }),
      this.prisma.review.count({ where }),
    ]);
    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  /** Danh sách tất cả đánh giá (Admin) — kèm sản phẩm + lọc duyệt. */
  async findAll(query: ReviewQueryDto) {
    const { page = 1, pageSize = 10, approved } = query;
    const where: Prisma.ReviewWhereInput = {
      ...(approved !== undefined && { isApproved: approved }),
    };
    const skip = (page - 1) * pageSize;

    const [items, total] = await Promise.all([
      this.prisma.review.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, fullName: true, email: true } },
          product: { select: { id: true, name: true, slug: true, images: true } },
        },
      }),
      this.prisma.review.count({ where }),
    ]);
    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async update(id: string, userId: string, dto: UpdateReviewDto) {
    const review = await this.prisma.review.findUnique({ where: { id } });
    if (!review) throw new NotFoundException('Không tìm thấy đánh giá');
    if (review.userId !== userId) {
      throw new ForbiddenException('Bạn không có quyền sửa đánh giá này');
    }
    const updated = await this.prisma.review.update({
      where: { id },
      data: dto,
      include: REVIEW_INCLUDE,
    });
    await this.recomputeRating(review.productId);
    return updated;
  }

  /** Duyệt / bỏ duyệt (Admin). */
  async setApproval(id: string, isApproved: boolean) {
    const review = await this.prisma.review.findUnique({ where: { id } });
    if (!review) throw new NotFoundException('Không tìm thấy đánh giá');
    const updated = await this.prisma.review.update({
      where: { id },
      data: { isApproved },
    });
    await this.recomputeRating(review.productId);
    return updated;
  }

  /** Xoá — chủ đánh giá hoặc ADMIN. */
  async remove(id: string, requester: { userId: string; role: string }) {
    const review = await this.prisma.review.findUnique({ where: { id } });
    if (!review) throw new NotFoundException('Không tìm thấy đánh giá');
    if (requester.role !== 'ADMIN' && review.userId !== requester.userId) {
      throw new ForbiddenException('Bạn không có quyền xoá đánh giá này');
    }
    await this.prisma.review.delete({ where: { id } });
    await this.recomputeRating(review.productId);
    return { success: true };
  }

  /**
   * Tính lại rating trung bình + reviewCount (chỉ tính đã duyệt) cho sản phẩm.
   */
  private async recomputeRating(productId: string) {
    const agg = await this.prisma.review.aggregate({
      where: { productId, isApproved: true },
      _avg: { rating: true },
      _count: { id: true },
    });
    await this.prisma.product.update({
      where: { id: productId },
      data: {
        rating: agg._avg.rating ? Math.round(agg._avg.rating * 10) / 10 : 0,
        reviewCount: agg._count.id,
      },
    });
  }
}
