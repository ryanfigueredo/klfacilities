export function slugify(s: string): string {
  const base = s ?? '';

  let normalized = base;
  try {
    normalized = base.normalize('NFD');
  } catch {
    // String.prototype.normalize might not exist in very old environments.
  }

  return normalized
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-');
}
