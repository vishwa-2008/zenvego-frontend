import React from 'react';
import { Currency, EXCHANGE_RATES } from '../utils/currency';

interface CurrencySelectorProps {
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  className?: string;
}

const CURRENCIES: { code: Currency, symbol: string }[] = [
  { code: 'USD', symbol: '$' },
  { code: 'INR', symbol: '₹' },
  { code: 'EUR', symbol: '€' },
  { code: 'GBP', symbol: '£' },
  { code: 'CAD', symbol: '$' },
  { code: 'AUD', symbol: '$' },
  { code: 'JPY', symbol: '¥' },
];

export default function CurrencySelector({ currency, setCurrency, className = "" }: CurrencySelectorProps) {
  return (
    <div className={`flex items-center gap-1.5 p-1 bg-surface-container rounded-xl border border-surface-container-high ${className}`}>
      <div className="relative">
        <select
          value={currency}
          onChange={(e) => setCurrency(e.target.value as Currency)}
          className="appearance-none bg-transparent pl-3 pr-7 py-1 text-[11px] font-extrabold text-on-surface focus:outline-none cursor-pointer"
        >
          {CURRENCIES.map(c => (
            <option key={c.code} value={c.code}>
              {c.symbol} {c.code}
            </option>
          ))}
        </select>
        <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
          <span className="material-symbols-outlined text-[14px] text-on-surface-variant">expand_more</span>
        </div>
      </div>
      
      {/* Expose the rate for clarity */}
      {currency !== 'USD' && (
        <span className="hidden lg:inline text-[9px] font-mono text-outline px-1.5 border-l border-surface-container-high ml-1" title="Stable local ledger conversion rate">
          $1 = {CURRENCIES.find(c => c.code === currency)?.symbol}{EXCHANGE_RATES[currency]}
        </span>
      )}
    </div>
  );
}
