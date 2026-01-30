import { Column, Entity, PrimaryColumn, ManyToOne, OneToMany, CreateDateColumn, UpdateDateColumn, JoinColumn } from 'typeorm';
import { Product } from '../product/product.entity';
import { Modifier } from '../modifier/modifier.entity';

@Entity('modifier_groups')
export class ModifierGroup {
    @PrimaryColumn()
    id: string; // Guruhning AliPos UUID identifikatori [cite: 72]

    @Column()
    name: string; // Guruh nomi (masalan: "Pishloqlar") [cite: 72]

    @Column()
    sort_order: number; // Guruhning ko'rinish tartibi [cite: 72]

    @Column({ type: 'int', default: 0, })
    min_selected_amount: number

    @Column({ type: 'int', default: 1, })
    max_selected_amount: number

    @ManyToOne(() => Product, (product) => product.modifier_groups, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'product_id' }) // Bazada aynan shu nomli ustun ochiladi
    product: Product;

    @Column() // Shunchaki ID bilan ishlash uchun qo'shimcha ustun
    product_id: string;

    @OneToMany(() => Modifier, (modifier) => modifier.group, { cascade: true })
    modifiers: Modifier[];

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
}