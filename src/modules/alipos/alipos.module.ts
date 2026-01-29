import { HttpModule } from "@nestjs/axios";
import { Module } from "@nestjs/common";
import { AliPosBaseService } from "./services/base.service";
import { AliPosCategoryService } from "./services/alipos-category.service";
import { AliPosCategoryController } from "./controllers/alipos-category.controller";
import { CategoryModule } from "../category/category.module";

@Module({
    imports: [
        HttpModule.register({
            baseURL: 'https://web.alipos.uz',
            timeout: 5000
        }),
        CategoryModule
    ],
    controllers: [AliPosCategoryController],
    providers: [AliPosBaseService, AliPosCategoryService],
    exports: [AliPosBaseService, AliPosCategoryService]
})
export class AliPosModule {

}