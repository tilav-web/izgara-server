import {
  Body,
  Controller,
  Get,
  Headers,
  HttpException,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AliPosService } from '../services/alipos.service';
import { AuthGuard } from '@nestjs/passport';
import { AuthRoleGuard } from '../../auth/guard/role.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { AuthRoleEnum } from '../../auth/enums/auth-role.enum';
import { ApiBearerAuth } from '@nestjs/swagger';
import { AuthStatusGuard } from '../../auth/guard/status.guard';

@Controller('alipos')
export class AliPosController {
  constructor(private readonly aliPosService: AliPosService) {}

  @Get()
  @UseGuards(AuthGuard('jwt'), AuthRoleGuard, AuthStatusGuard)
  @ApiBearerAuth('access_token')
  @Roles(AuthRoleEnum.SUPERADMIN)
  async findAllAliposData() {
    return this.aliPosService.updateAllData();
  }

  @Post('/webhook/stoplist/:id')
  async webHookProduct(
    @Param('id') id: string,
    @Query('restaurantId') restaurantId: string, // Restoran ID-si
    @Query('count') count: string, // Mahsulot miqdori
    @Headers('clientId') clientId: string, // Xavfsizlik uchun clientId
    @Headers('clientSecret') clientSecret: string,
  ) {
    if (!clientId || !clientSecret) {
      throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    }

    const countNum = parseInt(count);

    return this.aliPosService.updateProductOrModifier({
      id,
      countNum,
      clientId,
      clientSecret,
    });
  }

  @Post('/webhook/order/status')
  async webHookOrderStatus(
    @Body()
    body: {
      externalId: string;
      status: string;
      orderNumber?: string;
      cancelReason?: string;
    },
  ) {
    return this.aliPosService.updateOrderStatus(body);
  }
}
