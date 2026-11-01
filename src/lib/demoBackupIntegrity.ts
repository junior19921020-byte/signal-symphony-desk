import { parseRestorableDemoBackup } from "./restoreDemoBackup";

/** Read-only deep comparison of the restored demo snapshot. */
export function verifyRestoredDemoBackup(raw: string, storage: Pick<Storage, "getItem">) {
  const expected = parseRestorableDemoBackup(raw);
  const differences: string[] = [];
  const read = (key: string): unknown => {
    try { const value = storage.getItem(key); return value === null ? undefined : JSON.parse(value); }
    catch { differences.push(key + ": JSON inválido"); return undefined; }
  };
  const rawSettings = read("td_settings");
  const settings = rawSettings && typeof rawSettings === "object" && !Array.isArray(rawSettings)
    ? rawSettings as Record<string, unknown> : {};
  const fields: Array<[string, unknown, unknown]> = [
    ["saldo", expected.balance, read("td_balance")],
    ["banca", expected.bank, settings.bank],
    ["ativo", expected.symbol, settings.symbol],
    ["posições", expected.positions, read("td_positions")],
    ["trades", expected.trades, read("td_trades")],
    ["auditorias", expected.audit, read("td_decision_audit_v1")],
    ["edições de metas", expected.targetEdits, read("td_target_edits")],
    ["piloto", "manual", read("td_auto")],
    ["próxima execução", 0, read("td_next_run")],
  ];
  for (const [name, wanted, actual] of fields)
    if (!same(wanted, actual)) differences.push(name + ": diferente do backup");
  return { ok: differences.length === 0, differences };
}
function same(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (Array.isArray(a) || Array.isArray(b))
    return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((v, i) => same(v, b[i]));
  if (a === null || b === null || typeof a !== "object" || typeof b !== "object") return false;
  const x = a as Record<string, unknown>, y = b as Record<string, unknown>;
  const keys = Object.keys(x);
  return keys.length === Object.keys(y).length && keys.every(k => Object.prototype.hasOwnProperty.call(y, k) && same(x[k], y[k]));
}
