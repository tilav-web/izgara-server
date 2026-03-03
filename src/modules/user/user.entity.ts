import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { AuthStatusEnum } from '../auth/enums/status.enum';
import { AuthRoleEnum } from '../auth/enums/auth-role.enum';
import { Order } from '../order/schemas/order.entity';
import { Auth } from '../auth/auth.entity';
import { DeliveryAssignment } from '../deliveryAssignments/delivery_assignments.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToMany(() => Order, (order) => order.user)
  orders: Order[];

  @OneToMany(() => DeliveryAssignment, (assignment) => assignment.delivery)
  delivery_assignments: DeliveryAssignment[];

  @Column({ type: 'varchar', length: 12 })
  phone: string;

  @Column({ type: 'varchar', length: 50, nullable: true, default: '-' })
  first_name: string;

  @Column({ type: 'varchar', length: 50, nullable: true, default: '-' })
  last_name: string;

  @Column({ type: 'text', nullable: true, default: null })
  image: string;

  @Column({
    type: 'enum',
    enum: AuthStatusEnum,
    default: AuthStatusEnum.ACTIVE,
  })
  status: AuthStatusEnum;

  @Column({ type: 'enum', enum: AuthRoleEnum, default: AuthRoleEnum.USER })
  role: AuthRoleEnum;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  coin_balance: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // **********************
  @OneToOne(() => Auth, (auth) => auth.user)
  auth: Auth;
}
