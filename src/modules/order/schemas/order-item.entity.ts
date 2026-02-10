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
import { OrderItemModifier } from './order-item-modifier.entity';
import { Order } from './order.entity';
import { Product } from '../../product/product.entity';

@Entity('order_items')
export class OrderItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  order_id: string;

  @ManyToOne(() => Order, (order) => order.items)
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @ManyToOne(() => Product)
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column()
  product_id: string; // AliPos mahsulot ID'si

  @Column()
  product_name: string; // Mahsulot nomi (narx yoki nom o'zgarsa tarixda qolishi uchun)

  @Column()
  quantity: number;

  @Column({ type: 'decimal' })
  price: number;

  @OneToMany(() => OrderItemModifier, (mod) => mod.order_item, {
    cascade: true,
  })
  modifiers: OrderItemModifier[];

  @UpdateDateColumn()
  updated_at: Date;

  @CreateDateColumn()
  created_at: Date;
}
