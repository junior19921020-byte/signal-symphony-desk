import type { Side } from "./trading";

export function demoProfitTarget(side: Side, entry: number, sl: number, tp: number, qty: number, price: number | null) {
  if (![entry, sl, tp, qty].every((n) => Number.isFinite(n) && n > 0) ||
      (side === "COMPRA" ? !(sl < entry && tp > entry) : !(sl > entry && tp < entry))) return null;
  const direction = side === "COMPRA" ? 1 : -1;
  const targetProfit = direction * (tp - entry) * qty;
  const plannedLoss = Math.abs((entry - sl) * qty);
  const currentPnl = price !== null && Number.isFinite(price) && price > 0
    ? direction * (price - entry) * qty : null;
  const progress = currentPnl === null ? null : Math.max(0, Math.min(100, (currentPnl / targetProfit) * 100));
  return { targetProfit, plannedLoss, currentPnl, progress, riskReward: targetProfit / plannedLoss };
}
