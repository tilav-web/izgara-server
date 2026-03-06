import {
  BadRequestException,
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
import { Throttle } from '@nestjs/throttler';

@Controller('alipos')
export class AliPosController {
  constructor(private readonly aliPosService: AliPosService) {}

  @Get()
  @UseGuards(AuthGuard('jwt'), AuthRoleGuard, AuthStatusGuard)
  @ApiBearerAuth('access_token')
  @Roles(AuthRoleEnum.SUPERADMIN)
  @Throttle({ default: { ttl: 60000, limit: 1 } })
  async findAllAliposData() {
    return this.aliPosService.updateAllData();
  }

  @Post('/webhook/stoplist/:id')
  async webHookProduct(
    @Param('id') id: string,
    @Query() query: Record<string, string>, // restaurantId/RestaurantId, count/Count
    @Headers('clientId') clientId: string, // Xavfsizlik uchun clientId
    @Headers('clientSecret') clientSecret: string,
  ) {
    if (!clientId || !clientSecret) {
      throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    }

    const restaurantId = query.restaurantId || query.RestaurantId;
    const countRaw = query.count || query.Count;
    const countNum = Number(countRaw);

    if (!restaurantId) {
      throw new BadRequestException(
        'restaurantId query param yuborilishi shart',
      );
    }

    if (!countRaw || Number.isNaN(countNum)) {
      throw new BadRequestException('count noto‘g‘ri yuborilgan');
    }

    return this.aliPosService.updateProductOrModifier({
      id,
      restaurantId,
      countNum,
      clientId,
      clientSecret,
    });
  }

  @Post('/webhook/order/status')
  async webHookOrderStatus(
    @Body()
    body: {
      eatsId: string;
      status: string;
      orderNumber?: string;
      restaurantId?: string;
    },
    @Headers('clientId') clientId: string,
    @Headers('clientSecret') clientSecret: string,
  ) {
    if (!clientId || !clientSecret) {
      throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    }

    if (!body?.eatsId || !body?.status) {
      throw new BadRequestException('eatsId va status yuborilishi shart');
    }

    return this.aliPosService.updateOrderStatus({
      ...body,
      clientId,
      clientSecret,
    });
  }
}
