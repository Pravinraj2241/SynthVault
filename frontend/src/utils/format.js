/**
 * Safe formatting helpers shared by the authenticated pages.
 *
 * Backend timestamps are LocalDateTime.toString() values
 * ("2026-09-20T14:23:45" or "2026-09-20 14:23:45.0"), so they are parsed
 * defensively: an unparseable value yields null and the caller shows a
 * readable fallback - never an exception and never "Invalid Date".
 */

/** Parses a backend timestamp into a Date, or null when it cannot be trusted. */
export function toDate(value) {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value !== 'string' || value.trim() === '') {
    return null;
  }
  let normalized = value.trim();
  /* java.sql.Timestamp.toString() uses a space separator ("2026-09-20 14:23:45.0");
     converting the first space to "T" makes it ISO-parseable. */
  normalized = normalized.replace(' ', 'T');
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** 12345 -> "12,345" (locale-aware); non-numbers become "-". */
export function formatNumber(value) {
  const parsed = Number(value);
  if (value === null || value === undefined || value === '' || !Number.isFinite(parsed)) {
    return '-';
  }
  return parsed.toLocaleString();
}

/** "2026-09-20T14:23:45" -> "20 Sep 2026, 14:23"; null when unparseable. */
export function formatDateTime(value) {
  const date = toDate(value);
  if (!date) {
    return null;
  }
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** "2026-09-20T14:23:45" -> "20 Sep 2026"; null when unparseable. */
export function formatDate(value) {
  const date = toDate(value);
  if (!date) {
    return null;
  }
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

/** Short day label for chart axes: "2026-09-20" -> "20 Sep". */
export function formatDayLabel(dayKey) {
  if (typeof dayKey !== 'string' || dayKey.length < 10) {
    return '';
  }
  const date = toDate(`${dayKey.slice(0, 10)}T00:00:00`);
  if (!date) {
    return dayKey;
  }
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

/** Human file size: bytes -> "1.2 MB". */
export function formatBytes(bytes) {
  const value = Number(bytes);
  if (!Number.isFinite(value) || value < 0) {
    return '-';
  }
  if (value < 1024) {
    return `${value} B`;
  }
  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}
