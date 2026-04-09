import {
  Body,
  Controller,
  Get,
  Headers,
  HttpException,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ConfigService } from '@nestjs/config';
import { IikoService } from '../services/iiko.service';
import { IikoWebhookEvent } from '../types/iiko.types';
import { AuthRoleGuard } from '../../auth/guard/role.guard';
import { AuthStatusGuard } from '../../auth/guard/status.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { AuthRoleEnum } from '../../auth/enums/auth-role.enum';

@Controller('iiko')
export class IikoController {
  constructor(
    private readonly iikoService: IikoService,
    private readonly configService: ConfigService,
  ) {}

  @Get()
  @UseGuards(AuthGuard('jwt'), AuthRoleGuard, AuthStatusGuard)
  @ApiBearerAuth('access_token')
  @Roles(AuthRoleEnum.SUPERADMIN)
  @Throttle({ default: { ttl: 60000, limit: 1 } })
  async syncMenu() {
    return this.iikoService.updateAllData();
  }

  @Post('/auth/login')
  @UseGuards(AuthGuard('jwt'), AuthRoleGuard, AuthStatusGuard)
  @ApiBearerAuth('access_token')
  @Roles(AuthRoleEnum.SUPERADMIN)
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  async login(@Body() body?: { force?: boolean }) {
    return this.iikoService.login(Boolean(body?.force));
  }

  @Post('/webhook')
  async webhook(
    @Body() body: IikoWebhookEvent[] | IikoWebhookEvent,
    @Headers('authorization') authorization?: string,
    @Headers('x-iiko-token') iikoToken?: string,
  ) {
    this.assertWebhookToken(authorization, iikoToken);
    return this.iikoService.handleWebhook(body);
  }

  @Post('/stop-list/sync')
  @UseGuards(AuthGuard('jwt'), AuthRoleGuard, AuthStatusGuard)
  @ApiBearerAuth('access_token')
  @Roles(AuthRoleEnum.SUPERADMIN)
  @Throttle({ default: { ttl: 60000, limit: 1 } })
  async syncStopList() {
    return this.iikoService.syncStopLists();
  }

  private assertWebhookToken(authorization?: string, iikoToken?: string) {
    const expectedToken = this.configService.get<string>('IIKO_WEBHOOK_TOKEN');
    if (!expectedToken) return;

    const token =
      authorization?.replace(/^Bearer\s+/i, '') ||
      iikoToken?.replace(/^Bearer\s+/i, '');

    if (token !== expectedToken) {
      throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    }
  }
}
