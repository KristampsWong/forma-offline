/**
 * Shared resolver for "one complete field-name snapshot per PDF revision year"
 * maps (see form941-fields.ts, form940-fields.ts).
 *
 * Given a map keyed by revision year, returns the entry for the most recent
 * revision at or before `year`; years older than the earliest revision use the
 * earliest. Pass the effective PDF year from `getEffectiveFormYear(...)`, not
 * the raw tax year, so the names always match the PDF actually loaded.
 */
export function resolveByRevisionYear<T>(
  byRevision: Record<number, T>,
  year: number,
): T {
  const revisions = Object.keys(byRevision)
    .map(Number)
    .sort((a, b) => a - b)

  let chosen = revisions[0]
  for (const revision of revisions) {
    if (revision <= year) chosen = revision
  }
  return byRevision[chosen]
}
