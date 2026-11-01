import type { Side } from "./trading";

export type DemoExit = "SL" | "TP";
export interface DemoPositionLevels {
  id: string;
  symbol: string;
  side: Side;
  entry: number;
  sl: number;
  tp: number;
  qty: number;
}

/** Browser-only demo exit evaluator. Never submits exchange orders. */
export function evaluateDemoExits(
  positions: DemoPositionLevels[],
  symbol: string,
  price: number,
  quotedAt: number,
  now: number,
): Array<{ id: string; result: DemoExit }> {
  if (!Number.isFinite(price) || price <= 0 || !Number.isFinite(quotedAt) ||
      quotedAt <= 0 || quotedAt > now || now - quotedAt > 15000) return [];
  return positions.flatMap((p) => {
    if (p.symbol !== symbol || !p.id || !Number.isFinite(p.entry) || p.entry <= 0 ||
        !Number.isFinite(p.qty) || p.qty <= 0 ||
        !Number.isFinite(p.sl) || !Number.isFinite(p.tp) ||
        (p.side !== "COMPRA" && p.side !== "VENDA")) return [];
    if (p.side === "COMPRA") {
      if (!(p.sl < p.entry && p.tp > p.entry)) return [];
      if (price <= p.sl) return [{ id: p.id, result: "SL" as const }];
      if (price >= p.tp) return [{ id: p.id, result: "TP" as const }];
    } else {
      if (!(p.sl > p.entry && p.tp < p.entry)) return [];
      if (price >= p.sl) return [{ id: p.id, result: "SL" as const }];
      if (price <= p.tp) return [{ id: p.id, result: "TP" as const }];
    }
    return [];
  });
}
