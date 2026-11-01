export interface ClosedTradeMetric { pnl: number; result: "TP" | "SL" | "IA" | "MANUAL"; closedAt?: number }
export function demoPerformance(trades: ClosedTradeMetric[]) {
  const valid = trades.filter(t => Number.isFinite(t.pnl));
  const grossProfit = valid.reduce((sum,t) => sum + Math.max(0,t.pnl),0);
  const grossLoss = valid.reduce((sum,t) => sum + Math.max(0,-t.pnl),0);
  const netPnl = grossProfit - grossLoss;
  const winRate = valid.length ? 100 * valid.filter(t => t.pnl > 0).length / valid.length : 0;
  // Drawdown of realized P&L only, measured from the highest cumulative P&L.
  let cumulative = 0, peak = 0, maxDrawdown = 0;
  for (const t of valid) {
    cumulative += t.pnl;
    peak = Math.max(peak, cumulative);
    maxDrawdown = Math.max(maxDrawdown, peak - cumulative);
  }
  return {
    count: valid.length, netPnl, grossProfit, grossLoss, winRate, maxDrawdown,
    averageWin: valid.some(t => t.pnl > 0) ? grossProfit / valid.filter(t => t.pnl > 0).length : 0,
    averageLoss: valid.some(t => t.pnl < 0) ? grossLoss / valid.filter(t => t.pnl < 0).length : 0,
    profitFactor: grossLoss > 0 ? grossProfit / grossLoss : null,
    manualClosures: valid.filter(t => t.result === "MANUAL").length,
    automatedClosures: valid.filter(t => t.result !== "MANUAL").length,
  };
}
