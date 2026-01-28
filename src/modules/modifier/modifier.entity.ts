import { Column, Entity, PrimaryColumn, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { ModifierGroup } from '../modifierGroup/modifier-group.entity';

@Entity('modifiers')
export class Modifier {
    @PrimaryColumn()
    id: string; // Modifikatorning AliPos UUID identifikatori [cite: 78]

    @Column()
    name: string; // Qo'shimcha nomi (masalan: "Ketchup") [cite: 83]

    @Column({ type: 'decimal', precision: 12, scale: 2 })
    price: number; // Qo'shimchaning alohida narxi [cite: 86]

    @Column({ default: 1 })
    maxQuantity: number; // Mijoz nechta tanlay olishi mumkinligi [cite: 90]

    @Column({ default: 0 })
    sortOrder: number; // Guruh ichidagi tartibi [cite: 92]

    @ManyToOne(() => ModifierGroup, (group) => group.modifiers)
    group: ModifierGroup; // Modifikator tegishli bo'lgan guruh 

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
}