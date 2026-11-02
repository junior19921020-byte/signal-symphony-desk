# Etapa 63 — Assinatura JWT RS256 com chave pública fixada

Adicionamos um verificador criptográfico real **para Node.js**, usando `node:crypto`, RSA SHA-256, chave pública RSA >=2048 bits e identificador de chave fixado pelo servidor. O teste gera um par de chaves temporário em memória, assina tokens e verifica alterações, algoritmo inválido, emissor, audiência e expiração. Nenhuma chave privada real é adicionada ao repositório.

**Não está implantado:** o módulo não foi conectado a uma API HTTP nem a um provedor de login. Deve ser importado **somente em código de servidor**, nunca em componentes de navegador. A futura implantação deve configurar chaves confiáveis por ambiente, rotação e revogação, validação de sessão, HTTPS, rate limits, logs sem credenciais e autenticação real do provedor. Não usar tokens de teste em produção.

A assinatura criptográfica é verificada aqui; as regras de emissor, audiência, UUID e tempo continuam no contrato da etapa 62. Testes unitários não substituem testes de integração nem análise de segurança. Nenhuma ordem real, serviço pago, banco Neon ou monitoramento 24/7 foi ativado.
