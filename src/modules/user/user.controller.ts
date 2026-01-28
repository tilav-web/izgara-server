import { Controller, Get, Req, UseGuards } from "@nestjs/common";
import { UserService } from "./user.service";
import { AuthGuard } from "@nestjs/passport";
import { type Request } from "express";

@Controller('users')
export class UserController {
    constructor(
        private readonly userService: UserService
    ) { }

    @Get('/find-me')
    @UseGuards(AuthGuard('jwt'))
    async findMe(@Req() req: Request) {
        const auth = req.user as { id: number; }
        return this.userService.findByAuthId(auth?.id)
    }
}