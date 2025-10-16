# ⚡ GUIA DE CORREÇÃO RÁPIDA

**Tempo Estimado**: 1-2 horas  
**Objetivo**: Fazer o build passar e testes rodarem

---

## 🎯 PASSO 1: Corrigir ESLint Errors (30 min)

### Erro 1: `any` Types (6 arquivos)

#### Arquivo 1: `src/app/api/export/invoice/route.ts:38`
```typescript
// ANTES:
const data: any = await supabase.from('timesheets').select('*');

// DEPOIS:
interface TimesheetData {
  id: string;
  employee_id: string;
  status: string;
  // ... outros campos
}
const data: TimesheetData[] = await supabase.from('timesheets').select('*');
```

#### Arquivo 2: `src/app/api/notifications/send/route.ts:62,63`
```typescript
// ANTES:
const result: any = await sendNotification(payload);
const response: any = JSON.parse(result);

// DEPOIS:
interface NotificationResult {
  success: boolean;
  messageId?: string;
  error?: string;
}
const result: NotificationResult = await sendNotification(payload);
const response: NotificationResult = JSON.parse(result);
```

#### Arquivo 3: `src/lib/invoice/generator.ts:6`
```typescript
// ANTES:
export function generateInvoice(data: any): string {

// DEPOIS:
interface InvoiceData {
  timesheetId: string;
  employeeId: string;
  entries: Array<{
    date: string;
    hours: number;
    type: string;
  }>;
}
export function generateInvoice(data: InvoiceData): string {
```

#### Arquivo 4: `src/lib/reports/generator.ts:75,111`
```typescript
// ANTES:
const rows: any[] = [];
const summary: any = {};

// DEPOIS:
interface ReportRow {
  id: string;
  employeeId: string;
  status: string;
  // ... outros campos
}
const rows: ReportRow[] = [];

interface ReportSummary {
  total: number;
  approved: number;
  rejected: number;
  // ... outros campos
}
const summary: ReportSummary = {};
```

#### Arquivo 5: `src/lib/shared/api-client.ts:55,66`
```typescript
// ANTES:
const response: any = await fetch(url);
const data: any = await response.json();

// DEPOIS:
interface ApiResponse<T> {
  data?: T;
  error?: string;
}
const response: Response = await fetch(url);
const data: ApiResponse<unknown> = await response.json();
```

#### Arquivo 6: `src/lib/shared/types.ts:204,235`
```typescript
// ANTES:
export type SomeType = any;
export interface SomeInterface {
  field: any;
}

// DEPOIS:
export type SomeType = Record<string, unknown>;
export interface SomeInterface {
  field: Record<string, unknown>;
}
```

### Erro 2: Unused Variables (3 arquivos)

#### Arquivo 1: `src/app/[locale]/settings/notifications/page.tsx:13`
```typescript
// ANTES:
export default async function NotificationsPage({params}: {params: Promise<{locale: string}>}) {

// DEPOIS:
export default async function NotificationsPage() {
  // ou use params se necessário
}
```

#### Arquivo 2: `src/components/ui/Toast.tsx:65`
```typescript
// ANTES:
const addToast = useCallback(() => {
  // ...
}, []);

// DEPOIS:
// Remover se não for usado, ou usar em algum lugar
```

#### Arquivo 3: `src/__tests__/invoice/generator.test.ts:8`
```typescript
// ANTES:
import { InvoiceDTO } from '...';

// DEPOIS:
// Remover import se não for usado
```

### Erro 3: Prefer-const (1 arquivo)

#### Arquivo: `src/__tests__/notifications/push.test.ts:149`
```typescript
// ANTES:
let preferences = { ... };

// DEPOIS:
const preferences = { ... };
```

---

## 🎯 PASSO 2: Corrigir Testes (30 min)

### Erro 1: React not defined (UI Components)

#### Arquivo: `src/__tests__/ui/components.test.tsx`
```typescript
// ADICIONAR NO TOPO:
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Resto do arquivo...
```

### Erro 2: VAPID keys missing

#### Arquivo: `.env.local`
```bash
# ADICIONAR:
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your-public-key-here
VAPID_PRIVATE_KEY=your-private-key-here
```

Ou mockar no teste:
```typescript
// Em src/__tests__/notifications/push.test.ts
vi.stubEnv('NEXT_PUBLIC_VAPID_PUBLIC_KEY', 'test-public-key');
vi.stubEnv('VAPID_PRIVATE_KEY', 'test-private-key');
```

---

## 🎯 PASSO 3: Validar Correções

### Comando 1: Verificar ESLint
```bash
cd web
npm run lint
```

Esperado: Sem erros

### Comando 2: Verificar Build
```bash
npm run build
```

Esperado: "Compiled successfully"

### Comando 3: Rodar Testes
```bash
npm test
```

Esperado: Todos os testes passam

---

## 🎯 PASSO 4: Investigar Página Vazia

### Verificação 1: Console do Navegador
```bash
1. Abrir DevTools (F12)
2. Ir para Console
3. Procurar por erros vermelhos
4. Anotar mensagens de erro
```

### Verificação 2: Network Tab
```bash
1. Abrir DevTools (F12)
2. Ir para Network
3. Recarregar página
4. Procurar por requisições falhadas (status 4xx/5xx)
```

### Verificação 3: Autenticação
```bash
1. Abrir DevTools (F12)
2. Ir para Application > Local Storage
3. Verificar se há token de autenticação
4. Se não houver, fazer login
```

### Verificação 4: Dados
```bash
1. Abrir DevTools (F12)
2. Ir para Network
3. Procurar por requisições de API
4. Verificar se retornam dados
```

---

## ✅ CHECKLIST DE CONCLUSÃO

- [ ] Todos os `any` types removidos
- [ ] Todas as variáveis não usadas removidas
- [ ] Todos os `let` mudados para `const`
- [ ] `npm run lint` passa sem erros
- [ ] `npm run build` passa sem erros
- [ ] `npm test` passa com 100% de testes
- [ ] Página não está mais vazia
- [ ] Autenticação funciona
- [ ] Dados carregam corretamente

---

## 🚀 PRÓXIMOS PASSOS

1. ✅ Corrigir ESLint errors
2. ✅ Corrigir testes
3. ✅ Validar build
4. ⏳ Investigar página vazia
5. ⏳ Começar Fase 17

---

## 📞 DÚVIDAS?

Consulte:
- `PROBLEMAS-E-SOLUCOES.md` - Detalhes dos problemas
- `ANALISE-COMPLETA-PROJETO.md` - Análise completa
- `docs/TESTING.md` - Estratégia de testes
- `docs/NEXT-STEPS.md` - Próximos passos


