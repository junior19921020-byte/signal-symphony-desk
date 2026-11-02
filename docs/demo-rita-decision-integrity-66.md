# Etapa 66 — Integridade das decisões da Rita (DEMO)

A migração `0005_demo_rita_decision_integrity.sql` instala gatilho que bloqueia UPDATE e DELETE de decisões de risco, inclusive tentativas de trocar veto por aprovação. Não concede INSERT a agentes nem a usuários. Testes descartáveis verificam que um veto não pode ser alterado ou apagado e que um papel sem identidade não consegue inserir decisão.

**Limitação de segurança essencial:** isto **não autentica a Rita**. Um papel privilegiado com INSERT ou proprietário de tabela pode inserir decisões falsas; o banco não sabe se uma decisão veio realmente da Rita. O teste de inserção por agente depende do RLS padrão negar acesso, mesmo com permissões de tabela. Uma futura API deve autenticar a origem no servidor, validar parâmetros e assinatura/contexto da decisão, restringir INSERT a um papel mínimo e auditar toda emissão. Não conceder acesso de escrita diretamente a Max, navegador ou cliente. A função de consumo da etapa 65 ainda não verifica uma prova criptográfica de origem.

Sem banco externo, deployment, custos adicionais ou operações reais.
