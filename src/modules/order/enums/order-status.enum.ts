export enum OrderStatusEnum {
  NEW = 'NEW', // yangi
  IN_PROGRESS = 'IN_PROGRESS', // tayyorlanmoqda yoki jarayonda
  ON_WAY = 'ON_WAY', // yo'lda yetkazib berish uchun
  READY = 'READY', // tayyor olib ketish uchun
  CLOSED = 'CLOSED', // Buyurtmachi olib ketdi!
  DELIVERED = 'DELIVERED', // yetkazildi
  CANCELLED = 'CANCELLED', // bekor qilindi
}
