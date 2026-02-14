/** @generated —
 * Shared row-to-entity date conversion — handles both Postgres Date objects and SQLite strings.
 */
export function toISOString(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && 'toISOString' in value) {
    return (value as { toISOString(): string }).toISOString();
  }
  return String(value);
}
