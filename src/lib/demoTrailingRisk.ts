/** Browser-only DEMO trailing risk evaluator. Does not send or close orders. */
export interface DemoTrailingState {
  peakPnl: number;
  activated: boolean;
}
export interface DemoTrailingInput {
  side: "COMPRA" | "VENDA";
  entry: number;
  qty: number;
  price: number;
  quotedAt: number;
  now: number;
  activateAtUsdt: number;
  trailDistanceUsdt: number;
  previous?: DemoTrailingState;
}
export type DemoTrailingEvaluation =
  | { status: "INVALID" | "STALE"; next: null; shouldClose: false }
  | { status: "WAITING" | "ARMED" | "EXIT"; next: DemoTrailingState; shouldClose: boolean; pnl: number; floor: number | null; breached: boolean };

/** Use only with explicit per-position DEMO opt-in; SL/TP checks remain independent. */
export function evaluateDemoTrailing(input: DemoTrailingInput): DemoTrailingEvaluation {
  const { entry, qty, price, quotedAt, now, activateAtUsdt: activation, trailDistanceUsdt: gap } = input;
  if ((input.side !== "COMPRA" && input.side !== "VENDA") ||
      ![entry, qty, price, quotedAt, now, activation, gap].every(Number.isFinite) ||
      entry <= 0 || qty <= 0 || price <= 0 || activation <= 0 || gap <= 0 || gap >= activation ||
      (input.previous !== undefined && (!Number.isFinite(input.previous.peakPnl) ||
        typeof input.previous.activated !== "boolean"))) {
    return { status: "INVALID", next: null, shouldClose: false };
  }
  if (quotedAt <= 0 || quotedAt > now || now - quotedAt > 15000) {
    return { status: "STALE", next: null, shouldClose: false };
  }
  const pnl = (input.side === "COMPRA" ? price - entry : entry - price) * qty;
  const peakPnl = Math.max(input.previous?.peakPnl ?? pnl, pnl);
  const activated = (input.previous?.activated ?? false) || peakPnl >= activation;
  const next = { peakPnl, activated };
  const floor = activated ? peakPnl - gap : null;
  // Never trigger at the same observation that first arms the trailing protection.
  const shouldClose = !!input.previous?.activated && floor !== null && pnl <= floor;
  return {
    status: shouldClose ? "EXIT" : activated ? "ARMED" : "WAITING",
    next, shouldClose, pnl, floor, breached: shouldClose && pnl < floor!,
  };
}
