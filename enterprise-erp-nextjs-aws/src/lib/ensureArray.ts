export function ensureArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (value == null) return [] as T[];
  if (typeof value === 'object') return [value as T];
  return [] as T[];
}
