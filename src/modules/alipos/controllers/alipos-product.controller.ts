import { Controller, Get, Headers, HttpException, HttpStatus, Param, Post, Query } from "@nestjs/common";
import { AliPosProductService } from "../services/alipos-product.service";
import { ConfigService } from "@nestjs/config";

@Controller('alipos/product')
export class AliPosProductController {
    constructor(
        private readonly aliposProductService: AliPosProductService,
    ) { }

    @Post('/webhook/stoplist/:id')
    async webHookProduct(@Param('id') id: string,
        @Query('restaurantId') restaurantId: string, // Restoran ID-si 
        @Query('count') count: string, // Mahsulot miqdori 
        @Headers('clientId') clientId: string, // Xavfsizlik uchun clientId 
        @Headers('clientSecret') clientSecret: string
    ) {
        if (!clientId || !clientSecret) {
            throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
        }

        const countNum = parseInt(count);

        return this.aliposProductService.update({
            id,
            restaurantId,
            countNum,
            clientId,
            clientSecret
        })

    }
}