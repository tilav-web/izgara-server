import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('delivery_settings')
export class DeliverySettings {
  @PrimaryGeneratedColumn()
  id: number;

  // Yetkazib berish narxi
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  delivery_price: number;

  // Minimal summa, shu summadan oshsa yetkazib berish tekin
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  free_delivery_threshold: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
