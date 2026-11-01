import type { Market, Side } from "./trading";

/** Fail-closed validation for simulated order entry. Never submits exchange orders. */
export function demoOrderRejection(m: Market | null, side: Side, symbol: string): string | null {
  if (!m) return "Análise de mercado indisponível.";
  if (m.symbol !== symbol) return "Análise pertence a outro ativo.";
  if (!m.riskApproved || m.signal === "AGUARDAR") return "Rita Risk não aprovou a operação.";
  if (m.signal !== side) return "Direção contrária ao consenso aprovado.";
  if (!Number.isFinite(m.price) || m.price <= 0) return "Preço inválido.";
  if (!Number.isFinite(m.qty) || m.qty <= 0) return "Lote inválido.";
  if (!Number.isFinite(m.sl) || !Number.isFinite(m.tp) || !Number.isFinite(m.slDist) || m.slDist <= 0) return "Stop ou alvo inválido.";
  if (side === "COMPRA" && !(m.sl < m.price && m.tp > m.price)) return "Stop ou alvo invertido para compra.";
  if (side === "VENDA" && !(m.sl > m.price && m.tp < m.price)) return "Stop ou alvo invertido para venda.";
  return null;
}
