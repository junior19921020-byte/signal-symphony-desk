# Etapa 55 — Arquitetura PostgreSQL portátil (Neon como candidato)

**Status:** proposta de arquitetura. Nenhum banco, servidor, integração ou cobrança foi ativado. Somente operações DEMO.

## Decisão
- Usar **PostgreSQL padrão** como fonte futura de dados. Neon é o candidato inicial, não uma dependência obrigatória.
- Manter GitHub para versionamento e Lovable como interface.
- A aplicação cliente **nunca** recebe a URL PostgreSQL, senha ou credenciais administrativas. O acesso passa por API autenticada no servidor.
- Não usar GitHub Actions nem navegador como proteção garantida de Stop Loss/Take Profit. Persistência não equivale a monitoramento 24/7.
- Antes de ativar qualquer serviço, verificar limites gratuitos, cobrança excedente, região, retenção, recuperação e custos de crescimento.

## Modelo proposto (sem executar migração)
- `accounts`: usuário autenticado e identificador interno; não guardar segredos de corretoras.
- `demo_broker_accounts`: vínculo lógico do usuário com Binance, Bybit ou OKX **somente DEMO**.
- `demo_positions`: posição, corretora, símbolo, direção, quantidade, preço de entrada, SL, TP, status, revisão e timestamps.
- `demo_orders`: intenções de ordem DEMO, chave de idempotência única por usuário e corretora, estado e motivo de veto.
- `risk_decisions`: decisão da Rita Risk, limites aplicados, snapshot de dados e motivo.
- `agent_events`: diretor/co-diretor/funcionário, evento, correlação, timestamp, origem e versão.
- `market_observations`: cotação, origem, instante de mercado e recebimento, qualidade e expiração.
- `audit_events`: trilha append-only de ações críticas, ator e correlação.

## Invariantes de segurança
1. Coluna `mode` restrita a `DEMO`; nenhuma rota para envio de ordens reais.
2. Toda linha privada vinculada a `owner_id` e filtrada no servidor; autenticação e autorização testadas.
3. Transações e concorrência controlada para alterações de posição, consumo do limite de risco e ordens; chave de idempotência para impedir duplicatas.
4. Validação de valores finitos positivos, SL/TP coerentes com direção e integridade referencial.
5. Eventos e snapshots versionados; auditoria de decisões, sem segredos ou dados pessoais sensíveis em logs.
6. Falha de cotação, autenticação, heartbeat ou integridade deve bloquear **novas** ordens DEMO e sinalizar risco; não alegar proteção de posições sem serviço independente.
7. Backups, restauração testada, retenção, índices e política de exclusão antes de uso persistente.
8. Segredos apenas no servidor/gerenciador de segredos, nunca no repositório, navegador ou variáveis públicas.

## Migração sem surpresas
1. Exportar e conferir backup JSON dos dados DEMO locais; obter consentimento explícito para importar.
2. Criar migrações SQL PostgreSQL versionadas e testes de esquema/isolamento.
3. Provisionar banco gratuito **somente após** conferência de custos, limites e aprovação.
4. Implantar API mínima autenticada e validar acesso entre usuários, falhas e tentativas duplicadas.
5. Importar uma cópia DEMO em ambiente de testes; reconciliar contagens, saldos e histórico.
6. Ativar leitura do servidor de forma gradual, mantendo rollback e backup local.
7. Só depois considerar processos periódicos e monitoramento independente; testar suspensão, recuperação, custos e atrasos.

## Critérios de aceite para próxima etapa
- Revisão do esquema e das políticas de acesso.
- Testes automatizados de idempotência, isolamento por proprietário, limites de risco e recuperação.
- Comparativo real de custo e limites do provedor no momento da contratação.
- Nenhuma alteração em comportamento do aplicativo, nenhum banco criado e nenhuma credencial configurada nesta etapa.
