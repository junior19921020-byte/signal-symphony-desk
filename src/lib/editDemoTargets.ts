import type { Side } from "./trading";

export function editDemoTargets(position: { side: Side; entry: number; sl: number; tp: number; qty: number; provenance?: { plannedRisk: number } }, profit: number, risk: number) {
  const { side, entry, sl, tp, qty } = position;
  if (![entry, sl, tp, qty, profit, risk].every(Number.isFinite) ||
      entry <= 0 || qty <= 0 || profit <= 0 || risk <= 0) return { error: "Informe metas positivas e válidas." } as const;
  const oldRisk = Math.abs(entry - sl) * qty;
  const limit = Math.min(oldRisk, position.provenance?.plannedRisk && position.provenance.plannedRisk > 0 ? position.provenance.plannedRisk : oldRisk);
  if (risk > limit + 0.000001) return { error: "Rita Risk bloqueou aumento do risco da posição." } as const;
  const direction = side === "COMPRA" ? 1 : -1;
  const newTp = entry + direction * profit / qty;
  const newSl = entry - direction * risk / qty;
  if (![newTp, newSl].every((v) => Number.isFinite(v) && v > 0) ||
      (side === "COMPRA" ? !(newTp > entry && newSl < entry) : !(newTp < entry && newSl > entry)))
    return { error: "Os novos níveis não são válidos para essa posição." } as const;
  return { tp: newTp, sl: newSl } as const;
}
