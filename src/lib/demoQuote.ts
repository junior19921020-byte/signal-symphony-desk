/** Public spot quotes for the demo simulator. Never places real orders. */
const ENDPOINTS = [
  "https://data-api.binance.vision",
  "https://api1.binance.com",
  "https://api3.binance.com",
  "https://api.binance.com",
];

export async function fetchDemoQuote(symbol: string, fetcher: typeof fetch = fetch): Promise<number | null> {
  if (!/^[A-Z0-9]{5,20}$/.test(symbol)) return null;
  for (const base of ENDPOINTS) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);
      try {
        const response = await fetcher(`${base}/api/v3/ticker/price?symbol=${symbol}`, { signal: controller.signal, cache: "no-store" });
        if (!response.ok) continue;
        const json = (await response.json()) as { symbol?: string; price?: string };
        const price = Number(json.price);
        if (json.symbol === symbol && Number.isFinite(price) && price > 0) return price;
      } finally { clearTimeout(timeout); }
    } catch { /* try next endpoint */ }
  }
  return null;
}
