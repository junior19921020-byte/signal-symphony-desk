/**
 * Validation of candidate server snapshots, not persistence or migration.
 * Fail closed: never use browser-only data as proof of background protection.
 */
export type DemoPositionSnapshot = {
  id: string;
  symbol: string;
  side: "COMPRA" | "VENDA";
  quantity: number;
  entry: number;
  stopLoss: number;
  takeProfit: number;
};
export type DemoServerSnapshot = {
  schemaVersion: 1;
  mode: "DEMO";
  ownerId: string;
  revision: number;
  capturedAt: number;
  positions: DemoPositionSnapshot[];
};
export type SnapshotCheck = { valid: boolean; reason: string };
export function validateDemoServerSnapshot(snapshot: DemoServerSnapshot, expectedOwnerId: string, now: number): SnapshotCheck {
  const fail = (reason: string): SnapshotCheck => ({valid:false,reason});
  if (snapshot.schemaVersion !== 1 || snapshot.mode !== "DEMO") return fail("Somente esquema 1 e modo DEMO");
  if (!expectedOwnerId || snapshot.ownerId !== expectedOwnerId) return fail("Proprietário inválido");
  if (!Number.isSafeInteger(snapshot.revision) || snapshot.revision < 0) return fail("Revisão inválida");
  if (!Number.isFinite(now) || now <= 0 || !Number.isFinite(snapshot.capturedAt) || snapshot.capturedAt <= 0 || snapshot.capturedAt > now)
    return fail("Data da captura inválida");
  if (!Array.isArray(snapshot.positions) || snapshot.positions.length > 1000) return fail("Quantidade de posições inválida");
  const ids = new Set<string>();
  for (const p of snapshot.positions) {
    if (!p || typeof p.id !== "string" || !p.id.trim() || ids.has(p.id) ||
      typeof p.symbol !== "string" || !/^[A-Z0-9]{3,20}$/.test(p.symbol) ||
      !["COMPRA","VENDA"].includes(p.side) ||
      ![p.quantity,p.entry,p.stopLoss,p.takeProfit].every(v => Number.isFinite(v) && v > 0))
      return fail("Posição inválida ou duplicada");
    if (p.side === "COMPRA" && !(p.stopLoss < p.entry && p.entry < p.takeProfit))
      return fail("Proteções de compra inconsistentes");
    if (p.side === "VENDA" && !(p.takeProfit < p.entry && p.entry < p.stopLoss))
      return fail("Proteções de venda inconsistentes");
    ids.add(p.id);
  }
  return {valid:true,reason:"Snapshot DEMO estruturalmente válido; sem autorização para executar"};
}
