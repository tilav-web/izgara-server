import { HttpModule } from "@nestjs/axios";
import { Module } from "@nestjs/common";
import { AliPosBaseService } from "./services/base.service";
import { AliPosCategoryService } from "./services/alipos-category.service";

@Module({
    imports: [
        HttpModule.register({
            baseURL: 'https://web.alipos.uz',
            timeout: 5000
        })
    ],
    providers: [AliPosBaseService, AliPosCategoryService],
    exports: [AliPosBaseService, AliPosCategoryService]
})
export class AliPosModule {

}