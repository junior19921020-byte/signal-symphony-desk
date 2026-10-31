export const fmt = (v: unknown, d = 2): string => Number(v || 0).toFixed(d);

export type Side = "COMPRA" | "VENDA";

export interface Market {
  symbol: string;
  price: number;
  change: number;
  rsi: number;
  ema9: number;
  ema21: number;
  signal: Side;
  risk: number;
  sl: number;
  tp: number;
  time: number;
}

export function ema(values: number[], period: number): number {
  if (values.length === 0) return 0;
  const k = 2 / (period + 1);
  let e = values[0] ?? 0;
  for (let i = 1; i < values.length; i++) e = (values[i] ?? 0) * k + e * (1 - k);
  return e;
}

export function rsi(values: number[], period = 14): number {
  if (values.length <= period) return 50;
  let gain = 0;
  let loss = 0;
  for (let i = 1; i <= period; i++) {
    const d = (values[i] ?? 0) - (values[i - 1] ?? 0);
    if (d >= 0) gain += d;
    else loss -= d;
  }
  let ag = gain / period;
  let al = loss / period;
  for (let i = period + 1; i < values.length; i++) {
    const d = (values[i] ?? 0) - (values[i - 1] ?? 0);
    ag = (ag * (period - 1) + Math.max(d, 0)) / period;
    al = (al * (period - 1) + Math.max(-d, 0)) / period;
  }
  if (al === 0) return 100;
  const rs = ag / al;
  return 100 - 100 / (1 + rs);
}

export function buildMarket(symbol: string, closes: number[], bank: number): Market {
  const price = closes[closes.length - 1] || 0;
  const first = closes[0] || price || 1;
  const e9 = ema(closes, 9);
  const e21 = ema(closes, 21);
  const r = rsi(closes, 14);
  const signal: Side = e9 >= e21 && r < 70 ? "COMPRA" : "VENDA";
  const slDist = price * 0.0032;
  const tpDist = price * 0.0064;
  return {
    symbol,
    price,
    change: ((price - first) / first) * 100,
    rsi: r,
    ema9: e9,
    ema21: e21,
    signal,
    risk: bank * 0.01,
    sl: signal === "COMPRA" ? price - slDist : price + slDist,
    tp: signal === "COMPRA" ? price + tpDist : price - tpDist,
    time: Date.now(),
  };
}

export function localAnswer(question: string, agentName: string, role: string, m: Market | null): string {
  if (!m) {
    return `${agentName} (${role}): ainda não tenho dados da Binance. Clique em "▶ Rodar Ciclo de Operação" e me pergunte de novo.`;
  }
  const q = question.toLowerCase();
  const nums = `Preço ${fmt(m.price, 2)} | RSI14 ${fmt(m.rsi, 1)} | EMA9 ${fmt(m.ema9, 2)} vs EMA21 ${fmt(m.ema21, 2)}`;
  const levels = `Stop Loss ${fmt(m.sl, 2)} | Take Profit ${fmt(m.tp, 2)}`;
  const buy = m.ema9 >= m.ema21 && m.rsi < 70;
  if (/compr|vend|entr|vale|opera/.test(q)) {
    const verdict = buy
      ? "SIM, recomendo COMPRA."
      : `NÃO recomendo compra agora, o sinal é de VENDA/CAUTELA (${m.ema9 < m.ema21 ? "EMA9 abaixo da EMA21" : "RSI sobrecomprado ≥ 70"}).`;
    return `${agentName}: ${verdict} ${m.symbol} → ${nums}. ${levels}. Risco: ${fmt(m.risk, 2)} USDT (1% da banca).`;
  }
  if (/risco|stop|banca|perd|alvo|take|tp|sl/.test(q)) {
    return `${agentName}: Risco por operação = ${fmt(m.risk, 2)} USDT (1% da banca). Para ${m.signal} em ${fmt(m.price, 2)}: ${levels} (distâncias 0.32% / 0.64%, relação 2:1).`;
  }
  const trend = m.ema9 >= m.ema21 ? "tendência de ALTA (EMA9 acima da EMA21)" : "tendência de BAIXA (EMA9 abaixo da EMA21)";
  const rsiTxt = m.rsi >= 70 ? "sobrecomprado" : m.rsi <= 30 ? "sobrevendido" : "neutro";
  return `${agentName}: Diagnóstico de ${m.symbol} — ${trend}, RSI ${rsiTxt}. ${nums}. Variação (40 velas 15m): ${fmt(m.change, 2)}%. Sinal atual: ${m.signal}. ${levels}.`;
}
