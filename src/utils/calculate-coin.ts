import { CoinSettings } from '../modules/coinSettings/coin-settings.entity';

export const calculatePriceToCoin = ({
  product_price,
  coinSettings,
}: {
  product_price: number;
  coinSettings: CoinSettings | null;
}): { coin_price: string } => {
  if ((coinSettings && !coinSettings.is_active) || !coinSettings)
    return { coin_price: '0.00' };

  const spendAmountForOneCoin = Number(coinSettings.spend_amount_for_one_coin);
  const productPrice = Number(product_price);
  if (
    !Number.isFinite(spendAmountForOneCoin) ||
    spendAmountForOneCoin <= 0 ||
    !Number.isFinite(productPrice) ||
    productPrice <= 0
  )
    return { coin_price: '0.00' };

  const coin_price = (productPrice / spendAmountForOneCoin).toFixed(2);

  return { coin_price };
};

export const calculateEarnedCoinsToPrice = ({
  total_price,
  coinSettings,
}: {
  total_price: number;
  coinSettings: CoinSettings | null;
}) => {
  if ((coinSettings && !coinSettings.is_active) || !coinSettings)
    return { earned_coins: '0.00' };

  const spendAmount = Number(coinSettings.spend_amount_for_one_coin);
  const minSpendLimit = Number(coinSettings.min_spend_limit);
  const maxCoinsPerOrder = Number(coinSettings.max_coins_per_order);

  const totalPrice = Number(total_price);

  if (!Number.isFinite(totalPrice) || totalPrice <= 0) {
    return { earned_coins: '0.00' };
  }

  if (!Number.isFinite(spendAmount) || spendAmount <= 0)
    return { earned_coins: '0.00' };
  if (Number.isFinite(minSpendLimit) && totalPrice < minSpendLimit)
    return { earned_coins: '0.00' };

  let earnedCoins = totalPrice / spendAmount;

  if (Number.isFinite(maxCoinsPerOrder) && maxCoinsPerOrder > 0) {
    earnedCoins = Math.min(earnedCoins, maxCoinsPerOrder);
  }

  const earned_coins = earnedCoins.toFixed(2);
  return { earned_coins };
};
