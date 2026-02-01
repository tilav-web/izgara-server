import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Order } from "../order/schemas/order.entity";
import { PaymentProviderEnum } from "./enums/payment-provider.enum";
import { PaymentStatusEnum } from "./enums/payment-status.enum";

@Entity('payment_transactions')
export class PaymentTransaction {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => Order)
    @JoinColumn({ name: 'order_id' })
    order: Order;

    // 2. ID-ni o'ziga ham kirish imkoniyati (Qulaylik uchun)
    @Column({ name: 'order_id' })
    order_id: string;

    @Column({ type: 'enum', enum: PaymentProviderEnum })
    provider: PaymentProviderEnum; // Qaysi tizim orqali to'langan

    @Column({ nullable: true })
    provider_transaction_id: string; // Click yoki Payme bergan ID

    @Column({ type: 'decimal', precision: 12, scale: 2 })
    amount: number;

    @Column({ type: 'enum', enum: PaymentProviderEnum, default: PaymentStatusEnum.PENDING })
    status: PaymentStatusEnum;


    @UpdateDateColumn()
    updated_at: Date;

    @CreateDateColumn()
    created_at: Date;
}