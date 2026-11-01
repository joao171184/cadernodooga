export function authorCredit(autor?: string) {
  const name = autor?.trim();
  return name ? { "@type": "Person" as const, name } : undefined;
}