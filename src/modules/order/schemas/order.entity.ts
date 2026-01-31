import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { OrderItem } from "./order-item.entity";
import { OrderStatusEnum } from "../enums/order-status.enum";
import { OrderPaymentStatusEnum } from "../enums/order-payment-status.enum";

@Entity('orders')
export class Order {
    @PrimaryGeneratedColumn('uuid')
    id: string;

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

    @Column({ type: 'enum', enum: OrderStatusEnum, default: OrderStatusEnum.NEW })
    status: OrderStatusEnum; // NEW, IN_PROGRESS, READY, DELIVERED, CANCELLED

    @Column({ type: 'enum', enum: OrderPaymentStatusEnum, default: OrderPaymentStatusEnum.PAYMENT_CASH })
    payment_method: OrderPaymentStatusEnum;

    @Column({ type: 'text', nullable: true })
    address: string;

    @Column()
    customer_phone: string;

    @UpdateDateColumn()
    updated_at: Date;

    @CreateDateColumn()
    created_at: Date;

    @OneToMany(() => OrderItem, (item) => item.order, { cascade: true })
    items: OrderItem[];
}