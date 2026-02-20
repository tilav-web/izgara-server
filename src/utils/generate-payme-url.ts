import { InternalServerErrorException } from '@nestjs/common';

export const generatePaymeUrl = ({
  amount,
  order_id,
}: {
  amount: number;
  order_id: string;
}) => {
  const merchant_id = process.env.PAYME_MERCHANT_ID;

  if (!merchant_id) {
    throw new InternalServerErrorException(
      "Payme to'lov tizimi sozlamalari to'liq emas!",
    );
  }

  // Payme summani tiyinda qabul qiladi (masalan: 15000.00 so'm -> 1500000 tiyin)
  const amountInTiyin = Math.round(amount * 100);

  // Payme protokoli bo'yicha parametrlarni tayyorlaymiz
  // 'm' - merchant_id
  // 'ac.order_id' - sizning tizimingizdagi buyurtma identifikatori
  // 'a' - to'lov summasi (tiyinda)
  const params = `m=${merchant_id};ac.order_id=${order_id};a=${amountInTiyin}`;

  const encodedParams = Buffer.from(params).toString('base64');

  return `https://checkout.paycom.uz/${encodedParams}`;
};
