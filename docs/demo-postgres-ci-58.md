# Etapa 58 — PostgreSQL descartável no GitHub Actions

Este PR acrescenta um workflow manual e de PR para alterações em `db/**`. Ele usa um **container PostgreSQL 16 temporário dentro do GitHub Actions**. Não cria conta no Neon nem conecta a aplicação.

O script SQL de integração verifica RLS habilitada e forçada, ausência de políticas permissivas, leitura negada a um papel não privilegiado, modo REAL rejeitado, referência entre proprietários rejeitada, SL/TP invertidos rejeitados e chave idempotente duplicada rejeitada.

**Limites:** esse teste usa superusuário somente para preparar fixtures, não comprova isolamento completo entre usuários autenticados porque ainda não existe uma política de identidade aprovada. Não testa concorrência, backups, custos de produção nem monitoramento 24/7. A execução pode consumir minutos gratuitos de GitHub Actions conforme os limites da conta; não habilitar plano pago.

Não há credenciais externas: a senha no workflow é exclusiva do container temporário. Todas as operações são DEMO.
