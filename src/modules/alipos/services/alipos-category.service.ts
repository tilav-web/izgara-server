import { BadGatewayException, Injectable } from "@nestjs/common";
import { AliPosBaseService } from "./base.service";
import { HttpService } from "@nestjs/axios";
import { firstValueFrom } from "rxjs";
import { ALIPOST_API_ENDPOINTS } from "../utils/constants";
import { CategoryService } from "../../category/category.service";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class AliPosCategoryService extends AliPosBaseService {
    constructor(httpService: HttpService, configService: ConfigService, private readonly categoryService: CategoryService) {
        super(httpService, configService)
    }
}