# Etapa #53 — Contrato de segurança para monitoramento DEMO independente

## Estado atual

Este PR prepara apenas um **contrato de validação** e testes. Não instala servidor,
não executa tarefas em segundo plano, não migra posições do localStorage e não
garante Stop Loss/Take Profit com o aplicativo fechado. A interface continua
dependente da página aberta. Nenhuma ordem real é permitida.

## Arquitetura planejada (não implementada)

1. Serviço backend com agendador independente do navegador, autenticação e supervisão.
2. Posições DEMO e decisões da Rita Risk em armazenamento transacional do servidor,
   com isolamento por usuário e migração explícita, nunca silenciosa.
3. Fonte de preços com timestamp verificável, reconexão e detecção de lacunas.
4. Motor de saídas DEMO idempotente, com bloqueio contra processamento duplicado,
   logs auditáveis e regras de risco verificadas antes de cada transição.
5. Heartbeat autenticado, status separado da visibilidade do celular e alertas
   quando o servidor parar ou a cotação ficar desatualizada.
6. Testes de suspensão do celular, reinício do serviço, perda de rede, preço
   atrasado, simultaneidade, duplicação e reconciliação.

## Regras inegociáveis

- Estado inicial sem serviço: UNCONFIGURED e fail-closed.
- Nenhuma execução de ordem real, credencial de corretora ou acesso a fundos.
- Heartbeat recente não prova disponibilidade 24/7 nem proteção de SL/TP.
- O limite diário da Rita Risk e os vetos permanecem obrigatórios.
- Nunca afirmar que uma saída ocorreu sem confirmação persistida no backend.
- Não ligar o serviço automaticamente ao importar o módulo de validação.

Próximo PR: escolher infraestrutura backend, autenticação, armazenamento e
modelo de implantação antes de escrever o agendador.
