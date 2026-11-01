/** Read-only sampled trailing-profit simulation. Never places orders. */
export interface TrailingProfitInput {
  entry: number;
  side: "COMPRA" | "VENDA";
  qty: number;
  observedPrices: number[];
  activateAtUsdt: number;
  trailDistanceUsdt: number;
}
export interface TrailingProfitResult {
  peakPnl: number;
  activatedAtIndex: number | null;
  exitIndex: number | null;
  exitPrice: number | null;
  exitPnl: number | null;
  floorAtExit: number | null;
  floorBreached: boolean;
  floorBySample: Array<number | null>;
}
export function simulateTrailingProfit(input: TrailingProfitInput): TrailingProfitResult | null {
  if (!Number.isFinite(input.entry) || input.entry <= 0
    || !Number.isFinite(input.qty) || input.qty <= 0
    || (input.side !== "COMPRA" && input.side !== "VENDA")
    || !Array.isArray(input.observedPrices) || input.observedPrices.length === 0
    || !input.observedPrices.every(p => Number.isFinite(p) && p > 0)
    || !Number.isFinite(input.activateAtUsdt) || input.activateAtUsdt <= 0
    || !Number.isFinite(input.trailDistanceUsdt) || input.trailDistanceUsdt <= 0
    || input.trailDistanceUsdt >= input.activateAtUsdt) return null;
  const pnlAt = (p: number) => (input.side === "COMPRA" ? p - input.entry : input.entry - p) * input.qty;
  let peak = -Infinity;
  let armedAt: number | null = null;
  let exitIndex: number | null = null;
  let floorAtExit: number | null = null;
  const floorBySample: Array<number | null> = [];
  for (let i = 0; i < input.observedPrices.length; i++) {
    const pnl = pnlAt(input.observedPrices[i]);
    peak = Math.max(peak, pnl);
    if (armedAt === null && peak >= input.activateAtUsdt) armedAt = i;
    const floor = armedAt === null ? null : peak - input.trailDistanceUsdt;
    floorBySample.push(floor);
    if (armedAt !== null && i > armedAt && pnl <= floor! && exitIndex === null) {
      exitIndex = i;
      floorAtExit = floor;
    }
  }
  const exitPnl = exitIndex === null ? null : pnlAt(input.observedPrices[exitIndex]);
  return {
    peakPnl: peak, activatedAtIndex: armedAt, exitIndex,
    exitPrice: exitIndex === null ? null : input.observedPrices[exitIndex],
    exitPnl, floorAtExit,
    floorBreached: exitPnl !== null && floorAtExit !== null && exitPnl < floorAtExit,
    floorBySample,
  };
}
