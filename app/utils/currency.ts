import currenciesData from "../data/currencies.json";

export interface Currency {
  symbol: string;
  name: string;
  symbol_native: string;
  decimal_digits: number;
  rounding: number;
  code: string;
  name_plural: string;
}

export const searchCurrency = (query: string): Currency[] => {
  if (!query) return [];
  const normalizedQuery = query.toLowerCase().trim();

  const allCurrencies = currenciesData as Record<string, Currency>;

  // O(1) Exact match lookup
  if (allCurrencies[normalizedQuery]) {
    return [allCurrencies[normalizedQuery]];
  }

  // Fallback: Partial match O(N) lookup
  const partialMatches: Currency[] = [];
  for (const name in allCurrencies) {
    if (
      name.includes(normalizedQuery) ||
      allCurrencies[name].code.toLowerCase().includes(normalizedQuery)
    ) {
      partialMatches.push(allCurrencies[name]);
    }
  }

  return partialMatches;
};
