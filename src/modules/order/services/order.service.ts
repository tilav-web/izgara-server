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
    private readonly userService: UserService,
    private readonly productService: ProductService,
    private readonly modifierService: ModifierService,
    private readonly coinSettingsService: CoinSettingsService,
    private readonly locationService: LocationService,
  ) {}

  async findById(id: string) {
    return this.orderRepository.findOne({ where: { id } });
  }

  async markAsPaid(id: string) {}

  async createOrder(auth_id: number, dto: CreateOrderDto) {
    const user = await this.userService.findByAuthId(auth_id);
    if (!user) throw new ForbiddenException('Foydalanuvchi topilmadi!');

    const productsTotalPrices = await this.productService.getTotalPrice(
      dto.products,
    );

    const modifiersTotalPrices = await this.modifierService.getTotalPrice(
      dto.modifiers,
    );

    const total_price = productsTotalPrices + modifiersTotalPrices;

    if (dto.order_type === OrderTypeEnum.DELIVERY) {
      if (!dto.location_id)
        throw new BadRequestException(
          'Foydalanuvchi joylashuvi belgilanmagan!',
        );

      const location = await this.locationService.findLocationById(
        dto.location_id,
      );
      if (!location) throw new BadRequestException('Joylashuv topilmadi!');

      // ***************************

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
          total_price: total_price,
          customer_phone: user.phone,
          lat: location.latitude,
          lng: location.longitude,
          payment_status: PaymentStatusEnum.SUCCESS,
        });

        const result = await this.orderRepository.save(order);
        return result;
      }
    }
  }
}
