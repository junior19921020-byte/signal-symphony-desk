import { dailyLossStatus } from "./dailyLoss";
type OpenRisk = { entry: number; sl: number; qty: number };
type ClosedTrade = { pnl: number; closedAt?: number };
/** Conservative gross loss budget: realized losses + stop risk of all open positions + proposed stop risk. */
export function preventiveRiskGate(trades: ClosedTrade[], positions: OpenRisk[], proposed: OpenRisk, now: number, bank: number): string | null {
  const daily = dailyLossStatus(trades, now, bank);
  if (daily.blocked) return "Rita Risk: limite diário de perdas atingido.";
  const risk = (p: OpenRisk) => Math.abs(p.entry - p.sl) * p.qty;
  const all = [...positions, proposed];
  if (all.some(p => ![p.entry,p.sl,p.qty].every(n=>Number.isFinite(n)&&n>0))) return "Rita Risk: parâmetros de risco inválidos.";
  const reserved = all.reduce((sum,p)=>sum+risk(p),0);
  if (!Number.isFinite(reserved) || reserved > daily.remaining + 0.000001)
    return `Rita Risk: risco total de ${reserved.toFixed(2)} USDT supera o limite restante de ${daily.remaining.toFixed(2)} USDT.`;
  return null;
}
