import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAddressDto, UpdateAddressDto } from './dto/address.dto';

/**
 * Dịch vụ sổ địa chỉ giao hàng
 */
@Injectable()
export class AddressService {
  constructor(private readonly prisma: PrismaService) {}

  findByUser(userId: string) {
    return this.prisma.address.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async create(userId: string, dto: CreateAddressDto) {
    // Nếu đặt làm mặc định, bỏ mặc định các địa chỉ khác.
    if (dto.isDefault) {
      await this.prisma.address.updateMany({
        where: { userId },
        data: { isDefault: false },
      });
    }
    return this.prisma.address.create({ data: { ...dto, userId } });
  }

  private async ensureOwner(id: string, userId: string) {
    const addr = await this.prisma.address.findUnique({ where: { id } });
    if (!addr) throw new NotFoundException('Không tìm thấy địa chỉ');
    if (addr.userId !== userId) {
      throw new ForbiddenException('Bạn không có quyền với địa chỉ này');
    }
    return addr;
  }

  async update(id: string, userId: string, dto: UpdateAddressDto) {
    await this.ensureOwner(id, userId);
    if (dto.isDefault) {
      await this.prisma.address.updateMany({
        where: { userId },
        data: { isDefault: false },
      });
    }
    return this.prisma.address.update({ where: { id }, data: dto });
  }

  async remove(id: string, userId: string) {
    await this.ensureOwner(id, userId);
    await this.prisma.address.delete({ where: { id } });
    return { success: true };
  }
}
