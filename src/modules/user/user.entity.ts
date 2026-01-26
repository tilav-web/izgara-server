import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity('users')
export class User {
    @PrimaryGeneratedColumn()
    id: number

    @Column({ type: 'varchar', length: 50, nullable: true })
    first_name: string

    @Column({ type: 'varchar', length: 50, nullable: true })
    last_name: string
}