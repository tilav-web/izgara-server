import { CoinSettings } from '../modules/coinSettings/coin-settings.entity';

export const claculateCoin = ({
  product_price,
  coinSettings,
}: {
  product_price: number;
  coinSettings: CoinSettings | null;
}): { coin_price: number } => {
  if ((coinSettings && !coinSettings.is_active) || !coinSettings)
    return { coin_price: 0 };

  const valuePerCoin = Number(coinSettings.value_per_coin);
  const productPrice = Number(product_price);
  if (valuePerCoin <= 0) return { coin_price: 0 };

  const coin_price = productPrice / valuePerCoin;

  return { coin_price };
};
