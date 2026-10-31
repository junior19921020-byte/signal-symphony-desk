import { describe, it, expect } from "vitest";
import { parseIntent } from "@/lib/trading";
describe("parseIntent", () => {
  it("compre agora executa compra", () => expect(parseIntent("Compre agora")).toBe("BUY"));
  it("abra uma venda executa venda", () => expect(parseIntent("Abra uma venda")).toBe("SELL"));
  it("pergunta de posição mostra status", () => expect(parseIntent("Qual é a nossa posição?")).toBe("STATUS"));
  it("pergunta posso comprar não executa", () => expect(parseIntent("Posso comprar?")).toBe(null));
  it("encerre tudo fecha", () => expect(parseIntent("Encerre as posições")).toBe("CLOSE"));
});
