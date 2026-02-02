import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { OrderItem } from './order-item.entity';

@Entity('order_item_modifiers')
export class OrderItemModifier {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => OrderItem, (item) => item.selected_modifiers)
  order_item: OrderItem;

  @Column()
  modifier_id: string; // AliPos modifikator ID'si

  @Column()
  name: string;

  @Column({ type: 'decimal' })
  price: number;

  @UpdateDateColumn()
  updated_at: Date;

  @CreateDateColumn()
  created_at: Date;
}
