import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CoinSettings } from "./coin-settings.entity";
import { CoinSettingsController } from "./coin-settings.controller";
import { CoinSettingsService } from "./coin-settings.service";
import { AuthModule } from "../auth/auth.module";

@Module({
    imports: [TypeOrmModule.forFeature([CoinSettings]), AuthModule],
    controllers: [CoinSettingsController],
    providers: [CoinSettingsService],
    exports: [CoinSettingsService]
})
export class CoinSettingsModule { }