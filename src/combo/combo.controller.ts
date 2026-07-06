import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Header,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ComboService } from './combo.service';
import { CreateComboDto, UpdateComboDto } from './dto/combo.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Combo')
@Controller('combos')
export class ComboController {
  constructor(private readonly comboService: ComboService) {}

  @Get()
  @Header('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300')
  @ApiOperation({ summary: 'Danh sách combo đang bán (công khai)' })
  findAllPublic() {
    return this.comboService.findAll(true);
  }

  @Get('all')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Danh sách tất cả combo (Admin)' })
  findAll() {
    return this.comboService.findAll(false);
  }

  @Get('slug/:slug')
  @Header('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300')
  @ApiOperation({ summary: 'Chi tiết combo theo slug' })
  findBySlug(@Param('slug') slug: string) {
    return this.comboService.findBySlug(slug);
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Tạo combo (Admin)' })
  create(@Body() dto: CreateComboDto) {
    return this.comboService.create(dto);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Cập nhật combo (Admin)' })
  update(@Param('id') id: string, @Body() dto: UpdateComboDto) {
    return this.comboService.update(id, dto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Xoá combo (Admin)' })
  remove(@Param('id') id: string) {
    return this.comboService.remove(id);
  }
}
