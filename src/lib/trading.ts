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
  time: number;
}

export function parseKlines(data: unknown): Candle[] {
  if (!Array.isArray(data)) return [];
  return data.map((k) => {
    const a = k as unknown[];
    return { t: Number(a[0] || 0), o: Number(a[1] || 0), h: Number(a[2] || 0), l: Number(a[3] || 0), c: Number(a[4] || 0), v: Number(a[5] || 0), buyV: Number(a[9] || 0) };
  });
}

function emaSeries(values: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const out: number[] = [];
  let e = values[0] ?? 0;
  values.forEach((v, i) => { e = i === 0 ? v : v * k + e * (1 - k); out.push(e); });
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
    if (d >= 0) gain += d; else loss -= d;
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
  const tr = c.slice(1).map((k, i) => Math.max(k.h - k.l, Math.abs(k.h - (c[i]?.c ?? k.c)), Math.abs(k.l - (c[i]?.c ?? k.c))));
  const last = tr.slice(-period);
  return last.length ? last.reduce((a, b) => a + b, 0) / last.length : 0;
}

/** Estrutura dos topos/fundos: 12 últimas velas em 3 blocos de 4. */
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

/** Análise completa dos 4 agentes a partir das velas reais 15m e 5m. */
export function analyze(symbol: string, c15: Candle[], c5: Candle[], bank: number): Market {
  const closes = c15.map((k) => k.c);
  const price = c5.at(-1)?.c || closes.at(-1) || 0;
  const first = closes[0] || price || 1;
  const e9 = ema(closes, 9), e21 = ema(closes, 21), r = rsi(closes, 14), m = macd(closes);
  const recent = c15.slice(-6);
  const greens = recent.filter((k) => k.c > k.o).length;
  const reds = recent.filter((k) => k.c < k.o).length;
  const last10 = c15.slice(-10);
  const vol = last10.reduce((a, k) => a + k.v, 0);
  const buyRatio = vol > 0 ? last10.reduce((a, k) => a + k.buyV, 0) / vol : 0.5;
  const c5ref = c5.at(-7)?.c || price;
  const change5m = c5ref ? ((price - c5ref) / c5ref) * 100 : 0;
  const c15ref = c15.at(-5)?.c || price;
  const mom15 = c15ref ? ((price - c15ref) / c15ref) * 100 : 0;
  const structure = structureOf(c15);
  const a = atr(c15);

  // 1. Pesquisa: momentum 5m/15m + fluxo comprador vs vendedor
  let research: AgentVote;
  if (change5m > 0 && mom15 > 0 && buyRatio >= 0.5) research = { trend: "ALTA", note: `momentum positivo (5m ${fmt(change5m)}%, 15m ${fmt(mom15)}%) e ${fmt(buyRatio * 100, 0)}% do volume comprador` };
  else if (change5m < 0 && mom15 < 0 && buyRatio <= 0.5) research = { trend: "BAIXA", note: `momentum negativo (5m ${fmt(change5m)}%, 15m ${fmt(mom15)}%) e ${fmt((1 - buyRatio) * 100, 0)}% do volume vendedor` };
  else research = { trend: "LATERAL", note: `momentum misto (5m ${fmt(change5m)}%, 15m ${fmt(mom15)}%), volume comprador ${fmt(buyRatio * 100, 0)}%` };

  // 2. Análise gráfica: estrutura, velas, EMAs, MACD, rejeição de topo
  const lastC = c15.at(-1);
  const rejection = !!lastC && lastC.h - Math.max(lastC.o, lastC.c) > 2 * Math.abs(lastC.c - lastC.o) && lastC.c < lastC.o;
  let score = 0;
  score += e9 >= e21 ? 1 : -1;
  score += m.hist >= 0 ? 1 : -1;
  if (structure === "ASCENDENTE") score += 1; else if (structure === "DESCENDENTE") score -= 1;
  if (greens >= 4) score += 1; else if (reds >= 4) score -= 1;
  if (rejection) score -= 1;
  let chartTrend: Trend = score >= 2 ? "ALTA" : score <= -2 ? "BAIXA" : "LATERAL";
  if (chartTrend === "ALTA" && r >= 75) chartTrend = "LATERAL";
  if (chartTrend === "BAIXA" && r <= 25) chartTrend = "LATERAL";
  const chart: AgentVote = { trend: chartTrend, note: `estrutura ${structure}, ${greens} verdes x ${reds} vermelhas, EMA9 ${e9 >= e21 ? "acima" : "abaixo"} da EMA21, MACD hist ${fmt(m.hist)}${rejection ? ", rejeição de topo" : ""}` };

  // 3. Risco: aprova só se Pesquisa e Gráfico concordam
  const riskAmt = bank * 0.01;
  const slDist = Math.max(a * 1.2, price * 0.002);
  const agree = research.trend === chart.trend && research.trend !== "LATERAL";
  const signal: Signal = agree ? (research.trend === "ALTA" ? "COMPRA" : "VENDA") : "AGUARDAR";
  const riskNote = agree ? `aprovado: ${signal}, risco ${fmt(riskAmt)} USDT` : `vetado: Pesquisa ${research.trend} x Gráfico ${chart.trend}`;
  const qty = slDist > 0 ? riskAmt / slDist : 0;
  const lv = levels(signal === "AGUARDAR" ? (chartTrend === "BAIXA" ? "VENDA" : "COMPRA") : signal, price, slDist);

  return {
    symbol, price, change: ((price - first) / first) * 100, change5m, rsi: r, ema9: e9, ema21: e21,
    macd: m.macd, macdSignal: m.signal, macdHist: m.hist, atr: a, buyRatio, greens, reds, structure,
    research, chart, riskApproved: agree, riskNote, signal, risk: riskAmt, slDist, qty,
    sl: lv.sl, tp: lv.tp, candles: c15.slice(-15), time: Date.now(),
  };
}

/** COMPRA: SL abaixo, TP acima. VENDA: SL acima, TP abaixo. Alvo 2:1. */
export function levels(side: Side, price: number, slDist: number) {
  return side === "COMPRA" ? { sl: price - slDist, tp: price + 2 * slDist } : { sl: price + slDist, tp: price - 2 * slDist };
}

export function pnlOf(side: Side, entry: number, price: number, qty: number): number {
  return (side === "COMPRA" ? price - entry : entry - price) * qty;
}

export async function fetchMarket(symbol: string, bank: number): Promise<Market | null> {
  try {
    const t = Date.now();
    const [r15, r5] = await Promise.all([
      fetch(`https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=15m&limit=50&_=${t}`, { cache: "no-store" }),
      fetch(`https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=5m&limit=50&_=${t}`, { cache: "no-store" }),
    ]);
    const c15 = parseKlines(await r15.json());
    const c5 = parseKlines(await r5.json());
    if (c15.length < 30) return null;
    return analyze(symbol, c15, c5, bank);
  } catch { return null; }
}

export function marketContext(m: Market): string {
  const candles = m.candles.map((k) => `${new Date(k.t).toISOString().slice(11, 16)} O${fmt(k.o)} H${fmt(k.h)} L${fmt(k.l)} C${fmt(k.c)} V${fmt(k.v, 1)} ${k.c >= k.o ? "verde" : "vermelha"}`).join("\n");
  return `Ativo ${m.symbol} | preço ${fmt(m.price)} | var 5m(30min) ${fmt(m.change5m)}% | var 50 velas 15m ${fmt(m.change)}%
RSI14 ${fmt(m.rsi, 1)} | EMA9 ${fmt(m.ema9)} | EMA21 ${fmt(m.ema21)} | MACD ${fmt(m.macd)} sinal ${fmt(m.macdSignal)} hist ${fmt(m.macdHist)} | ATR ${fmt(m.atr)}
Volume comprador ${fmt(m.buyRatio * 100, 0)}% | últimas 6 velas: ${m.greens} verdes, ${m.reds} vermelhas | estrutura ${m.structure}
Pesquisa: ${m.research.trend} (${m.research.note})
Análise Gráfica: ${m.chart.trend} (${m.chart.note})
Gestão de Risco: ${m.riskNote}; SL ${fmt(m.sl)} TP ${fmt(m.tp)} lote ${fmt(m.qty, 6)}
Sinal final do Executor: ${m.signal}
Últimas 15 velas 15m (UTC):
${candles}`;
}

export type Intent = "BUY" | "SELL" | "CLOSE" | "STATUS" | "AUTO_ON" | "AUTO_OFF" | null;

/** Interpreta uma ordem direta no chat. Perguntas ("posso comprar?") não executam. */
export function parseIntent(text: string): Intent {
  const q = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const question = /\?|\b(posso|devo|vale|sera|seria|deveria)\b/.test(q);
  if (/\b(encerr|fech|zer)\w*/.test(q) && !question) return "CLOSE";
  if (/(lig|ativ)\w* (o )?piloto|piloto automatico/.test(q) && !/deslig|desativ/.test(q) && !question) return "AUTO_ON";
  if (/(deslig|desativ|par)\w* (o )?piloto|modo manual/.test(q)) return "AUTO_OFF";
  if (/\b(posica|posicoes|status|saldo|p&l|pnl|carteira)/.test(q)) return "STATUS";
  if (question) return null;
  if (/\b(compr[ae]\w*|abr\w* (uma )?compra|long|entr\w* comprad)/.test(q)) return "BUY";
  if (/\b(vend[ae]\w*|abr\w* (uma )?venda|short|entr\w* vendid)/.test(q)) return "SELL";
  return null;
}
