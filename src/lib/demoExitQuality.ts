import type { ExitVariance } from "./exitVariance";

type TradeLike = { result: string; exitVariance?: ExitVariance | null };
export function demoExitQuality(trades: readonly TradeLike[]) {
  let eligible = 0, atTarget = 0, favorable = 0, unfavorable = 0;
  let favorableImpact = 0, unfavorableImpact = 0;
  for (const trade of trades) {
    if (trade.result !== "TP" && trade.result !== "SL") continue;
    const v = trade.exitVariance;
    if (!v || ![v.plannedPrice, v.actualPrice, v.plannedPnl, v.actualPnl, v.difference].every(Number.isFinite) ||
      v.plannedPrice <= 0 || v.actualPrice <= 0 ||
      Math.abs(v.actualPnl - v.plannedPnl - v.difference) > 0.01) continue;
    eligible++;
    if (v.difference < -0.005) { unfavorable++; unfavorableImpact += v.difference; }
    else if (v.difference > 0.005) { favorable++; favorableImpact += v.difference; }
    else atTarget++;
  }
  return { total: trades.length, eligible, missing: trades.length - eligible, atTarget, favorable, unfavorable,
    favorableImpact, unfavorableImpact, netImpact: favorableImpact + unfavorableImpact };
}
