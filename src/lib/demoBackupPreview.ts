export interface DemoBackupPreview {
  exportedAt: string; balance: number; bank: number; symbol: string;
  positions: number; trades: number; audit: number; targetEdits: number;
}
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);
const validAmount = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v >= 0;
const validNumber = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
export function previewDemoBackup(raw: string): DemoBackupPreview {
  if (raw.length > 2_000_000) throw new Error("Arquivo muito grande (máximo 2 MB).");
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { throw new Error("O arquivo não é um JSON válido."); }
  if (!object(parsed) || parsed["format"] !== "signal-symphony-demo-backup" || parsed["version"] !== 1)
    throw new Error("Formato ou versão do backup não reconhecido.");
  const data = parsed;
  const exportedAt = data["exportedAt"];
  if (typeof exportedAt !== "string" || !Number.isFinite(Date.parse(exportedAt)))
    throw new Error("Data de exportação inválida.");
  if (!object(data["account"])) throw new Error("Dados da conta demo inválidos.");
  const account = data["account"];
  const balance = account["balance"];
  const bank = account["bank"];
  const symbol = account["symbol"];
  if (!validAmount(balance) || !validNumber(bank) || bank <= 0 ||
      typeof symbol !== "string" || !/^[A-Z0-9]{3,20}$/.test(symbol))
    throw new Error("Dados da conta demo inválidos.");
  const lists: Record<"positions" | "trades" | "audit" | "targetEdits", unknown[]> =
    { positions: [], trades: [], audit: [], targetEdits: [] };
  for (const key of ["positions", "trades", "audit", "targetEdits"] as const) {
    const list = data[key];
    if (!Array.isArray(list) || list.length > 10000)
      throw new Error("Histórico inválido ou excessivamente grande.");
    lists[key] = list as unknown[];
  }
  const ids = new Set<string>();
  for (const trade of lists["trades"]) {
    if (!object(trade) || typeof trade["id"] !== "string" || !trade["id"] || ids.has(trade["id"]) ||
        !["COMPRA", "VENDA"].includes(String(trade["side"])) ||
        ![trade["entry"], trade["exit"], trade["pnl"]].every(validNumber) ||
        !["TP", "SL", "IA", "MANUAL"].includes(String(trade["result"])))
      throw new Error("Operação inválida ou duplicada no backup.");
    ids.add(trade["id"]);
  }
  for (const position of lists["positions"]) {
    if (!object(position) || typeof position["id"] !== "string" || !position["id"] || ids.has(position["id"]) ||
        typeof position["symbol"] !== "string" || !/^[A-Z0-9]{3,20}$/.test(position["symbol"]) ||
        !["COMPRA", "VENDA"].includes(String(position["side"])) ||
        ![position["entry"], position["sl"], position["tp"], position["qty"]].every((v) => validNumber(v) && v > 0))
      throw new Error("Posição aberta inválida ou duplicada no backup.");
    ids.add(position["id"]);
  }
  return {
    exportedAt, balance, bank, symbol,
    positions: lists["positions"].length, trades: lists["trades"].length,
    audit: lists["audit"].length, targetEdits: lists["targetEdits"].length,
  };
}
