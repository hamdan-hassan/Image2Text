const DATE_FORMAT_OPTIONS: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
};

const TIME_FORMAT_OPTIONS: Intl.DateTimeFormatOptions = {
  hour: 'numeric',
  minute: '2-digit',
};

export function formatScanDate(epochMs: number): string {
  const date = new Date(epochMs);
  return `${new Intl.DateTimeFormat(undefined, DATE_FORMAT_OPTIONS).format(date)} · ${new Intl.DateTimeFormat(
    undefined,
    TIME_FORMAT_OPTIONS
  ).format(date)}`;
}

export function formatAutoTitle(epochMs: number): string {
  return `Scan · ${new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(epochMs))}`;
}
