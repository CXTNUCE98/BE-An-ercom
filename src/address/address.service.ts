import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LocationService } from '../location/location.service';
import { CreateAddressDto, UpdateAddressDto } from './dto/address.dto';

/**
 * Dịch vụ sổ địa chỉ giao hàng
 */
@Injectable()
export class AddressService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly location: LocationService,
  ) {}

  findByUser(userId: string) {
    return this.prisma.address.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  }

  /**
   * Resolve tên tỉnh/phường từ mã và kiểm tra phường thuộc tỉnh.
   * Trả về { provinceName, wardName } để lưu snapshot.
   */
  private resolveLocation(provinceCode: string, wardCode: string) {
    const provinceName = this.location.provinceName(provinceCode);
    if (!provinceName) throw new BadRequestException('Tỉnh/thành không hợp lệ');

    const wardName = this.location.wardName(wardCode);
    if (!wardName || !this.location.isWardInProvince(wardCode, provinceCode)) {
      throw new BadRequestException('Phường/xã không hợp lệ');
    }
    return { provinceName, wardName };
  }

  async create(userId: string, dto: CreateAddressDto) {
    const { provinceName, wardName } = this.resolveLocation(
      dto.provinceCode,
      dto.wardCode,
    );

    // Địa chỉ đầu tiên của user luôn là mặc định.
    const count = await this.prisma.address.count({ where: { userId } });
    const isDefault = dto.isDefault || count === 0;

    // Nếu đặt làm mặc định, bỏ mặc định các địa chỉ khác.
    if (isDefault) {
      await this.prisma.address.updateMany({
        where: { userId },
        data: { isDefault: false },
      });
    }

    return this.prisma.address.create({
      data: {
        userId,
        fullName: dto.fullName,
        phone: dto.phone,
        line: dto.line,
        provinceCode: dto.provinceCode,
        provinceName,
        wardCode: dto.wardCode,
        wardName,
        isDefault,
      },
    });
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
    const current = await this.ensureOwner(id, userId);

    // Xác định mã tỉnh/phường sau cập nhật để resolve lại tên khi có đổi.
    const nextProvinceCode = dto.provinceCode ?? current.provinceCode;
    const nextWardCode = dto.wardCode ?? current.wardCode;

    const data: Record<string, unknown> = {
      ...(dto.fullName !== undefined && { fullName: dto.fullName }),
      ...(dto.phone !== undefined && { phone: dto.phone }),
      ...(dto.line !== undefined && { line: dto.line }),
    };

    // Nếu client đổi tỉnh hoặc phường thì validate + cập nhật cả mã lẫn tên.
    if (dto.provinceCode !== undefined || dto.wardCode !== undefined) {
      const { provinceName, wardName } = this.resolveLocation(
        nextProvinceCode,
        nextWardCode,
      );
      data.provinceCode = nextProvinceCode;
      data.provinceName = provinceName;
      data.wardCode = nextWardCode;
      data.wardName = wardName;
    }

    if (dto.isDefault) {
      await this.prisma.address.updateMany({
        where: { userId },
        data: { isDefault: false },
      });
      data.isDefault = true;
    }

    return this.prisma.address.update({ where: { id }, data });
  }

  async remove(id: string, userId: string) {
    const addr = await this.ensureOwner(id, userId);
    await this.prisma.address.delete({ where: { id } });

    // Nếu xoá địa chỉ mặc định mà vẫn còn địa chỉ khác → chọn địa chỉ mới nhất làm mặc định.
    if (addr.isDefault) {
      const next = await this.prisma.address.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });
      if (next) {
        await this.prisma.address.update({
          where: { id: next.id },
          data: { isDefault: true },
        });
      }
    }
    return { success: true };
  }
}
