import {
  BadGatewayException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { AliPosBaseService } from './base.service';
import { HttpService } from '@nestjs/axios';
import { ALIPOST_API_ENDPOINTS } from '../utils/constants';
import { ProductService } from '../../product/product.service';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Product } from '../../product/product.entity';
import { Repository } from 'typeorm';
import { firstValueFrom } from 'rxjs';
import { MeasureEnum } from '../../product/enums/measure.enum';
import { CategoryService } from '../../category/category.service';
import { Category } from '../../category/category.entity';
import { Modifier } from '../../modifier/modifier.entity';

@Injectable()
export class AliPosService extends AliPosBaseService {
  constructor(
    httpService: HttpService,
    configService: ConfigService,
    private readonly productService: ProductService,
    private readonly categoryService: CategoryService,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Modifier)
    private readonly modifierRepository: Repository<Modifier>,
  ) {
    super(httpService, configService);
  }

  async updateAllData() {
    if (!this.restaurantId) {
      throw new BadGatewayException('Restaran id si topilmadi!');
    }

    const response = await firstValueFrom(
      this.httpService.get(
        ALIPOST_API_ENDPOINTS.CATEGORY.findAll(this.restaurantId),
      ),
    );

    const categories = response.data.categories.map(
      (category: { id: string; name: string; sortOrder: number }) => {
        return {
          id: category.id,
          name: category.name,
          sort_order: category.sortOrder,
        };
      },
    );

    const productsToSave = response.data.items.map((item) => {
      return {
        id: item.id,
        category_id: item.categoryId,
        name: item.name,
        description: item.description,
        price: item.price,
        vat: item.vat,
        measure: item.measure,
        measure_unit:
          item.measureUnit === 'мл'
            ? MeasureEnum.L
            : item.measureUnit === 'г'
              ? MeasureEnum.KG
              : MeasureEnum.PCS,
        sort_order: item.sortOrder,

        modifier_groups: (item.modifierGroups || []).map((group) => ({
          id: group.id,
          name: group.name,
          sort_order: group.sortOrder,
          min_selected_amount: group.minSelectedAmount,
          max_selected_amount: group.maxSelectedAmount,
        })),
      };
    });

    await this.categoryService.upsertMany(categories);
    await this.productService.saveMenu(productsToSave);
  }

  async updateProductOrModifier({
    id,
    restaurantId,
    countNum,
    clientId,
    clientSecret,
  }: {
    id: string;
    restaurantId: string;
    countNum: number;
    clientId: string;
    clientSecret: string;
  }) {
    const originalId = this.configService.get('ALIPOS_CLIENT_ID');
    const originalSecret = this.configService.get('ALIPOS_CLIENT_SECRET');

    if (clientId !== originalId || clientSecret !== originalSecret) {
      throw new UnauthorizedException('Xavfsizlik kalitlari xato!');
    }

    const isActive = countNum === -1 || countNum > 0;

    const modifier = await this.modifierRepository.findOne({ where: { id } });
    if (modifier) {
      modifier.is_active = isActive;
      await this.modifierRepository.save(modifier);
      return { status: 'success', type: 'modifier' };
    }

    const product = await this.productRepository.findOne({ where: { id } });
    if (product) {
      product.is_active = isActive;
      await this.productRepository.save(product);
      return { status: 'success', type: 'product' };
    }

    throw new NotFoundException('Mahsulot yoki modifikator topilmadi');
  }
}
