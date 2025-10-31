# Regras de Auto-Fill para Ambientes de Trabalho

## Visão Geral

O sistema de auto-fill permite que funcionários preencham automaticamente seus timesheets baseado em suas escalas de trabalho (7x7, 14x14, 21x21, 28x28, etc.). As regras são aplicadas de acordo com o ambiente de trabalho selecionado.

## Ambientes com Auto-Fill Habilitado

Os seguintes ambientes têm auto-fill habilitado por padrão:

### 1. **Embarque** 🚢
- **Cor:** #3B82F6 (Azul)
- **Auto-fill:** ✅ Habilitado
- **Regra:** Quando o funcionário seleciona "Embarque", o sistema:
  1. Cria o lançamento de embarque na data selecionada
  2. Calcula automaticamente as datas de desembarque baseado na escala (ex: 14 dias depois para 14x14)
  3. Sugere lançamentos de "Offshore" para todos os dias entre embarque e desembarque
  4. Continua o ciclo até o final do período do timesheet

### 2. **Desembarque** 🏠
- **Cor:** #6366F1 (Roxo)
- **Auto-fill:** ✅ Habilitado
- **Regra:** Quando o funcionário seleciona "Desembarque", o sistema:
  1. Cria o lançamento de desembarque na data selecionada
  2. Calcula automaticamente as datas de embarque baseado na escala (ex: 14 dias depois para 14x14)
  3. Sugere lançamentos de "Folga" para todos os dias entre desembarque e embarque
  4. Continua o ciclo até o final do período do timesheet

### 3. **Offshore** 🌊
- **Cor:** #0EA5E9 (Azul claro)
- **Auto-fill:** ✅ Habilitado (apenas como sugestão)
- **Regra:** Sugerido automaticamente para dias em que o funcionário está "embarcado"
- **Nota:** Não dispara auto-fill quando selecionado manualmente

### 4. **Folga** 🏖️
- **Cor:** #6B7280 (Cinza)
- **Auto-fill:** ✅ Habilitado (apenas como sugestão)
- **Regra:** Sugerido automaticamente para dias em que o funcionário está "desembarcado"
- **Nota:** Não dispara auto-fill quando selecionado manualmente

## Ambientes sem Auto-Fill

Os seguintes ambientes **NÃO** disparam auto-fill:

### 5. **Onshore** 🏢
- **Cor:** #10B981 (Verde)
- **Auto-fill:** ❌ Desabilitado
- **Uso:** Para trabalho em terra/escritório sem seguir escala offshore

### 6. **Translado** 🚗
- **Cor:** #F59E0B (Laranja)
- **Auto-fill:** ❌ Desabilitado
- **Uso:** Para dias de viagem/deslocamento

### 7. **Outros Ambientes Personalizados**
- Ambientes criados pelo administrador podem ter auto-fill habilitado ou desabilitado
- Exemplo: "Inicio do Expediente", "Fim do Expediente", "Inicio Almoço", "Fim do Almoço"

## Como Funciona o Auto-Fill

### Passo 1: Seleção do Ambiente
Quando o funcionário clica em um dia e seleciona um ambiente:
- Se o ambiente for **Embarque** ou **Desembarque** E tiver `auto_fill_enabled = true`
- O sistema verifica se há uma escala de trabalho configurada

### Passo 2: Cálculo das Sugestões
O sistema calcula:
1. **Transições obrigatórias** (Embarque ↔ Desembarque)
   - Marcadas como **selecionadas por padrão** ✅
   - Baseadas na escala (ex: 14x14 = 14 dias on, 14 dias off)

2. **Dias intermediários** (Offshore ou Folga)
   - Marcadas como **sugestões** (não selecionadas por padrão)
   - Offshore: para dias "embarcado"
   - Folga: para dias "desembarcado"

### Passo 3: Modal de Confirmação
O funcionário vê um modal com:
- Lista de todas as sugestões
- Opção de selecionar/desselecionar cada sugestão
- Botões "Selecionar Todos" / "Desselecionar Todos"
- Visualização clara de:
  - 🔵 Transições (Embarque/Desembarque) - selecionadas por padrão
  - 🟡 Sugestões diárias (Offshore/Folga) - não selecionadas por padrão

### Passo 4: Criação dos Lançamentos
Ao confirmar:
1. Cria o lançamento inicial (Embarque ou Desembarque)
2. Cria todos os lançamentos selecionados pelo funcionário
3. Adiciona observação "Auto-gerado pela escala 14x14" nos lançamentos automáticos

## Exemplo Prático: Escala 14x14

### Cenário
- Funcionário: João Silva
- Escala: 14x14 (14 dias embarcado, 14 dias em terra)
- Data de início da escala: 01/01/2025
- Período do timesheet: 01/01/2025 a 31/01/2025

### Ação: João seleciona "Embarque" no dia 01/01/2025

**Sugestões geradas:**
1. ✅ **01/01** - Embarque (selecionado)
2. ⬜ **02/01** - Offshore (sugestão)
3. ⬜ **03/01** - Offshore (sugestão)
4. ⬜ **04/01** - Offshore (sugestão)
5. ⬜ **05/01** - Offshore (sugestão)
6. ⬜ **06/01** - Offshore (sugestão)
7. ⬜ **07/01** - Offshore (sugestão)
8. ⬜ **08/01** - Offshore (sugestão)
9. ⬜ **09/01** - Offshore (sugestão)
10. ⬜ **10/01** - Offshore (sugestão)
11. ⬜ **11/01** - Offshore (sugestão)
12. ⬜ **12/01** - Offshore (sugestão)
13. ⬜ **13/01** - Offshore (sugestão)
14. ⬜ **14/01** - Offshore (sugestão)
15. ✅ **15/01** - Desembarque (selecionado)
16. ⬜ **16/01** - Folga (sugestão)
17. ⬜ **17/01** - Folga (sugestão)
18. ⬜ **18/01** - Folga (sugestão)
19. ⬜ **19/01** - Folga (sugestão)
20. ⬜ **20/01** - Folga (sugestão)
21. ⬜ **21/01** - Folga (sugestão)
22. ⬜ **22/01** - Folga (sugestão)
23. ⬜ **23/01** - Folga (sugestão)
24. ⬜ **24/01** - Folga (sugestão)
25. ⬜ **25/01** - Folga (sugestão)
26. ⬜ **26/01** - Folga (sugestão)
27. ⬜ **27/01** - Folga (sugestão)
28. ⬜ **28/01** - Folga (sugestão)
29. ✅ **29/01** - Embarque (selecionado)
30. ⬜ **30/01** - Offshore (sugestão)
31. ⬜ **31/01** - Offshore (sugestão)

**João pode:**
- Aceitar todas as sugestões (clicando em "Selecionar Todos")
- Aceitar apenas as transições (Embarque/Desembarque já selecionadas)
- Personalizar selecionando apenas alguns dias específicos

## Configurações de Tenant

O administrador pode configurar 3 níveis de controle:

### 1. Auto-fill Global
- **Campo:** `auto_fill_enabled`
- **Padrão:** `true`
- **Efeito:** Habilita/desabilita auto-fill para todo o tenant

### 2. Auto-fill para Dias Passados
- **Campo:** `auto_fill_past_days`
- **Padrão:** `false`
- **Efeito:** Permite/bloqueia criação de lançamentos em dias anteriores à data atual

### 3. Auto-fill para Dias Futuros
- **Campo:** `auto_fill_future_days`
- **Padrão:** `true`
- **Efeito:** Permite/bloqueia criação de lançamentos em dias posteriores à data atual

## Benefícios

1. **Economia de Tempo:** Funcionários não precisam preencher manualmente cada dia
2. **Redução de Erros:** Cálculo automático baseado na escala configurada
3. **Flexibilidade:** Funcionários podem revisar e ajustar as sugestões antes de confirmar
4. **Conformidade:** Garante que os lançamentos sigam a escala de trabalho definida

## Limitações

1. **Máximo de 12 Ciclos:** Para evitar loops infinitos, o sistema limita a 12 ciclos de embarque/desembarque
2. **Requer Escala Configurada:** Auto-fill só funciona se o funcionário tiver uma escala de trabalho definida
3. **Não Sobrescreve:** Não cria lançamentos em dias que já têm entradas existentes

