import { evaluateDemoTrailing, type DemoTrailingState } from "./demoTrailingRisk";

export interface PersistedDemoTrailing extends DemoTrailingState {
  lastQuotedAt: number;
}

export interface TrailingDemoPosition {
  side: "COMPRA" | "VENDA";
  entry: number;
  qty: number;
  trailing?: PersistedDemoTrailing;
}

/**
 * Read-only DEMO trailing state update. It never closes a position.
 * A caller must explicitly opt in and persist the returned state.
 */
export function observeDemoTrailing(
  position: TrailingDemoPosition,
  price: number,
  quotedAt: number,
  now: number,
  activateAtUsdt: number,
  trailDistanceUsdt: number,
): { state: PersistedDemoTrailing; floor: number | null; breached: boolean } | null {
  const prev = position.trailing;
  if (prev && (!Number.isFinite(prev.lastQuotedAt) || prev.lastQuotedAt <= 0 ||
    !Number.isFinite(prev.peakPnl) || typeof prev.activated !== "boolean" ||
    quotedAt <= prev.lastQuotedAt)) return null;

  const result = evaluateDemoTrailing({
    side: position.side,
    entry: position.entry,
    qty: position.qty,
    price,
    quotedAt,
    now,
    activateAtUsdt,
    trailDistanceUsdt,
    previous: prev ? { peakPnl: prev.peakPnl, activated: prev.activated } : undefined,
  });
  if (!result.next) return null;
  return {
    state: { ...result.next, lastQuotedAt: quotedAt },
    floor: result.floor,
    breached: result.breached,
  };
}
