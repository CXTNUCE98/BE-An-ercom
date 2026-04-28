import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

/**
 * Điều hướng các yêu cầu thống kê dashboard (chỉ Admin)
 */
@ApiTags('Dashboard (Admin)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Tổng quan thống kê hệ thống' })
  getOverview() {
    return this.dashboardService.getOverview();
  }

  @Get('monthly-sales')
  @ApiOperation({ summary: 'Doanh thu theo tháng (12 tháng gần nhất)' })
  getMonthlySales() {
    return this.dashboardService.getMonthlySales();
  }

  @Get('top-products')
  @ApiOperation({ summary: 'Top sản phẩm bán chạy' })
  getTopProducts() {
    return this.dashboardService.getTopProducts();
  }

  @Get('recent-orders')
  @ApiOperation({ summary: 'Đơn hàng gần đây' })
  getRecentOrders() {
    return this.dashboardService.getRecentOrders();
  }
}
