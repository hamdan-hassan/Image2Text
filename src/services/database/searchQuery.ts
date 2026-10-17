/** Builds the SQL fragment for offline full-text search over title + text content. */
export function buildSearchFilter(rawQuery: string): { sql: string; params: string[] } | null {
  const query = rawQuery.trim().toLowerCase();
  if (query.length === 0) return null;
  const escaped = query.replace(/[\\%_]/g, (match) => `\\${match}`);
  const like = `%${escaped}%`;
  return {
    sql: `AND (
      LOWER(title) LIKE ? ESCAPE '\\' OR
      LOWER(extracted_text) LIKE ? ESCAPE '\\' OR
      LOWER(COALESCE(edited_text, '')) LIKE ? ESCAPE '\\'
    )`,
    params: [like, like, like],
  };
}
