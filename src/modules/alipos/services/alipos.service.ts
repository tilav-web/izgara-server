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
import { Modifier } from '../../modifier/modifier.entity';
import { type AxiosError } from 'axios';

interface AlipostApiResponse {
  categories: {
    id: string;
    name: string;
    sortOrder: number;
  }[];
  items: {
    id: string;
    categoryId: string;
    name: string;
    description?: string;
    price: number;
    vat: number;
    measure: number;
    measureUnit: 'шт' | 'г' | 'мл'; // Alipost API dagi qiymatlar
    sortOrder: number;
    modifierGroups?: {
      id: string;
      name: string;
      sortOrder: number;
      minSelectedAmount: number;
      maxSelectedAmount: number;
      modifiers?: {
        id: string;
        name: string;
        price: number;
        vat: number;
        sortOrder: number;
      }[];
    }[];
  }[];
}

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
    const data = response.data as AlipostApiResponse;

    // 1. Kategoriyalarni tayyorlash
    const categories = data.categories.map((category) => ({
      id: category.id,
      name: category.name,
      sort_order: category.sortOrder,
    }));

    // 2. Mahsulotlar va ularning ichki tuzilmasini tayyorlash
    const productsToSave = data.items.map((item) => {
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
        is_active: true, // Yangilangan menyu mahsulotlari sukut bo'yicha aktiv

        // Har bir guruhni map qilish
        modifier_groups: (item.modifierGroups || []).map((group) => ({
          id: group.id,
          name: group.name,
          sort_order: group.sortOrder,
          min_selected_amount: group.minSelectedAmount,
          max_selected_amount: group.maxSelectedAmount,
          modifiers: (group.modifiers || []).map((modifier) => ({
            id: modifier.id,
            name: modifier.name,
            price: modifier.price,
            vat: modifier.vat,
            sort_order: modifier.sortOrder,
            max_quantity: 1,
            is_active: true,
          })),
        })),
      };
    });

    try {
      // 3. Ma'lumotlarni bazaga yozish
      await this.categoryService.upsertMany(categories);
      await this.productService.saveMenu(productsToSave);
    } catch (error) {
      throw new Error((error as AxiosError).message);
    }
    return { message: 'Barcha malumotlar bazaga yozildi!' };
  }

  async updateProductOrModifier({
    id,
    countNum,
    clientId,
    clientSecret,
  }: {
    id: string;
    countNum: number;
    clientId: string;
    clientSecret: string;
  }) {
    const originalId = this.configService.get('ALIPOS_CLIENT_ID') as string;
    const originalSecret = this.configService.get(
      'ALIPOS_CLIENT_SECRET',
    ) as string;

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
