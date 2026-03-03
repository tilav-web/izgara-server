import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Order } from '../order/schemas/order.entity';
import { User } from '../user/user.entity';
import { DeliveryAssignmentStatusEnum } from './enum/delivery-assignment-status.enum';

@Entity('delivery_assignments')
export class DeliveryAssignment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Order, (order) => order.assignments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @Column({ name: 'order_id' })
  order_id: string;

  @ManyToOne(() => User, (user) => user.delivery_assignments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'delivery_id' })
  delivery: User;

  @Column({ name: 'delivery_id' })
  delivery_id: number;

  @Column({
    type: 'enum',
    enum: DeliveryAssignmentStatusEnum,
    default: DeliveryAssignmentStatusEnum.ASSIGNED,
  })
  status: DeliveryAssignmentStatusEnum;

  @Column({ type: 'timestamp', nullable: true })
  accepted_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  delivered_at: Date;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
