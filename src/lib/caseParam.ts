// Enlace directo a un caso de la demo: /demo?case=<case_id> (D-29). Función pura, sin imports de valores.

/**
 * - Sin parámetro `case`: null (comportamiento original, ningún caso seleccionado).
 * - `case` válido: ese id.
 * - `case` inválido o vacío: el primer caso disponible (predeterminado), sin error.
 */
export function resolveCaseParam(search: string, validIds: readonly string[]): string | null {
  const params = new URLSearchParams(search.startsWith("?") ? search : `?${search}`);
  if (!params.has("case")) return null;
  const value = (params.get("case") ?? "").trim();
  if (validIds.includes(value)) return value;
  return validIds[0] ?? null;
}

export function caseHref(caseId: string): string {
  return `/demo?case=${encodeURIComponent(caseId)}`;
}
