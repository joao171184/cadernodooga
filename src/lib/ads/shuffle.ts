/** Fisher–Yates: ordem aleatória por visitante / carregamento de página. */
export function shuffleAds<T>(items: T[]): T[] {
  const list = items.slice();
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}
