# Etapa 56 — Esquema SQL DEMO, não implantado

Arquivo: `db/migrations/0001_demo_schema.sql`.

**Não executar ainda.** Nenhum Neon, Lovable Cloud ou outro banco foi criado; não houve cobrança. O esquema usa PostgreSQL padrão e pode ser aplicado futuramente em um ambiente isolado após revisão.

## Proteções presentes
- Restrição explícita a modo `DEMO` em contas de corretora, posições e ordens.
- Chaves estrangeiras compostas para impedir referência a posições de outro proprietário.
- Validação de preços, direção e coerência de SL/TP.
- Chaves de idempotência únicas por proprietário e conta DEMO.
- RLS `ENABLE` + `FORCE`, **sem políticas permissivas**; permissões `PUBLIC` revogadas. Isso significa que o aplicativo ainda **não consegue ler ou gravar** usando um papel comum.

## Trabalho obrigatório antes de implantação
1. Revisar roles, privilégios herdados, propriedade de tabelas e autenticação na API; criar políticas RLS com testes de isolamento entre usuários. Não usar conta superuser ou `BYPASSRLS` na API.
2. Definir como a identidade do usuário será validada no servidor, sem confiar em `owner_id` vindo do navegador.
3. Criar transações de execução DEMO com travas/revisão, controle de orçamento de risco e tratamento de repetição.
4. Definir eventos imutáveis, política de retenção, backups e teste real de restauração.
5. Testar o SQL em PostgreSQL descartável e adicionar testes de integração.
6. Avaliar preço e limites atuais do Neon, região, suspensão por inatividade e comportamento ao exceder cotas.
7. Planejar importação do histórico local com consentimento e conferência dos saldos.

**Importante:** tabelas não são processos em segundo plano. Nenhuma proteção 24/7 ou Stop Loss independente foi implementada.
