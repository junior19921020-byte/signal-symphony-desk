export interface ObservedExcursion { maxFavorablePnl: number; maxAdversePnl: number; firstObservedAt: number; lastObservedAt: number }
export function observeDemoExcursion(position: { side: "COMPRA" | "VENDA"; entry: number; qty: number; excursion?: ObservedExcursion }, price: number, quoteAt: number, now: number): ObservedExcursion | null {
  if (![price, quoteAt, now, position.entry, position.qty].every(Number.isFinite) || price <= 0 || position.entry <= 0 || position.qty <= 0 || quoteAt <= 0 || quoteAt > now || now - quoteAt > 15000) return null;
  const pnl = (position.side === "COMPRA" ? price - position.entry : position.entry - price) * position.qty;
  if (!Number.isFinite(pnl)) return null;
  const prev = position.excursion;
  return { maxFavorablePnl: Math.max(0, pnl, prev?.maxFavorablePnl ?? 0), maxAdversePnl: Math.min(0, pnl, prev?.maxAdversePnl ?? 0), firstObservedAt: prev?.firstObservedAt ?? quoteAt, lastObservedAt: quoteAt };
}
