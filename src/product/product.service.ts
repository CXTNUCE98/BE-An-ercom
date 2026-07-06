import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { Prisma, ProductStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateProductDto,
  UpdateProductDto,
  ProductQueryDto,
} from './dto/product.dto';

/**
 * Dịch vụ quản lý sản phẩm
 */
/**
 * Các field tối thiểu cần cho card sản phẩm trên lưới storefront.
 * Không trả description / specs / tags / highlights để giảm payload.
 */
const PRODUCT_CARD_SELECT = {
  id: true,
  slug: true,
  name: true,
  brand: true,
  price: true,
  salePrice: true,
  images: true,
  rating: true,
  reviewCount: true,
  stock: true,
  status: true,
  isNew: true,
  isBestSeller: true,
  isLuxury: true,
  createdAt: true,
  category: { select: { slug: true, name: true } },
} satisfies Prisma.ProductSelect;

type ProductWithCategory = {
  category?: { slug: string; name: string } | null;
} & Record<string, unknown>;

/**
 * Phẳng hoá quan hệ category thành categorySlug + categoryName để khớp
 * hợp đồng FE, đồng thời vẫn giữ nested `category` cho tương thích ngược.
 */
function flattenCategory<T extends ProductWithCategory>(product: T) {
  return {
    ...product,
    categorySlug: product.category?.slug ?? null,
    categoryName: product.category?.name ?? null,
  };
}

@Injectable()
export class ProductService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Tạo sản phẩm mới
   */
  async create(dto: CreateProductDto) {
    const existing = await this.prisma.product.findUnique({
      where: { slug: dto.slug },
    });
    if (existing) {
      throw new ConflictException('Slug sản phẩm đã tồn tại');
    }
    const created = await this.prisma.product.create({
      data: {
        ...dto,
        specs: (dto.specs ?? []) as unknown as Prisma.InputJsonValue,
        images: dto.images ?? [],
      },
      include: { category: true },
    });
    return flattenCategory(created);
  }

  /**
   * Lấy danh sách sản phẩm có phân trang và lọc
   */
  async findAll(query: ProductQueryDto) {
    const {
      search,
      categoryId,
      categorySlug,
      brand,
      priceMin,
      priceMax,
      tags,
      status,
      page = 1,
      pageSize = 12,
      sort,
    } = query;

    const priceFilter =
      priceMin !== undefined || priceMax !== undefined
        ? {
            price: {
              ...(priceMin !== undefined && { gte: priceMin }),
              ...(priceMax !== undefined && { lte: priceMax }),
            },
          }
        : {};

    const where: Prisma.ProductWhereInput = {
      deletedAt: null,
      ...(status && { status }),
      ...(brand && { brand: { contains: brand, mode: 'insensitive' } }),
      ...(categoryId && { categoryId }),
      ...(categorySlug && { category: { slug: categorySlug } }),
      ...(tags && tags.length > 0 && { tags: { hasSome: tags } }),
      ...priceFilter,
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { brand: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const orderBy = this.buildOrderBy(sort);
    const skip = (page - 1) * pageSize;

    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        orderBy,
        skip,
        take: pageSize,
        select: PRODUCT_CARD_SELECT,
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      items: items.map(flattenCategory),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * Lấy chi tiết sản phẩm theo id
   */
  async findOne(id: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, deletedAt: null },
      include: { category: true },
    });
    if (!product) {
      throw new NotFoundException('Không tìm thấy sản phẩm');
    }
    return flattenCategory(product);
  }

  /**
   * Lấy chi tiết sản phẩm theo slug
   */
  async findBySlug(slug: string) {
    const product = await this.prisma.product.findFirst({
      where: { slug, deletedAt: null },
      include: { category: true },
    });
    if (!product) {
      throw new NotFoundException('Không tìm thấy sản phẩm');
    }
    return flattenCategory(product);
  }

  /**
   * Cập nhật sản phẩm
   */
  async update(id: string, dto: UpdateProductDto) {
    await this.findOne(id);
    const { specs, ...rest } = dto;
    const updated = await this.prisma.product.update({
      where: { id },
      data: {
        ...rest,
        ...(specs !== undefined && { specs: specs as unknown as Prisma.InputJsonValue }),
      },
      include: { category: true },
    });
    return flattenCategory(updated);
  }

  /**
   * Xóa mềm sản phẩm (giữ dữ liệu để không vỡ FK OrderItem + URL SEO).
   */
  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.product.update({
      where: { id },
      data: { deletedAt: new Date(), status: 'INACTIVE' },
    });
  }

  /**
   * Lấy thống kê sản phẩm cho dashboard
   */
  async getStats() {
    const [total, active, outOfStock] = await Promise.all([
      this.prisma.product.count({ where: { deletedAt: null } }),
      this.prisma.product.count({ where: { deletedAt: null, status: ProductStatus.ACTIVE } }),
      this.prisma.product.count({ where: { deletedAt: null, status: ProductStatus.OUT_OF_STOCK } }),
    ]);
    return { total, active, outOfStock };
  }

  /**
   * Xây dựng điều kiện sắp xếp
   */
  private buildOrderBy(sort?: string): Prisma.ProductOrderByWithRelationInput {
    switch (sort) {
      case 'price-asc':
        return { price: 'asc' };
      case 'price-desc':
        return { price: 'desc' };
      case 'rating':
        return { rating: 'desc' };
      case 'best-seller':
        return { reviewCount: 'desc' };
      default:
        return { createdAt: 'desc' };
    }
  }
}
