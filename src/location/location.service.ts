import { Injectable, NotFoundException } from '@nestjs/common';
import {
  PROVINCES,
  WARDS,
  type ProvinceRecord,
  type WardRecord,
} from './data/vn-units';

/**
 * Dịch vụ tra cứu đơn vị hành chính VN (2 cấp: Tỉnh → Phường/Xã).
 * Dữ liệu tĩnh, nạp sẵn vào bộ nhớ + index theo mã tỉnh để tra O(1).
 * Nguồn: thanglequoc/vietnamese-provinces-database (cập nhật NĐ 30/2026).
 */
@Injectable()
export class LocationService {
  /** Ward gom theo provinceCode để trả nhanh. */
  private readonly wardsByProvince = new Map<string, WardRecord[]>();
  /** Map code → tên, dùng để validate & tra tên khi lưu địa chỉ. */
  private readonly provinceByCode = new Map<string, ProvinceRecord>();
  private readonly wardByCode = new Map<string, WardRecord>();

  constructor() {
    for (const p of PROVINCES) this.provinceByCode.set(p.code, p);
    for (const w of WARDS) {
      this.wardByCode.set(w.code, w);
      const list = this.wardsByProvince.get(w.provinceCode) ?? [];
      list.push(w);
      this.wardsByProvince.set(w.provinceCode, list);
    }
  }

  /** Danh sách toàn bộ tỉnh/thành (đã sắp xếp theo tên). */
  getProvinces(): ProvinceRecord[] {
    return PROVINCES;
  }

  /** Danh sách phường/xã theo mã tỉnh. */
  getWards(provinceCode: string): WardRecord[] {
    if (!this.provinceByCode.has(provinceCode)) {
      throw new NotFoundException('Không tìm thấy tỉnh/thành');
    }
    return this.wardsByProvince.get(provinceCode) ?? [];
  }

  /** Tra tên tỉnh theo mã (null nếu không có). */
  provinceName(code?: string | null): string | null {
    return code ? (this.provinceByCode.get(code)?.name ?? null) : null;
  }

  /** Tra tên phường/xã theo mã (null nếu không có). */
  wardName(code?: string | null): string | null {
    return code ? (this.wardByCode.get(code)?.name ?? null) : null;
  }

  /** Kiểm tra ward có thuộc province không (dùng khi validate địa chỉ). */
  isWardInProvince(wardCode: string, provinceCode: string): boolean {
    return this.wardByCode.get(wardCode)?.provinceCode === provinceCode;
  }
}
