import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";
import { fetchMarket, marketContext } from "./trading";

function buildLocalAnalystReply(input: { system: string; role: string; question: string; context: string; action: string }): string {
  const role = input.role.toLowerCase();
  const lines = input.context.split("\n");
  const header = lines[0] || "";
  const indicators = lines[1] || "";
  const candlesInfo = lines[2] || "";
  const researchLine = lines.find((l) => l.startsWith("Pesquisa")) || "";
  const chartLine = lines.find((l) => l.startsWith("Gráfico")) || "";
  const riskLine = lines.find((l) => l.startsWith("Risco")) || "";
  const signalLine = lines.find((l) => l.startsWith("Sinal Consolidado")) || "";
  const lastCandles = lines.find((l) => l.startsWith("Últimas 5 velas")) || "";
  const newsLine = lines.find((l) => l.startsWith("Manchetes Cripto")) || "";

  const actionPrefix = input.action ? `✅ Ação executada: ${input.action}\n\n` : "";

  if (role.includes("notícia") || role.includes("noticia") || role.includes("pesquisa")) {
    return `${actionPrefix}Aqui é a Ana News. Analisando os dados em tempo real (${header}): ${researchLine.replace("Pesquisa (Ana News): ", "")}. ${candlesInfo}. ${newsLine ? newsLine : ""} Diante desse fluxo de curto prazo e do gráfico (${chartLine.replace("Gráfico (Sofia Quant): ", "")}), minha recomendação atual acompanha o ${signalLine}.`;
  }
  if (role.includes("gráfica") || role.includes("grafica") || role.includes("quant")) {
    return `${actionPrefix}Aqui é a Sofia Quant. Leitura atualizada do gráfico (${header}): ${indicators}. ${candlesInfo}. Diagnóstico técnico: ${chartLine.replace("Gráfico (Sofia Quant): ", "")}. ${lastCandles}. Com base na confluência entre médias móveis, RSI, MACD e estrutura de topos e fundos, o sinal consolidado agora é ${signalLine.replace("Sinal Consolidado (Max Trader): ", "")}.`;
  }
  if (role.includes("risco")) {
    return `${actionPrefix}Aqui é a Rita Risk. Avaliação de gerenciamento de risco para ${header}: ${riskLine.replace("Risco (Rita Risk): ", "")}. ${researchLine} e ${chartLine}. Só liberamos entrada quando Pesquisa e Análise Gráfica estão alinhadas na mesma direção com relação retorno/risco de 2:1 (${signalLine}).`;
  }
  return `${actionPrefix}Aqui é o Max Trader. Status da mesa para ${header}: ${signalLine}. ${riskLine}. ${indicators}. Estou monitorando os níveis de Stop Loss e Take Profit em tempo real; você também pode me comandar "Compre agora", "Abra uma venda" ou "Encerre as posições" a qualquer momento.`;
}

export async function askAgent(input: { system: string; role: string; question: string; context: string; action: string }) {
  let context = input.context;
  if (!context || context.includes("Não foi possível ler a Binance")) {
    const fresh = await fetchMarket("BTCUSDT", 10000);
    if (fresh) context = marketContext(fresh);
  }

  const enrichedInput = { ...input, context };
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) {
    return { ok: true as const, text: buildLocalAnalystReply(enrichedInput) };
  }

  const provider = createOpenAI({
    baseURL: "https://ai.gateway.lovable.dev/v1",
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
  });
  const instructions = `${input.system}
Seu cargo: ${input.role}. Funções do escritório:
- Pesquisa (Ana News): momentum 5m/15m, fluxo comprador vs vendedor e manchetes do mercado cripto.
- Análise Gráfica (Sofia Quant): padrão das velas, suportes/resistências, RSI, cruzamento de EMAs, MACD -> ALTA, BAIXA ou LATERAL.
- Gestão de Risco (Rita Risk): aprova/veta, calcula lote, SL e TP (COMPRA: SL abaixo/TP acima; VENDA: SL acima/TP abaixo; risco 1% da banca).
- Execução (Max Trader): só executa COMPRA ou VENDA se Pesquisa e Gráfico concordarem; caso contrário AGUARDAR.
Responda SEMPRE em português, do ponto de vista da SUA função, citando números reais das velas e manchetes fornecidas. Nunca diga que a leitura falhou se houver dados no contexto; 3 a 6 frases objetivas.`;

  try {
    const result = streamText({
      model: provider.responses("openai/gpt-6-astra"),
      system: instructions,
      prompt: `DADOS REAIS DA BINANCE AGORA:\n${context}\n\n${input.action ? `AÇÃO JÁ EXECUTADA NA CONTA DEMO: ${input.action}\n\n` : ""}MENSAGEM DO USUÁRIO: ${input.question}`,
      providerOptions: { openai: { store: false, forceReasoning: true, reasoningEffort: "low", include: ["reasoning.encrypted_content"] } },
    });
    const text = (await result.text).trim();
    if (!text) return { ok: true as const, text: buildLocalAnalystReply(enrichedInput) };
    return { ok: true as const, text };
  } catch {
    return { ok: true as const, text: buildLocalAnalystReply(enrichedInput) };
  }
}
