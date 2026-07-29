const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const DEFAULT_IMPORT_DAYS = 30;
const BYBIT_HISTORY_SAFETY_MS = 60 * 1000;

export function earliestBybitHistoryTime(now: number): number {
  const earliest = new Date(now);
  earliest.setUTCFullYear(earliest.getUTCFullYear() - 2);
  return earliest.getTime() + BYBIT_HISTORY_SAFETY_MS;
}

export function bybitHistoryWindows(
  startTime?: Date,
  end = Date.now()
): Array<{ start: number; end: number }> {
  const requestedStart = startTime?.getTime();
  const start = Math.max(
    requestedStart !== undefined && Number.isFinite(requestedStart)
      ? requestedStart
      : end - DEFAULT_IMPORT_DAYS * 24 * 60 * 60 * 1000,
    earliestBybitHistoryTime(end)
  );
  if (!Number.isFinite(end) || start >= end) return [];

  const windows: Array<{ start: number; end: number }> = [];
  for (let cursor = start; cursor < end; cursor += SEVEN_DAYS_MS) {
    windows.push({ start: cursor, end: Math.min(cursor + SEVEN_DAYS_MS - 1, end) });
  }
  return windows;
}
