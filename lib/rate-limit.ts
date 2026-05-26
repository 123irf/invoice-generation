const requests = new Map<string, number[]>();
const WINDOW_MS = 60_000;
const MAX_REQUESTS = 30;

export function rateLimit(key: string): { ok: boolean; remaining: number } {
  const now = Date.now();
  const arr = requests.get(key) ?? [];
  const recent = arr.filter((ts) => now - ts < WINDOW_MS);
  if (recent.length >= MAX_REQUESTS) {
    return { ok: false, remaining: 0 };
  }
  recent.push(now);
  requests.set(key, recent);
  return { ok: true, remaining: MAX_REQUESTS - recent.length };
}

export async function getClientIp(): Promise<string> {
  const { headers } = await import('next/headers');
  const h = await headers();
  const fwd = h.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return h.get('x-real-ip') ?? 'unknown';
}
