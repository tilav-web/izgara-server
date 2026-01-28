import { Module } from "@nestjs/common";
import { CategoryController } from "./category.controller";
import { CategoryService } from "./cotegory.service";
import { AliPosModule } from "../alipos/alipos.module";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Category } from "./category.entity";

@Module({
    imports: [AliPosModule, TypeOrmModule.forFeature([Category])],
    controllers: [CategoryController],
    providers: [CategoryService],
    exports: [CategoryService]
})
export class CategoryModule { }