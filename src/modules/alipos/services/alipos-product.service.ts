import { BadGatewayException, Injectable, UnauthorizedException } from "@nestjs/common";
import { AliPosBaseService } from "./base.service";
import { HttpService } from "@nestjs/axios";
import { firstValueFrom } from "rxjs";
import { ALIPOST_API_ENDPOINTS } from "../utils/constants";
import { ProductService } from "../../product/product.service";
import { MeasureEnum } from "../../product/enums/measure.enum";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { Product } from "../../product/product.entity";
import { Repository } from "typeorm";

@Injectable()
export class AliPosProductService extends AliPosBaseService {
    constructor(httpService: HttpService, configService: ConfigService, private readonly productService: ProductService, @InjectRepository(Product) private readonly repository: Repository<Product>) {
        super(httpService, configService)
    }
}