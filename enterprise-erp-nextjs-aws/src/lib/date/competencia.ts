export function getCompetencia(date: Date): Date {
  const d = new Date(date);
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
