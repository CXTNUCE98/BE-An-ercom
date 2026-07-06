import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateComboDto, UpdateComboDto } from './dto/combo.dto';

const COMBO_INCLUDE = {
  items: {
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
        },
      },
    },
  },
} satisfies Prisma.ComboInclude;

type ComboWithItems = Prisma.ComboGetPayload<{ include: typeof COMBO_INCLUDE }>;

/**
 * Dịch vụ combo/bundle sản phẩm
 */
@Injectable()
export class ComboService {
  constructor(private readonly prisma: PrismaService) {}

  /** Bổ sung originalPrice + savings từ giá lẻ các sản phẩm. */
  private decorate(combo: ComboWithItems) {
    const originalPrice = combo.items.reduce((sum, it) => {
      const unit = it.product.salePrice ?? it.product.price;
      return sum + unit * it.quantity;
    }, 0);
    return {
      ...combo,
      originalPrice,
      savings: Math.max(0, originalPrice - combo.comboPrice),
    };
  }

  async create(dto: CreateComboDto) {
    const existing = await this.prisma.combo.findUnique({
      where: { slug: dto.slug },
    });
    if (existing) throw new ConflictException('Slug combo đã tồn tại');

    const { items, ...rest } = dto;
    const combo = await this.prisma.combo.create({
      data: {
        ...rest,
        items: {
          create: items.map((it) => ({
            productId: it.productId,
            quantity: it.quantity,
          })),
        },
      },
      include: COMBO_INCLUDE,
    });
    return this.decorate(combo);
  }

  async findAll(onlyActive = false) {
    const combos = await this.prisma.combo.findMany({
      where: onlyActive ? { isActive: true } : {},
      orderBy: { createdAt: 'desc' },
      include: COMBO_INCLUDE,
    });
    return combos.map((c) => this.decorate(c));
  }

  async findBySlug(slug: string) {
    const combo = await this.prisma.combo.findUnique({
      where: { slug },
      include: COMBO_INCLUDE,
    });
    if (!combo) throw new NotFoundException('Không tìm thấy combo');
    return this.decorate(combo);
  }

  async findOne(id: string) {
    const combo = await this.prisma.combo.findUnique({
      where: { id },
      include: COMBO_INCLUDE,
    });
    if (!combo) throw new NotFoundException('Không tìm thấy combo');
    return this.decorate(combo);
  }

  async update(id: string, dto: UpdateComboDto) {
    await this.findOne(id);
    const { items, ...rest } = dto;

    // Nếu có items mới → thay toàn bộ danh sách item.
    const combo = await this.prisma.$transaction(async (tx) => {
      if (items) {
        await tx.comboItem.deleteMany({ where: { comboId: id } });
      }
      return tx.combo.update({
        where: { id },
        data: {
          ...rest,
          ...(items && {
            items: {
              create: items.map((it) => ({
                productId: it.productId,
                quantity: it.quantity,
              })),
            },
          }),
        },
        include: COMBO_INCLUDE,
      });
    });
    return this.decorate(combo);
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.combo.delete({ where: { id } });
    return { success: true };
  }
}
