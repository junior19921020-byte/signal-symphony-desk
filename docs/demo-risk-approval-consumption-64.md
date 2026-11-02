# Etapa 64 — Reserva única de aprovação de risco DEMO

A migração `0003_demo_risk_approval_consumptions.sql` cria uma tabela de **registro de consumo** com unicidade por ordem e por decisão de Rita. Chaves estrangeiras compostas exigem que decisão, ordem e proprietário correspondam. RLS permite leitura apenas pelo proprietário e nega escritas por roles comuns. Testes em PostgreSQL temporário verificam duplicidade, vínculo cruzado e acesso sem identidade.

**Limitação crítica:** a tabela por si só NÃO garante que a decisão tenha `approved=true`, esteja vigente ou tenha sido criada por Rita autenticada. Tampouco implementa o consumo atômico com a mudança de estado da ordem ou uma execução DEMO. Uma API futura deve criar função transacional privilegiada mínima que bloqueie ordem e decisão, valide aprovação positiva e atual, autoridade da Rita, limites de risco e idempotência, insira consumo e atualize ordem **na mesma transação**. Nenhum papel de navegador/agente recebe INSERT, UPDATE ou DELETE. O serviço precisa impedir alteração/exclusão de aprovações e consumos, e testar concorrência real.

Não executar a migração em banco existente sem revisão. Sem banco externo, servidor 24/7, cobrança ou ordens reais.
