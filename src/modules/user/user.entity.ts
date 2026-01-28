import { Column, CreateDateColumn, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Auth } from "../auth/auth.entity";
import { AuthStatusEnum } from "../auth/enums/status.enum";

@Entity('users')
export class User {
    @PrimaryGeneratedColumn()
    id: number

    @Column({ type: 'varchar', length: 12 })
    phone: string

    @Column({ type: 'varchar', length: 50, nullable: true })
    first_name: string

    @Column({ type: 'varchar', length: 50, nullable: true })
    last_name: string

    @Column({ type: 'enum', enum: AuthStatusEnum, default: AuthStatusEnum.ACTIVE })
    status: AuthStatusEnum

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;

    // **********************
    @OneToOne(() => Auth, (auth) => auth.user)
    auth: Auth;
}