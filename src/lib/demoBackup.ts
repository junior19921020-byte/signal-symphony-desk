/** Versioned local demo snapshot. Never export API keys or credentials. */
export function createDemoBackup(data: {
  balance: number; bank: number; symbol: string;
  positions: unknown[]; trades: unknown[]; audit: unknown[]; targetEdits: unknown[];
}, exportedAt: string = new Date().toISOString()) {
  if (![data.balance, data.bank].every(n => Number.isFinite(n) && n >= 0) || !Number.isFinite(data.bank) || data.bank <= 0)
    throw new Error("Saldo ou banca demo inválidos.");
  if (!/^[A-Z0-9]{3,20}$/.test(data.symbol)) throw new Error("Símbolo inválido.");
  for (const key of ["positions", "trades", "audit", "targetEdits"] as const)
    if (!Array.isArray(data[key])) throw new Error("Histórico demo inválido.");
  if (!Number.isFinite(Date.parse(exportedAt))) throw new Error("Data de backup inválida.");
  return JSON.stringify({
    format: "signal-symphony-demo-backup", version: 1, exportedAt,
    account: { balance: data.balance, bank: data.bank, symbol: data.symbol },
    positions: data.positions, trades: data.trades, audit: data.audit, targetEdits: data.targetEdits,
  }, null, 2);
}
