import { CoinSettings } from '../modules/coinSettings/coin-settings.entity';

const formatMoney = (value: number): string => {
  return new Intl.NumberFormat('uz-UZ', {
    maximumFractionDigits: 2,
  }).format(value);
};

const formatNumber = (value: number): string => {
  return new Intl.NumberFormat('uz-UZ', {
    maximumFractionDigits: 2,
  }).format(value);
};

export const buildCoinUsageInfo = (
  coinSettings: CoinSettings | null,
): string => {
  if (!coinSettings) {
    return "Coin sozlamalari hali o'rnatilmagan.";
  }

  if (!coinSettings.is_active) {
    return "Coin tizimi vaqtincha o'chirilgan.";
  }

  const valuePerCoin = Number(coinSettings.value_per_coin);
  const spendAmountForOneCoin = Number(coinSettings.spend_amount_for_one_coin);
  const minSpendLimit = Number(coinSettings.min_spend_limit);
  const minCoinValueToUse = Number(coinSettings.min_coin_value_to_use);
  const maxCoinsPerOrder = Number(coinSettings.max_coins_per_order);

  if (
    !Number.isFinite(valuePerCoin) ||
    valuePerCoin <= 0 ||
    !Number.isFinite(spendAmountForOneCoin) ||
    spendAmountForOneCoin <= 0
  ) {
    return "Coin sozlamalarida qiymatlar noto'g'ri kiritilgan, iltimos administratorga murojaat qiling.";
  }

  const cashbackPercent = (valuePerCoin / spendAmountForOneCoin) * 100;
  const coinsPer1000Som = 1000 / spendAmountForOneCoin;
  const requiredCoinsToUse =
    minCoinValueToUse > 0 ? minCoinValueToUse / valuePerCoin : 0;

  const earnCondition =
    minSpendLimit > 0
      ? `Xaridingiz ${formatMoney(minSpendLimit)} so'mdan oshsa`
      : 'Har bir xaridingizda';

  const maxCoinPart =
    Number.isFinite(maxCoinsPerOrder) && maxCoinsPerOrder > 0
      ? ` Bitta buyurtmadan maksimal ${formatNumber(maxCoinsPerOrder)} coin yig'ish mumkin.`
      : '';

  const useCondition =
    minCoinValueToUse > 0
      ? ` Coinlarni ishlatish uchun balansingiz kamida ${formatMoney(minCoinValueToUse)} so'm (${formatNumber(requiredCoinsToUse)} coin) ekvivalentiga yetgan bo'lishi kerak.`
      : ' Coinlarni keyingi xaridlaringizda ishlatishingiz mumkin.';

  return `${earnCondition}, sizga xarid summasining ${cashbackPercent.toFixed(2)}% qismi cashback sifatida coin ko'rinishida qaytadi (${formatMoney(spendAmountForOneCoin)} so'm = 1 coin, 1 coin = ${formatMoney(valuePerCoin)} so'm). 1 000 so'm xarid uchun taxminan ${formatNumber(coinsPer1000Som)} coin beriladi.${maxCoinPart}${useCondition}`;
};
