export const generateClickUrl = ({
  amount,
  order_id,
}: {
  amount: number;
  order_id: string;
}) => {
  const service_id = process.env.CLICK_SERVICE_ID;
  const merchant_id = process.env.CLICK_MERCHANT_ID;
  const merchant_user_id = process.env.CLICK_MERCHANT_USER_ID;
  const return_url = process.env.CLICK_RETURN_URL;

  if (!service_id || !merchant_id || !return_url || !merchant_user_id) {
    throw new Error("Click to'lov tizimi sozlamalari to'liq emas!");
  }

  const params = new URLSearchParams({
    service_id: service_id,
    merchant_id: merchant_id,
    amount: amount.toFixed(2),
    transaction_param: order_id,
    merchant_user_id: merchant_user_id,
    return_url: return_url,
  });

  return `https://my.click.uz/services/pay?${params.toString()}`;
};
