import { HttpModule } from "@nestjs/axios";
import { Module } from "@nestjs/common";
import { AliPosBaseService } from "./services/base.service";
import { CategoryModule } from "../category/category.module";
import { ProductModule } from "../product/product.module";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Product } from "../product/product.entity";
import { AliPosController } from "./controllers/alipos.controller";
import { AliPosService } from "./services/alipos.service";
import { AuthModule } from "../auth/auth.module";
import { Modifier } from "../modifier/modifier.entity";

@Module({
    imports: [
        TypeOrmModule.forFeature([Product, Modifier]),
        HttpModule.register({
            baseURL: 'https://web.alipos.uz',
            timeout: 5000
        }),
        CategoryModule,
        ProductModule,
        AuthModule
    ],
    controllers: [AliPosController],
    providers: [AliPosBaseService, AliPosService],
    exports: [AliPosBaseService, AliPosService]
})
export class AliPosModule { }