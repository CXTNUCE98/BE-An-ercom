import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { WishlistService } from './wishlist.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedRequest } from '../common/interfaces/request.interface';

@ApiTags('Yêu thích (Wishlist)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('wishlist')
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách yêu thích của tôi' })
  findMine(@Req() req: AuthenticatedRequest) {
    return this.wishlistService.findByUser(req.user.userId);
  }

  @Post(':productId')
  @ApiOperation({ summary: 'Thêm sản phẩm vào yêu thích' })
  add(@Req() req: AuthenticatedRequest, @Param('productId') productId: string) {
    return this.wishlistService.add(req.user.userId, productId);
  }

  @Delete(':productId')
  @ApiOperation({ summary: 'Bỏ sản phẩm khỏi yêu thích' })
  remove(@Req() req: AuthenticatedRequest, @Param('productId') productId: string) {
    return this.wishlistService.remove(req.user.userId, productId);
  }
}
