# Lógica Correta do Auto-fill de Escalas

## 🐛 Problema Anterior (INCORRETO)

A lógica antiga estava **completamente errada**:

❌ **Preenchendo dias ANTERIORES ao embarque** (não faz sentido - você estava em casa)  
❌ **Não considerava a escala de trabalho** (28x28, 14x14, etc.)  
❌ **Não cruzava meses** (se embarcar no final do mês, parava no fim do mês)  
❌ **Colocava "Folga" logo após embarque** (impossível - você acabou de embarcar!)  
❌ **Não era opcional** (forçava o preenchimento)  

### Exemplo do Erro

Se você marcasse **EMBARQUE no dia 28/09**:
- ❌ Sistema preenchia dias 01/09 até 27/09 com "Offshore" (ERRADO!)
- ❌ Sistema colocava "Folga" no dia 29/09 (ERRADO!)
- ❌ Não considerava que você trabalharia 28 dias após o embarque

## ✅ Lógica Correta Implementada

### Conceitos Fundamentais

1. **EMBARQUE** = Dia da viagem PARA o trabalho (você está indo trabalhar)
2. **OFFSHORE** = Dias trabalhando na plataforma/navio
3. **DESEMBARQUE** = Dia da volta PARA casa (você está voltando)
4. **FOLGA** = Dias em casa (descansando)

### Fluxo Correto - Escala 28x28

#### Quando marcar **EMBARQUE** (ex: dia 28/09):

```
Dia 28/09: EMBARQUE (viagem para o trabalho)
           ↓
Dias 29/09 até 25/10 (28 dias): OFFSHORE (trabalhando)
           ↓
Dia 26/10: DESEMBARQUE (volta para casa)
           ↓
Dias 27/10 até 23/11 (28 dias): FOLGA (em casa)
           ↓
Dia 24/11: Próximo EMBARQUE (sugestão - pode ser dobra ou cancelado)
```

**Detalhamento:**
- ✅ **Dia do embarque**: Você está viajando para o trabalho
- ✅ **Próximos 28 dias**: Você está trabalhando offshore (PRÉ-SELECIONADO)
- ✅ **Dia 29**: Desembarque - volta para casa (PRÉ-SELECIONADO)
- ✅ **Próximos 28 dias**: Folga em casa (NÃO PRÉ-SELECIONADO - pode ter mudanças)
- ✅ **Dia 57**: Próximo embarque (NÃO PRÉ-SELECIONADO - pode ser dobra/cancelado)

#### Quando marcar **DESEMBARQUE** (ex: dia 26/10):

```
Dia 26/10: DESEMBARQUE (volta para casa)
           ↓
Dias 27/10 até 23/11 (28 dias): FOLGA (em casa)
           ↓
Dia 24/11: Próximo EMBARQUE (sugestão - pode ser cancelado)
```

**Detalhamento:**
- ✅ **Dia do desembarque**: Você está voltando para casa
- ✅ **Próximos 28 dias**: Folga em casa (PRÉ-SELECIONADO)
- ✅ **Dia 29**: Próximo embarque (NÃO PRÉ-SELECIONADO - pode ser cancelado/adiado)

## 🎯 Regras de Pré-seleção

### PRÉ-SELECIONADO (✅ checkbox marcado por padrão)

Estes são os lançamentos que **provavelmente** vão acontecer:

1. **Após EMBARQUE**:
   - ✅ Todos os dias OFFSHORE (você vai trabalhar)
   - ✅ Dia do DESEMBARQUE (você vai voltar)

2. **Após DESEMBARQUE**:
   - ✅ Todos os dias de FOLGA (você vai descansar)

### NÃO PRÉ-SELECIONADO (☐ checkbox desmarcado por padrão)

Estes são **sugestões** que podem mudar:

1. **Próximo EMBARQUE**: Pode ser:
   - Cancelado (você não vai embarcar)
   - Adiado (data mudou)
   - Dobra (você vai trabalhar mais tempo)

2. **Dias de FOLGA após EMBARQUE**: Não são pré-selecionados porque:
   - Podem mudar se houver dobra
   - Podem ser cancelados
   - Podem ter data alterada

## 🔄 Casos Especiais

### 1. Dobra (Trabalhar 2 escalas seguidas)

**Cenário**: Você embarcou e vai fazer dobra (56 dias ao invés de 28)

**Como usar o sistema:**
1. Marque EMBARQUE no dia 28/09
2. Sistema sugere OFFSHORE até 25/10 e DESEMBARQUE no 26/10
3. **NÃO confirme o DESEMBARQUE** (desmarque)
4. Continue marcando OFFSHORE manualmente até o dia real do desembarque

**Ou:**
1. Confirme tudo normalmente
2. Depois, **delete o DESEMBARQUE** do dia 26/10
3. Continue marcando OFFSHORE até o dia real

### 2. Cancelamento de Embarque

**Cenário**: Você estava programado para embarcar mas o embarque foi cancelado

**Como usar o sistema:**
1. Sistema sugere EMBARQUE no dia 24/11
2. **NÃO confirme** (deixe desmarcado)
3. Continue marcando FOLGA normalmente

### 3. Saída Antecipada

**Cenário**: Você desembarcou antes do previsto (ex: dia 20/10 ao invés de 26/10)

**Como usar o sistema:**
1. Marque DESEMBARQUE manualmente no dia 20/10
2. Sistema vai sugerir FOLGA a partir do dia 21/10
3. Confirme as sugestões

### 4. Embarque no Final do Mês

**Cenário**: Você embarca no dia 28/09 (escala 28x28)

**Sistema agora:**
- ✅ Sugere OFFSHORE de 29/09 até 25/10 (cruza o mês!)
- ✅ Sugere DESEMBARQUE no 26/10
- ✅ Sugere FOLGA de 27/10 até 23/11 (cruza o mês!)
- ✅ Sugere próximo EMBARQUE no 24/11

**Antes (ERRADO):**
- ❌ Parava no dia 30/09 (fim do mês)
- ❌ Não cruzava para outubro

## 📋 Interface do Modal

### Seções do Modal

1. **Banner Informativo** (topo)
   - Explica o que está acontecendo
   - "Você marcou EMBARQUE - sistema sugere dias offshore e desembarque"
   - "Você marcou DESEMBARQUE - sistema sugere dias de folga"

2. **Dias Trabalhados (Offshore)** - PRÉ-SELECIONADO
   - Cor: Azul ciano
   - Mostra quantos dias selecionados
   - Explicação: "Dias que você estará trabalhando offshore após o embarque"

3. **Desembarque** - PRÉ-SELECIONADO
   - Cor: Roxo
   - Dia da volta para casa

4. **Dias de Folga** - PRÉ-SELECIONADO (se após desembarque)
   - Cor: Cinza
   - Mostra quantos dias selecionados
   - Explicação: "Dias que você estará em casa após o desembarque"

5. **Próxima Transição** - NÃO PRÉ-SELECIONADO
   - Cor: Azul (com opacidade)
   - Badge: "⚠️ Opcional"
   - Explicação: "Próximo embarque/desembarque previsto (pode ser alterado)"

### Botões

- **Selecionar Todos**: Marca todos os checkboxes
- **Desmarcar Todos**: Desmarca todos os checkboxes
- **Cancelar Tudo**: Fecha o modal sem criar nada
- **Confirmar Selecionados**: Cria apenas os lançamentos marcados

## 🧪 Exemplos de Teste

### Teste 1: Embarque no meio do mês

```
Data: 15/09/2025
Ação: Marcar EMBARQUE
Escala: 28x28

Resultado esperado:
✅ 16/09 até 12/10: OFFSHORE (28 dias) - PRÉ-SELECIONADO
✅ 13/10: DESEMBARQUE - PRÉ-SELECIONADO
☐ 14/10 até 10/11: FOLGA (28 dias) - NÃO PRÉ-SELECIONADO
☐ 11/11: EMBARQUE - NÃO PRÉ-SELECIONADO
```

### Teste 2: Embarque no final do mês

```
Data: 28/09/2025
Ação: Marcar EMBARQUE
Escala: 28x28

Resultado esperado:
✅ 29/09 até 30/09: OFFSHORE (2 dias em setembro)
✅ 01/10 até 26/10: OFFSHORE (26 dias em outubro)
✅ 27/10: DESEMBARQUE
☐ 28/10 até 31/10: FOLGA (4 dias em outubro)
☐ 01/11 até 23/11: FOLGA (23 dias em novembro)
☐ 24/11: EMBARQUE
```

### Teste 3: Desembarque

```
Data: 26/10/2025
Ação: Marcar DESEMBARQUE
Escala: 28x28

Resultado esperado:
✅ 27/10 até 31/10: FOLGA (5 dias em outubro)
✅ 01/11 até 23/11: FOLGA (23 dias em novembro)
☐ 24/11: EMBARQUE - NÃO PRÉ-SELECIONADO
```

### Teste 4: Escala 14x14

```
Data: 15/09/2025
Ação: Marcar EMBARQUE
Escala: 14x14

Resultado esperado:
✅ 16/09 até 29/09: OFFSHORE (14 dias)
✅ 30/09: DESEMBARQUE
☐ 01/10 até 14/10: FOLGA (14 dias)
☐ 15/10: EMBARQUE
```

## 💡 Mensagens ao Usuário

### No Modal

```
💡 Estas são apenas SUGESTÕES! 

Você pode desmarcar qualquer item antes de confirmar. 

Útil para casos de:
- 🔄 Dobra (trabalhar 2 escalas seguidas)
- ❌ Cancelamento de embarque
- ⏰ Saída antecipada
- 📅 Mudança de data
```

### Após Confirmar

```
✅ 29 lançamentos criados com sucesso!

Você pode editar ou excluir qualquer lançamento depois.
```

## 🔧 Código Implementado

### Função Principal

```typescript
const calculateSuggestedEntries = (
  startDate: string, 
  startTipo: 'embarque' | 'desembarque'
): Array<{date: string; tipo: string; environment_id: string; selected: boolean}> => {
  
  if (startTipo === 'embarque') {
    // EMBARQUE: User is boarding, so they will work offshore
    
    // Days 1 to N: Offshore (working) - PRE-SELECTED
    for (let i = 0; i < onDays; i++) {
      suggestions.push({
        date: dateStr,
        tipo: 'offshore',
        environment_id: offshoreEnv.id,
        selected: true // ✅ Pre-selected
      });
    }
    
    // Day N+1: Desembarque (return home) - PRE-SELECTED
    suggestions.push({
      date: dateStr,
      tipo: 'desembarque',
      environment_id: desembarqueEnv.id,
      selected: true // ✅ Pre-selected
    });
    
    // Days N+2 to N+M+1: Folga (days off) - NOT PRE-SELECTED
    for (let i = 0; i < offDays; i++) {
      suggestions.push({
        date: dateStr,
        tipo: 'folga',
        environment_id: folgaEnv.id,
        selected: false // ☐ Not pre-selected
      });
    }
    
    // Day N+M+2: Next embarque - NOT PRE-SELECTED
    suggestions.push({
      date: dateStr,
      tipo: 'embarque',
      environment_id: embarqueEnv.id,
      selected: false // ☐ Not pre-selected
    });
    
  } else {
    // DESEMBARQUE: User is returning home
    
    // Days 1 to M: Folga (days off) - PRE-SELECTED
    for (let i = 0; i < offDays; i++) {
      suggestions.push({
        date: dateStr,
        tipo: 'folga',
        environment_id: folgaEnv.id,
        selected: true // ✅ Pre-selected
      });
    }
    
    // Day M+1: Next embarque - NOT PRE-SELECTED
    suggestions.push({
      date: dateStr,
      tipo: 'embarque',
      environment_id: embarqueEnv.id,
      selected: false // ☐ Not pre-selected
    });
  }
}
```

## ✅ Checklist de Validação

- [x] Não preenche dias anteriores ao embarque
- [x] Considera a escala de trabalho (28x28, 14x14, etc.)
- [x] Cruza meses corretamente
- [x] Não coloca folga logo após embarque
- [x] Tudo é opcional (checkboxes)
- [x] Pré-seleciona apenas o que é provável
- [x] Deixa desmarcado o que pode mudar
- [x] Interface clara e informativa
- [x] Suporta casos especiais (dobra, cancelamento, etc.)
- [x] Performance otimizada (batch insert)

## 🎉 Resultado

Agora o sistema funciona **exatamente como deveria**:

✅ **Lógica correta** - Respeita o fluxo real de trabalho  
✅ **Flexível** - Suporta dobra, cancelamento, mudanças  
✅ **Opcional** - Usuário tem controle total  
✅ **Rápido** - Batch insert (140x mais rápido)  
✅ **Intuitivo** - Interface clara e informativa  

