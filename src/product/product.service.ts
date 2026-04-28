import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { Prisma, ProductStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import {
  CreateProductDto,
  UpdateProductDto,
  ProductQueryDto,
} from './dto/product.dto';

/**
 * Dịch vụ quản lý sản phẩm
 */
@Injectable()
export class ProductService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
  ) {}

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
    return this.prisma.product.create({
      data: { ...dto, specs: [] },
      include: { category: true },
    });
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
      status,
      page = 1,
      pageSize = 12,
      sort,
    } = query;

    const where: Prisma.ProductWhereInput = {
      ...(status && { status }),
      ...(brand && { brand: { contains: brand, mode: 'insensitive' } }),
      ...(categoryId && { categoryId }),
      ...(categorySlug && { category: { slug: categorySlug } }),
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
        include: { category: true },
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      items,
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
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { category: true },
    });
    if (!product) {
      throw new NotFoundException('Không tìm thấy sản phẩm');
    }
    return product;
  }

  /**
   * Lấy chi tiết sản phẩm theo slug
   */
  async findBySlug(slug: string) {
    const product = await this.prisma.product.findUnique({
      where: { slug },
      include: { category: true },
    });
    if (!product) {
      throw new NotFoundException('Không tìm thấy sản phẩm');
    }
    return product;
  }

  /**
   * Cập nhật sản phẩm
   */
  async update(id: string, dto: UpdateProductDto) {
    await this.findOne(id);
    return this.prisma.product.update({
      where: { id },
      data: dto,
      include: { category: true },
    });
  }

  /**
   * Xóa sản phẩm
   */
  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.product.delete({ where: { id } });
  }

  /**
   * Upload ảnh sản phẩm và thêm vào danh sách images
   */
  async uploadImages(id: string, files: Express.Multer.File[]) {
    const product = await this.findOne(id);
    const urls = await this.cloudinary.uploadImages(files);
    const updatedImages = [...(product.images as string[]), ...urls];
    return this.prisma.product.update({
      where: { id },
      data: { images: updatedImages },
      include: { category: true },
    });
  }

  /**
   * Xóa một ảnh khỏi sản phẩm
   */
  async removeImage(id: string, imageUrl: string) {
    const product = await this.findOne(id);
    const publicId = this.cloudinary.extractPublicId(imageUrl);
    await this.cloudinary.deleteImage(publicId);
    const updatedImages = (product.images as string[]).filter(
      (img) => img !== imageUrl,
    );
    return this.prisma.product.update({
      where: { id },
      data: { images: updatedImages },
      include: { category: true },
    });
  }

  /**
   * Lấy thống kê sản phẩm cho dashboard
   */
  async getStats() {
    const [total, active, outOfStock] = await Promise.all([
      this.prisma.product.count(),
      this.prisma.product.count({ where: { status: ProductStatus.ACTIVE } }),
      this.prisma.product.count({ where: { status: ProductStatus.OUT_OF_STOCK } }),
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
