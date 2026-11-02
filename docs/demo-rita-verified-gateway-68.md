# Etapa 68 — Gateway de aprovação DEMO com assinatura verificada

O contrato `approveVerifiedDemoOrder` recusa vetos, assinaturas inválidas, contexto divergente, validade expirada e falhas do banco. Só após `verifyRitaDecision` aceita chamar o adaptador `insertAndConsumeAtomically`. Os testes usam um adaptador simulado para comprovar que nenhum acesso ocorre em entradas inválidas e que falhas retornam rejeição.

**Não é uma API implantada nem um adaptador PostgreSQL implementado.** O futuro adaptador precisa, em uma única transação, inserir a decisão assinada (sem permitir decisões fabricadas pelo navegador ou Max), conferir vínculo com snapshot de risco e limites, chamar `desk.consume_demo_risk_approval` da etapa 65 e fazer rollback se a aprovação falhar. Precisa autenticar o solicitante e derivar ownerId no servidor, usar chave pública fixada, gerenciar chaves privadas fora do cliente e testar concorrência/replay. Nunca conceder INSERT direto ao navegador ou agentes. O teste simulado não comprova atomicidade real em PostgreSQL.

Não há execução de ordens, servidor 24/7, banco externo, custo novo ou deploy.
