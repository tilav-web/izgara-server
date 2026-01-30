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

    async update({ id, restaurantId, countNum, clientId, clientSecret }: {
        id: string;
        restaurantId: string;
        countNum: number;
        clientId: string;
        clientSecret: string;
    }) {
        const originalId = this.configService.get('ALIPOS_CLIENT_ID');
        const originalSecret = this.configService.get('ALIPOS_CLIENT_SECRET');

        if (clientId !== originalId || clientSecret !== originalSecret || this.restaurantId !== restaurantId) {
            throw new UnauthorizedException('Xavfsizlik kalitlari xato! Bu soʻrov begona manbadan kelgan.');
        }

        const product = await this.repository.findOne({ where: { id } });
        if (product) {
            product.is_active = countNum !== 0;
            return await this.repository.save(product);
        }
    }
}