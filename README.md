# Signal Symphony Desk

Crie uma aplicação web completa em React, TypeScript e Tailwind CSS chamada "TRADING DESK - Escritório de Agentes". 



REGRAS CRÍTICAS DE ESTABILIDADE E TYPESCRIPT (PARA COMPILAR DE PRIMEIRA SEM ERROS):

- Use apenas tipos explícitos seguros. NUNCA chame `.toFixed()` diretamente em variáveis; crie e use sempre uma função utilitária `const fmt = (v: unknown, d = 2) => Number(v || 0).toFixed(d);`.

- Envolva todas as chamadas `fetch` em blocos `try/catch` silenciosos.

- Limpe todos os `setInterval` dentro do `useEffect` (`return () => clearInterval(id)`).

- NÃO crie timers que gerem logs falsos a cada poucos segundos (isso estoura a memória do celular). Limite qualquer lista de mensagens/logs a no máximo 20 itens (`.slice(-20)`).

- Layout 100% responsivo para celular: o container principal deve ter `w-full max-w-md mx-auto px-3 pt-4 pb-24 overflow-x-hidden bg-[#0b0e14] text-slate-100 min-h-screen`.



ESTRUTURA FUNCIONAL OBRIGATÓRIA:



1. CABEÇALHO E SALAS (TOPO):

- Título "TRADING DESK" (dourado) e "Escritório de Agentes" (branco), abaixo um card "18º Andar • Mesa de Operações".

- Lista clicável das 4 salas mostrando a lotação (`1/4` até `4/4`):

  1) Pesquisa (Ana News - Analista de Notícias)

  2) Análise Gráfica (Sofia Quant - Analista Gráfica)

  3) Gestão de Risco (Rita Risk - Diretora de Risco)

  4) Execução (Max Trader - Executor de Ordens)

- Botão amarelo "+ Contratar Funcionário" que adiciona um novo agente na primeira sala que tiver vaga (< 4), salvando no `localStorage`.



2. PAINEL DE CONTROLE E DADOS REAIS DA BINANCE:

- Botão verde "▶ Rodar Ciclo de Operação", botão "⚙ Configurações Globais" e seletor "Piloto Automático" (Manual, 1m, 5m, 15m) com cronômetro regressivo funcional.

- Ao rodar o ciclo, busque dados reais na API pública da Binance (`https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=15m&limit=40`).

- Calcule matematicamente a partir dos fechamentos: Preço Atual, Variação %, RSI(14), EMA(9) e EMA(21).

- Regra de Sinal: Se `EMA9 >= EMA21` e `RSI < 70`, o sinal é `COMPRA` (verde); caso contrário, `VENDA` (vermelho).

- Calcule Risco = 1% da banca (padrão 10.000 USDT = 100 USDT). Distância do Stop Loss = 0.32% do preço de entrada; Take Profit = 0.64% do preço de entrada (relação 2:1).

- Exiba o Card do Sinal APROVADO com: Entrada, Stop Loss, Take Profit, RSI14, EMA9/21, Risco em USDT, justificativa técnica clara e o botão "Executar na Conta Demo ✓".



3. MAPA ISOMÉTRICO 3D EM SVG (SEM CORTES E COM BONECOS EM PÉ):

- Crie um SVG responsivo (`viewBox="0 0 600 420" className="w-full h-auto block select-none"`). NÃO use CSS `rotateX` ou `rotateZ` para não achatar os bonecos.

- Desenhe em projeção isométrica 2D dentro do SVG as 4 salas de trabalho com paredes 3D + 1 área verde de "DESCANSO" com sofá e plantas:

  - Sala 0 (Pesquisa): centro-topo

  - Sala 2 (Gestão de Risco): esquerda

  - Sala 1 (Análise Gráfica): direita

  - Sala 3 (Execução): centro-baixo

- Em cada sala, desenhe 4 mesas isométricas 3D com monitores brilhantes.

- Desenhe cada agente EM PÉ atrás da sua mesa (pernas, tronco com a cor do agente, cabeça e cabelo) e um balão branco arredondado acima da cabeça mostrando o status atualizado (ex: `Contexto ▲ 0.6%`, `RSI 61 • Alta`, `Risco 100 USDT`, `Sinal: COMPRA ✓`).

- Clicar em qualquer boneco no SVG ou na lista de salas abre o Modal de Chat daquele agente.



4. CHAT INTELIGENTE DOS AGENTES (RESPONDE SEMPRE E NUNCA FICA MUDO):

- No modal do agente, mostre Nome, Cargo, System Prompt editável, histórico de conversa e barra de digitação com botão "Enviar".

- IMPORTANTE PARA MOBILE: Adicione `pb-16` (64px de espaço inferior) abaixo da barra de digitação do modal para que o selo flutuante "Edit with Lovable" NUNCA cubra o botão "Enviar".

- Quando o usuário enviar uma pergunta (ex: "Posso comprar?", "Vale a pena vender?", "Qual o stop?", "Como está o mercado?"):

  a) Se houver uma API Key configurada, tente chamar `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}` com `try/catch`.

  b) SE a chave estiver vazia OU se a chamada da API retornar erro (ex: chaves iniciadas com `AQ.` ou erro de CORS), acione IMEDIATAMENTE um Motor Analítico Local em português que analisa a pergunta do usuário e responde em nome do agente usando os números reais da Binance daquele instante:

     - Se perguntar sobre comprar/vender/entrar: diga claramente "SIM, recomendo COMPRA" (se EMA9 >= EMA21 e RSI < 70) ou "NÃO recomendo compra agora, o sinal é de VENDA/CAUTELA" (se EMA9 < EMA21 ou RSI >= 70), informando o preço exato, RSI14, EMA9 vs EMA21, Stop Loss e Take Profit.

     - Se perguntar sobre risco/stop/banca: informe o valor de 1% da banca, o preço exato do Stop Loss e do Take Profit.

     - Para qualquer outra pergunta: dê o diagnóstico completo da tendência atual do ativo com todos os números ao vivo.



5. CONTA DEMO (PAPER TRADING) EM TEMPO REAL E CONFIGURAÇÕES:

- Atualize o preço atual na API da Binance (`https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`) a cada 5 segundos.

- Na seção "Posições Abertas & Histórico de Trades", mostre: Saldo Realizado, Patrimônio, P&L Flutuante em USDT e Taxa de Acerto (Win Rate %).

- Calcule o lucro/prejuízo flutuante de cada ordem aberta e feche automaticamente a posição quando o preço atingir o Take Profit ou Stop Loss, somando o resultado ao Saldo Realizado.

- Adicione um botão retrátil para abrir/fechar o iframe do gráfico TradingView (`BINANCE:${symbol}`, intervalo 15m, tema dark) que só renderiza quando aberto.

- No modal "⚙ Configurações Globais", permita salvar no `localStorage`: API Key do Gemini (aceitando qualquer formato como `AQ...` ou `AIza...`), Ativo (`BTCUS

DT`, `ETHUSDT`, `SOLUSDT`, `BNBUSDT`) e Banca Inicial.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://signal-symphony-desk.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/6724692d-a19f-4f7f-a979-8e9fdbfa0883).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
