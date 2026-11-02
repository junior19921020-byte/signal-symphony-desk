# Etapa 60 — Matriz de capacidades DEMO (proposta, sem implantação)

| Diretor | Capacidades |
| --- | --- |
| Ana | Ler e registrar dados de mercado |
| Sofia | Ler mercado e análises; escrever análises |
| Rita | Ler mercado, análises, risco e auditoria; decidir risco |
| Max | Ler mercado e risco; propor ordens DEMO; simular somente com aprovação da Rita |

O módulo `src/lib/demoAgentCapabilities.ts` é uma **função pura de contrato** com testes Vitest. Não está conectado à interface, banco, API ou agentes em execução. Ele não autentica ninguém, não consulta aprovações persistidas e **não executa ordens**. O campo `serverVerifiedIdentity` e a aprovação são apenas entradas de teste: no futuro deverão ser derivados/validados por um servidor confiável, nunca enviados pelo navegador como fonte de autoridade.

Antes de usar em produção: construir API autenticada com autorização no servidor, papéis mínimos no PostgreSQL, transações que validem a aprovação da Rita e o estado da ordem de modo atômico, prevenção de replay/idempotência, revogação, auditoria append-only e testes de concorrência. Separação dos 12 co-diretores e funcionários por corretora fica para etapa posterior, com escopo e permissões limitados.

**Não houve criação de banco, ativação de serviço, custo ou negociação real.**
