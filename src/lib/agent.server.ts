import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";

export async function askAgent(input: { system: string; role: string; question: string; context: string; action: string }) {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) return { ok: false as const, error: "IA não configurada." };
  const provider = createOpenAI({
    baseURL: "https://ai.gateway.lovable.dev/v1",
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
  });
  const instructions = `${input.system}
Seu cargo: ${input.role}. Funções do escritório:
- Pesquisa: momentum 5m/15m e volume comprador vs vendedor.
- Análise Gráfica: padrão das velas, suportes/resistências, RSI, cruzamento de EMAs, MACD → ALTA, BAIXA ou LATERAL.
- Gestão de Risco: aprova/veta, calcula lote, SL e TP (COMPRA: SL abaixo/TP acima; VENDA: SL acima/TP abaixo; risco 1% da banca).
- Execução: só executa COMPRA ou VENDA se Pesquisa e Gráfico concordarem; caso contrário AGUARDAR.
Responda SEMPRE em português, do ponto de vista da SUA função, citando números reais das velas fornecidas (preços, topos, fundos, volumes). Nunca repita frases prontas; 3 a 6 frases objetivas. Se o mercado estiver lateral ou os agentes divergirem, recomende AGUARDAR.`;
  try {
    const result = streamText({
      model: provider.responses("openai/gpt-6-astra"),
      system: instructions,
      prompt: `DADOS REAIS DA BINANCE AGORA:\n${input.context}\n\n${input.action ? `AÇÃO JÁ EXECUTADA NA CONTA DEMO: ${input.action}\n\n` : ""}MENSAGEM DO USUÁRIO: ${input.question}`,
      providerOptions: { openai: { store: false, forceReasoning: true, reasoningEffort: "low", include: ["reasoning.encrypted_content"] } },
    });
    const text = (await result.text).trim();
    if (!text) return { ok: false as const, error: "A IA não respondeu." };
    return { ok: true as const, text };
  } catch (e) {
    const status = (e as { statusCode?: number }).statusCode;
    const msg = status === 402 ? "Créditos de IA esgotados no workspace." : status === 429 ? "Muitas perguntas seguidas, aguarde alguns segundos." : "IA indisponível no momento.";
    return { ok: false as const, error: msg };
  }
}
