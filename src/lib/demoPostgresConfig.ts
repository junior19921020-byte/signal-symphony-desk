// Stage 72: server-side-only configuration validation; no connections are created.
// Pass process.env from a trusted server runtime, never from Vite/client code.
export type DemoPostgresConfig = Readonly<{
  connectionString: string;
  maxConnections: number;
  connectionTimeoutMs: number;
  idleTimeoutMs: number;
  sslMode: 'verify-full';
}>;

const integer = (value: string | undefined, fallback: number, min: number, max: number): number | null => {
  if (value === undefined) return fallback;
  if (!/^[0-9]+$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= min && parsed <= max ? parsed : null;
};

/** Fail closed: never log or return the secret on invalid configuration. */
export function parseDemoPostgresConfig(
  env: Readonly<Record<string, string | undefined>>,
): DemoPostgresConfig | null {
  const raw = env["DEMO_DATABASE_URL"];
  if (!raw || raw.length > 4096 || /[\s]/.test(raw)) return null;
  let url: URL;
  try { url = new URL(raw); } catch { return null; }
  if (url.protocol !== 'postgresql:' && url.protocol !== 'postgres:') return null;
  if (!url.hostname || !url.username || !url.password ||
      url.username === 'postgres' || url.hostname === 'localhost' ||
      url.hostname === '127.0.0.1' || url.hostname === '::1' ||
      !url.pathname || url.pathname === '/' || url.hash) return null;
  // TLS certificate validation must be explicit, never allow sslmode=disable/require.
  if (url.searchParams.getAll('sslmode').length !== 1 ||
      url.searchParams.get('sslmode') !== 'verify-full') return null;
  if ([...url.searchParams.keys()].some((key) => key !== 'sslmode')) return null;
  const maxConnections = integer(env["DEMO_DB_POOL_MAX"], 3, 1, 5);
  const connectionTimeoutMs = integer(env["DEMO_DB_CONNECT_TIMEOUT_MS"], 3000, 500, 10000);
  const idleTimeoutMs = integer(env["DEMO_DB_IDLE_TIMEOUT_MS"], 10000, 1000, 30000);
  if (maxConnections === null || connectionTimeoutMs === null || idleTimeoutMs === null) return null;
  return { connectionString: raw, maxConnections, connectionTimeoutMs, idleTimeoutMs, sslMode: 'verify-full' };
}

/** Availability check never modifies data and returns false for errors or timeouts. */
export async function checkDemoDatabaseAvailability(
  query: (sql: string) => Promise<unknown>,
  timeoutMs = 3000,
): Promise<boolean> {
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 100 || timeoutMs > 10000) return false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const deadline = new Promise<false>((resolve) => {
      timer = setTimeout(() => resolve(false), timeoutMs);
    });
    const result = await Promise.race([
      Promise.resolve().then(() => query('SELECT 1')).then(() => true as const, () => false as const),
      deadline,
    ]);
    return result === true;
  } catch {
    return false;
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}
