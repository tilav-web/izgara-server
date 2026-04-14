import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, In, Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { IikoBaseService } from './base.service';
import { CategoryService } from '../../category/category.service';
import { Product } from '../../product/product.entity';
import { ModifierGroup } from '../../modifierGroup/modifier-group.entity';
import { Modifier } from '../../modifier/modifier.entity';
import { Order } from '../../order/schemas/order.entity';
import { MeasureEnum } from '../../product/enums/measure.enum';
import { OrderPaymentMethodEnum } from '../../order/enums/order-payment-status.enum';
import { OrderTypeEnum } from '../../order/enums/order-type.enum';
import { OrderStatusEnum } from '../../order/enums/order-status.enum';
import { PaymentProviderEnum } from '../../payment/enums/payment-provider.enum';
import { PaymentStatusEnum } from '../../payment/enums/payment-status.enum';
import {
  IikoCommandResponse,
  IikoCreateDeliveryResponse,
  IikoExternalMenuCategory,
  IikoExternalMenuItem,
  IikoExternalMenuResponse,
  IikoExternalMenusResponse,
  IikoStopListsResponse,
  IikoWebhookEvent,
} from '../types/iiko.types';
import {
  IIKO_API_ENDPOINTS,
  IIKO_DELIVERY_STATUS_TO_ORDER_STATUS,
  IIKO_SOURCE_KEY,
} from '../utils/constants';

type IikoPaymentPayload = {
  paymentTypeKind: 'Cash' | 'Card' | 'External' | 'LoyaltyCard';
  sum: number;
  paymentTypeId: string;
  isProcessedExternally: boolean;
};

@Injectable()
export class IikoService extends IikoBaseService {
  private readonly serviceLogger = new Logger(IikoService.name);

  constructor(
    httpService: HttpService,
    configService: ConfigService,
    private readonly categoryService: CategoryService,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(ModifierGroup)
    private readonly modifierGroupRepository: Repository<ModifierGroup>,
    @InjectRepository(Modifier)
    private readonly modifierRepository: Repository<Modifier>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
  ) {
    super(httpService, configService);
  }

  async updateAllData() {
    const organizationId = await this.getOrganizationId();

    // 1. External menu ID ni olish
    const menusData = await this.request<
      Record<string, never>,
      IikoExternalMenusResponse
    >(IIKO_API_ENDPOINTS.EXTERNAL_MENUS.findAll, {});

    const externalMenuId =
      this.configService.get<string>('IIKO_EXTERNAL_MENU_ID') ||
      menusData.externalMenus?.[0]?.id;

    if (!externalMenuId) {
      throw new BadGatewayException('IIKO da external menu topilmadi');
    }

    // 2. External menu ma'lumotlarini olish
    const data = await this.request<
      { externalMenuId: string; organizationIds: string[]; version: number },
      IikoExternalMenuResponse
    >(IIKO_API_ENDPOINTS.EXTERNAL_MENUS.findById, {
      externalMenuId,
      organizationIds: [organizationId],
      version: 2,
    });

    if (!data.itemCategories?.length) {
      throw new BadGatewayException('IIKO external menu bo\'sh');
    }

    // 3. Kategoriyalar, mahsulotlar, modifier guruhlar va modifierlarni yig'ish
    const categoriesToUpsert: Array<{
      id: string;
      name: string;
      sort_order: number;
    }> = [];
    const productsToUpsert: Array<{
      id: string;
      category_id: string;
      name: string;
      description?: string;
      price: number;
      vat: number;
      measure: number;
      measure_unit: MeasureEnum;
      sort_order: number;
      is_active: boolean;
    }> = [];
    const modifierGroupsToUpsert: Array<{
      id: string;
      name: string;
      sort_order: number;
      min_selected_amount: number;
      max_selected_amount: number;
      product_id: string;
    }> = [];
    const modifiersToUpsert: Array<{
      id: string;
      name: string;
      price: number;
      sort_order: number;
      max_quantity: number;
      is_active: boolean;
      group_id: string;
    }> = [];

    for (let catIdx = 0; catIdx < data.itemCategories.length; catIdx++) {
      const category = data.itemCategories[catIdx];
      const categoryId = category.id || `ext-cat-${catIdx}`;

      categoriesToUpsert.push({
        id: categoryId,
        name: category.name,
        sort_order: catIdx,
      });

      for (let itemIdx = 0; itemIdx < category.items.length; itemIdx++) {
        const item = category.items[itemIdx];
        const size = item.itemSizes?.[0];
        const price = size?.prices?.[0]?.price || 0;

        productsToUpsert.push({
          id: item.itemId,
          category_id: categoryId,
          name: item.name,
          description: item.description || undefined,
          price,
          vat: 0,
          measure: Number(size?.portionWeightGrams || 0),
          measure_unit: this.mapMeasureUnit(item.measureUnit),
          sort_order: itemIdx,
          is_active: true,
        });

        // Modifier guruhlarni yig'ish
        for (const modGroup of size?.itemModifierGroups || []) {
          if (!modGroup.itemGroupId || !modGroup.items?.length) continue;

          const groupId = modGroup.itemGroupId;
          modifierGroupsToUpsert.push({
            id: groupId,
            name: modGroup.name || 'Modifierlar',
            sort_order: 0,
            min_selected_amount: Number(
              modGroup.restrictions?.minQuantity || 0,
            ),
            max_selected_amount: Number(
              modGroup.restrictions?.maxQuantity || modGroup.items.length,
            ),
            product_id: item.itemId,
          });

          for (const mod of modGroup.items) {
            const modPrice = mod.prices?.[0]?.price || 0;
            const maxQty =
              mod.restrictions?.[0]?.maxQuantity ||
              modGroup.restrictions?.maxQuantity ||
              1;

            modifiersToUpsert.push({
              id: mod.itemId,
              name: mod.name,
              price: modPrice,
              sort_order: 0,
              max_quantity: Number(maxQty),
              is_active: true,
              group_id: groupId,
            });
          }
        }
      }
    }

    // 4. Bazaga yozish
    await this.categoryService.upsertMany(categoriesToUpsert);

    if (productsToUpsert.length > 0) {
      await this.productRepository.upsert(productsToUpsert, ['id']);
    }

    if (modifierGroupsToUpsert.length > 0) {
      await this.modifierGroupRepository.upsert(modifierGroupsToUpsert, ['id']);
    }

    if (modifiersToUpsert.length > 0) {
      await this.modifierRepository.upsert(modifiersToUpsert, ['id']);
    }

    // 5. IIKO dan o'chirilgan elementlarni bazadan tozalash
    await this.cleanupRemovedModifiers(
      productsToUpsert.map((item) => item.id),
      modifierGroupsToUpsert.map((item) => item.id),
      modifiersToUpsert.map((item) => item.id),
    );

    return {
      message: 'IIKO external menu bazaga yozildi',
      menu: data.name,
      categories: categoriesToUpsert.length,
      products: productsToUpsert.length,
      modifier_groups: modifierGroupsToUpsert.length,
      modifiers: modifiersToUpsert.length,
    };
  }

  async syncStopLists() {
    const organizationId = await this.getOrganizationId();
    const terminalGroupId = await this.getTerminalGroupId();

    const data = await this.request<
      {
        organizationIds: string[];
        terminalGroupsIds: string[];
        returnSize: boolean;
      },
      IikoStopListsResponse
    >(IIKO_API_ENDPOINTS.STOP_LISTS.findAll, {
      organizationIds: [organizationId],
      terminalGroupsIds: [terminalGroupId],
      returnSize: false,
    });

    const stoppedProductIds = new Set(
      data.terminalGroupStopLists
        .flatMap((wrapper) => wrapper.items)
        .filter((terminal) => terminal.terminalGroupId === terminalGroupId)
        .flatMap((terminal) => terminal.items)
        .map((item) => item.productId),
    );

    const [products, modifiers] = await Promise.all([
      this.productRepository.find({ select: { id: true, is_active: true } }),
      this.modifierRepository.find({ select: { id: true, is_active: true } }),
    ]);

    await Promise.all([
      ...products.map((product) =>
        this.productRepository.update(product.id, {
          is_active: !stoppedProductIds.has(product.id),
        }),
      ),
      ...modifiers.map((modifier) =>
        this.modifierRepository.update(modifier.id, {
          is_active: !stoppedProductIds.has(modifier.id),
        }),
      ),
    ]);

    return {
      message: 'IIKO stop-list sinxron qilindi',
      stopped_count: stoppedProductIds.size,
    };
  }

  async sendOrderToIiko(orderId: string) {
    const organizationId = await this.getOrganizationId();
    const terminalGroupId = await this.getTerminalGroupId();
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: {
        items: {
          product: true,
          order_item_modifiers: {
            modifier: true,
          },
        },
        transactions: true,
      },
    });

    if (!order) throw new NotFoundException('Order topilmadi');

    const payment = this.resolvePaymentPayload(order);
    const payload = {
      organizationId,
      terminalGroupId,
      createOrderSettings: {
        checkStopList: true,
      },
      order: {
        id: order.id,
        phone: this.normalizePhone(order.customer_phone),
        orderServiceType:
          order.order_type === OrderTypeEnum.DELIVERY
            ? 'DeliveryByCourier'
            : 'DeliveryByClient',
        deliveryPoint: this.buildDeliveryPoint(order),
        comment: this.buildOrderComment(order),
        customer: {
          type: 'one-time',
          name: 'Mijoz',
        },
        items: order.items.map((item) => ({
          type: 'Product',
          productId: item.product_id,
          amount: Number(item.quantity),
          price: Number(item.price),
          positionId: randomUUID(),
          modifiers: (item.order_item_modifiers || []).map((modifier) => ({
            productId: modifier.modifier_id,
            productGroupId: modifier.modifier?.group_id,
            amount: Number(modifier.quantity || 1),
            price: Number(modifier.price),
            positionId: randomUUID(),
          })),
        })),
        payments: [payment],
        sourceKey:
          this.configService.get<string>('IIKO_SOURCE_KEY') || IIKO_SOURCE_KEY,
        externalData: [
          {
            key: 'izgaraOrderId',
            value: order.id,
          },
        ],
      },
    };

    const response = await this.request<
      typeof payload,
      IikoCreateDeliveryResponse
    >(IIKO_API_ENDPOINTS.DELIVERIES.create, payload);

    await this.orderRepository.update(order.id, {
      alipos_order_id: response.orderInfo?.id || order.id,
      order_number:
        response.orderInfo?.order?.number ||
        response.orderInfo?.order?.externalNumber ||
        order.order_number,
      status: OrderStatusEnum.IN_PROGRESS,
    });

    return response;
  }

  async cancelOrderInIiko(orderId: string) {
    const organizationId = await this.getOrganizationId();
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
    });

    if (!order) throw new NotFoundException('Order topilmadi');

    const payload = {
      organizationId,
      orderId: order.alipos_order_id || order.id,
      cancelComment: 'Cancelled from Izgara',
    };

    return this.request<typeof payload, IikoCommandResponse>(
      IIKO_API_ENDPOINTS.DELIVERIES.cancel,
      payload,
    );
  }

  async handleWebhook(body: IikoWebhookEvent[] | IikoWebhookEvent) {
    const events = Array.isArray(body) ? body : [body];
    const handled: string[] = [];

    for (const event of events) {
      if (event.eventType === 'DeliveryOrderUpdate') {
        const result = await this.updateOrderStatusFromWebhook(event);
        if (result) handled.push(result);
      }

      if (event.eventType === 'StopListUpdate') {
        await this.syncStopLists();
        handled.push('StopListUpdate');
      }
    }

    return {
      success: true,
      handled,
    };
  }

  private async cleanupRemovedModifiers(
    productIds: string[],
    groupIds: string[],
    modifierIds: string[],
  ) {
    if (productIds.length === 0) return;

    const existingGroups = await this.modifierGroupRepository.find({
      where: { product_id: In(productIds) },
      select: { id: true },
    });
    const scopedGroupIds = existingGroups.map((group) => group.id);

    if (scopedGroupIds.length > 0) {
      const deleteModifierQb = this.modifierRepository
        .createQueryBuilder()
        .delete()
        .where('group_id IN (:...groupIds)', { groupIds: scopedGroupIds });

      if (modifierIds.length > 0) {
        deleteModifierQb.andWhere('id NOT IN (:...modifierIds)', {
          modifierIds,
        });
      }

      await deleteModifierQb.execute();
    }

    const deleteGroupQb = this.modifierGroupRepository
      .createQueryBuilder()
      .delete()
      .where('product_id IN (:...productIds)', { productIds });

    if (groupIds.length > 0) {
      deleteGroupQb.andWhere('id NOT IN (:...groupIds)', { groupIds });
    }

    await deleteGroupQb.execute();
  }

  private mapMeasureUnit(measureUnit?: string | null) {
    const unit = (measureUnit || '').toLowerCase();
    if (unit.includes('kg') || unit.includes('кг') || unit === 'г') {
      return MeasureEnum.KG;
    }
    if (unit.includes('l') || unit.includes('л') || unit.includes('мл')) {
      return MeasureEnum.L;
    }
    return MeasureEnum.PCS;
  }

  private resolvePaymentPayload(order: Order): IikoPaymentPayload {
    const total = Number(order.total_price);

    switch (order.payment_method) {
      case OrderPaymentMethodEnum.PAYMENT_CASH:
        return {
          paymentTypeKind: 'Cash',
          paymentTypeId: this.getRequiredPaymentId('IIKO_PAYMENT_CASH'),
          sum: total,
          isProcessedExternally: false,
        };
      case OrderPaymentMethodEnum.PAYMENT_TERMINAL:
        return {
          paymentTypeKind: 'Card',
          paymentTypeId: this.getRequiredPaymentId('IIKO_PAYMENT_CARD'),
          sum: total,
          isProcessedExternally: false,
        };
      case OrderPaymentMethodEnum.PAYMENT_ONLINE:
        return {
          paymentTypeKind: 'Card',
          paymentTypeId: this.resolveOnlinePaymentId(order),
          sum: total,
          isProcessedExternally: true,
        };
      case OrderPaymentMethodEnum.PAYMENT_COIN:
        return {
          paymentTypeKind: 'Card',
          paymentTypeId: this.getRequiredPaymentId('IIKO_PAYMENT_COIN'),
          sum: total,
          isProcessedExternally: true,
        };
      default:
        throw new BadRequestException('Nomalum tolov turi');
    }
  }

  private resolveOnlinePaymentId(order: Order): string {
    const successTransaction = (order.transactions || []).find(
      (t) => t.status === PaymentStatusEnum.SUCCESS,
    );

    if (successTransaction?.provider === PaymentProviderEnum.PAYME) {
      return this.getRequiredPaymentId('IIKO_PAYMENT_PAYME');
    }

    return this.getRequiredPaymentId('IIKO_PAYMENT_CLICK');
  }

  private getRequiredPaymentId(key: string) {
    const value = this.configService.get<string>(key);
    if (!value) {
      throw new BadGatewayException(`${key} env topilmadi`);
    }
    return value;
  }

  private normalizePhone(phone: string) {
    const digits = phone.replace(/[^\d]/g, '');
    if (phone.trim().startsWith('+')) return `+${digits}`;
    return `+${digits}`;
  }

  private buildDeliveryPoint(order: Order) {
    if (order.order_type !== OrderTypeEnum.DELIVERY) return undefined;

    const latitude = Number(order.lat);
    const longitude = Number(order.lng);

    return {
      coordinates:
        Number.isFinite(latitude) && Number.isFinite(longitude)
          ? { latitude, longitude }
          : undefined,
      address: {
        type: 'city',
        line1: (order.address || 'Manzil korsatilmadi').slice(0, 250),
      },
      comment: order.address || undefined,
    };
  }

  private buildOrderComment(order: Order) {
    const modifierLines = order.items.flatMap((item, itemIndex) =>
      (item.order_item_modifiers || []).map((modifier) => {
        const productName =
          item.product?.name || item.product_name || 'Product';
        return `${itemIndex + 1}. ${productName} - ${modifier.modifier_name} x${Number(modifier.quantity || 1)}`;
      }),
    );

    return modifierLines.length
      ? `Modifierlar:\n${modifierLines.join('\n')}`
      : undefined;
  }

  private async updateOrderStatusFromWebhook(event: IikoWebhookEvent) {
    const iikoStatus = event.eventInfo?.order?.status;
    if (!iikoStatus) return null;

    const nextStatus = IIKO_DELIVERY_STATUS_TO_ORDER_STATUS[iikoStatus];
    if (!nextStatus) {
      this.serviceLogger.warn(`Unknown IIKO delivery status: ${iikoStatus}`);
      return null;
    }

    const where: FindOptionsWhere<Order>[] = [];
    const internalOrderId =
      event.eventInfo?.order?.id || event.eventInfo?.order?.externalNumber;

    if (internalOrderId) where.push({ id: internalOrderId });
    if (event.eventInfo?.id)
      where.push({ alipos_order_id: event.eventInfo.id });

    if (where.length === 0) return null;

    const order = await this.orderRepository.findOne({ where });
    if (!order) return null;

    order.status = nextStatus;
    order.order_number =
      event.eventInfo?.order?.number ||
      event.eventInfo?.order?.externalNumber ||
      order.order_number;

    await this.orderRepository.save(order);
    return `DeliveryOrderUpdate:${order.id}:${nextStatus}`;
  }
}
