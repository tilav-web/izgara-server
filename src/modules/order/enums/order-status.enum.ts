export enum OrderStatusEnum {
  NEW = 'NEW', // yangi
  IN_PROGRESS = 'IN_PROGRESS', // tayyorlanmoqda yoki jarayonda
  READY = 'READY', // tayyor olib ketish uchun yoki kuriyerga berish uchun
  ON_WAY = 'ON_WAY', // yo'lda yetkazib berish uchun
  DELIVERED = 'DELIVERED', // yetkazildi
  CANCELLED = 'CANCELLED', // bekor qilindi
}
