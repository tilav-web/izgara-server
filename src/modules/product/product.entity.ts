import { Column, Entity, PrimaryColumn, ManyToOne, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
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

    @Column()
    vat: number; // QQS stavkasi foizda [cite: 56]

    @Column({ type: 'enum', enum: MeasureEnum, default: MeasureEnum.PCS })
    measure_unit: MeasureEnum; // O'lchov birligi (0-шт, 1-кг, 2-л) [cite: 63]

    @Column({ default: 0 })
    sort_order: number; // Kategoriyasi ichidagi tartib raqami [cite: 42]

    @Column({ default: false })
    is_active: boolean; // Mahsulot stop-listda ekanligi (Webhook orqali boshqariladi) [cite: 161]

    @ManyToOne(() => Category, (category) => category.products)
    category: Category;

    @OneToMany(() => ModifierGroup, (group) => group.product)
    modifier_groups: ModifierGroup[]; // Mahsulotga tegishli qo'shimchalar guruhlari [cite: 69]

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
}