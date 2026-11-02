# Escritório isométrico — plano seguro de implementação

## Objetivo
Transformar o Escritório de Agentes em uma sala isométrica 2.5D com estética pixel-art social, inspirada em jogos de salas virtuais, sem reutilizar marcas, sprites ou recursos proprietários. Manter a identidade preta e dourada.

## Regras de isolamento e segurança
- Alterar apenas componentes de apresentação do escritório. Não modificar Supabase Auth, OAuth, RLS, migrações, segredos, APIs de trading ou execução de ordens.
- Dados dos agentes devem vir das fontes já autorizadas. Não simular status como se fossem reais.
- Painéis interativos devem usar as mesmas verificações de autorização existentes. Nunca exibir credenciais ou dados financeiros sensíveis na cena.
- Nenhuma operação financeira pode ser disparada diretamente por clique em avatar.
- Não publicar ou mesclar sem revisão e testes.

## Experiência desejada
- Sala com piso isométrico, mesas, monitores, sala de reunião e comitê de risco.
- Seis agentes distintos com identificação legível, função e estado atual.
- Toque em um agente abre o painel existente de detalhes e conversa.
- Zoom e deslocamento por gestos, com botão para recentralizar.
- Visual adaptado a celular; fallback leve 2D se a renderização avançada não estiver disponível.
- Acessibilidade: navegação por teclado, rótulos acessíveis e preferência por movimento reduzido.

## Etapas
1. Localizar a rota e o componente do escritório, documentar interfaces e dependências.
2. Criar componente de cena isolado, alimentado por dados existentes e callbacks sem privilégios novos.
3. Substituir somente a camada visual da página, preservando ações e controles existentes.
4. Validar build, testes, login, autorização, responsividade e desempenho mobile.
5. Revisar o diff e disponibilizar preview antes de mesclar/publicar.

## Critérios de aceitação
- Fluxos de autenticação e autorização intactos.
- Nenhuma alteração de banco, políticas ou integrações financeiras.
- Todos os seis agentes acessíveis por toque e teclado.
- Tela inicial utilizável em viewport mobile de 360px.
- Sem dados inventados apresentados como atividade real.
