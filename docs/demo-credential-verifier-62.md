# Etapa 62 — Contrato de verificação de credenciais DEMO

`src/lib/demoCredentialVerifier.ts` prepara a validação **no servidor** de informações de identidade previamente verificadas criptograficamente: emissor, público-alvo, UUID do usuário, expiração, emissão, início de validade e duração máxima. Os testes usam um adaptador criptográfico simulado.

**Não existe validação real de JWT nesta etapa.** O adaptador `TrustedCryptoTokenVerifier` ainda precisa ser implementado exclusivamente no backend com biblioteca auditada, algoritmos permitidos fixos, assinatura validada, chaves JWKS obtidas com segurança, rotação, emissor/audiência corretos, HTTPS, revogação/sessões e limites de requisições. Nunca confiar em claims decodificadas sem verificação de assinatura. O tipo branded de TypeScript não é proteção de runtime.

Na API futura, usar `createDemoCredentialVerifier` como verificador confiável da etapa 61, sem aceitar `owner_id` do navegador. Testar falhas de rede, rotação de chave, replay, relógio, credenciais inválidas e isolamento do banco. Não persistir tokens em logs.

**Nenhuma API HTTP foi implantada; nenhum banco Neon ou serviço pago foi ativado; nenhuma ordem real é permitida.**
