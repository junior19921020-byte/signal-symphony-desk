# Etapa 59 — RLS por proprietário: contrato de identidade DEMO

O arquivo `db/migrations/0002_demo_owner_rls.sql` cria políticas de isolamento de proprietário para oito tabelas, e `db/tests/0002_owner_rls_integration.sql` testa negação sem identidade, leitura isolada e rejeição de escrita cruzada em PostgreSQL descartável.

**Modelo de confiança obrigatório:** o valor de sessão `desk.owner_id` **não é autenticação**. Um cliente com acesso SQL direto poderia alterá-lo. A API futura deverá autenticar o usuário, derivar o UUID de um token validado no servidor e definir o contexto com `SET LOCAL` dentro de uma transação usando role não privilegiada. Nunca aceitar UUID do corpo da requisição como identidade; nunca expor a conexão PostgreSQL no navegador. Conexões compartilhadas precisam reset transacional rigoroso. O schema não fornece autenticação pronta.

**Separação de agentes:** ainda não há permissões por função (Ana/Sofia/Rita/Max). Não conceder gravação direta a agentes até existir matriz de capacidades, API autenticada e testes específicos. RLS de proprietário sozinha não impede Max de alterar decisões da Rita se ambos usarem papel com privilégios amplos.

**Antes da produção:** definir roles e grants mínimos por serviço, privilégios de execução de função, políticas de escrita append-only para auditoria, transações de risco, testes de concorrência e segurança da API. O workflow é teste descartável; não existe banco Neon, implantação, cobrança ou monitoramento 24/7.
