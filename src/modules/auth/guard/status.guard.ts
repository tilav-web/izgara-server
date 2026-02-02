// auth-status.guard.ts
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from '../auth.service';
import { AuthStatusEnum } from '../enums/status.enum';
import { Request } from 'express';

@Injectable()
export class AuthStatusGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const user = req.user as { id: number };
    if (!user || !user.id) {
      throw new UnauthorizedException('Autentifikatsiya talab qilinadi');
    }

    const auth = await this.authService.findById(user?.id);

    if (!auth) {
      throw new UnauthorizedException('Foydalanuvchi topilmadi');
    }

    switch (auth.status) {
      case AuthStatusEnum.ACTIVE:
        return true;
      case AuthStatusEnum.BLOCK:
        throw new ForbiddenException(
          "Sizning akkauntingiz bloklangan. Support bilan bog'laning.",
        );
      default:
        throw new ForbiddenException("Noma'lum akkount holati");
    }
  }
}
