# Referências de Segurança - Mapeamento OWASP e CVEs

## Mapeamento OWASP Top 10 (2021)

### A01: Broken Access Control
**Vulnerabilidades Identificadas:**
1. **Missing Authentication in /api/cron/deadline-reminders**
   - OWASP: A01:2021 – Broken Access Control
   - CWE: CWE-284 (Improper Access Control)
   - Referência: https://owasp.org/Top10/A01_2021-Broken_Access_Control/

2. **Weak RBAC in /api/admin/users/[id]/reset-password**
   - OWASP: A01:2021 – Broken Access Control
   - CWE: CWE-639 (Authorization Bypass Through User-Controlled Key)
   - Impacto: Privilege Escalation

### A02: Cryptographic Failures
**Vulnerabilidades Identificadas:**
1. **Weak Token Strategy (base64 without HMAC)**
   - OWASP: A02:2021 – Cryptographic Failures
   - CWE: CWE-327 (Use of a Broken or Risky Cryptographic Algorithm)
   - Impacto: Token Forgery

2. **Temporary Password Handling**
   - OWASP: A02:2021 – Cryptographic Failures
   - CWE: CWE-521 (Weak Password Requirements)
   - Impacto: Weak Credentials

### A03: Injection
**Vulnerabilidades Identificadas:**
1. **SQL Injection Risk in /api/admin/users**
   - OWASP: A03:2021 – Injection
   - CWE: CWE-89 (SQL Injection)
   - Mitigado por: Supabase parameterized queries (mas antipadrão)
   - Referência: https://owasp.org/www-community/attacks/SQL_Injection

2. **Path Traversal in /api/admin/config/env**
   - OWASP: A03:2021 – Injection
   - CWE: CWE-22 (Improper Limitation of a Pathname)
   - Impacto: Remote Code Execution (RCE)
   - Referência: https://owasp.org/www-community/attacks/Path_Traversal

### A04: Insecure Design
**Vulnerabilidades Identificadas:**
1. **Missing Rate Limiting**
   - OWASP: A04:2021 – Insecure Design
   - CWE: CWE-1021 (Improper Restriction of Rendered UI Layers or Frames)
   - Impacto: Brute Force, Credential Stuffing, DoS
   - Referência: https://owasp.org/www-community/attacks/Rate_Limiting

### A05: Security Misconfiguration
**Vulnerabilidades Identificadas:**
1. **Information Disclosure in Responses**
   - OWASP: A05:2021 – Security Misconfiguration
   - CWE: CWE-200 (Exposure of Sensitive Information)
   - Exemplos:
     - `/api/admin/config/env` expõe URLs e configurações
     - `/api/admin/health` expõe masked keys
   - Referência: https://owasp.org/Top10/A05_2021-Security_Misconfiguration/

2. **Sensitive Data in Stack Traces**
   - OWASP: A05:2021 – Security Misconfiguration
   - CWE: CWE-209 (Information Exposure Through an Error Message)

### A09: Logging & Monitoring Failures
**Vulnerabilidades Identificadas:**
1. **Sensitive Data in Logs**
   - OWASP: A09:2021 – Security Logging and Monitoring Failures
   - CWE: CWE-532 (Insertion of Sensitive Information into Log File)
   - Exemplos:
     - Emails em plain text nos logs
     - Prefixo de tokens expostos
   - Impacto: Log Injection, Sensitive Data Exposure

2. **Missing Audit Trail**
   - OWASP: A09:2021 – Security Logging and Monitoring Failures
   - CWE: CWE-778 (Insufficient Logging)
   - Impacto: Inability to Detect Attacks

---

## CWE (Common Weakness Enumeration) - Mapeamento Completo

| CWE | Título | Severidade | Afetadas | Referência |
|-----|--------|-----------|----------|-----------|
| CWE-284 | Improper Access Control | Critical | 1 API | https://cwe.mitre.org/data/definitions/284.html |
| CWE-352 | Cross-Site Request Forgery (CSRF) | High | Todas APIs | https://cwe.mitre.org/data/definitions/352.html |
| CWE-327 | Use of Broken Crypto | High | Auth | https://cwe.mitre.org/data/definitions/327.html |
| CWE-89 | SQL Injection | High | 1 API | https://cwe.mitre.org/data/definitions/89.html |
| CWE-22 | Path Traversal | Critical | 1 API | https://cwe.mitre.org/data/definitions/22.html |
| CWE-200 | Info Exposure | High | 2 APIs | https://cwe.mitre.org/data/definitions/200.html |
| CWE-209 | Error Message Info Disclosure | Medium | 2 APIs | https://cwe.mitre.org/data/definitions/209.html |
| CWE-532 | Sensitive Data in Logs | Medium | 5+ APIs | https://cwe.mitre.org/data/definitions/532.html |
| CWE-778 | Insufficient Logging | Medium | Global | https://cwe.mitre.org/data/definitions/778.html |
| CWE-799 | Improper Control of Interaction Frequency | High | Auth | https://cwe.mitre.org/data/definitions/799.html |

---

## CVSS v3.1 Scoring

### Exemplo: Sem Autenticação em Cron
```
CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:H
Score: 9.8 (CRITICAL)

Breakdown:
- Attack Vector (AV): Network - pode ser explorado remotamente
- Attack Complexity (AC): Low - sem validação adicional necessária
- Privileges Required (PR): None - sem autenticação
- User Interaction (UI): None - nenhuma interação necessária
- Scope (S): Changed - afeta sistemas fora do escopo
- Confidentiality (C): High - acesso a dados sensíveis
- Integrity (I): High - pode modificar dados
- Availability (A): High - pode causar DoS
```

### Exemplo: Exposição de Senha
```
CVSS:3.1/AV:N/AC:L/PR:H/UI:N/S:C/C:H/I:N/A:N
Score: 9.1 (CRITICAL)

Breakdown:
- Requer privilégio de admin, mas ainda crítico
- Expõe senhas em plain text
- Afeta confidentiality de forma severa
```

---

## Padrões de Código Inseguro Identificados

### Padrão 1: Confiança Cega em Input
```typescript
// INSEGURO
const { q } = searchParams;
query = query.or(`email.ilike.%${q}%,...`);

// SEGURO
const { q } = SearchSchema.parse(searchParams);
// Com validação regex e whitelist
```

### Padrão 2: Senhas em Responses
```typescript
// INSEGURO
return { success: true, password: tempPassword };

// SEGURO
sendEmailWithPassword(email, tempPassword);
return { success: true };
```

### Padrão 3: Dados Sensíveis em Logs
```typescript
// INSEGURO
console.log('User login:', { email, token, password });

// SEGURO
logAuth('info', 'Login attempt', { 
  email: redactEmail(email),
  userId: user.id 
});
```

### Padrão 4: Sem Rate Limiting
```typescript
// INSEGURO
export async function POST(req) {
  // Qualquer um pode fazer requisições ilimitadas
}

// SEGURO
const rateLimit = await checkRateLimit(req.ip, 'signin', 5);
if (!rateLimit.success) {
  return { error: 'too_many_requests' };
}
```

---

## Referências de Implementação Segura

### NIST Recommendations
- **SP 800-63B: Authentication and Lifecycle Management**
  - Password: Mínimo 8 caracteres
  - Tokens: Usar JWT com assinatura HMAC-SHA256
  - Sessão: Máximo 7 dias (já implementado)

- **SP 800-63C: Federation and Assertions**
  - Referência para multi-tenant: https://pages.nist.gov/800-63-3/

### OWASP Cheat Sheets
1. **Authentication Cheat Sheet**
   - https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html

2. **Authorization Testing Guide**
   - https://owasp.org/www-project-web-security-testing-guide/

3. **Logging Cheat Sheet**
   - https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html

4. **Cryptographic Storage Cheat Sheet**
   - https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html

### Industry Standards
- **JWT.io Best Practices**
  - https://tools.ietf.org/html/rfc7519

- **OWASP Rate Limiting**
  - https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html

---

## Ferramentas Recomendadas para Testing

### Testes de Segurança
```bash
# OWASP ZAP
docker run -t owasp/zap2docker-weekly zap-baseline.py -t http://localhost:3000

# Burp Suite Community
# Download: https://portswigger.net/burp/communitydownload

# npm audit
npm audit --production

# SonarQube
docker run -d --name sonarqube -p 9000:9000 sonarqube
```

### Testes de Rate Limiting
```bash
# Testar brute force
for i in {1..10}; do
  curl -X POST http://localhost:3000/api/auth/signin \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"wrong"}'
  echo "Tentativa $i"
done
```

### Testes de Validação
```bash
# Testar SQL injection
curl "http://localhost:3000/api/admin/users?q='; DROP TABLE users; --"

# Testar path traversal
curl "http://localhost:3000/api/admin/config?path=../../../etc/passwd"
```

---

## Timeline de Correção Recomendada

| Fase | Prazo | Vulnerabilidades | Status |
|------|-------|-----------------|--------|
| Crítica | Hoje | 3 (CVSS 9+) | Pendente |
| Urgente | Esta semana | 6 (CVSS 7-8) | Pendente |
| Normal | 2 semanas | 5 (CVSS 4-6) | Pendente |
| Melhorias | Roadmap | 3 (CVSS 1-3) | Pendente |

---

## Contacts e Escalation

Para questões críticas de segurança:
1. **Código de Conduta:** Seguir responsabilidade disclosure
2. **Contato:** security@pontoflow.dev (substituir email conforme necessário)
3. **Referência:** Issue #[numero]

---

## Documentos Relacionados

- `SECURITY_ANALYSIS.md` - Análise técnica detalhada
- `SECURITY_FIXES.md` - Guia de implementação de correções
- `SECURITY_SUMMARY.md` - Sumário executivo
- `SECURITY_REFERENCES.md` - Este documento

---

**Versão:** 1.0
**Data:** 2025-11-07
**Atualizado:** 2025-11-07
**Status:** Pronto para Referência

