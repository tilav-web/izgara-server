import { BadGatewayException, Injectable } from "@nestjs/common";
import { AliPosBaseService } from "./base.service";
import { HttpService } from "@nestjs/axios";
import { ALIPOST_API_ENDPOINTS } from "../utils/constants";
import { ProductService } from "../../product/product.service";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { Product } from "../../product/product.entity";
import { Repository } from "typeorm";
import { firstValueFrom } from "rxjs";
import { MeasureEnum } from "../../product/enums/measure.enum";
import { CategoryService } from "../../category/category.service";

@Injectable()
export class AliPosService extends AliPosBaseService {
    constructor(
        httpService: HttpService,
        configService: ConfigService,
        private readonly productService: ProductService,
        private readonly categoryService: CategoryService,
    ) {


        super(httpService, configService)
    }

    async updateAllData() {
        if (!this.restaurantId) {
            throw new BadGatewayException('Restaran id si topilmadi!')
        }

        const response = await firstValueFrom(this.httpService.get(ALIPOST_API_ENDPOINTS.CATEGORY.findAll(this.restaurantId)))

        const categories = response.data.categories.map((category: { id: string; name: string; sortOrder: number }) => {
            return {
                id: category.id,
                name: category.name,
                sort_order: category.sortOrder
            }
        })

        const productsToSave = response.data.items.map((item) => {
            return {
                id: item.id,
                category_id: item.categoryId,
                name: item.name,
                description: item.description,
                price: item.price,
                vat: item.vat,
                measure: item.measure,
                measure_unit: item.measureUnit === 'мл' ? MeasureEnum.L
                    : item.measureUnit === 'г' ? MeasureEnum.KG
                        : MeasureEnum.PCS,
                sort_order: item.sortOrder,

                modifier_groups: (item.modifierGroups || []).map(group => ({
                    id: group.id,
                    name: group.name,
                    sort_order: group.sortOrder,
                    min_selected_amount: group.minSelectedAmount,
                    max_selected_amount: group.maxSelectedAmount,
                }))
            };
        });
        
        await this.categoryService.upsertMany(categories)
        await this.productService.saveMenu(productsToSave)
    }


}