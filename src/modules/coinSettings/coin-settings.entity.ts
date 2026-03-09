import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('coin_settings')
export class CoinSettings {
  @PrimaryGeneratedColumn()
  id: number;

  // 1 ta coin foydalanuvchi uchun necha pulga teng?
  // Masalan: 1 coin = 500 so'm (chegirma sifatida ishlatganda)
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  value_per_coin: number;

  // Har qancha xarid uchun 1 coin beriladi?
  // Masalan: 10,000 so'mga 1 coin.
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  spend_amount_for_one_coin: number;

  // Minimal xarid summasi (shundan kam bo'lsa coin berilmaydi)
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  min_spend_limit: number;

  // Coin ishlatish uchun foydalanuvchi coin balansining minimal pul ekvivalenti (so'mda)
  // Masalan: 100000 bo'lsa, user coin_balance * value_per_coin >= 100000 bo'lganda ishlata oladi
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  min_coin_value_to_use: number;

  // Maksimal bitta buyurtmadan qancha coin yig'ish mumkin? (Abuse'ni oldini olish uchun)
  @Column({ type: 'int', default: 1000 })
  max_coins_per_order: number;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
