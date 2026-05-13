export interface MetricsQueryOptions {
  hours: number;
  service: string;
  includeTimeline: boolean;
}

export interface ServicesQueryOptions {
  hours: number;
}

function sanitizePlainText(value: string | null | undefined): string {
  if (!value) return '';
  return String(value).replace(/[\u0000-\u001F\u007F]/g, '').trim();
}

function parseIntegerQuery(value: string | null, fallback: number, min: number, max: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

export function parseMetricsQueryParams(searchParams: URLSearchParams): MetricsQueryOptions {
  const hours = parseIntegerQuery(searchParams.get('hours'), 24, 1, 168);

  const serviceRaw = sanitizePlainText(searchParams.get('service') || '');
  const service = /^[A-Za-z0-9._:-]{1,64}$/.test(serviceRaw) ? serviceRaw : '';

  const includeTimeline = ['1', 'true', 'yes'].includes(
    sanitizePlainText(searchParams.get('include_timeline') || '').toLowerCase(),
  );

  return {
    hours,
    service,
    includeTimeline,
  };
}

export function parseServicesQueryParams(searchParams: URLSearchParams): ServicesQueryOptions {
  const hours = parseIntegerQuery(searchParams.get('hours'), 168, 1, 720);
  return { hours };
}
