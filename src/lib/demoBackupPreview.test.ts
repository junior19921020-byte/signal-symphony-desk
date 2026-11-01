import { describe, expect, it } from "vitest";
import { createDemoBackup } from "./demoBackup";
import { previewDemoBackup } from "./demoBackupPreview";
const fixture = { balance: 9845.96, bank: 10000, symbol: "BTCUSDT", positions: [], trades: [{id:"t1",side:"VENDA",entry:100,exit:99,pnl:1,result:"TP"}], audit: [], targetEdits: [] };
describe("demo backup import preview", () => {
 it("accepts a versioned export and summarizes without mutating storage", () => {
  expect(previewDemoBackup(createDemoBackup(fixture)).trades).toBe(1);
 });
 it("rejects unknown versions, malformed files and duplicates", () => {
  expect(()=>previewDemoBackup("{}")).toThrow();
  expect(()=>previewDemoBackup("not json")).toThrow();
  expect(()=>previewDemoBackup(createDemoBackup({...fixture,trades:[fixture.trades[0],fixture.trades[0]]}))).toThrow();
 });
 it("rejects invalid position quantities", () => {
  expect(()=>previewDemoBackup(createDemoBackup({...fixture,positions:[{id:"p1",symbol:"BTCUSDT",side:"VENDA",entry:100,sl:101,tp:99,qty:-1}]}))).toThrow();
 });
});
