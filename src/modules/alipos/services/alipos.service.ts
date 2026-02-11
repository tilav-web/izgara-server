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
import { Order } from '../../order/schemas/order.entity';
import { OrderPaymentMethodEnum } from '../../order/enums/order-payment-status.enum';
import { OrderTypeEnum } from '../../order/enums/order-type.enum';
import { OrderStatusEnum } from '../../order/enums/order-status.enum';

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
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
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

  async sendOrderToAlipos(order_id: string) {
    const order = await this.orderRepository.findOne({
      where: { id: order_id },
      relations: {
        items: {
          product: true,
          order_item_modifiers: true,
        },
      },
    });

    if (!order) throw new NotFoundException('Order topilmadi!');

    // 1. To'lov ID-larini ConfigService orqali .env dan olish
    let aliposPaymentId: string;

    const CASH_ID = this.configService.get<string>(
      'ALIPOS_PAYMENT_CASH',
    ) as string;
    const TERMINAL_ID = this.configService.get<string>(
      'ALIPOS_PAYMENT_TERMINAL',
    ) as string;
    const ONLINE_ID = this.configService.get<string>(
      'ALIPOS_PAYMENT_ONLINE',
    ) as string;
    const COIN_ID = this.configService.get<string>(
      'ALIPOS_PAYMENT_COIN',
    ) as string;

    switch (order.payment_method) {
      case OrderPaymentMethodEnum.PAYMENT_CASH:
        aliposPaymentId = CASH_ID;
        break;
      case OrderPaymentMethodEnum.PAYMENT_TERMINAL:
        aliposPaymentId = TERMINAL_ID;
        break;
      case OrderPaymentMethodEnum.PAYMENT_ONLINE:
        aliposPaymentId = ONLINE_ID;
        break;
      case OrderPaymentMethodEnum.PAYMENT_COIN:
        aliposPaymentId = COIN_ID;
        break;
      default:
        aliposPaymentId = CASH_ID;
    }

    // 2. AliPos Payload tayyorlash

    const payload = {
      discriminator:
        order.order_type === OrderTypeEnum.DELIVERY ? 'delivery' : 'pickup',
      platform: 'CLIENT_APP_ANDROID',
      eatsId: order.id,
      restaurantId: this.restaurantId,
      comment: order.address
        ? 'TEST QILINMOQDA TAYYORLANMASIN' + order.address
        : 'TEST QILINMOQDA TAYYORLANMASIN',
      deliveryInfo: {
        clientName: 'Mijoz',
        phoneNumber: order.customer_phone,
        deliveryAddress:
          order.order_type === OrderTypeEnum.DELIVERY
            ? {
                full: order.address || "Manzil ko'rsatilmadi",
                latitude: order.lat?.toString() || '0',
                longitude: order.lng?.toString() || '0',
              }
            : null,
      },
      paymentInfo: {
        paymentId: aliposPaymentId,
        itemsCost: Number(order.items_price),
        total: Number(order.total_price),
        deliveryFee: Number(order.delivery_fee),
      },
      items: order.items.map((item) => ({
        id: item.product_id,
        quantity: Number(item.quantity),
        price: Number(item.price),
        modifications: (item.order_item_modifiers || []).map((mod) => ({
          id: mod.modifier_id,
          quantity: Number(mod.quantity || 1),
          price: Number(mod.price),
        })),
      })),
    };

    try {
      // const response = await firstValueFrom(
      //   this.httpService.post('api/Integration/v1/order', payload),
      // );
      // const data = response.data as {
      //   orderId: string;
      // };

      // await this.orderRepository.save({
      //   ...order,
      //   alipos_order_id: data.orderId,
      //   status: OrderStatusEnum.IN_PROGRESS,
      // });
      await new Promise((resolve) => setTimeout(resolve, 2000));
      console.log(payload);
    } catch (error) {
      const axiosError = error as AxiosError;
      console.error(
        'AliPos Error Details:',
        axiosError.response?.data || axiosError.message,
      );
      throw new BadGatewayException(
        'AliPos-ga buyurtma yuborishda xatolik yuz berdi',
      );
    }
  }

  async updateOrderStatus(body: {
    eatsId: string;
    status: string;
    orderNumber?: string;
  }) {
    const { eatsId, status } = body;

    // 1. Buyurtmani bazadan qidirish
    const order = await this.orderRepository.findOne({
      where: { id: eatsId },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${eatsId} not found`);
    }

    // 2. AliPos statuslarini o'zingizning OrderStatusEnum-ga map qilish
    // AliPos statuslari: NEW, IN_PROGRESS, READY_FOR_PICKUP, ON_WAY, DELIVERED, CANCELLED
    switch (status) {
      case 'NEW':
        order.status = OrderStatusEnum.NEW;
        break;
      case 'ACCEPTED_BY_RESTAURANT':
        order.status = OrderStatusEnum.IN_PROGRESS;
        if (body.orderNumber) {
          order.order_number = body.orderNumber;
        }
        break;
      case 'READY':
        order.status = OrderStatusEnum.READY;
        break;
      case 'TAKEN_BY_COURIER':
        order.status = OrderStatusEnum.ON_WAY;
        break;
      case 'CANCELLED':
        order.status = OrderStatusEnum.CANCELLED;
        // Agar bekor bo'lsa, coinlarni qaytarish mantiqini shu yerga qo'shish mumkin
        break;
    }

    await this.orderRepository.save(order);

    return { success: true, newStatus: order.status };
  }

  async deleteOrderToAlipos(order_id: string) {
    const order = await this.orderRepository.findOne({
      where: { id: order_id },
    });

    if (!order) throw new NotFoundException('Order topilmadi!');

    try {
      const response = await firstValueFrom(
        this.httpService.delete(
          `${ALIPOST_API_ENDPOINTS.ORDER.deleteOrder(order.alipos_order_id)}`,
        ),
      );
      console.log(response.data);
    } catch (error) {
      console.error(error);
      throw new BadGatewayException(
        "AliPos-ga order o'chirish so'rovida xatolik yuz berdi",
      );
    }
  }
}
