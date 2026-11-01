import type { Side } from "./trading";
export function evaluateExitVariance(p: { side: Side; entry: number; sl: number; tp: number; qty: number }, exit: number, reason: "TP" | "SL" | "IA" | "MANUAL") {
  if (![p.entry,p.sl,p.tp,p.qty,exit].every(n=>Number.isFinite(n)&&n>0)) return null;
  const plannedPrice = reason === "TP" ? p.tp : reason === "SL" ? p.sl : null;
  if (plannedPrice === null) return null;
  const direction = p.side === "COMPRA" ? 1 : -1;
  const plannedPnl = direction * (plannedPrice-p.entry)*p.qty;
  const actualPnl = direction * (exit-p.entry)*p.qty;
  return { plannedPrice, actualPrice: exit, plannedPnl, actualPnl, difference: actualPnl-plannedPnl };
}
