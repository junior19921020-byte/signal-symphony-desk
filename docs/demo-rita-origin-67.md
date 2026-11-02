# Etapa 67 — Verificação criptográfica da origem Rita (contrato DEMO)

`src/lib/demoRitaOrigin.ts` verifica uma assinatura RSA-SHA256 sobre campos canônicos: ID de decisão, proprietário, ordem, aprovação, emissor, público e validade de até 5 minutos. A chave pública deve ser fixada no servidor, nunca recebida do cliente. Testes verificam alteração da aprovação, contexto, expiração, emissor, campos extras, chave errada e assinatura adulterada.

**Não há emissor implantado nem credencial privada criada.** Este verificador isolado **não autentica Rita em produção**, não está integrado à inserção PostgreSQL nem à transação da etapa 65, e não evita replay por si só. Um futuro serviço deve guardar chave privada em cofre, autenticar Rita e vincular a assinatura ao snapshot exato da ordem e aos limites de risco, verificar assinatura no servidor antes de gravar decisão, manter idempotência e auditoria, e impedir que Max ou o navegador forneçam uma chave de confiança. Não importar este módulo em bundles do navegador.

Apenas testes locais/CI, sem banco, deploy, serviços pagos ou ordens reais.
