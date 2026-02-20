import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Order } from '../schemas/order.entity';
import { Brackets, FindOptionsWhere, Repository } from 'typeorm';
import { CreateOrderDto } from '../dto/create-order.dto';
import { UserService } from '../../user/user.service';
import { ProductService } from '../../product/product.service';
import { OrderPaymentMethodEnum } from '../enums/order-payment-status.enum';
import { claculateCoin } from '../../../utils/calculate-coin';
import { CoinSettingsService } from '../../coinSettings/coin-settings.service';
import { User } from '../../user/user.entity';
import { OrderTypeEnum } from '../enums/order-type.enum';
import { LocationService } from '../../location/location.service';
import { PaymentStatusEnum } from '../../payment/enums/payment-status.enum';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PaymentProviderEnum } from '../../payment/enums/payment-provider.enum';
import { generateClickUrl } from '../../../utils/generate-click-url';
import { FilterOrderDto } from '../dto/filter-order.dto';
import { DataSource } from 'typeorm';
import { UpdateOrderDto } from '../dto/update-order.dto';
import { DeliverySettingsService } from '../../deliverySettings/delivery-settings.service';
import { OrderStatusEnum } from '../enums/order-status.enum';
import { OrderGateway } from '../../socket/gateways/order.gateway';
import { generatePaymeUrl } from '../../../utils/generate-payme-url';
import { Location } from '../../location/location.entity';
import { OrderItem } from '../schemas/order-item.entity';

type CreateOrderContext = {
  dto: CreateOrderDto;
  total_price: number;
  user: User;
  location?: Location;
  items: OrderItem[];
  delivery_fee: number;
  items_price: number;
};

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectQueue('alipos-queue') private readonly aliposQueue: Queue,
    private readonly userService: UserService,
    private readonly productService: ProductService,
    private readonly coinSettingsService: CoinSettingsService,
    private readonly locationService: LocationService,
    private readonly dataSource: DataSource,
    private readonly deliverySettingsService: DeliverySettingsService,
    private readonly orderGateway: OrderGateway,
  ) {}

  private async makeOrderTotalPrice(auth_id: number, dto: CreateOrderDto) {
    const user = await this.userService.findByAuthId(auth_id);
    if (!user) throw new ForbiddenException('Foydalanuvchi topilmadi!');

    const { items_price } = await this.productService.getTotalPrice(
      dto.products,
    );

    const deliverySettings = await this.deliverySettingsService.findSettings();

    let delivery_fee: number = 0;

    if (items_price < deliverySettings.free_delivery_threshold) {
      delivery_fee = Number(deliverySettings.delivery_price);
    }

    const total_price = items_price + delivery_fee;

    return {
      total_price,
      items_price,
      user,
      delivery_fee,
    };
  }

  private async sendToAlipos(order_id: string) {
    await this.aliposQueue.add(
      'send-order-to-alipos',
      { id: order_id },
      {
        attempts: 5, // Qayta urinishlar sonini biroz oshirish mumkin
        backoff: {
          type: 'exponential',
          delay: 10000, // 10 soniyadan boshlab har safar 2 barobar ko'payadi (10s, 20s, 40s...)
        },
        removeOnComplete: true,
        removeOnFail: { age: 24 * 3600 }, // Xato bo'lganlarni bazada 24 soat saqlash (tahlil uchun)
      },
    );
  }

  private async deleteToAlipos(order_id: string) {
    await this.aliposQueue.add(
      'delete-order-to-alipos',
      { id: order_id },
      {
        attempts: 5, // Qayta urinishlar sonini biroz oshirish mumkin
        backoff: {
          type: 'exponential',
          delay: 10000, // 10 soniyadan boshlab har safar 2 barobar ko'payadi (10s, 20s, 40s...)
        },
        removeOnComplete: true,
        removeOnFail: { age: 24 * 3600 }, // Xato bo'lganlarni bazada 24 soat saqlash (tahlil uchun)
      },
    );
  }

  private resolveDeliveryLocation(dto: CreateOrderDto, location?: Location) {
    if (dto.order_type === OrderTypeEnum.DELIVERY && !location) {
      throw new BadRequestException("Joylashuv ma'lumotlari topilmadi!");
    }

    return dto.order_type === OrderTypeEnum.DELIVERY ? location : undefined;
  }

  private async createAndSaveOrder({
    dto,
    total_price,
    user,
    location,
    items,
    delivery_fee,
    items_price,
    payment_method,
  }: CreateOrderContext & {
    payment_method:
      | OrderPaymentMethodEnum.PAYMENT_CASH
      | OrderPaymentMethodEnum.PAYMENT_ONLINE
      | OrderPaymentMethodEnum.PAYMENT_TERMINAL;
  }): Promise<Order> {
    const deliveryLocation = this.resolveDeliveryLocation(dto, location);

    const order = this.orderRepository.create({
      order_type: dto.order_type,
      payment_method,
      address: dto.address,
      user_id: user.id,
      cash_amount: total_price,
      total_price,
      items_price,
      delivery_fee,
      customer_phone: user.phone,
      items,
      ...(deliveryLocation
        ? {
            location_id: deliveryLocation.id,
            lat: deliveryLocation.latitude,
            lng: deliveryLocation.longitude,
          }
        : {}),
    });

    await this.orderRepository.save(order);
    return order;
  }

  // payment coin
  private async paymentCoin({
    dto,
    total_price,
    user,
    location,
    items,
    delivery_fee,
    items_price,
  }: CreateOrderContext): Promise<Order> {
    const coinSettings = await this.coinSettingsService.findCoinSettings();
    const totalCoin = claculateCoin({
      coinSettings,
      product_price: total_price,
    });

    if (user.coin_balance < Number(totalCoin.coin_price))
      throw new ForbiddenException('Sizda yetarli coin yoq!');

    const deliveryLocation = this.resolveDeliveryLocation(dto, location);

    let savedOrder: Order | null = null;

    await this.dataSource.transaction(async (manager) => {
      await manager.update(
        User,
        { id: user.id },
        {
          coin_balance: () => `"coin_balance" - ${totalCoin.coin_price}`,
        },
      );

      const order = manager.create(Order, {
        order_type: dto.order_type,
        payment_method: OrderPaymentMethodEnum.PAYMENT_COIN,
        address: dto.address,
        user_id: user.id,
        used_coins: Number(totalCoin.coin_price),
        total_price,
        delivery_fee,
        items_price,
        customer_phone: user.phone,
        payment_status: PaymentStatusEnum.SUCCESS,
        items,
        ...(deliveryLocation
          ? {
              location_id: deliveryLocation.id,
              lat: deliveryLocation.latitude,
              lng: deliveryLocation.longitude,
            }
          : {}),
      });

      savedOrder = await manager.save(order);
    });

    if (!savedOrder) {
      throw new BadRequestException('Order saqlanmadi!');
    }

    return savedOrder;
  }

  // payment cash
  private async paymentCash(ctx: CreateOrderContext): Promise<Order> {
    return this.createAndSaveOrder({
      ...ctx,
      payment_method: OrderPaymentMethodEnum.PAYMENT_CASH,
    });
  }

  // payment terminal
  private async paymentTerminal(ctx: CreateOrderContext): Promise<Order> {
    return this.createAndSaveOrder({
      ...ctx,
      payment_method: OrderPaymentMethodEnum.PAYMENT_TERMINAL,
    });
  }

  // payment online
  private async paymentOnline(
    ctx: CreateOrderContext,
  ): Promise<{ url: string }> {
    if (!ctx.dto.payment_provider) {
      throw new BadRequestException(
        "Online to'lov uchun provider yuborilmadi!",
      );
    }

    const order = await this.createAndSaveOrder({
      ...ctx,
      payment_method: OrderPaymentMethodEnum.PAYMENT_ONLINE,
    });

    switch (ctx.dto.payment_provider) {
      case PaymentProviderEnum.CLICK:
        return {
          url: generateClickUrl({
            amount: ctx.total_price,
            order_id: order.id,
          }),
        };
      case PaymentProviderEnum.PAYME:
        return {
          url: generatePaymeUrl({
            amount: ctx.total_price,
            order_id: order.id,
          }),
        };
      default:
        throw new BadRequestException("Noma'lum to'lov provayderi!");
    }
  }

  async findAll(filter: FilterOrderDto) {
    const qb = this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.user', 'user');

    if (filter.search) {
      qb.andWhere(
        new Brackets((qb) => {
          qb.where(`
        user.first_name ILIKE :search
        OR user.last_name ILIKE :search
        OR order.customer_phone ILIKE :search
        OR order.order_number ILIKE :search
        OR order.address ILIKE :search
      `);
        }),
      ).setParameter('search', `%${filter.search}%`);
    }

    if (filter.status) {
      qb.andWhere('order.status = :status', {
        status: filter.status,
      });
    }

    if (filter.order_type) {
      qb.andWhere('order.order_type = :order_type', {
        order_type: filter.order_type,
      });
    }

    if (filter.payment_method) {
      qb.andWhere('order.payment_method = :payment_method', {
        payment_method: filter.payment_method,
      });
    }

    if (filter.payment_status) {
      qb.andWhere('order.payment_status = :payment_status', {
        payment_status: filter.payment_status,
      });
    }

    if (filter.from_date) {
      qb.andWhere('order.created_at >= :from_date', {
        from_date: filter.from_date,
      });
    }

    if (filter.to_date) {
      qb.andWhere('order.created_at <= :to_date', {
        to_date: filter.to_date,
      });
    }

    const page = filter.page ?? 1;
    const limit = filter.limit ?? 10;

    qb.skip((page - 1) * limit).take(limit);

    const [orders, total] = await qb.getManyAndCount();

    return {
      orders,
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit),
    };
  }

  async findOrdersByAuthId(
    auth_id: number,
    { page = 1, limit = 10 }: { page?: number; limit?: number },
  ) {
    const user = await this.userService.findByAuthId(auth_id);
    if (!user) {
      throw new ForbiddenException('Foydalanuvchi topilmadi!');
    }

    const skip = (page - 1) * limit;

    const [orders, total] = await this.orderRepository.findAndCount({
      where: {
        user_id: user.id,
      },
      relations: {
        items: true,
        location: true,
      },
      order: {
        created_at: 'DESC',
      },
      skip,
      take: limit,
    });

    return {
      orders,
      page,
      limit,
      total,
      total_pages: Math.ceil(total / limit),
    };
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
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  // Bu metod controllerda chaqiriladi
  async createOrder(auth_id: number, dto: CreateOrderDto) {
    const { total_price, user, delivery_fee, items_price } =
      await this.makeOrderTotalPrice(auth_id, dto);
    const items = await this.productService.findByIds(dto.products);

    if (
      dto.payment_provider &&
      dto.payment_method !== OrderPaymentMethodEnum.PAYMENT_ONLINE
    )
      throw new BadRequestException(
        `To'lov providerlaridan foydalanish uchun to'lov turi ${OrderPaymentMethodEnum.PAYMENT_ONLINE} bo'lishi kerak!`,
      );

    const orderContextBase = {
      dto,
      total_price,
      user,
      items,
      delivery_fee,
      items_price,
    };

    if (dto.order_type === OrderTypeEnum.DELIVERY) {
      if (dto.payment_method === OrderPaymentMethodEnum.PAYMENT_TERMINAL)
        throw new BadRequestException(
          "Bu to'lov usuli delivery uchun qo'llab-quvvatlanmaydi!",
        );

      if (!dto.location_id)
        throw new BadRequestException(
          'Foydalanuvchi joylashuvi belgilanmagan!',
        );

      const location = await this.locationService.findLocationById(
        dto.location_id,
      );
      if (!location) throw new BadRequestException('Joylashuv topilmadi!');

      const ctx: CreateOrderContext = { ...orderContextBase, location };
      switch (dto.payment_method) {
        case OrderPaymentMethodEnum.PAYMENT_COIN:
          return this.paymentCoin(ctx);
        case OrderPaymentMethodEnum.PAYMENT_CASH:
          return this.paymentCash(ctx);
        case OrderPaymentMethodEnum.PAYMENT_ONLINE:
          return this.paymentOnline(ctx);
        default:
          throw new BadRequestException("Noma'lum to'lov usuli!");
      }
    }

    if (dto.order_type === OrderTypeEnum.PICKUP) {
      const ctx: CreateOrderContext = { ...orderContextBase };
      switch (dto.payment_method) {
        case OrderPaymentMethodEnum.PAYMENT_COIN:
          return this.paymentCoin(ctx);
        case OrderPaymentMethodEnum.PAYMENT_CASH:
          return this.paymentCash(ctx);
        case OrderPaymentMethodEnum.PAYMENT_ONLINE:
          return this.paymentOnline(ctx);
        case OrderPaymentMethodEnum.PAYMENT_TERMINAL:
          return this.paymentTerminal(ctx);
        default:
          throw new BadRequestException("Noma'lum to'lov usuli!");
      }
    }
    throw new BadRequestException("Noma'lum order turi!");
  }

  async updateOrderForAdmin(order_id: string, dto: UpdateOrderDto) {
    const order = await this.orderRepository.findOne({
      where: {
        id: order_id,
      },
    });

    if (!order) throw new NotFoundException('Buyurtma malumotlari topilmadi!');

    if (
      dto.status === OrderStatusEnum.NEW &&
      order.status !== OrderStatusEnum.NEW
    )
      throw new BadRequestException(
        "Order status ni NEW ga o'zgartira olmaysiz!",
      );

    if (
      dto.status &&
      dto.status !== OrderStatusEnum.CANCELLED &&
      dto.status !== OrderStatusEnum.NEW &&
      order.status === OrderStatusEnum.NEW
    ) {
      await this.sendToAlipos(order.id);
      order.status = dto.status;
    }

    if (dto.status) {
      order.status = dto.status;
      if (dto.status === OrderStatusEnum.CANCELLED) {
        await this.deleteToAlipos(order.id);
      }
    }

    if (dto.payment_status) {
      order.payment_status = dto.payment_status;
    }

    const result = await this.orderRepository.save(order);
    await this.orderGateway.handleStatus({
      order_id: result.id,
      status: order.status,
      user_id: order.user_id,
    });
    return result;
  }

  async findOneMoreOptions({
    auth_id,
    order_id,
  }: {
    auth_id?: number;
    order_id: string;
  }) {
    if (!order_id) throw new BadRequestException('Buyurtma id si yuborilmadi!');

    const filter: FindOptionsWhere<Order> = {};

    filter.id = order_id;

    if (auth_id) {
      const user = await this.userService.findByAuthId(auth_id);
      if (!user)
        throw new NotFoundException('Foydalanuvchi malumotlari topilmadi!');
      filter.user_id = user.id;
    }

    return this.orderRepository.findOne({
      where: filter,
      relations: {
        items: {
          product: true,
          order_item_modifiers: {
            modifier: true,
          },
        },
      },
    });
  }

  async cancelOrder({
    order_id,
    auth_id,
  }: {
    order_id: string;
    auth_id: number;
  }) {
    const user = await this.userService.findByAuthId(auth_id);
    if (!user) {
      throw new NotFoundException('Foydalanuvchi ma’lumotlari topilmadi!');
    }

    const order = await this.orderRepository.findOne({
      where: {
        id: order_id,
        user_id: user.id,
      },
    });

    if (!order) {
      throw new NotFoundException(
        'Buyurtma topilmadi yoki sizga tegishli emas!',
      );
    }

    if (order.status === OrderStatusEnum.CANCELLED) {
      throw new BadRequestException('Buyurtma allaqachon bekor qilingan!');
    }

    return await this.dataSource.transaction(async (manager) => {
      if (order.status !== OrderStatusEnum.NEW) {
        await this.deleteToAlipos(order.id);
      }
      order.status = OrderStatusEnum.CANCELLED;
      const updatedOrder = await manager.save(order);
      return updatedOrder;
    });
  }
}
