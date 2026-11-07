export function authorCredit(autor?: string | null) {
  const name = autor?.trim();
  return name ? { "@type": "Person" as const, name } : undefined;
}