import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { DeliveryAssignment } from './delivery_assignments.entity';
import { Auth } from '../auth/auth.entity';
import { AuthRoleEnum } from '../auth/enums/auth-role.enum';
import { AuthStatusEnum } from '../auth/enums/status.enum';
import { TelegramStatusEnum } from '../auth/guard/telegram-status.enum';
import { Order } from '../order/schemas/order.entity';
import { OrderStatusEnum } from '../order/enums/order-status.enum';
import { OrderTypeEnum } from '../order/enums/order-type.enum';
import { DeliveryAssignmentStatusEnum } from './enum/delivery-assignment-status.enum';
import { UserService } from '../user/user.service';
import { OrderGateway } from '../socket/gateways/order/order.gateway';

@Injectable()
export class DeliveryAssignmentsService {
  private readonly activeAssignmentStatuses = [
    DeliveryAssignmentStatusEnum.ASSIGNED,
    DeliveryAssignmentStatusEnum.PICKED_UP,
  ];

  constructor(
    @InjectRepository(DeliveryAssignment)
    private readonly deliveryAssignmentRepository: Repository<DeliveryAssignment>,
    @InjectRepository(Auth)
    private readonly authRepository: Repository<Auth>,
    private readonly dataSource: DataSource,
    private readonly userService: UserService,
    private readonly orderGateway: OrderGateway,
  ) {}

  private async findDeliveryAuthByTelegram(telegram_id: string) {
    const auth = await this.authRepository.findOne({
      where: {
        telegram_id,
        role: AuthRoleEnum.DELIVERY,
        status: AuthStatusEnum.ACTIVE,
        telegram_status: TelegramStatusEnum.ACTIVE,
      },
      select: {
        id: true,
        user_id: true,
      },
    });

    if (!auth) {
      throw new ForbiddenException(
        'Siz delivery sifatida tasdiqlanmagansiz yoki Telegram profilingiz faol emas.',
      );
    }

    return auth;
  }

  private async findDeliveryAuthById(auth_id: number) {
    const auth = await this.authRepository.findOne({
      where: {
        id: auth_id,
        role: AuthRoleEnum.DELIVERY,
        status: AuthStatusEnum.ACTIVE,
      },
      select: {
        id: true,
        user_id: true,
      },
    });

    if (!auth) {
      throw new ForbiddenException(
        'Siz delivery sifatida tasdiqlanmagansiz yoki profilingiz faol emas.',
      );
    }

    return auth;
  }

  private async acceptReadyOrderByDeliveryUserId({
    order_id,
    delivery_user_id,
  }: {
    order_id: string;
    delivery_user_id: number;
  }) {
    const result = await this.dataSource.transaction(async (manager) => {
      const order = await manager.findOne(Order, {
        where: { id: order_id },
        lock: { mode: 'pessimistic_write' },
      });

      if (!order) throw new NotFoundException('Buyurtma topilmadi!');

      if (order.order_type !== OrderTypeEnum.DELIVERY) {
        throw new BadRequestException(
          "Bu buyurtma delivery turiga kirmaydi, uni qabul qilib bo'lmaydi.",
        );
      }

      if (order.status !== OrderStatusEnum.READY) {
        throw new BadRequestException(
          'Buyurtma hali deliveryga tayyor emas yoki allaqachon jarayonga olingan.',
        );
      }

      const existingActive = await manager.findOne(DeliveryAssignment, {
        where: {
          order_id,
          status: In(this.activeAssignmentStatuses),
        },
        order: { created_at: 'DESC' },
      });

      if (existingActive) {
        if (existingActive.delivery_id === delivery_user_id) {
          return {
            assignment: existingActive,
            order,
            already_assigned: true,
          };
        }

        throw new BadRequestException(
          'Buyurtma boshqa delivery tomonidan allaqachon qabul qilingan.',
        );
      }

      const assignment = manager.create(DeliveryAssignment, {
        order_id,
        delivery_id: delivery_user_id,
        status: DeliveryAssignmentStatusEnum.ASSIGNED,
        accepted_at: new Date(),
      });

      const savedAssignment = await manager.save(
        DeliveryAssignment,
        assignment,
      );

      return {
        assignment: savedAssignment,
        order,
        already_assigned: false,
      };
    });

    await Promise.all([
      this.userService.invalidateUserCacheByUserId(result.order.user_id),
      this.orderGateway.handleOrder({
        user_id: result.order.user_id,
        order: result.order,
      }),
    ]);

    return result;
  }

  private async markPickedUpByDeliveryUserId({
    order_id,
    delivery_user_id,
  }: {
    order_id: string;
    delivery_user_id: number;
  }) {
    const { order, assignment } = await this.dataSource.transaction(
      async (manager) => {
        const order = await manager.findOne(Order, {
          where: { id: order_id },
          lock: { mode: 'pessimistic_write' },
        });

        if (!order) throw new NotFoundException('Buyurtma topilmadi!');

        const assignment = await manager.findOne(DeliveryAssignment, {
          where: {
            order_id,
            delivery_id: delivery_user_id,
          },
          order: { created_at: 'DESC' },
        });

        if (!assignment) {
          throw new NotFoundException(
            'Bu buyurtma sizga biriktirilmagan yoki qabul qilinmagan.',
          );
        }

        if (assignment.status !== DeliveryAssignmentStatusEnum.ASSIGNED) {
          throw new BadRequestException(
            "Buyurtma pickup bosqichida emas. Joriy holatda 'olib ketdim' qilib bo'lmaydi.",
          );
        }

        assignment.status = DeliveryAssignmentStatusEnum.PICKED_UP;
        await manager.save(DeliveryAssignment, assignment);

        if (order.status === OrderStatusEnum.READY) {
          order.status = OrderStatusEnum.ON_WAY;
          await manager.save(Order, order);
        }

        return { order, assignment };
      },
    );

    await Promise.all([
      this.userService.invalidateUserCacheByUserId(order.user_id),
      this.orderGateway.handleOrder({
        user_id: order.user_id,
        order,
      }),
    ]);

    return { order, assignment };
  }

  private async markDeliveredByDeliveryUserId({
    order_id,
    delivery_user_id,
  }: {
    order_id: string;
    delivery_user_id: number;
  }) {
    const { order, assignment } = await this.dataSource.transaction(
      async (manager) => {
        const order = await manager.findOne(Order, {
          where: { id: order_id },
          lock: { mode: 'pessimistic_write' },
        });

        if (!order) throw new NotFoundException('Buyurtma topilmadi!');

        if (order.status === OrderStatusEnum.CANCELLED) {
          throw new BadRequestException(
            "Buyurtma bekor qilingan. Yetkazildi holatiga o'tkazib bo'lmaydi.",
          );
        }

        const assignment = await manager.findOne(DeliveryAssignment, {
          where: {
            order_id,
            delivery_id: delivery_user_id,
          },
          order: { created_at: 'DESC' },
        });

        if (!assignment) {
          throw new NotFoundException(
            'Bu buyurtma sizga biriktirilmagan yoki qabul qilinmagan.',
          );
        }

        if (assignment.status === DeliveryAssignmentStatusEnum.DELIVERED) {
          return { order, assignment };
        }

        if (
          assignment.status !== DeliveryAssignmentStatusEnum.PICKED_UP &&
          assignment.status !== DeliveryAssignmentStatusEnum.ASSIGNED
        ) {
          throw new BadRequestException(
            "Buyurtmani yetkazildi holatiga o'tkazish uchun avval qabul qilish kerak.",
          );
        }

        assignment.status = DeliveryAssignmentStatusEnum.DELIVERED;
        assignment.delivered_at = new Date();
        await manager.save(DeliveryAssignment, assignment);

        if (order.status !== OrderStatusEnum.DELIVERED) {
          order.status = OrderStatusEnum.DELIVERED;
          await manager.save(Order, order);
        }

        return { order, assignment };
      },
    );

    await Promise.all([
      this.userService.invalidateUserCacheByUserId(order.user_id),
      this.orderGateway.handleOrder({
        user_id: order.user_id,
        order,
      }),
    ]);

    return { order, assignment };
  }

  async acceptReadyOrderByTelegram({
    telegram_id,
    order_id,
  }: {
    telegram_id: string;
    order_id: string;
  }) {
    const auth = await this.findDeliveryAuthByTelegram(telegram_id);
    return this.acceptReadyOrderByDeliveryUserId({
      order_id,
      delivery_user_id: auth.user_id,
    });
  }

  async markPickedUpByTelegram({
    telegram_id,
    order_id,
  }: {
    telegram_id: string;
    order_id: string;
  }) {
    const auth = await this.findDeliveryAuthByTelegram(telegram_id);
    return this.markPickedUpByDeliveryUserId({
      order_id,
      delivery_user_id: auth.user_id,
    });
  }

  async markDeliveredByTelegram({
    telegram_id,
    order_id,
  }: {
    telegram_id: string;
    order_id: string;
  }) {
    const auth = await this.findDeliveryAuthByTelegram(telegram_id);
    return this.markDeliveredByDeliveryUserId({
      order_id,
      delivery_user_id: auth.user_id,
    });
  }

  async cancelActiveByOrderId(order_id: string) {
    await this.deliveryAssignmentRepository.update(
      {
        order_id,
        status: In(this.activeAssignmentStatuses),
      },
      {
        status: DeliveryAssignmentStatusEnum.CANCELLED,
      },
    );
  }

  async acceptReadyOrderByAuthId({
    auth_id,
    order_id,
  }: {
    auth_id: number;
    order_id: string;
  }) {
    const auth = await this.findDeliveryAuthById(auth_id);
    return this.acceptReadyOrderByDeliveryUserId({
      order_id,
      delivery_user_id: auth.user_id,
    });
  }

  async markPickedUpByAuthId({
    auth_id,
    order_id,
  }: {
    auth_id: number;
    order_id: string;
  }) {
    const auth = await this.findDeliveryAuthById(auth_id);
    return this.markPickedUpByDeliveryUserId({
      order_id,
      delivery_user_id: auth.user_id,
    });
  }

  async markDeliveredByAuthId({
    auth_id,
    order_id,
  }: {
    auth_id: number;
    order_id: string;
  }) {
    const auth = await this.findDeliveryAuthById(auth_id);
    return this.markDeliveredByDeliveryUserId({
      order_id,
      delivery_user_id: auth.user_id,
    });
  }
}
