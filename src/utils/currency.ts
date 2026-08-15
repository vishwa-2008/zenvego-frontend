export type Currency = 'USD' | 'INR' | 'EUR' | 'GBP' | 'CAD' | 'AUD' | 'JPY';

export const EXCHANGE_RATES: Record<Currency, number> = {
  USD: 1,
  INR: 83.5,
  EUR: 0.93,
  GBP: 0.79,
  CAD: 1.36,
  AUD: 1.51,
  JPY: 155.4,
};

export function convertPrice(usdAmount: number, currency: Currency): number {
  return usdAmount * EXCHANGE_RATES[currency];
}

export function formatPrice(usdAmount: number, currency: Currency): string {
  const converted = convertPrice(usdAmount, currency);
  
  if (currency === 'INR') {
    return `₹${converted.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: currency === 'JPY' ? 0 : 2,
    maximumFractionDigits: currency === 'JPY' ? 0 : 2,
  }).format(converted);
}
