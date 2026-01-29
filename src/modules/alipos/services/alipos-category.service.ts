import { BadGatewayException, Injectable } from "@nestjs/common";
import { AliPosBaseService } from "./base.service";
import { HttpService } from "@nestjs/axios";
import { firstValueFrom } from "rxjs";
import { ALIPOST_API_ENDPOINTS } from "../utils/constants";
import { CategoryService } from "../../category/category.service";

@Injectable()
export class AliPosCategoryService extends AliPosBaseService {
    constructor(httpService: HttpService, private readonly categoryService: CategoryService) {
        super(httpService)
    }

    async findAll() {
        try {
            if (!this.restaurantId) {
                throw new BadGatewayException('Restaran id si topilmadi!')
            }
            const response = await firstValueFrom(this.httpService.get(ALIPOST_API_ENDPOINTS.CATEGORY.findAll(this.restaurantId)))
            return response.data
        } catch (error) {
            console.error(error);
            throw error
        }
    }

    async writeToDb() {
        if (!this.restaurantId) {
            throw new BadGatewayException('Restaran id si topilmadi!')
        }
        const res = await firstValueFrom(this.httpService.get(ALIPOST_API_ENDPOINTS.CATEGORY.findAll(this.restaurantId)))
        const categories = res.data.categories.map((category: { id: string; name: string; sortOrder: number }) => {
            return {
                id: category.id,
                name: category.name,
                sort_order: category.sortOrder
            }
        })

        await this.categoryService.upsertMany(categories)
    }

}