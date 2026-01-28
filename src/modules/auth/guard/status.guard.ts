// auth-status.guard.ts
import {
    CanActivate,
    ExecutionContext,
    Injectable,
    ForbiddenException,
    UnauthorizedException
} from "@nestjs/common";
import { AuthService } from "../auth.service";
import { AuthStatusEnum } from "../enums/status.enum";

@Injectable()
export class AuthStatusGuard implements CanActivate {
    constructor(
        private readonly authService: AuthService
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const req = context.switchToHttp().getRequest();

        if (!req.user || !req.user.id) {
            throw new UnauthorizedException(
                'Autentifikatsiya talab qilinadi'
            );
        }

        const auth = await this.authService.findById(req.user.id);

        if (!auth) {
            throw new UnauthorizedException(
                'Foydalanuvchi topilmadi'
            );
        }

        switch (auth.status) {
            case AuthStatusEnum.ACTIVE:
                return true;
            case AuthStatusEnum.BLOCK:
                throw new ForbiddenException(
                    'Sizning akkauntingiz bloklangan. Support bilan bog\'laning.'
                );
            default:
                throw new ForbiddenException(
                    'Noma\'lum akkount holati'
                );
        }
    }
}