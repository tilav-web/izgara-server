import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { AuthRoleEnum } from "./enums/auth-role.enum";
import { AuthStatusEnum } from "./utils/status.enum";

@Entity('auths')
export class Auth {
    @PrimaryGeneratedColumn()
    id: number

    @Column({ type: 'varchar', length: 13, unique: true, nullable: false })
    phone: string

    @Column({ type: 'text', nullable: true })
    password: string

    @Column({ type: 'enum', enum: AuthRoleEnum, default: AuthRoleEnum.USER })
    role: AuthRoleEnum

    @Column({ type: 'enum', enum: AuthStatusEnum, default: AuthStatusEnum.ACTIVE })
    status: AuthStatusEnum

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
}