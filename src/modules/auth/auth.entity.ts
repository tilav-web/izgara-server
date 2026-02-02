import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { AuthRoleEnum } from './enums/auth-role.enum';
import { AuthStatusEnum } from './enums/status.enum';
import { User } from '../user/user.entity';

@Entity('auths')
export class Auth {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 12, unique: true, nullable: false })
  phone: string;

  @Column({ type: 'text', nullable: true })
  password: string;

  @Column({ type: 'enum', enum: AuthRoleEnum, default: AuthRoleEnum.USER })
  role: AuthRoleEnum;

  @Column({
    type: 'enum',
    enum: AuthStatusEnum,
    default: AuthStatusEnum.ACTIVE,
  })
  status: AuthStatusEnum;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // *************************
  @OneToOne(() => User, (user) => user.auth, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  user_id: number;
}
