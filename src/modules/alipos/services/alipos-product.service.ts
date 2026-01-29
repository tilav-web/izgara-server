import { BadGatewayException, Injectable } from "@nestjs/common";
import { AliPosBaseService } from "./base.service";
import { HttpService } from "@nestjs/axios";
import { firstValueFrom } from "rxjs";
import { ALIPOST_API_ENDPOINTS } from "../utils/constants";
import { ProductService } from "../../product/product.service";
import { MeasureEnum } from "../../product/enums/measure.enum";

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
        const products = res.data.items.map((item: {
            id: string;
            categoryId: string;
            name: string;
            description: string;
            price: number;
            vat: number;
            measure: number;
            measureUnit: "мл" | "г" | "шт",
            sortOrder: number
        }) => ({
            id: item.id,
            category_id: item.categoryId,
            name: item.name,
            description: item.description,
            price: item.price,
            vat: item.vat,
            measure: item.measure,
            measure_unit: item.measureUnit === 'мл' ? MeasureEnum.L
                : item.measureUnit === 'г' ? MeasureEnum.KG
                    : item.measureUnit === 'шт' ? MeasureEnum.PCS
                        : MeasureEnum.PCS,
            sort_order: item.sortOrder
        }));
        await this.productService.upsertMany(products)
    }

}