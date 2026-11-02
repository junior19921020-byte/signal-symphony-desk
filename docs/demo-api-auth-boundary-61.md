# Etapa 61 — Contrato da futura API autenticada DEMO

O módulo `src/lib/demoApiAuthorization.ts` define um **limite lógico de autorização**, sem servidor HTTP, login, validação JWT, banco, implantação ou execução de ordens. Os testes Vitest usam verificadores simulados e não provam a segurança de uma API em rede.

Fluxo planejado:
1. API recebe credencial por canal seguro, aplica limites de requisição e valida token no servidor (assinatura, emissor, audiência, expiração, revogação).
2. Adaptador confiável constrói `VerifiedDemoPrincipal`; identidade e propriedade nunca são aceitas do navegador.
3. API verifica propriedade do recurso e capacidades do diretor. Para Max, busca aprovação válida da Rita no servidor.
4. Em operação real de backend DEMO, a aprovação deve ser verificada **na mesma transação** que atualiza a ordem, com travas, idempotência, prazo de validade e consumo único da autorização.
5. O banco usa role de aplicação sem BYPASSRLS e define `desk.owner_id` via `SET LOCAL` em cada transação após autenticação; nunca expor SQL ao cliente.
6. Auditoria append-only, proteção contra replay, segregação de agentes e testes de integração devem preceder qualquer implantação.

**Atenção:** TypeScript não cria barreira de confiança em runtime; um chamador malicioso poderia falsificar campos caso o módulo fosse usado diretamente no navegador. Somente o servidor confiável pode chamar os adaptadores. Esta etapa não liga o Lovable ao Neon e não oferece monitoramento 24/7. Nenhum serviço pago foi ativado.
