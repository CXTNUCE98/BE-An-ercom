import { Controller, Get, Param, Header } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam } from '@nestjs/swagger';
import { LocationService } from './location.service';

/**
 * Endpoint công khai tra cứu đơn vị hành chính (không cần đăng nhập).
 * Dữ liệu tĩnh nên cache mạnh ở CDN/browser.
 */
@ApiTags('Đơn vị hành chính (Locations)')
@Controller('locations')
export class LocationController {
  constructor(private readonly locationService: LocationService) {}

  @Get('provinces')
  @Header('Cache-Control', 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400')
  @ApiOperation({ summary: 'Danh sách tỉnh/thành phố' })
  getProvinces() {
    return this.locationService.getProvinces();
  }

  @Get('provinces/:code/wards')
  @Header('Cache-Control', 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400')
  @ApiOperation({ summary: 'Danh sách phường/xã theo mã tỉnh' })
  @ApiParam({ name: 'code', example: '01', description: 'Mã tỉnh/thành' })
  getWards(@Param('code') code: string) {
    return this.locationService.getWards(code);
  }
}
