import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { AuthRoleEnum } from "./enums/auth-role.enum";

@Entity('auths')
export class Auth {
    @PrimaryGeneratedColumn()
    id: number

    @Column({ type: 'varchar', length: 13, unique: true, nullable: false })
    phone: string

    @Column({ type: 'enum', enum: AuthRoleEnum, default: AuthRoleEnum.USER })
    role: AuthRoleEnum

    @Column({ type: 'timestamp', nullable: true })
    last_seen_at: Date;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
}