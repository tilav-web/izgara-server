export const generateClickUrl = ({ amount, order_id }: { amount: number, order_id: string }) => {
    const service_id = process.env.CLICK_SERVICE_ID;
    const merchant_id = process.env.CLICK_MERCHANT_ID;
    const return_url = process.env.CLICK_RETURN_URL;

    if (!service_id || !merchant_id || !return_url) {
        throw new Error("Click to'lov tizimi sozlamalari to'liq emas!");
    }

    // 2. Parametrlarni yig'amiz
    const params = new URLSearchParams({
        service_id: service_id,
        merchant_id: merchant_id,
        amount: amount.toString(),
        transaction_param: order_id,
        return_url: return_url
    });

    return `https://my.click.uz/services/pay?${params.toString()}`;
};