import { formatDistanceToNow, format as formatDate, parseISO } from 'date-fns';

/**
 * The backend stores and returns cost in rupees, so every money figure in the
 * UI goes through here rather than being interpolated raw.
 */
const inr = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

const inrPrecise = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function currency(value: number | null | undefined, precise = false): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return precise ? inrPrecise.format(value) : inr.format(value);
}

/** Compact money for stat tiles: ₹1.2L, ₹45.3K. */
export function currencyCompact(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  const abs = Math.abs(value);
  if (abs >= 10_000_000) return `₹${(value / 10_000_000).toFixed(1)}Cr`;
  if (abs >= 100_000) return `₹${(value / 100_000).toFixed(1)}L`;
  if (abs >= 1_000) return `₹${(value / 1_000).toFixed(1)}K`;
  return inr.format(value);
}

export function percent(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return `${value.toFixed(digits)}%`;
}

export function number(value: number | null | undefined, digits = 0): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: digits }).format(value);
}

/** Bytes-style formatting for the network and storage metrics (already in MB/GB). */
export function megabytes(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  if (value >= 1024) return `${(value / 1024).toFixed(1)} GB`;
  return `${value.toFixed(0)} MB`;
}

export function gigabytes(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  if (value >= 1024) return `${(value / 1024).toFixed(2)} TB`;
  return `${value.toFixed(1)} GB`;
}

function toDate(value: string | Date): Date {
  return typeof value === 'string' ? parseISO(value) : value;
}

/** "3 hours ago" — for anomaly detection times and alert feeds. */
export function relativeTime(value: string | Date | null | undefined): string {
  if (!value) return '—';
  return formatDistanceToNow(toDate(value), { addSuffix: true });
}

/** "12 Mar 2026" — for table columns. */
export function shortDate(value: string | Date | null | undefined): string {
  if (!value) return '—';
  return formatDate(toDate(value), 'd MMM yyyy');
}

/** "12 Mar 2026, 14:30" — for detail panels and audit rows. */
export function dateTime(value: string | Date | null | undefined): string {
  if (!value) return '—';
  return formatDate(toDate(value), 'd MMM yyyy, HH:mm');
}

/** "12 Mar" — compact axis tick for the charts. */
export function chartDate(value: string | Date | null | undefined): string {
  if (!value) return '';
  return formatDate(toDate(value), 'd MMM');
}

export function plural(count: number, singular: string, pluralForm?: string): string {
  return count === 1 ? singular : (pluralForm ?? `${singular}s`);
}

/** Triggers a browser download for a Blob fetched through the authorised client. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
