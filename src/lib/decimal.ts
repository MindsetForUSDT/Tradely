export function safeAdd(a: number, b: number): number {
  return +(a + b).toFixed(2);
}

export function safeSubtract(a: number, b: number): number {
  return +(a - b).toFixed(2);
}

export function safeMultiply(a: number, b: number): number {
  return +(a * b).toFixed(2);
}

export function safeDivide(a: number, b: number): number {
  if (b === 0) return 0;
  return +(a / b).toFixed(2);
}
