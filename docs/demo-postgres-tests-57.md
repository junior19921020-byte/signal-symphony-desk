# Etapa 57 — Plano de testes do PostgreSQL DEMO

## Implementado
`src/lib/demoPostgresSchema.test.ts` verifica **estaticamente** que o arquivo de migração inclui oito tabelas, RLS forçada, ausência de políticas permissivas, revogação de privilégios públicos, restrições DEMO, chaves estrangeiras por proprietário, idempotência e limites de SL/TP.

Esses testes não exigem banco nem consomem créditos do Neon.

## O que os testes NÃO provam
- Que o SQL executa com sucesso em PostgreSQL real.
- Que um usuário autenticado não acessa dados de outro em tempo de execução.
- Que concorrência, transações e deduplicação resistem a solicitações simultâneas.
- Que Stop Loss/Take Profit são monitorados em segundo plano.
- Que backup e restauração funcionam.

## Próximos testes obrigatórios antes de criar banco definitivo
1. Em PostgreSQL descartável, aplicar migração com papel de migração restrito; verificar tabelas, constraints e índices.
2. Criar papéis de aplicação **sem BYPASSRLS**; confirmar que, antes das políticas, nenhuma linha é visível ou editável.
3. Criar políticas RLS somente após a API autenticada definir identidade verificável no servidor; testar isolamento entre proprietários A/B.
4. Tentar inserir modo REAL, posição com SL/TP invertidos, proprietário cruzado e idempotency_key duplicada: todas devem falhar.
5. Executar transações concorrentes de ordens DEMO e limite de risco; exigir ausência de duplicatas e saldos inconsistentes.
6. Testar recuperação de falha, exportação/importação consentida e restauração de backup.
7. Registrar resultados e custos antes de autorizar provisionamento.

**Estado:** apenas testes estáticos no GitHub. Nenhum serviço externo ativado.
