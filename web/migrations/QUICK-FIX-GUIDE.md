# 🚀 Guia Rápido - Fix do Sistema de Convites

## ⚠️ Situação Atual

Você executou a migration e recebeu o erro:
```
ERROR: 42710: policy "user_invitations_admin_all" for table "user_invitations" already exists
```

Isso significa que a migration foi **parcialmente executada**.

---

## ✅ Solução em 3 Passos

### **Passo 1: Abra o Supabase SQL Editor**

1. Acesse: https://supabase.com/dashboard
2. Selecione o projeto: **Timesheet_Project**
3. Clique em **"SQL Editor"** → **"New query"**

### **Passo 2: Execute o Script de Fix**

Copie e cole o conteúdo do arquivo:
```
web/migrations/FIX-USER-INVITATIONS-COMPLETE.sql
```

Ou copie diretamente daqui: [Ver arquivo completo](./FIX-USER-INVITATIONS-COMPLETE.sql)

### **Passo 3: Clique em "Run"**

✅ **Sucesso**: Você verá a mensagem "user_invitations table created successfully" com 20 colunas

❌ **Erro**: Se ainda houver erro, me envie a mensagem completa

---

## 🧪 Teste Após Execução

1. **Recarregue** a página do sistema (Ctrl+Shift+R)
2. **Abra** o modal "Gerenciar Convites"
3. **Verifique** se o erro desapareceu
4. **Crie** um convite de teste

---

## 📊 O Que o Script Faz

1. **Remove** tudo relacionado a `user_invitations` (se existir)
2. **Recria** a tabela do zero
3. **Adiciona** todos os índices, policies, triggers e funções
4. **Verifica** que tudo foi criado corretamente

---

## ❓ Por Que Isso Aconteceu?

A migration anterior usava `CREATE POLICY` sem `IF NOT EXISTS`, então quando você executou novamente, ela tentou criar uma policy que já existia.

O novo script usa `DROP ... IF EXISTS` antes de criar, garantindo uma instalação limpa.

---

**Após executar este script, o sistema de convites funcionará perfeitamente!** ✨

