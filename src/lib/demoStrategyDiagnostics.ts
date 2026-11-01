export interface DiagnosticTrade {
  side: "COMPRA" | "VENDA";
  result: "TP" | "SL" | "IA" | "MANUAL";
  pnl: number;
}

export interface DiagnosticGroup {
  label: string;
  count: number;
  wins: number;
  losses: number;
  netPnl: number;
  winRate: number;
  averagePnl: number;
}

function summarize(label: string, trades: DiagnosticTrade[]): DiagnosticGroup {
  const count = trades.length;
  const wins = trades.filter(t => t.pnl > 0).length;
  const losses = trades.filter(t => t.pnl < 0).length;
  const netPnl = trades.reduce((sum, t) => sum + t.pnl, 0);
  return { label, count, wins, losses, netPnl, winRate: count ? wins * 100 / count : 0, averagePnl: count ? netPnl / count : 0 };
}

/** Read-only analysis of closed demo trades; ignores invalid P&L and unknown categories. */
export function demoStrategyDiagnostics(trades: DiagnosticTrade[]) {
  const valid = trades.filter(t => Number.isFinite(t.pnl) &&
    (t.side === "COMPRA" || t.side === "VENDA") &&
    (t.result === "TP" || t.result === "SL" || t.result === "IA" || t.result === "MANUAL"));
  return {
    total: valid.length,
    excluded: trades.length - valid.length,
    bySide: (["COMPRA", "VENDA"] as const).map(side => summarize(side, valid.filter(t => t.side === side))),
    byExit: (["TP", "SL", "IA", "MANUAL"] as const).map(result => summarize(result, valid.filter(t => t.result === result))),
  };
}
