export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function normalizeMobile(value: string): string {
  return value.trim().replace(/\s+/g, "");
}

export function isProbablyEmail(value: string): boolean {
  return value.includes("@");
}
