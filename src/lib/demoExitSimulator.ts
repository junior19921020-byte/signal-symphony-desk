export type ExitRule = "TAKE_PROFIT" | "STOP_LOSS" | "PROFIT_TARGET" | "PROTECT_PROFIT" | "AGENT";
export interface DemoExitScenario {
  entry: number;
  side: "COMPRA" | "VENDA";
  qty: number;
  stopLoss: number;
  takeProfit: number;
  observedPrices: number[];
  profitTargetUsdt?: number;
  protectAfterUsdt?: number;
  protectFloorUsdt?: number;
  agentExitIndex?: number;
}
export interface DemoExitResult {
  rule: ExitRule;
  exitIndex: number | null;
  exitPrice: number | null;
  pnl: number | null;
  reason: string;
}
export function simulateDemoExits(input: DemoExitScenario): DemoExitResult[] {
  const rules: ExitRule[] = ["TAKE_PROFIT", "STOP_LOSS", "PROFIT_TARGET", "PROTECT_PROFIT", "AGENT"];
  const valid = [input.entry, input.qty, input.stopLoss, input.takeProfit].every(v => Number.isFinite(v) && v > 0)
    && (input.side === "COMPRA" || input.side === "VENDA")
    && Array.isArray(input.observedPrices) && input.observedPrices.length > 0
    && input.observedPrices.every(v => Number.isFinite(v) && v > 0)
    && (input.side === "COMPRA" ? input.stopLoss < input.entry && input.takeProfit > input.entry : input.stopLoss > input.entry && input.takeProfit < input.entry);
  const unavailable = (rule: ExitRule, reason: string): DemoExitResult => ({ rule, exitIndex: null, exitPrice: null, pnl: null, reason });
  if (!valid) return rules.map(rule => unavailable(rule, "Dados insuficientes ou inválidos"));
  const pnlAt = (price: number) => (input.side === "COMPRA" ? price - input.entry : input.entry - price) * input.qty;
  const stopHit = (price: number) => input.side === "COMPRA" ? price <= input.stopLoss : price >= input.stopLoss;
  const takeHit = (price: number) => input.side === "COMPRA" ? price >= input.takeProfit : price <= input.takeProfit;
  const resultAt = (rule: ExitRule, index: number, reason: string): DemoExitResult => ({ rule, exitIndex: index, exitPrice: input.observedPrices[index], pnl: pnlAt(input.observedPrices[index]), reason });
  const find = (rule: ExitRule, test: (price: number, i: number) => boolean): DemoExitResult => {
    const index = input.observedPrices.findIndex(test);
    return index < 0 ? unavailable(rule, "Gatilho não observado nas amostras") : resultAt(rule, index, "Gatilho observado; preço hipotético da amostra");
  };
  const tp = find("TAKE_PROFIT", takeHit);
  const sl = find("STOP_LOSS", stopHit);
  const target = Number.isFinite(input.profitTargetUsdt) && (input.profitTargetUsdt ?? 0) > 0
    ? find("PROFIT_TARGET", price => pnlAt(price) >= input.profitTargetUsdt!)
    : unavailable("PROFIT_TARGET", "Meta de lucro não configurada");
  let armed = false;
  const protect = Number.isFinite(input.protectAfterUsdt) && (input.protectAfterUsdt ?? 0) > 0
    && Number.isFinite(input.protectFloorUsdt) && (input.protectFloorUsdt ?? -1) >= 0
    && input.protectFloorUsdt! < input.protectAfterUsdt!
    ? find("PROTECT_PROFIT", price => {
        const pnl = pnlAt(price);
        if (!armed && pnl >= input.protectAfterUsdt!) armed = true;
        return armed && pnl <= input.protectFloorUsdt!;
      })
    : unavailable("PROTECT_PROFIT", "Parâmetros de proteção não configurados");
  const agent = Number.isInteger(input.agentExitIndex) && input.agentExitIndex! >= 0 && input.agentExitIndex! < input.observedPrices.length
    ? resultAt("AGENT", input.agentExitIndex!, "Índice de saída fornecido; não simula decisão de IA")
    : unavailable("AGENT", "Sem decisão de saída do agente registrada");
  return [tp, sl, target, protect, agent];
}
