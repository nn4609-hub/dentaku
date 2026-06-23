import Decimal from "decimal.js";

export type RoundingMode = "half-up" | "floor" | "ceil";

const ROUNDING_MAP: Record<RoundingMode, Decimal.Rounding> = {
  "half-up": Decimal.ROUND_HALF_UP,
  floor: Decimal.ROUND_FLOOR,
  ceil: Decimal.ROUND_CEIL
};

export function normalizeNumberInput(value: string): string {
  return value.replace(/,/g, "").trim();
}

export function isValidDecimalInput(value: string): boolean {
  const normalized = normalizeNumberInput(value);
  return normalized !== "" && /^-?\d*(\.\d*)?$/.test(normalized) && normalized !== "." && normalized !== "-";
}

export function toDecimal(value: string): Decimal {
  return new Decimal(normalizeNumberInput(value));
}

export function roundDecimal(value: Decimal, places: number, mode: RoundingMode): Decimal {
  return value.toDecimalPlaces(places, ROUNDING_MAP[mode]);
}

export function formatDecimal(value: Decimal | string, maxPlaces = 8): string {
  const decimal = value instanceof Decimal ? value : new Decimal(value);
  const fixed = decimal.toDecimalPlaces(maxPlaces, Decimal.ROUND_HALF_UP).toFixed();
  const trimmed = trimFractionZeros(fixed);
  const [integer, fraction] = trimmed.split(".");
  const formattedInteger = new Intl.NumberFormat("ja-JP", {
    maximumFractionDigits: 0,
    useGrouping: true
  }).format(Number(integer));

  return fraction ? `${formattedInteger}.${fraction}` : formattedInteger;
}

export function formatFixed(value: Decimal, places: number): string {
  const rounded = value.toDecimalPlaces(places, Decimal.ROUND_HALF_UP);
  if (places === 0) {
    return formatDecimal(rounded, 0);
  }
  return formatDecimal(rounded.toFixed(places), places);
}

export function formatPlain(value: Decimal | string, maxPlaces = 8): string {
  const decimal = value instanceof Decimal ? value : new Decimal(value);
  return trimFractionZeros(decimal.toDecimalPlaces(maxPlaces, Decimal.ROUND_HALF_UP).toFixed());
}

function trimFractionZeros(value: string): string {
  if (!value.includes(".")) {
    return value;
  }

  return value.replace(/0+$/, "").replace(/\.$/, "");
}
