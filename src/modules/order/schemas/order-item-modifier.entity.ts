import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { OrderItem } from './order-item.entity';
import { Modifier } from '../../modifier/modifier.entity';

@Entity('order_item_modifiers')
export class OrderItemModifier {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => OrderItem, (item) => item.order_item_modifiers)
  @JoinColumn({ name: 'order_item_id' })
  order_item: OrderItem;

  @Column()
  order_item_id: number;

  @ManyToOne(() => Modifier)
  @JoinColumn({ name: 'modifier_id' })
  modifier: Modifier;

  @Column()
  modifier_id: string; // AliPos modifikator ID'si

  @Column()
  quantity: number;

  @Column()
  modifier_name: string;

  @Column({ type: 'decimal' })
  price: number;

  @UpdateDateColumn()
  updated_at: Date;

  @CreateDateColumn()
  created_at: Date;
}
