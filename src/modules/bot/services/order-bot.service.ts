import { Injectable } from '@nestjs/common';
import { BotService } from '../bot.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Auth } from '../../auth/auth.entity';
import { Order } from '../../order/schemas/order.entity';
import { Repository } from 'typeorm';
import { AuthRoleEnum } from '../../auth/enums/auth-role.enum';
import { AuthStatusEnum } from '../../auth/enums/status.enum';
import { TelegramStatusEnum } from '../../auth/guard/telegram-status.enum';
import { OrderPaymentMethodEnum } from '../../order/enums/order-payment-status.enum';
import { PaymentStatusEnum } from '../../payment/enums/payment-status.enum';

@Injectable()
export class OrderBotService {
  constructor(
    private readonly botService: BotService,
    @InjectRepository(Auth)
    private readonly authRepository: Repository<Auth>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
  ) {}

  private formatPaymentMethod(payment_method: OrderPaymentMethodEnum): string {
    switch (payment_method) {
      case OrderPaymentMethodEnum.PAYMENT_CASH:
        return "Naxt (qo'lda)";
      case OrderPaymentMethodEnum.PAYMENT_TERMINAL:
        return 'Terminal';
      case OrderPaymentMethodEnum.PAYMENT_ONLINE:
        return 'Online';
      case OrderPaymentMethodEnum.PAYMENT_COIN:
        return 'Coin';
      default:
        return payment_method;
    }
  }

  private formatPaymentStatus(payment_status: PaymentStatusEnum): string {
    switch (payment_status) {
      case PaymentStatusEnum.SUCCESS:
        return "To'langan";
      case PaymentStatusEnum.PENDING:
        return 'Kutilmoqda';
      case PaymentStatusEnum.FAILED:
        return 'Muvaffaqiyatsiz';
      case PaymentStatusEnum.CANCELLED:
        return 'Bekor qilingan';
      default:
        return payment_status;
    }
  }

  private buildMapsLinks({ lat, lng }: { lat: number; lng: number }): {
    google: string;
    yandex: string;
  } {
    return {
      google: `https://maps.google.com/?q=${lat},${lng}`,
      yandex: `https://yandex.com/maps/?pt=${lng},${lat}&z=16&l=map`,
    };
  }

  private parseCoordinate(value: unknown): number | null {
    if (value === null || value === undefined || value === '') return null;
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
  }

  private escapeHtml(value: string): string {
    return value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  private buildOrderMessage(order: Order): string {
    const totalPrice = Number(order.total_price || 0).toFixed(2);
    const itemsPrice = Number(order.items_price || 0).toFixed(2);
    const deliveryFee = Number(order.delivery_fee || 0).toFixed(2);
    const lat = this.parseCoordinate(order.lat);
    const lng = this.parseCoordinate(order.lng);
    const hasLocation = lat !== null && lng !== null;

    let mapsSection = '📍 <b>Joylashuv:</b> <i>mavjud emas</i>';
    if (hasLocation) {
      const maps = this.buildMapsLinks({
        lat,
        lng,
      });
      mapsSection = `📍 <b>Joylashuv:</b>\n🗺️ Google map: ${maps.google}\n🧭 Yandex map: ${maps.yandex}`;
    }

    const itemsLines = (order.items || []).map((item, idx) => {
      const price = Number(item.price || 0).toFixed(2);
      const modifiers = (item.order_item_modifiers || [])
        .map(
          (m) =>
            `   ◦ <i>${this.escapeHtml(m.modifier_name || '-')}</i> x${m.quantity} (${Number(m.price || 0).toFixed(2)})`,
        )
        .join('\n');
      return `${idx + 1}. <b>${this.escapeHtml(item.product_name || '-')}</b> x${item.quantity} (${price})${
        modifiers ? `\n${modifiers}` : ''
      }`;
    });

    return [
      `🛵 <b>Yangi tayyor buyurtma:</b> #${this.escapeHtml(order.order_number || '-')}`,
      `📞 <b>Mijoz tel:</b> ${this.escapeHtml(order.customer_phone || '-')}`,
      `🏠 <b>Manzil:</b> ${this.escapeHtml(order.address || '-')}`,
      `💳 <b>To'lov usuli:</b> <i>${this.escapeHtml(this.formatPaymentMethod(order.payment_method))}</i>`,
      `📌 <b>To'lov holati:</b> <i>${this.escapeHtml(this.formatPaymentStatus(order.payment_status))}</i>`,
      `🧾 <b>Mahsulotlar summasi:</b> ${itemsPrice}`,
      `🚚 <b>Delivery narxi:</b> ${deliveryFee}`,
      `💰 <b>Jami summa:</b> ${totalPrice}`,
      mapsSection,
      itemsLines.length
        ? `🍽️ <b>Tarkib:</b>\n${itemsLines.join('\n')}`
        : '🍽️ <b>Tarkib:</b> -',
    ].join('\n');
  }

  async sendOrderNotificationToDelivery(order: Order) {
    const bot = this.botService.getBot();

    const freshOrder = await this.orderRepository.findOne({
      where: { id: order.id },
      relations: {
        items: {
          order_item_modifiers: true,
        },
      },
    });

    if (!freshOrder) {
      return;
    }

    const deliveries = await this.authRepository.find({
      where: {
        role: AuthRoleEnum.DELIVERY,
        status: AuthStatusEnum.ACTIVE,
        telegram_status: TelegramStatusEnum.ACTIVE,
      },
      select: {
        id: true,
        telegram_id: true,
      },
    });

    if (!deliveries.length) {
      return;
    }

    const lat = this.parseCoordinate(freshOrder.lat);
    const lng = this.parseCoordinate(freshOrder.lng);
    const hasLocation = lat !== null && lng !== null;
    const text = this.buildOrderMessage(freshOrder);

    for (const delivery of deliveries) {
      if (!delivery.telegram_id) continue;

      try {
        if (hasLocation) {
          await bot.api.sendLocation(delivery.telegram_id, lat, lng);
        }
        await bot.api.sendMessage(delivery.telegram_id, text, {
          parse_mode: 'HTML',
          link_preview_options: {
            is_disabled: true,
          },
        });
      } catch (error) {
        console.error(
          `Failed to send order notification to delivery auth_id=${delivery.id}`,
          error,
        );
      }
    }
  }
}
