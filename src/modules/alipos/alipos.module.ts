import { HttpModule } from "@nestjs/axios";
import { Module } from "@nestjs/common";
import { AliPosBaseService } from "./services/base.service";
import { AliPosCategoryService } from "./services/alipos-category.service";
import { AliPosCategoryController } from "./controllers/alipos-category.controller";
import { CategoryModule } from "../category/category.module";
import { AliPosProductController } from "./controllers/alipos-product.controller";
import { AliPosProductService } from "./services/alipos-product.service";
import { ProductModule } from "../product/product.module";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Product } from "../product/product.entity";
import { AliPosController } from "./controllers/alipos.controller";
import { AliPosService } from "./services/alipos.service";
import { AuthModule } from "../auth/auth.module";

@Module({
    imports: [
        TypeOrmModule.forFeature([Product]),
        HttpModule.register({
            baseURL: 'https://web.alipos.uz',
            timeout: 5000
        }),
        CategoryModule,
        ProductModule,
        AuthModule
    ],
    controllers: [AliPosProductController, AliPosCategoryController, AliPosController],
    providers: [AliPosBaseService, AliPosCategoryService, AliPosProductService, AliPosService],
    exports: [AliPosBaseService, AliPosCategoryService, AliPosProductService, AliPosService]
})
export class AliPosModule { }