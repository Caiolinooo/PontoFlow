# Correção do Erro lightningcss.win32-x64-msvc.node

## Problema
O erro `Cannot find module '../lightningcss.win32-x64-msvc.node'` ocorre quando o `@tailwindcss/postcss` v4 tenta carregar o binário nativo do `lightningcss` no Windows.

## Correções Aplicadas

### 1. Remoção do Tailwind CSS v3
- **Problema**: Conflito entre `tailwindcss` v3.4.0 e `@tailwindcss/postcss` v4
- **Solução**: Removido `tailwindcss` v3 do `package.json` e desinstalado
- **Motivo**: O Tailwind v4 é incompatível com v3 e usa uma abordagem diferente

### 2. Reinstalação das Dependências
- Reinstalado `lightningcss-win32-x64-msvc` para garantir que os binários nativos estejam presentes
- Reconstruído os módulos nativos com `npm rebuild`

### 3. Limpeza de Cache
- Removido cache do Next.js (`.next`)
- Reinstalado dependências com `npm install --legacy-peer-deps`

## Verificação

O binário nativo está localizado em:
```
node_modules/lightningcss-win32-x64-msvc/lightningcss.win32-x64-msvc.node
```

## Próximos Passos

### Se o erro persistir:

1. **Limpar completamente o cache e reinstalar**:
```powershell
cd web
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
npm install
```

2. **Verificar versão do Node.js**:
```powershell
node --version
```
Certifique-se de que está usando Node.js >= 18.17.0 (conforme especificado no package.json)

3. **Alternativa: Usar Tailwind CSS v3**:
Se o problema persistir, considere reverter para Tailwind CSS v3:
```powershell
npm install tailwindcss@^3.4.0
npm uninstall @tailwindcss/postcss
```
E ajustar o `postcss.config.cjs` para usar `tailwindcss` e `autoprefixer` em vez de `@tailwindcss/postcss`.

## Arquivos Modificados
1. `web/package.json` (removido tailwindcss v3)
2. `web/postcss.config.cjs` (já estava correto)

## Referências
- [Tailwind CSS v4 Documentation](https://tailwindcss.com/docs/v4-beta)
- [lightningcss GitHub](https://github.com/parcel-bundler/lightningcss)

