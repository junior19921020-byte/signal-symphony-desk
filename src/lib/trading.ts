export const fmt = (v: unknown, d = 2): string => Number(v || 0).toFixed(d);

export type Side = "COMPRA" | "VENDA";
export type Signal = Side | "AGUARDAR";
export type Trend = "ALTA" | "BAIXA" | "LATERAL";

export interface Candle { t: number; o: number; h: number; l: number; c: number; v: number; buyV: number }

export interface AgentVote { trend: Trend; note: string }

export interface Market {
  symbol: string;
  price: number;
  change: number;
  change5m: number;
  rsi: number;
  ema9: number;
  ema21: number;
  macd: number;
  macdSignal: number;
  macdHist: number;
  atr: number;
  buyRatio: number;
  greens: number;
  reds: number;
  structure: "ASCENDENTE" | "DESCENDENTE" | "MISTA";
  research: AgentVote;
  chart: AgentVote;
  riskApproved: boolean;
  riskNote: string;
  signal: Signal;
  risk: number;
  slDist: number;
  qty: number;
  sl: number;
  tp: number;
  candles: Candle[];
  headlines?: string[];
  time: number;
}

const BINANCE_ENDPOINTS = [
  "https://data-api.binance.vision",
  "https://api1.binance.com",
  "https://api3.binance.com",
  "https://api.binance.com",
];

const lastMarketCache: Record<string, Market> = {};
let cachedHeadlines: { time: number; items: string[] } = { time: 0, items: [] };
let lastNotifiedKey = "";
let lastNotifiedAt = 0;
let bgWorkerStarted = false;
let activeSymbol = "BTCUSDT";
let activeBank = 10000;

export function parseKlines(data: unknown): Candle[] {
  if (!Array.isArray(data)) return [];
  return data.map((k) => {
    const a = k as unknown[];
    return {
      t: Number(a[0] || 0),
      o: Number(a[1] || 0),
      h: Number(a[2] || 0),
      l: Number(a[3] || 0),
      c: Number(a[4] || 0),
      v: Number(a[5] || 0),
      buyV: Number(a[9] ?? Number(a[5] || 0) * (Number(a[4] || 0) >= Number(a[1] || 0) ? 0.58 : 0.42)),
    };
  });
}

function emaSeries(values: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const out: number[] = [];
  let e = values[0] ?? 0;
  values.forEach((v, i) => {
    e = i === 0 ? v : v * k + e * (1 - k);
    out.push(e);
  });
  return out;
}

export function ema(values: number[], period: number): number {
  if (values.length === 0) return 0;
  return emaSeries(values, period).at(-1) ?? 0;
}

export function rsi(values: number[], period = 14): number {
  if (values.length <= period) return 50;
  let gain = 0, loss = 0;
  for (let i = 1; i <= period; i++) {
    const d = (values[i] ?? 0) - (values[i - 1] ?? 0);
    if (d >= 0) gain += d;
    else loss -= d;
  }
  let ag = gain / period, al = loss / period;
  for (let i = period + 1; i < values.length; i++) {
    const d = (values[i] ?? 0) - (values[i - 1] ?? 0);
    ag = (ag * (period - 1) + Math.max(d, 0)) / period;
    al = (al * (period - 1) + Math.max(-d, 0)) / period;
  }
  if (al === 0) return 100;
  return 100 - 100 / (1 + ag / al);
}

export function macd(values: number[]) {
  const e12 = emaSeries(values, 12), e26 = emaSeries(values, 26);
  const line = values.map((_, i) => (e12[i] ?? 0) - (e26[i] ?? 0));
  const sig = emaSeries(line, 9);
  const m = line.at(-1) ?? 0, s = sig.at(-1) ?? 0;
  return { macd: m, signal: s, hist: m - s };
}

function atr(c: Candle[], period = 14): number {
  const tr = c.slice(1).map((k, i) =>
    Math.max(k.h - k.l, Math.abs(k.h - (c[i]?.c ?? k.c)), Math.abs(k.l - (c[i]?.c ?? k.c)))
  );
  const last = tr.slice(-period);
  return last.length ? last.reduce((a, b) => a + b, 0) / last.length : 0;
}

function structureOf(c: Candle[]): Market["structure"] {
  const last = c.slice(-12);
  if (last.length < 12) return "MISTA";
  const blocks = [0, 1, 2].map((b) => last.slice(b * 4, b * 4 + 4));
  const hi = blocks.map((b) => Math.max(...b.map((k) => k.h)));
  const lo = blocks.map((b) => Math.min(...b.map((k) => k.l)));
  if (hi[2]! > hi[1]! && hi[1]! > hi[0]! && lo[2]! >= lo[0]!) return "ASCENDENTE";
  if (hi[2]! < hi[1]! && hi[1]! < hi[0]! && lo[2]! <= lo[0]!) return "DESCENDENTE";
  if (lo[2]! > lo[1]! && lo[1]! > lo[0]!) return "ASCENDENTE";
  if (lo[2]! < lo[1]! && lo[1]! < lo[0]! && hi[2]! <= hi[0]!) return "DESCENDENTE";
  return "MISTA";
}

export function hasDirectionalConsensus(a: Trend, b: Trend): boolean {
  return a !== "LATERAL" && a === b;
}

export function analyze(symbol: string, c15: Candle[], c5: Candle[], bank: number, headlines?: string[]): Market {
  const closes = c15.map((k) => k.c);
  const price = c5.at(-1)?.c || closes.at(-1) || 0;
  const first = closes[0] || price || 1;
  const e9 = ema(closes, 9), e21 = ema(closes, 21), r = rsi(closes, 14), m = macd(closes);
  const recent = c15.slice(-6);
  const greens = recent.filter((k) => k.c > k.o).length;
  const reds = recent.filter((k) => k.c < k.o).length;
  const last4 = c15.slice(-4);
  const vol = last4.reduce((a, k) => a + k.v, 0);
  const buyRatio = vol > 0 ? last4.reduce((a, k) => a + k.buyV, 0) / vol : 0.5;
  const c5ref = c5.at(-4)?.c || c5.at(0)?.c || price;
  const change5m = c5ref ? ((price - c5ref) / c5ref) * 100 : 0;
  const c15ref = c15.at(-3)?.c || c15.at(0)?.c || price;
  const mom15 = c15ref ? ((price - c15ref) / c15ref) * 100 : 0;
  const structure = structureOf(c15);
  const a = atr(c15);

  // 1. Pesquisa (Ana News): confirma direção imediatamente quando 5m e 15m estão alinhados
  let research: AgentVote;
  if (change5m > 0 && mom15 > 0) {
    research = { trend: "ALTA", note: `momentum positivo (5m +${fmt(change5m)}%, 15m +${fmt(mom15)}%), volume comprador ${(buyRatio * 100).toFixed(0)}%` };
  } else if (change5m < 0 && mom15 < 0) {
    research = { trend: "BAIXA", note: `momentum negativo (5m ${fmt(change5m)}%, 15m ${fmt(mom15)}%), fluxo vendedor ativo` };
  } else if (buyRatio >= 0.54 && (change5m > 0 || mom15 > 0)) {
    research = { trend: "ALTA", note: `fluxo comprador dominante (${(buyRatio * 100).toFixed(0)}%) com retomada de curto prazo` };
  } else if (buyRatio <= 0.46 && (change5m < 0 || mom15 < 0)) {
    research = { trend: "BAIXA", note: `pressão vendedora (${((1 - buyRatio) * 100).toFixed(0)}%) com perda de força no curto prazo` };
  } else {
    research = { trend: "LATERAL", note: `momentum misto (5m ${fmt(change5m)}%, 15m ${fmt(mom15)}%), volume comprador ${(buyRatio * 100).toFixed(0)}%` };
  }

  // 2. Análise Gráfica (Sofia Quant): estrutura, velas, EMAs, MACD, preço vs EMA9
  const lastC = c15.at(-1);
  const rejectionTop = !!lastC && lastC.h - Math.max(lastC.o, lastC.c) > 2 * Math.abs(lastC.c - lastC.o) && lastC.c < lastC.o;
  const rejectionBottom = !!lastC && Math.min(lastC.o, lastC.c) - lastC.l > 2 * Math.abs(lastC.c - lastC.o) && lastC.c > lastC.o;
  let score = 0;
  score += e9 >= e21 ? 1 : -1;
  score += price >= e9 ? 1 : -1;
  score += m.hist >= 0 ? 1 : -1;
  if (structure === "ASCENDENTE") score += 1; else if (structure === "DESCENDENTE") score -= 1;
  if (greens >= 4) score += 1; else if (reds >= 4) score -= 1;
  if (rejectionTop) score -= 1;
  if (rejectionBottom) score += 1;

  let chartTrend: Trend = score >= 1 ? "ALTA" : score <= -1 ? "BAIXA" : "LATERAL";
  if (greens === reds && structure === "MISTA") chartTrend = "LATERAL";
  if (chartTrend === "ALTA" && r >= 75) chartTrend = "LATERAL";
  if (chartTrend === "BAIXA" && r <= 25) chartTrend = "LATERAL";
  const chart: AgentVote = {
    trend: chartTrend,
    note: `estrutura ${structure}, ${greens} verdes x ${reds} vermelhas, RSI ${fmt(r, 0)}, EMAs ${e9 >= e21 ? "ALTA" : "BAIXA"}`,
  };

  // 3. Risco (Rita Risk): somente consenso direcional explícito aprova.
  // Lateralidade, divergência ou dados financeiros inválidos vetam novas ordens.
  const riskAmt = bank * 0.01;
  const slDist = Math.max(a * 1.2, price * 0.002);
  const activeTrend: Trend = hasDirectionalConsensus(research.trend, chart.trend) ? research.trend : "LATERAL";
  const agree = activeTrend !== "LATERAL" && Number.isFinite(bank) && bank > 0
    && Number.isFinite(price) && price > 0 && Number.isFinite(slDist) && slDist > 0
    && Number.isFinite(riskAmt) && riskAmt > 0;
  const signal: Signal = agree ? (activeTrend === "ALTA" ? "COMPRA" : "VENDA") : "AGUARDAR";
  const riskNote = agree
    ? `aprovado: ${signal}, risco $${fmt(riskAmt)} USDT (Pesquisa ${research.trend} + Gráfico ${chart.trend})`
    : `vetado: conflito/lateralidade (Pesquisa ${research.trend} vs Gráfico ${chart.trend})`;
  const qty = slDist > 0 ? riskAmt / slDist : 0;
  const lv = levels(signal === "AGUARDAR" ? (chartTrend === "BAIXA" ? "VENDA" : "COMPRA") : signal, price, slDist);

  return {
    symbol, price, change: ((price - first) / first) * 100, change5m, rsi: r, ema9: e9, ema21: e21,
    macd: m.macd, macdSignal: m.signal, macdHist: m.hist, atr: a, buyRatio, greens, reds, structure,
    research, chart, riskApproved: agree, riskNote, signal, risk: riskAmt, slDist, qty,
    sl: lv.sl, tp: lv.tp, candles: c15.slice(-15), headlines: headlines ?? [], time: Date.now(),
  };
}

export function levels(side: Side, price: number, slDist: number) {
  return side === "COMPRA" ? { sl: price - slDist, tp: price + 2 * slDist } : { sl: price + slDist, tp: price - 2 * slDist };
}

export function pnlOf(side: Side, entry: number, current: number, qty: number): number {
  return (side === "COMPRA" ? current - entry : entry - current) * qty;
}

function notifyOpportunity(m: Market) {
  if (typeof window === "undefined" || m.signal === "AGUARDAR") return;
  const key = `${m.symbol}-${m.signal}`;
  const now = Date.now();
  if (key === lastNotifiedKey && now - lastNotifiedAt < 600_000) return;
  lastNotifiedKey = key;
  lastNotifiedAt = now;

  const title = `🚨 Oportunidade de ${m.signal} em ${m.symbol}!`;
  const body = `Entrada: $${fmt(m.price)} | SL: $${fmt(m.sl)} | TP: $${fmt(m.tp)}\nSofia Quant: ${m.chart.note}\nAna News: ${m.research.note}`;

  try {
    if ("vibrate" in navigator) navigator.vibrate([250, 120, 250]);
  } catch { /* */ }

  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (AudioCtx) {
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(m.signal === "COMPRA" ? 880 : 660, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    }
  } catch { /* */ }

  try {
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(title, { body, tag: key, renotify: true } as NotificationOptions);
    }
  } catch { /* */ }
}

function ensureBackgroundScanner() {
  if (typeof window === "undefined" || bgWorkerStarted) return;
  bgWorkerStarted = true;

  const askPerm = () => {
    try {
      if ("Notification" in window && Notification.permission === "default") {
        void Notification.requestPermission();
      }
    } catch { /* */ }
    window.removeEventListener("click", askPerm);
    window.removeEventListener("touchstart", askPerm);
  };
  window.addEventListener("click", askPerm);
  window.addEventListener("touchstart", askPerm);

  try {
    const workerCode = `
      setInterval(() => {
        postMessage("tick");
      }, 45000);
    `;
    const blob = new Blob([workerCode], { type: "application/javascript" });
    const worker = new Worker(URL.createObjectURL(blob));
    worker.onmessage = () => {
      void fetchMarket(activeSymbol, activeBank);
    };
  } catch {
    setInterval(() => {
      void fetchMarket(activeSymbol, activeBank);
    }, 45000);
  }
}

async function fetchBinanceKlines(symbol: string, interval: "15m" | "5m", limit: number): Promise<Candle[]> {
  for (const base of BINANCE_ENDPOINTS) {
    try {
      const res = await fetch(`${base}/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`);
      if (res.ok) {
        const parsed = parseKlines(await res.json());
        if (parsed.length >= Math.min(limit, 5)) return parsed;
      }
    } catch {
      /* tenta próximo endpoint */
    }
  }
  try {
    const bybitInt = interval === "15m" ? "15" : "5";
    const res = await fetch(`https://api.bybit.com/v5/market/kline?category=spot&symbol=${symbol}&interval=${bybitInt}&limit=${limit}`);
    if (res.ok) {
      const json = (await res.json()) as { result?: { list?: string[][] } };
      const list = (json.result?.list || []).slice().reverse();
      return list.map((a) => {
        const o = Number(a[1] || 0), h = Number(a[2] || 0), l = Number(a[3] || 0), c = Number(a[4] || 0), v = Number(a[5] || 0);
        return { t: Number(a[0] || 0), o, h, l, c, v, buyV: v * (c >= o ? 0.56 : 0.44) };
      });
    }
  } catch {
    /* ignora */
  }
  return [];
}

async function fetchNewsHeadlines(symbol: string): Promise<string[]> {
  if (Date.now() - cachedHeadlines.time < 120_000 && cachedHeadlines.items.length > 0) {
    return cachedHeadlines.items;
  }
  try {
    const coin = symbol.replace("USDT", "");
    const res = await fetch(`https://min-api.cryptocompare.com/data/v2/news/?categories=${coin},BTC,Market&excludeCategories=Sponsored`);
    if (res.ok) {
      const data = (await res.json()) as { Data?: Array<{ title?: string; source?: string }> };
      const items = (data.Data || [])
        .slice(0, 4)
        .map((n) => `${n.title || ""} (${n.source || "CryptoNews"})`.trim())
        .filter(Boolean);
      if (items.length > 0) {
        cachedHeadlines = { time: Date.now(), items };
        return items;
      }
    }
  } catch {
    /* fallback silencioso */
  }
  return cachedHeadlines.items;
}

/** Fail closed on missing, stale, malformed, or divergent exchange candles. */
export function marketCandlesFresh(c15: Candle[], c5: Candle[], now = Date.now()): boolean {
  if (c15.length < 30 || c5.length < 5) return false;
  const valid = (candles: Candle[], intervalMs: number) => {
    const last = candles.at(-1);
    if (!last || !Number.isFinite(last.t) || last.t <= 0 ||
      last.t > now + 60_000 || now - last.t > intervalMs + 5 * 60_000) return false;
    return candles.every((c, i) =>
      Number.isFinite(c.t) && c.t > 0 &&
      Number.isFinite(c.o) && c.o > 0 &&
      Number.isFinite(c.h) && c.h >= Math.max(c.o, c.c) &&
      Number.isFinite(c.l) && c.l > 0 && c.l <= Math.min(c.o, c.c) &&
      Number.isFinite(c.c) && c.c > 0 &&
      Number.isFinite(c.v) && c.v >= 0 &&
      (i === 0 || c.t > candles[i - 1]!.t));
  };
  if (!valid(c15, 15 * 60_000) || !valid(c5, 5 * 60_000)) return false;
  const p15 = c15.at(-1)!.c, p5 = c5.at(-1)!.c;
  return Math.abs(p15 - p5) / p5 <= 0.02;
}

export async function fetchMarket(symbol: string, bank: number): Promise<Market | null> {
  activeSymbol = symbol || activeSymbol;
  activeBank = bank || activeBank;
  ensureBackgroundScanner();

  try {
    const [c15, c5, headlines] = await Promise.all([
      fetchBinanceKlines(symbol, "15m", 60),
      fetchBinanceKlines(symbol, "5m", 12),
      fetchNewsHeadlines(symbol),
    ]);
    if (c15.length < 30 || c5.length < 5) {
      return null;
    }
    if (!marketCandlesFresh(c15, c5)) return null;
    const m = analyze(symbol, c15, c5, bank, headlines);
    lastMarketCache[symbol] = m;
    notifyOpportunity(m);
    return m;
  } catch {
    return null;
  }
}

export function marketContext(m: Market): string {
  const c = m.candles
    .slice(-5)
    .map((k) => `${new Date(k.t).toISOString().slice(11, 16)} o:${k.o} h:${k.h} l:${k.l} c:${k.c}`)
    .join(" | ");
  const newsBlock = m.headlines?.length
    ? `\nManchetes Cripto Recentes: ${m.headlines.join(" ; ")}`
    : "\nManchetes Cripto Recentes: Foco técnico no fluxo spot e derivativos da Binance.";
  return `Ativo: ${m.symbol} | Preço: $${fmt(m.price)} | Var Período: ${fmt(m.change)}% | Var 5m: ${fmt(m.change5m)}%
RSI(14): ${fmt(m.rsi, 0)} | EMA9: $${fmt(m.ema9)} | EMA21: $${fmt(m.ema21)} | MACD Hist: ${fmt(m.macdHist, 2)} | Estrutura: ${m.structure}
Velas recentes (6 de 15m): ${m.greens} verdes x ${m.reds} vermelhas | Volume Comprador: ${(m.buyRatio * 100).toFixed(0)}%
Pesquisa (Ana News): ${m.research.trend} (${m.research.note})
Gráfico (Sofia Quant): ${m.chart.trend} (${m.chart.note})
Risco (Rita Risk): ${m.riskNote} | SL: $${fmt(m.sl)} | TP: $${fmt(m.tp)} | Lote: ${m.qty.toFixed(4)}
Sinal Consolidado (Max Trader): ${m.signal}
Últimas 5 velas 15m: ${c}${newsBlock}`;
}

export function parseIntent(msg: string): "BUY" | "SELL" | "STATUS" | "CLOSE" | "AUTO_ON" | "AUTO_OFF" | null {
  const m = msg.toLowerCase().trim();
  if (/(feche|fechar|encerre|encerrar|zere|zerar|pare a opera|parar opera|^stop$|^parar$)/.test(m)) return "CLOSE";
  if (/(posição|posicao|status|como está|como esta)/.test(m) && !/(compre|venda|abra|gráfico|grafico)/.test(m)) return "STATUS";
  if (/(desligue|desative|desativa|pare o piloto|parar o piloto|modo manual|piloto manual)/.test(m)) return "AUTO_OFF";
  if (/(ligue o piloto|ative o piloto|ativa o piloto|piloto autom|modo autom)/.test(m)) return "AUTO_ON";
  if (/(compre agora|abra uma compra|entrar comprando|execute compra|ordem de compra|^comprar agora$)/.test(m)) return "BUY";
  if (/(venda agora|abra uma venda|entrar vendendo|execute venda|ordem de venda|^vender agora$)/.test(m)) return "SELL";
  return null;
}
