// admin/src/utils/format.ts
// Utility functions for formatting data

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount) + " ₸";
};

export const formatNumber = (num: number): string => {
  return new Intl.NumberFormat("ru-RU").format(num);
};

export const formatPercent = (value: number): string => {
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
};
