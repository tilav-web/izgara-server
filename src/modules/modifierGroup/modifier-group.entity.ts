import { Column, Entity, PrimaryColumn, ManyToOne, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Product } from '../product/product.entity';
import { Modifier } from '../modifier/modifier.entity';

@Entity('modifier_groups')
export class ModifierGroup {
    @PrimaryColumn()
    id: string; // Guruhning AliPos UUID identifikatori [cite: 72]

    @Column()
    name: string; // Guruh nomi (masalan: "Pishloqlar") [cite: 72]

    @Column()
    sortOrder: number; // Guruhning ko'rinish tartibi [cite: 72]

    @ManyToOne(() => Product, (product) => product.modifier_groups)
    product: Product; // Ushbu guruh qaysi mahsulotga tegishli ekanligi 

    @OneToMany(() => Modifier, (modifier) => modifier.group)
    modifiers: Modifier[]; // Guruh ichidagi aniq qo'shimchalar ro'yxati 

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
}