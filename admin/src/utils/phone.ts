/**
 * Normalize phone numbers so that variants like +7XXXXXXXXXX and 8XXXXXXXXXX
 * map to the same canonical 11-digit form. Returns digits only.
 */
export function normalizePhoneNumber(input: string): string {
  const digitsOnly = (input ?? '').replace(/\D/g, '');
  if (!digitsOnly) return '';

  // Prefer the last 10 digits (local part) and prefix with `7` for CIS numbers
  if (digitsOnly.length >= 10) {
    const localPart = digitsOnly.slice(-10);
    return `7${localPart}`;
  }

  // Fallback: replace a leading 8 with 7 if present
  if (digitsOnly.startsWith('8')) {
    return `7${digitsOnly.slice(1)}`;
  }

  return digitsOnly;
}

/**
 * Compare two phone numbers after normalization.
 */
export function phonesEqual(a?: string | null, b?: string | null): boolean {
  return !!a && !!b && normalizePhoneNumber(a) === normalizePhoneNumber(b);
}
