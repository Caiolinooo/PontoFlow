# 🗺️ ROADMAP - Fases 17-20

**Status**: Fases 0-16 Completas | Fases 17-20 Pendentes  
**Estimativa Total**: 2-3 semanas

---

## 📊 VISÃO GERAL

```
Fase 17: Web Push Notifications      [2-3 dias]
Fase 18: Invoice Generator           [1-2 dias]
Fase 19: UX Polish & Accessibility   [2-3 dias]
Fase 20: Mobile SDK                  [2-3 dias]
─────────────────────────────────────────────
Total: ~2-3 semanas
```

---

## 🔔 FASE 17: Web Push Notifications (2-3 dias)

### Objetivo
Implementar notificações push web com opt-in e preferências de usuário.

### Deliverables
- [ ] Gerar VAPID keys (public/private)
- [ ] Service worker registration
- [ ] Push notification opt-in UI
- [ ] Notification preferences panel
- [ ] Push notification dispatcher
- [ ] Testes para push notifications

### Arquivos a Criar
```
web/public/service-worker.js
web/src/lib/push-notifications/
  ├── vapid.ts
  ├── subscription.ts
  └── dispatcher.ts
web/src/components/notifications/
  ├── PreferencesPanel.tsx
  └── OptInDialog.tsx
web/src/app/api/notifications/
  ├── subscribe/route.ts
  ├── unsubscribe/route.ts
  └── send-push/route.ts
web/src/__tests__/notifications/
  └── push-integration.test.ts
```

### Requisitos
- [ ] VAPID keys configuradas em `.env.local`
- [ ] Service worker funcional
- [ ] Supabase push_subscriptions table
- [ ] Testes de integração
- [ ] i18n para UI

### Critério de Aceição
- [ ] Usuário consegue opt-in para push
- [ ] Notificações são enviadas corretamente
- [ ] Preferências são persistidas
- [ ] Testes passam 100%

---

## 📄 FASE 18: Invoice Generator Integration (1-2 dias)

### Objetivo
Integrar com gerador de invoices externo (OMEGA).

### Deliverables
- [ ] DTO/data contract definido
- [ ] Export endpoint alinhado com OMEGA
- [ ] Validação contra schema
- [ ] Testes de integração
- [ ] Documentação de API

### Arquivos a Criar
```
web/src/lib/export/
  ├── invoice-dto.ts
  └── invoice-validator.ts
web/src/app/api/export/
  └── invoice/route.ts
web/src/__tests__/export/
  └── invoice-integration.test.ts
docs/export/
  └── INVOICE-API.md
```

### Requisitos
- [ ] Contrato de dados com OMEGA definido
- [ ] Validação de schema
- [ ] Testes de integração
- [ ] Documentação completa

### Critério de Aceição
- [ ] Endpoint `/api/export/invoice` funciona
- [ ] Dados exportados validam contra schema
- [ ] Testes passam 100%
- [ ] Documentação completa

---

## 🎨 FASE 19: UX Polish & Accessibility (2-3 dias)

### Objetivo
Melhorar UX e garantir WCAG 2.1 AA compliance.

### Deliverables
- [ ] Loading states e skeletons
- [ ] Error handling e user feedback
- [ ] Confirmation dialogs
- [ ] WCAG 2.1 AA compliance
- [ ] Mobile responsiveness
- [ ] Cross-browser testing

### Componentes a Melhorar
```
- LoadingSpinner (com ARIA labels)
- Skeleton loaders
- ConfirmDialog (com keyboard support)
- Toast notifications
- Error boundaries
- Form validation feedback
```

### Requisitos
- [ ] Todos os componentes com ARIA labels
- [ ] Keyboard navigation funcional
- [ ] Contrast ratio ≥ 4.5:1
- [ ] Mobile responsiveness testada
- [ ] Testes de acessibilidade

### Critério de Aceição
- [ ] WCAG 2.1 AA compliance verificado
- [ ] Mobile responsiveness testada
- [ ] Keyboard navigation funciona
- [ ] Testes passam 100%

---

## 📱 FASE 20: Mobile SDK & Shared Types (2-3 dias)

### Objetivo
Preparar tipos compartilhados para mobile (React Native/Expo).

### Deliverables
- [ ] Extract types em `@abz/timesheet-types`
- [ ] Shared DTOs
- [ ] Mobile integration guide
- [ ] React Native/Expo compatibility

### Arquivos a Criar
```
packages/types/
  ├── package.json
  ├── src/
  │   ├── index.ts
  │   ├── timesheet.ts
  │   ├── employee.ts
  │   ├── manager.ts
  │   └── api.ts
  └── tsconfig.json
docs/
  └── MOBILE-INTEGRATION.md
```

### Requisitos
- [ ] Tipos extraídos e compartilhados
- [ ] DTOs documentados
- [ ] Exemplos de uso
- [ ] Compatibilidade React Native

### Critério de Aceição
- [ ] Package `@abz/timesheet-types` publicado
- [ ] Documentação completa
- [ ] Exemplos funcionais
- [ ] Testes passam 100%

---

## 🎯 PRIORIZAÇÃO

### Crítica (Fazer Primeiro)
1. **Corrigir Build** - Sem isso, nada funciona
2. **Corrigir Testes** - Garantir qualidade
3. **Investigar Página Vazia** - Pode ser bloqueador

### Alta (Fazer Depois)
4. **Fase 17** - Web Push (importante para notificações)
5. **Fase 18** - Invoice (integração crítica)

### Média (Fazer Depois)
6. **Fase 19** - UX Polish (melhoria de experiência)
7. **Fase 20** - Mobile SDK (preparação para mobile)

---

## 📋 CHECKLIST GERAL

### Antes de Começar Fase 17
- [ ] Build passa sem erros
- [ ] Todos os testes passam
- [ ] Página não está vazia
- [ ] Autenticação funciona

### Para Cada Fase
- [ ] Requisitos documentados
- [ ] Arquivos criados
- [ ] Testes escritos
- [ ] i18n implementado
- [ ] Build passa
- [ ] Testes passam 100%
- [ ] Documentação atualizada
- [ ] CHANGELOG atualizado

### Antes de Marcar Completo
- [ ] Code review feito
- [ ] Testes passam
- [ ] Build passa
- [ ] Documentação completa
- [ ] Commit com Conventional Commits

---

## 🚀 TIMELINE ESTIMADA

| Fase | Estimativa | Status |
|------|-----------|--------|
| 17 | 2-3 dias | ⏳ Pendente |
| 18 | 1-2 dias | ⏳ Pendente |
| 19 | 2-3 dias | ⏳ Pendente |
| 20 | 2-3 dias | ⏳ Pendente |
| **Total** | **~2-3 semanas** | **⏳ Pendente** |

---

## 📞 PRÓXIMOS PASSOS

1. **Corrigir problemas críticos** (hoje)
2. **Validar build e testes** (hoje)
3. **Começar Fase 17** (amanhã)
4. **Seguir roadmap** (próximas semanas)


