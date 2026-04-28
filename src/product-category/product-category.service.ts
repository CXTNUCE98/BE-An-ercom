import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateProductCategoryDto,
  UpdateProductCategoryDto,
} from './dto/product-category.dto';

/**
 * Dịch vụ quản lý danh mục sản phẩm
 */
@Injectable()
export class ProductCategoryService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Tạo danh mục sản phẩm mới
   */
  async create(dto: CreateProductCategoryDto) {
    const existing = await this.prisma.productCategory.findUnique({
      where: { slug: dto.slug },
    });
    if (existing) {
      throw new ConflictException('Slug danh mục đã tồn tại');
    }
    return this.prisma.productCategory.create({ data: dto });
  }

  /**
   * Lấy tất cả danh mục sản phẩm
   */
  async findAll() {
    return this.prisma.productCategory.findMany({
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Lấy chi tiết danh mục theo id
   */
  async findOne(id: string) {
    const category = await this.prisma.productCategory.findUnique({
      where: { id },
    });
    if (!category) {
      throw new NotFoundException('Không tìm thấy danh mục sản phẩm');
    }
    return category;
  }

  /**
   * Lấy danh mục theo slug
   */
  async findBySlug(slug: string) {
    const category = await this.prisma.productCategory.findUnique({
      where: { slug },
    });
    if (!category) {
      throw new NotFoundException('Không tìm thấy danh mục sản phẩm');
    }
    return category;
  }

  /**
   * Cập nhật danh mục sản phẩm
   */
  async update(id: string, dto: UpdateProductCategoryDto) {
    await this.findOne(id);
    return this.prisma.productCategory.update({ where: { id }, data: dto });
  }

  /**
   * Xóa danh mục sản phẩm
   */
  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.productCategory.delete({ where: { id } });
  }
}
