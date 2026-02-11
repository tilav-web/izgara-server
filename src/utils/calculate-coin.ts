import { CoinSettings } from '../modules/coinSettings/coin-settings.entity';

export const claculateCoin = ({
  product_price,
  coinSettings,
}: {
  product_price: number;
  coinSettings: CoinSettings | null;
}): { coin_price: string } => {
  if ((coinSettings && !coinSettings.is_active) || !coinSettings)
    return { coin_price: '0.00' };

  const valuePerCoin = Number(coinSettings.value_per_coin);
  const productPrice = Number(product_price);
  if (valuePerCoin <= 0) return { coin_price: '0.00' };

  const coin_price = (productPrice / valuePerCoin).toFixed(2);

  return { coin_price: parseFloat(coin_price).toString() };
};
