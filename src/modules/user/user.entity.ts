import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Auth } from '../auth/auth.entity';
import { AuthStatusEnum } from '../auth/enums/status.enum';
import { AuthRoleEnum } from '../auth/enums/auth-role.enum';
import { Order } from '../order/schemas/order.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToMany(() => Order, (order) => order.user)
  orders: Order[];

  @Column({ type: 'varchar', length: 12 })
  phone: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  first_name: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  last_name: string;

  @Column({ type: 'text', nullable: true })
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
