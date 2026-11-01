export interface DemoBackupPreview {
  exportedAt: string; balance: number; bank: number; symbol: string;
  positions: number; trades: number; audit: number; targetEdits: number;
}
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);
const validAmount = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v >= 0;
const validNumber = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
export function previewDemoBackup(raw: string): DemoBackupPreview {
  if (raw.length > 2_000_000) throw new Error("Arquivo muito grande (máximo 2 MB).");
  let data: unknown;
  try { data = JSON.parse(raw); } catch { throw new Error("O arquivo não é um JSON válido."); }
  if (!object(data) || data.format !== "signal-symphony-demo-backup" || data.version !== 1)
    throw new Error("Formato ou versão do backup não reconhecido.");
  if (typeof data.exportedAt !== "string" || !Number.isFinite(Date.parse(data.exportedAt)))
    throw new Error("Data de exportação inválida.");
  if (!object(data.account) || !validAmount(data.account.balance) || !validNumber(data.account.bank) || data.account.bank <= 0 ||
      typeof data.account.symbol !== "string" || !/^[A-Z0-9]{3,20}$/.test(data.account.symbol))
    throw new Error("Dados da conta demo inválidos.");
  for (const key of ["positions", "trades", "audit", "targetEdits"] as const) {
    if (!Array.isArray(data[key]) || data[key].length > 10000)
      throw new Error("Histórico inválido ou excessivamente grande.");
  }
  const ids = new Set<string>();
  for (const trade of data.trades as unknown[]) {
    if (!object(trade) || typeof trade.id !== "string" || !trade.id || ids.has(trade.id) ||
        !["COMPRA", "VENDA"].includes(String(trade.side)) ||
        ![trade.entry, trade.exit, trade.pnl].every(validNumber) ||
        !["TP", "SL", "IA", "MANUAL"].includes(String(trade.result)))
      throw new Error("Operação inválida ou duplicada no backup.");
    ids.add(trade.id);
  }
  for (const position of data.positions as unknown[]) {
    if (!object(position) || typeof position.id !== "string" || !position.id || ids.has(position.id) ||
        typeof position.symbol !== "string" || !/^[A-Z0-9]{3,20}$/.test(position.symbol) ||
        !["COMPRA", "VENDA"].includes(String(position.side)) ||
        ![position.entry, position.sl, position.tp, position.qty].every((v) => validNumber(v) && v > 0))
      throw new Error("Posição aberta inválida ou duplicada no backup.");
    ids.add(position.id);
  }
  return {
    exportedAt: data.exportedAt, balance: data.account.balance, bank: data.account.bank,
    symbol: data.account.symbol, positions: data.positions.length, trades: data.trades.length,
    audit: data.audit.length, targetEdits: data.targetEdits.length,
  };
}
