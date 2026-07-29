import { Prisma } from '@prisma/client';

export type DecimalInput = Prisma.Decimal | string | number;

export const DECIMAL_ZERO = new Prisma.Decimal(0);

export function decimal(value: DecimalInput): Prisma.Decimal {
  return value instanceof Prisma.Decimal ? value : new Prisma.Decimal(value);
}

export function decimalMin(left: DecimalInput, right: DecimalInput): Prisma.Decimal {
  const normalizedLeft = decimal(left);
  const normalizedRight = decimal(right);
  return normalizedLeft.lte(normalizedRight) ? normalizedLeft : normalizedRight;
}

export function decimalMax(left: DecimalInput, right: DecimalInput): Prisma.Decimal {
  const normalizedLeft = decimal(left);
  const normalizedRight = decimal(right);
  return normalizedLeft.gte(normalizedRight) ? normalizedLeft : normalizedRight;
}

export function sumDecimals(values: Iterable<DecimalInput>): Prisma.Decimal {
  let result = DECIMAL_ZERO;
  for (const value of values) result = result.plus(decimal(value));
  return result;
}

export function decimalSign(value: DecimalInput): -1 | 0 | 1 {
  const normalized = decimal(value);
  if (normalized.gt(0)) return 1;
  if (normalized.lt(0)) return -1;
  return 0;
}
