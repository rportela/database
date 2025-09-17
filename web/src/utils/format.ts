import { format, formatDistanceToNow, isValid, parseISO } from "date-fns";

type DateInput = Date | string | number | null | undefined;

const integerFormatter = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 });
const decimalFormatter = new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 });
const currencyFormatter = new Intl.NumberFormat(undefined, {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 4,
});

const toDate = (value: DateInput): Date | null => {
  if (value instanceof Date) {
    return isValid(value) ? value : null;
  }
  if (typeof value === "string") {
    const parsedIso = parseISO(value);
    if (isValid(parsedIso)) {
      return parsedIso;
    }
    const fallback = new Date(value);
    return isValid(fallback) ? fallback : null;
  }
  if (typeof value === "number") {
    const normalized = value > 1e12 ? value : value * 1000;
    const date = new Date(normalized);
    return isValid(date) ? date : null;
  }
  return null;
};

export const formatInteger = (value: number | null | undefined): string => {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "—";
  }
  return integerFormatter.format(value);
};

export const formatDecimal = (
  value: number | null | undefined,
  fractionDigits: number = 1,
): string => {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "—";
  }
  const formatter = new Intl.NumberFormat(undefined, {
    maximumFractionDigits: fractionDigits,
    minimumFractionDigits: 0,
  });
  return formatter.format(value);
};

export const formatScanVolume = (value: number | null | undefined): string => {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "—";
  }
  if (value >= 1024) {
    return `${decimalFormatter.format(value / 1024)} GB`;
  }
  return `${decimalFormatter.format(value)} MB`;
};

export const formatCurrency = (value: number | null | undefined, currency: string = "USD"): string => {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "—";
  }
  if (currency !== "USD") {
    const dynamicFormatter = new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
    });
    return dynamicFormatter.format(value);
  }
  return currencyFormatter.format(value);
};

export const formatDateLabel = (
  value: DateInput,
  pattern: string = "MMM d, yyyy",
): string => {
  const date = toDate(value);
  if (!date) {
    return "—";
  }
  return format(date, pattern);
};

export const formatRelativeTime = (value: DateInput): string | null => {
  const date = toDate(value);
  if (!date) {
    return null;
  }
  return formatDistanceToNow(date, { addSuffix: true });
};

export const coerceDate = (value: DateInput): Date | null => toDate(value);
