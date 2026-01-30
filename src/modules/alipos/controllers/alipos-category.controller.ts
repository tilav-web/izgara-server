import { Controller, Get } from "@nestjs/common";
import { AliPosCategoryService } from "../services/alipos-category.service";

@Controller('alipos/category')
export class AliPosCategoryController {
    constructor(
        private readonly aliposCategoryService: AliPosCategoryService
    ) { }
}