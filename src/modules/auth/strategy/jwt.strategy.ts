import { BadRequestException, Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { AuthService } from "../auth.service";
import { ConfigService } from "@nestjs/config";
import { AuthRoleEnum } from "../enums/auth-role.enum";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
    constructor(
        private readonly authService: AuthService,
        configService: ConfigService
    ) {
        const jwtSecret = configService.get('JWT_SECRET')

        if (!jwtSecret) {
            throw new BadRequestException('JWT SECRET not found check your .env')
        }

        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            secretOrKey: jwtSecret
        })
    }

    async validate(payload: { id: number }) {
        if (!payload.id) {
            throw new UnauthorizedException();
        }
        const auth = await this.authService.findById(payload.id)
        if (!auth) {
            throw new UnauthorizedException();
        }
        return auth as { id: number, role: AuthRoleEnum };
    }
}