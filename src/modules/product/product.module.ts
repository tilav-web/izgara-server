import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Product } from "./product.entity";
import { ProductController } from "./product.controller";
import { ProductService } from "./product.service";
import { CoinSettingsModule } from "../coinSettings/coin-settings.module";

@Module({
    imports: [TypeOrmModule.forFeature([Product]), CoinSettingsModule],
    controllers: [ProductController],
    providers: [ProductService],
    exports: [ProductService]
})
export class ProductModule { }