import { BadGatewayException, Injectable } from "@nestjs/common";
import { AliPosBaseService } from "./base.service";
import { HttpService } from "@nestjs/axios";
import { firstValueFrom } from "rxjs";
import { ALIPOST_API_ENDPOINTS } from "../utils/constants";

@Injectable()
export class AliPosCategoryService extends AliPosBaseService {
    constructor(httpService: HttpService) {
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

}