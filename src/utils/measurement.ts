import { Currency, convertPrice, formatPrice } from './currency';

export function convertWeight(lbsValue: number, system: 'US' | 'IND'): { value: number; unit: string } {
  if (system === 'IND') {
    return {
      value: lbsValue * 0.45359237,
      unit: 'kg'
    };
  }
  return {
    value: lbsValue,
    unit: 'lb'
  };
}

export function formatWeight(lbsValue: number, system: 'US' | 'IND', showUnit: boolean = true): string {
  const converted = convertWeight(lbsValue, system);
  const formattedVal = converted.value.toFixed(1);
  return showUnit ? `${formattedVal} ${converted.unit === 'lb' ? (lbsValue === 1 ? 'lb' : 'lbs') : 'kg'}` : formattedVal;
}

export function convertDistance(milesValue: number, system: 'US' | 'IND'): { value: number; unit: string } {
  if (system === 'IND') {
    return {
      value: milesValue * 1.609344,
      unit: 'km'
    };
  }
  return {
    value: milesValue,
    unit: 'miles'
  };
}

export function formatDistance(milesValue: number, system: 'US' | 'IND'): string {
  const converted = convertDistance(milesValue, system);
  const formattedVal = converted.value.toFixed(1);
  // Translate "miles"/"km"
  const unitStr = converted.unit === 'miles' ? (milesValue === 1 ? 'mile' : 'miles') : 'km';
  return `${formattedVal} ${unitStr}`;
}

export function parseAndFormatTextWeight(text: string, system: 'US' | 'IND'): string {
  // If text is like "3 lbs" or "4 lbs" or "1.5 lbs"
  const match = text.match(/^([\d.]+)\s*(lbs|lb|pounds|pound|kg|g)?$/i);
  if (match) {
    const val = parseFloat(match[1]);
    const unit = match[2] ? match[2].toLowerCase() : '';
    if (unit === 'lbs' || unit === 'lb' || unit === 'pounds' || unit === 'pound' || !unit) {
      return formatWeight(val, system);
    }
  }
  return text;
}

export function convertAndFormatProductWeight(usdPrice: number, baseUnit: string, system: 'US' | 'IND', currency: Currency = 'USD') {
  let displayUnit = baseUnit;
  let displayPriceUsd = usdPrice;

  const isWeightUnit = baseUnit.toLowerCase() === 'lb' || baseUnit.toLowerCase() === 'lbs' || baseUnit.toLowerCase() === 'pound' || baseUnit.toLowerCase() === 'pounds';

  if (system === 'IND' && isWeightUnit) {
    displayUnit = 'kg';
    displayPriceUsd = usdPrice * 2.20462262; // 1 kg = 2.20462 lbs, so price/kg is price/lb * 2.2
  }

  const convertedPrice = convertPrice(displayPriceUsd, currency);
  const formattedPriceStr = formatPrice(displayPriceUsd, currency);

  return {
    unit: displayUnit,
    price: convertedPrice,
    displayPriceUsd,
    formatted: formattedPriceStr,
    full: `${formattedPriceStr}/${displayUnit}`
  };
}
