import { describe, expect, it } from "vitest";
import { createDemoBackup } from "./demoBackup";
const data = { balance: 9900, bank: 10000, symbol: "BTCUSDT", positions: [], trades: [{id:"t1",pnl:-100}], audit: [], targetEdits: [] };
describe("demo backup export", () => {
  it("exports versioned snapshot and trades", () => {
    const backup = JSON.parse(createDemoBackup(data,"2026-11-01T20:00:00.000Z"));
    expect(backup.format).toBe("signal-symphony-demo-backup");
    expect(backup.version).toBe(1);
    expect(backup.trades[0].id).toBe("t1");
    expect(backup.account.balance).toBe(9900);
  });
  it("never includes unrelated credentials", () => {
    const backup = createDemoBackup({...data, apiKey:"SECRET"} as typeof data);
    expect(backup).not.toContain("SECRET");
    expect(backup).not.toContain("apiKey");
  });
  it("rejects invalid balances and history", () => {
    expect(()=>createDemoBackup({...data,balance:NaN})).toThrow();
    expect(()=>createDemoBackup({...data,trades:null as unknown as []})).toThrow();
  });
});
