/** Minimal RFC-4180 CSV serialiser — no dependency needed for two export routes. */
export function toCsv(rows: Array<Record<string, unknown>>, columns?: string[]): string {
  const cols = columns ?? (rows.length > 0 ? Object.keys(rows[0]) : []);
  const escape = (v: unknown): string => {
    if (v === null || v === undefined) return '';
    const s = v instanceof Date ? v.toISOString() : String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [cols.join(','), ...rows.map((r) => cols.map((c) => escape(r[c])).join(','))];
  return lines.join('\r\n');
}
