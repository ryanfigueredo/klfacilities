export function parseBRLToNumber(txt: string) {
  return Number(
    String(txt ?? '')
      .replace(/[\sR$]/g, '')
      .replace(/\./g, '')
      .replace(',', '.')
  );
}

export function normName(s: string) {
  return String(s ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toUpperCase()
    .trim()
    .replace(/\s{2,}/g, ' ');
}
