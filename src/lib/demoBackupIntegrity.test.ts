import { describe, expect, it } from "vitest";
import { createDemoBackup } from "./demoBackup";
import { parseRestorableDemoBackup, restoreDemoBackupToStorage } from "./restoreDemoBackup";
import { verifyRestoredDemoBackup } from "./demoBackupIntegrity";
const raw = createDemoBackup({
  balance: 9845.96, bank: 10000, symbol: "BTCUSDT", positions: [],
  trades: [{ id: "t1", side: "VENDA", entry: 78000, exit: 77900, pnl: 50, result: "TP" }],
  audit: [{ id: "a1", at: 1730000000000, symbol: "BTCUSDT", reason: "Aprovada" }],
  targetEdits: [{ id: "t1", at: 1730000000000, oldTp: 77900, newTp: 77800, oldSl: 78100, newSl: 78050 }],
});
function setup() {
  const data = new Map<string, string>();
  const storage = { getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => { data.set(k, v); },
    removeItem: (k: string) => { data.delete(k); } };
  restoreDemoBackupToStorage(storage, parseRestorableDemoBackup(raw));
  return { data, storage };
}
describe("verificação exata do backup demo", () => {
  it("aprova conteúdo idêntico", () => {
    const { storage } = setup();
    expect(verifyRestoredDemoBackup(raw, storage)).toEqual({ ok: true, differences: [] });
  });
  it("detecta P&L alterado sem mudança na quantidade de trades", () => {
    const { data, storage } = setup();
    const trades = JSON.parse(data.get("td_trades")!);
    trades[0].pnl = 999;
    data.set("td_trades", JSON.stringify(trades));
    expect(verifyRestoredDemoBackup(raw, storage).differences).toContain("trades: diferente do backup");
  });
  it("detecta auditoria, metas e piloto modificados", () => {
    const { data, storage } = setup();
    data.set("td_decision_audit_v1", "[]");
    data.set("td_target_edits", "[]");
    data.set("td_auto", JSON.stringify("5m"));
    expect(verifyRestoredDemoBackup(raw, storage).differences).toEqual(expect.arrayContaining([
      "auditorias: diferente do backup", "edições de metas: diferente do backup", "piloto: diferente do backup",
    ]));
  });
  it("não modifica storage e detecta JSON inválido", () => {
    const { data, storage } = setup();
    data.set("td_trades", "{");
    expect(verifyRestoredDemoBackup(raw, storage).ok).toBe(false);
    expect(data.get("td_trades")).toBe("{");
  });
});
