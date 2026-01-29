import { BadGatewayException, Injectable } from "@nestjs/common";
import { AliPosBaseService } from "./base.service";
import { HttpService } from "@nestjs/axios";
import { firstValueFrom } from "rxjs";
import { ALIPOST_API_ENDPOINTS } from "../utils/constants";
import { ProductService } from "../../product/product.service";

@Injectable()
export class AliPosProductService extends AliPosBaseService {
    constructor(httpService: HttpService, private readonly productService: ProductService) {
        super(httpService)
    }

    async writeToDb() {
        if (!this.restaurantId) {
            throw new BadGatewayException('Restaran id si topilmadi!')
        }

        const res = await firstValueFrom(this.httpService.get(ALIPOST_API_ENDPOINTS.PRODUCT.findAll(this.restaurantId)))
        return res.data.items
    }

}