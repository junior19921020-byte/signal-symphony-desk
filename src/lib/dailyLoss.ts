export function dailyLossStatus(trades: { pnl: number; closedAt?: number }[], now: number, bank: number) {
  const valid = Number.isFinite(now) && now > 0 && Number.isFinite(bank) && bank > 0;
  if (!valid) return { loss: 0, limit: 0, remaining: 0, blocked: true, count: 0 };
  const start = new Date(now); start.setHours(0,0,0,0);
  const end = new Date(start); end.setDate(end.getDate()+1);
  const today = trades.filter(t => typeof t.closedAt === "number" && Number.isFinite(t.closedAt) && t.closedAt >= start.getTime() && t.closedAt < end.getTime() && Number.isFinite(t.pnl));
  const loss = today.reduce((sum,t)=>sum+Math.max(0,-t.pnl),0);
  const limit = bank*0.01;
  return { loss, limit, remaining: Math.max(0,limit-loss), blocked: loss >= limit-0.000001, count: today.length };
}
