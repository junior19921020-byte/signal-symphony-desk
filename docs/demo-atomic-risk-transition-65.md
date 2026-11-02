# Etapa 65 — Transição transacional de aprovação DEMO

A função SQL `desk.consume_demo_risk_approval` bloqueia a ordem e a decisão com `FOR UPDATE`, exige modo DEMO, ordem PENDING, aprovação positiva, mesmo proprietário e decisão recente (até 5 minutos). Em uma transação, registra consumo único e muda o status para APPROVED. Repetições não alteram a ordem. Testes em PostgreSQL temporário cobrem veto, outro proprietário, aprovação e repetição.

**Limites:** `APPROVED` não significa ordem simulada/executada. Não há execução de ordens, API implantada, nem monitoramento 24/7. A função é SECURITY INVOKER e não é concedida a roles de usuários; a futura API precisa autenticar o usuário e conferir owner_id no servidor, criar uma role mínima auditada e aplicar RLS. A função não comprova a identidade de Rita nem a imutabilidade da decisão, e não substitui controles de limite de risco, aprovação vinculada a parâmetros da ordem, revogação e auditoria. Antes da produção DEMO: proteger escrita de risk_decisions, garantir autorização assinada de Rita, testar concorrência e falhas de transação, e revisar permissões.

Nenhum banco externo ou serviço pago foi ativado.
