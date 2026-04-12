const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value: string): boolean {
  return EMAIL_PATTERN.test(value.trim());
}

/**
 * Normalizes mobile to exactly 10 digits (India-oriented):
 * - 10 consecutive digits, or
 * - 12 digits starting with 91 → last 10, or
 * - 11 digits starting with 0 → last 10 (leading 0 trunk prefix).
 * Returns null if the value cannot be normalized to 10 digits.
 */
export function canonicalMobile(value: string): string | null {
  const d = value.replace(/\D/g, "");
  if (d.length === 10) {
    return d;
  }
  if (d.length === 12 && d.startsWith("91")) {
    return d.slice(-10);
  }
  if (d.length === 11 && d.startsWith("0")) {
    return d.slice(-10);
  }
  return null;
}

/** True when the input can be normalized to a 10-digit mobile. */
export function isValidMobile(value: string): boolean {
  return canonicalMobile(value) !== null;
}

export function mobileDigits(value: string): string {
  return value.replace(/\D/g, "");
}

export function looksLikeEmail(value: string): boolean {
  return value.includes("@");
}
