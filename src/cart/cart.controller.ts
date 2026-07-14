import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CartService } from './cart.service';
import { ReplaceCartDto } from './dto/cart.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedRequest } from '../common/interfaces/request.interface';

@ApiTags('Giỏ hàng (Cart)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy giỏ hàng của tôi' })
  getCart(@Req() req: AuthenticatedRequest) {
    return this.cartService.getCart(req.user.userId);
  }

  @Put()
  @ApiOperation({ summary: 'Thay toàn bộ giỏ hàng' })
  replace(@Req() req: AuthenticatedRequest, @Body() dto: ReplaceCartDto) {
    return this.cartService.replaceCart(req.user.userId, dto.items);
  }

  @Post('merge')
  @ApiOperation({ summary: 'Gộp giỏ khách vào giỏ user (khi đăng nhập)' })
  merge(@Req() req: AuthenticatedRequest, @Body() dto: ReplaceCartDto) {
    return this.cartService.mergeCart(req.user.userId, dto.items);
  }

  @Delete()
  @ApiOperation({ summary: 'Xoá sạch giỏ hàng' })
  clear(@Req() req: AuthenticatedRequest) {
    return this.cartService.clearCart(req.user.userId);
  }
}
