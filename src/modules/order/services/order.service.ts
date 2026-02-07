import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Order } from '../schemas/order.entity';
import { Repository } from 'typeorm';
import { OrderItem } from '../schemas/order-item.entity';
import { OrderItemModifier } from '../schemas/order-item-modifier.entity';
import { CreateOrderDto } from '../dto/create-order.dto';
import { UserService } from '../../user/user.service';
import { ProductService } from '../../product/product.service';
import { ModifierService } from '../../modifier/modifier.service';
import { OrderPaymentMethodEnum } from '../enums/order-payment-status.enum';
import { claculateCoin } from '../../../utils/calculate-coin';
import { CoinSettingsService } from '../../coinSettings/coin-settings.service';
import { User } from '../../user/user.entity';
import { OrderTypeEnum } from '../enums/order-type.enum';
import { LocationService } from '../../location/location.service';
import { PaymentStatusEnum } from '../../payment/enums/payment-status.enum';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { DeliverySettingsService } from '../../deliverySettings/delivery-settings.service';
import { PaymentProviderEnum } from '../../payment/enums/payment-provider.enum';
import { PaymentTransaction } from '../../payment/payment-transaction.entity';
import { generateClickUrl } from '../../../utils/generate-click-url';

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,
    @InjectRepository(OrderItemModifier)
    private readonly orderItemModifierRepository: Repository<OrderItemModifier>,
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(PaymentTransaction)
    private readonly paymentTransactionRepository: Repository<PaymentTransaction>,
    @InjectQueue('alipos-queue') private readonly aliposQueue: Queue,
    private readonly userService: UserService,
    private readonly productService: ProductService,
    private readonly modifierService: ModifierService,
    private readonly coinSettingsService: CoinSettingsService,
    private readonly locationService: LocationService,
    private readonly deliverySettingsService: DeliverySettingsService,
  ) {}

  private async makeOrderTotalPrice(auth_id: number, dto: CreateOrderDto) {
    const user = await this.userService.findByAuthId(auth_id);
    if (!user) throw new ForbiddenException('Foydalanuvchi topilmadi!');

    const productsTotalPrices = await this.productService.getTotalPrice(
      dto.products,
    );

    const modifiersTotalPrices = await this.modifierService.getTotalPrice(
      dto.modifiers,
    );

    const deliverySettings = await this.deliverySettingsService.findSettings();

    let deliveryPrice = 0;

    if (deliverySettings) {
      if (
        deliverySettings.free_delivery_threshold <=
        productsTotalPrices.total_price + modifiersTotalPrices.total_price
      ) {
        deliveryPrice = 0;
      } else {
        deliveryPrice = deliverySettings.delivery_price;
      }
    }

    const total_price =
      productsTotalPrices.total_price +
      modifiersTotalPrices.total_price +
      deliveryPrice;

    return { total_price, user };
  }

  async findAll() {
    return this.orderRepository.find({
      relations: {
        location: true,
        user: true,
        transactions: true,
      },
    });
  }

  async findById(id: string) {
    return this.orderRepository.findOne({ where: { id } });
  }

  async markAsPaid(id: string) {
    try {
      const order = await this.findById(id);

      if (!order) throw new BadRequestException('Order topilmadi!');

      if (order.payment_status === PaymentStatusEnum.SUCCESS) return;

      await this.orderRepository.update(id, {
        payment_status: PaymentStatusEnum.SUCCESS,
      });

      await this.aliposQueue.add(
        'send-order-to-alipos',
        {
          order_id: order.id,
        },
        {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
          removeOnComplete: true, // Muvaffaqiyatli bo'lganda o'chirish
          removeOnFail: false, // Xato bo'lganda saqlab qolish (debugging uchun)
        },
      );
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  async createOrder(auth_id: number, dto: CreateOrderDto) {
    const { total_price, user } = await this.makeOrderTotalPrice(auth_id, dto);

    if (dto.order_type === OrderTypeEnum.DELIVERY) {
      if (!dto.location_id)
        throw new BadRequestException(
          'Foydalanuvchi joylashuvi belgilanmagan!',
        );

      const location = await this.locationService.findLocationById(
        dto.location_id,
      );
      if (!location) throw new BadRequestException('Joylashuv topilmadi!');

      // Order Payment coin
      if (dto.payment_method === OrderPaymentMethodEnum.PAYMENT_COIN) {
        const coinSettings = await this.coinSettingsService.findCoinSettings();
        const totalCoin = claculateCoin({
          coinSettings,
          product_price: total_price,
        });

        if (user.coin_balance < totalCoin.coin_price)
          throw new ForbiddenException('Sizda yetarli coin yoq!');

        await this.userRepository
          .createQueryBuilder()
          .update()
          .set({
            coin_balance: () => `"coin_balance" - ${totalCoin.coin_price}`,
          })
          .where('id = :id', { id: user.id })
          .execute();

        const order = this.orderRepository.create({
          order_type: dto.order_type,
          payment_method: OrderPaymentMethodEnum.PAYMENT_COIN,
          address: dto.address,
          location_id: location.id,
          user_id: user.id,
          used_coins: totalCoin.coin_price,
          total_price,
          customer_phone: user.phone,
          lat: location.latitude,
          lng: location.longitude,
          payment_status: PaymentStatusEnum.SUCCESS,
        });

        await this.orderRepository.save(order);
        await this.aliposQueue.add(
          'send-order-to-alipos',
          {
            order_id: order.id,
          },
          {
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 5000,
            },
            removeOnComplete: true, // Muvaffaqiyatli bo'lganda o'chirish
            removeOnFail: false, // Xato bo'lganda saqlab qolish (debugging uchun)
          },
        );
        return order;
      }

      // Order Payment cash
      if (dto.payment_method === OrderPaymentMethodEnum.PAYMENT_CASH) {
        const order = this.orderRepository.create({
          order_type: dto.order_type,
          payment_method: OrderPaymentMethodEnum.PAYMENT_CASH,
          address: dto.address,
          location_id: location.id,
          user_id: user.id,
          cash_amount: total_price,
          total_price,
          customer_phone: user.phone,
          lat: location.latitude,
          lng: location.longitude,
        });

        await this.orderRepository.save(order);
        await this.aliposQueue.add(
          'send-order-to-alipos',
          {
            order_id: order.id,
          },
          {
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 5000,
            },
            removeOnComplete: true, // Muvaffaqiyatli bo'lganda o'chirish
            removeOnFail: false, // Xato bo'lganda saqlab qolish (debugging uchun)
          },
        );
        return order;
      }

      // Order payent online
      if (dto.payment_method === OrderPaymentMethodEnum.PAYMENT_ONLINE) {
        const order = this.orderRepository.create({
          order_type: dto.order_type,
          payment_method: OrderPaymentMethodEnum.PAYMENT_ONLINE,
          address: dto.address,
          location_id: location.id,
          user_id: user.id,
          cash_amount: total_price,
          total_price,
          customer_phone: user.phone,
          lat: location.latitude,
          lng: location.longitude,
        });
        await this.orderRepository.save(order);

        const paymentTransaction = this.paymentTransactionRepository.create({
          order_id: order.id,
          provider: dto.payment_provider,
          amount: total_price,
        });
        await this.paymentTransactionRepository.save(paymentTransaction);
        if (dto.payment_provider === PaymentProviderEnum.CLICK) {
          const click_url = generateClickUrl({
            amount: total_price,
            transaction_id: paymentTransaction.id,
          });
          return { url: click_url };
        }
      }
    }
  }
}
