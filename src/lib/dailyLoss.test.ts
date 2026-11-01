import { describe,expect,it } from "vitest";
import { dailyLossStatus } from "./dailyLoss";
describe("Rita daily loss gate",()=>{
 const now = new Date(2026,10,1,16).getTime();
 it("blocks at 1% bank based on gross losses",()=>{
   const s=dailyLossStatus([{pnl:-40,closedAt:now},{pnl:80,closedAt:now},{pnl:-60,closedAt:now}],now,10000);
   expect(s.loss).toBe(100);expect(s.blocked).toBe(true);expect(s.remaining).toBe(0);
 });
 it("ignores prior day and legacy trades without timestamp",()=>{
   const s=dailyLossStatus([{pnl:-100,closedAt:new Date(2026,9,31,23).getTime()},{pnl:-100}],now,10000);
   expect(s.loss).toBe(0);expect(s.blocked).toBe(false);
 });
 it("counts stop overrun actual loss",()=>{
   const s=dailyLossStatus([{pnl:-43.38,closedAt:now}],now,10000);
   expect(s.loss).toBeCloseTo(43.38);expect(s.remaining).toBeCloseTo(56.62);
 });
 it("fails closed for invalid bank",()=>expect(dailyLossStatus([],now,0).blocked).toBe(true));
});
