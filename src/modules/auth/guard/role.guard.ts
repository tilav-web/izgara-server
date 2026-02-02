import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { AuthRoleEnum } from '../enums/auth-role.enum';
import { Request } from 'express';

@Injectable()
export class AuthRoleGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext) {
    const requiredRoles = this.reflector.getAllAndOverride<AuthRoleEnum[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || !requiredRoles.length) {
      return true;
    }

    const req = context.switchToHttp().getRequest<Request>();
    const auth = req.user as { id: number; role: AuthRoleEnum };

    if (!auth?.id || !auth.role) {
      throw new UnauthorizedException('Tizimga kirish kerak');
    }

    const hasRole = requiredRoles.includes(auth.role);

    if (!hasRole) {
      throw new UnauthorizedException(
        `Bu amalni bajarish uchun ${requiredRoles.join(' yoki ')} roli kerak. Sizning rolingiz: ${auth.role}`,
      );
    }
    return true;
  }
}
