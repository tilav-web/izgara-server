import {
  Column,
  Entity,
  PrimaryColumn,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ModifierGroup } from '../modifierGroup/modifier-group.entity';

@Entity('modifiers')
export class Modifier {
  @PrimaryColumn()
  id: string; // Modifikatorning AliPos UUID identifikatori

  @Column()
  name: string; // Qo'shimcha nomi (masalan: "Ketchup")

  @Column({ type: 'text', nullable: true, default: null })
  image: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  price: number; // Qo'shimchaning alohida narxi

  @Column({ default: 1 })
  max_quantity: number; // Mijoz nechta tanlay olishi mumkinligi

  @Column({ default: true })
  is_active: boolean;

  @Column({ default: 0 })
  sort_order: number; // Guruh ichidagi tartibi

  @ManyToOne(() => ModifierGroup, (group) => group.modifiers)
  group: ModifierGroup; // Modifikator tegishli bo'lgan guruh

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
