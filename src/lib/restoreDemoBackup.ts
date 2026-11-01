import { previewDemoBackup } from "./demoBackupPreview";

export interface RestorableDemoBackup {
  balance: number; bank: number; symbol: string;
  positions: unknown[]; trades: unknown[]; audit: unknown[]; targetEdits: unknown[];
}
const record = (x: unknown): x is Record<string, unknown> => x !== null && typeof x === "object" && !Array.isArray(x);
const finite = (x: unknown) => typeof x === "number" && Number.isFinite(x);
export function parseRestorableDemoBackup(raw: string): RestorableDemoBackup {
  previewDemoBackup(raw);
  const data: unknown = JSON.parse(raw);
  if (!record(data) || !record(data.account)) throw new Error("Backup inválido.");
  if (!Array.isArray(data.positions) || data.positions.length !== 0)
    throw new Error("Por segurança, a restauração de backups com posições abertas ainda não é permitida.");
  if (!Array.isArray(data.trades) || !Array.isArray(data.audit) || !Array.isArray(data.targetEdits))
    throw new Error("Histórico inválido.");
  for (const trade of data.trades) {
    if (!record(trade) || !finite(trade.entry) || trade.entry <= 0 || !finite(trade.exit) || trade.exit <= 0 ||
      !finite(trade.pnl) || (trade.closedAt !== undefined && (!finite(trade.closedAt) || trade.closedAt <= 0)))
      throw new Error("Trade com valores inválidos.");
  }
  for (const entry of data.audit) {
    if (!record(entry) || typeof entry.id !== "string" || !finite(entry.at) ||
      typeof entry.symbol !== "string" || typeof entry.reason !== "string")
      throw new Error("Registro de auditoria inválido.");
  }
  for (const edit of data.targetEdits) {
    if (!record(edit) || typeof edit.id !== "string" ||
      ![edit.at, edit.oldTp, edit.newTp, edit.oldSl, edit.newSl].every(finite))
      throw new Error("Edição de meta inválida.");
  }
  return {
    balance: data.account.balance as number, bank: data.account.bank as number,
    symbol: data.account.symbol as string, positions: [], trades: data.trades,
    audit: data.audit, targetEdits: data.targetEdits,
  };
}

/** Atomic best-effort browser restore with rollback on storage errors. No network or orders. */
export function restoreDemoBackupToStorage(storage: Pick<Storage, "getItem" | "setItem" | "removeItem">, backup: RestorableDemoBackup) {
  const updates: Record<string, string> = {
    td_balance: JSON.stringify(backup.balance),
    td_positions: JSON.stringify([]),
    td_trades: JSON.stringify(backup.trades),
    td_target_edits: JSON.stringify(backup.targetEdits),
    td_decision_audit_v1: JSON.stringify(backup.audit),
    td_auto: JSON.stringify("manual"),
    td_next_run: JSON.stringify(0),
  };
  const previousSettings = storage.getItem("td_settings");
  let settings: Record<string, unknown> = {};
  try { const parsed: unknown = JSON.parse(previousSettings ?? "{}"); if (record(parsed)) settings = parsed; } catch { /* default */ }
  updates.td_settings = JSON.stringify({ ...settings, symbol: backup.symbol, bank: backup.bank });
  const before = Object.fromEntries(Object.keys(updates).map(k => [k, storage.getItem(k)]));
  try {
    for (const [key, value] of Object.entries(updates)) storage.setItem(key, value);
  } catch {
    for (const [key, value] of Object.entries(before)) {
      try { if (value === null) storage.removeItem(key); else storage.setItem(key, value); } catch { /* storage unavailable */ }
    }
    throw new Error("Falha ao gravar os dados. Tentamos recuperar o estado anterior; confira seu backup.");
  }
}
