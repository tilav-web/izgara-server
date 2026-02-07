import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { OrderItem } from './order-item.entity';
import { OrderStatusEnum } from '../enums/order-status.enum';
import { OrderPaymentMethodEnum } from '../enums/order-payment-status.enum';
import { User } from '../../user/user.entity';
import { PaymentStatusEnum } from '../../payment/enums/payment-status.enum';
import { PaymentTransaction } from '../../payment/payment-transaction.entity';
import { OrderTypeEnum } from '../enums/order-type.enum';
import { Location } from '../../location/location.entity';

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.orders)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  user_id: number;

  @Column({ nullable: true })
  alipos_order_id: string; // AliPos qaytargan ID (Webhook uchun kerak)

  @Column({ nullable: true })
  order_number: string; // Mijozga ko'rsatiladigan qisqa raqam (masalan: #542)

  @Column({ type: 'decimal', default: 0 })
  used_coins: number; // Mijoz ishlatgan coinlar miqdori

  @Column({ type: 'decimal', default: 0 })
  cash_amount: number; // Real pul bilan to'lanadigan qism

  @Column({ type: 'decimal', default: 0 })
  earned_coins: number; // Ushbu buyurtmadan yig'ilgan coinlar

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  total_price: number; // Buyurtmaning umumiy summasi (coinlar ayirilmasdan oldingi yoki keyingi)

  @Column({ type: 'enum', enum: OrderStatusEnum, default: OrderStatusEnum.NEW })
  status: OrderStatusEnum; // NEW, IN_PROGRESS, READY, DELIVERED, CANCELLED

  @Column({
    type: 'enum',
    enum: OrderTypeEnum,
    default: OrderTypeEnum.DELIVERY,
  })
  order_type: OrderTypeEnum;

  @Column({
    type: 'enum',
    enum: OrderPaymentMethodEnum,
  })
  payment_method: OrderPaymentMethodEnum;

  @OneToMany(() => PaymentTransaction, (transaction) => transaction.order)
  transactions: PaymentTransaction[];

  @Column({
    type: 'enum',
    enum: PaymentStatusEnum,
    default: PaymentStatusEnum.PENDING,
  })
  payment_status: PaymentStatusEnum;

  @Column({ type: 'text', nullable: true })
  address: string;

  @Column()
  customer_phone: string;

  @ManyToOne(() => Location, { nullable: true })
  @JoinColumn({ name: 'location_id' })
  location: Location;

  @Column({ name: 'location_id', nullable: true })
  location_id: string;

  // Koordinatalarni order ichida ham saqlash (snapshot)
  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  lat: number;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  lng: number;

  @UpdateDateColumn()
  updated_at: Date;

  @CreateDateColumn()
  created_at: Date;

  @OneToMany(() => OrderItem, (item) => item.order, { cascade: true })
  items: OrderItem[];
}
