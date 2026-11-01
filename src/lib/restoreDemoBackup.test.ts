import { describe, expect, it } from "vitest";
import { createDemoBackup } from "./demoBackup";
import { parseRestorableDemoBackup, restoreDemoBackupToStorage } from "./restoreDemoBackup";

const valid = () => createDemoBackup({
  balance: 9845.96, bank: 10000, symbol: "BTCUSDT", positions: [],
  trades: [{ id: "t1", side: "VENDA", entry: 78000, exit: 77900, pnl: 50, result: "TP" }],
  audit: [{ id: "a1", at: 1730000000000, symbol: "BTCUSDT", reason: "Aprovada" }],
  targetEdits: [{ id: "t1", at: 1730000000000, oldTp: 77900, newTp: 77800, oldSl: 78100, newSl: 78050 }],
});
describe("restauração segura do backup demo", () => {
  it("valida e prepara backup fechado", () => {
    const parsed = parseRestorableDemoBackup(valid());
    expect(parsed.balance).toBe(9845.96);
    expect(parsed.trades).toHaveLength(1);
    expect(parsed.positions).toEqual([]);
  });
  it("recusa posições abertas e valores inválidos", () => {
    const open = JSON.parse(valid());
    open.positions = [{ id: "p1", symbol: "BTCUSDT", side: "VENDA", entry: 78000, sl: 78100, tp: 77900, qty: 1 }];
    expect(() => parseRestorableDemoBackup(JSON.stringify(open))).toThrow(/posições abertas/);
    const invalid = JSON.parse(valid());
    invalid.trades[0].entry = -10;
    expect(() => parseRestorableDemoBackup(JSON.stringify(invalid))).toThrow(/valores inválidos/);
  });
  it("grava o backup e mantém piloto manual", () => {
    const data = new Map<string,string>([["td_settings", JSON.stringify({ apiKey: "keep-local", bank: 1 })]]);
    const storage = {
      getItem: (k: string) => data.get(k) ?? null,
      setItem: (k: string, v: string) => { data.set(k,v); },
      removeItem: (k: string) => { data.delete(k); },
    };
    restoreDemoBackupToStorage(storage, parseRestorableDemoBackup(valid()));
    expect(JSON.parse(data.get("td_balance")!)).toBe(9845.96);
    expect(JSON.parse(data.get("td_auto")!)).toBe("manual");
    expect(JSON.parse(data.get("td_settings")!).apiKey).toBe("keep-local");
  });
  it("faz rollback quando storage falha", () => {
    const data = new Map<string,string>([["td_balance","111"],["td_trades","[]"]]);
    let failed = false;
    const storage = {
      getItem: (k: string) => data.get(k) ?? null,
      setItem: (k: string,v: string) => { if (k === "td_trades" && !failed) { failed = true; throw Error("quota"); } data.set(k,v); },
      removeItem: (k: string) => { data.delete(k); },
    };
    expect(() => restoreDemoBackupToStorage(storage, parseRestorableDemoBackup(valid()))).toThrow(/Falha ao gravar/);
    expect(data.get("td_balance")).toBe("111");
    expect(data.get("td_trades")).toBe("[]");
  });
});
