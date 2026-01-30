import { Column, Entity, PrimaryColumn, ManyToOne, OneToMany, CreateDateColumn, UpdateDateColumn, JoinColumn } from 'typeorm';
import { Category } from '../category/category.entity';
import { MeasureEnum } from './enums/measure.enum';
import { ModifierGroup } from '../modifierGroup/modifier-group.entity';

@Entity('products')
export class Product {
    @PrimaryColumn()
    id: string;

    @Column()
    name: string;

    @Column({ nullable: true, type: 'text' })
    description: string;

    @Column({ type: 'decimal', precision: 12, scale: 2 })
    price: number;

    @Column({ type: 'text', nullable: true, default: null })
    image: string

    @Column()
    vat: number; // QQS stavkasi foizda 

    @Column({ type: 'enum', enum: MeasureEnum, default: MeasureEnum.PCS })
    measure_unit: MeasureEnum; // O'lchov birligi (0-шт, 1-кг, 2-л)

    @Column({ type: 'float', default: 0 })
    measure: number; // Mahsulot hajmi yoki og'irligi (masalan: 1.5 yoki 0.5)

    @Column({ default: 0 })
    sort_order: number; // Kategoriyasi ichidagi tartib raqami [cite: 42]

    @Column({ default: false })
    is_active: boolean; // Mahsulot stop-listda ekanligi (Webhook orqali boshqariladi) [cite: 161]

    @Column()
    category_id: string;

    @ManyToOne(() => Category, (category) => category.products)
    @JoinColumn({ name: 'category_id' })
    category: Category;

    @OneToMany(() => ModifierGroup, (group) => group.product, { cascade: true })
    modifier_groups: ModifierGroup[];

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
}