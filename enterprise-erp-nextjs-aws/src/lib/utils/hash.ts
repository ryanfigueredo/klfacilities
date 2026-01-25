import { createHash } from 'crypto';

export function sha256Hex(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

export function normalizeMoneyToCents(value: number | string): number {
  const n =
    typeof value === 'number'
      ? value
      : Number(
          String(value)
            .replace(/\s/g, '')
            .replace('R$', '')
            .replace(/\./g, '')
            .replace(',', '.')
        );
  return Math.round(n * 100);
}

export function ymd(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
