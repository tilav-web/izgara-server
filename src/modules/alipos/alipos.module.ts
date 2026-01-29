import { HttpModule } from "@nestjs/axios";
import { Module } from "@nestjs/common";
import { AliPosBaseService } from "./services/base.service";
import { AliPosCategoryService } from "./services/alipos-category.service";
import { AliPosCategoryController } from "./controllers/alipos-category.controller";
import { CategoryModule } from "../category/category.module";
import { AliPosProductController } from "./controllers/alipos-product.controller";
import { AliPosProductService } from "./services/alipos-product.service";
import { ProductModule } from "../product/product.module";

@Module({
    imports: [
        HttpModule.register({
            baseURL: 'https://web.alipos.uz',
            timeout: 5000
        }),
        CategoryModule,
        ProductModule
    ],
    controllers: [AliPosProductController, AliPosCategoryController],
    providers: [AliPosBaseService, AliPosCategoryService, AliPosProductService],
    exports: [AliPosBaseService, AliPosCategoryService, AliPosProductService]
})
export class AliPosModule {

}