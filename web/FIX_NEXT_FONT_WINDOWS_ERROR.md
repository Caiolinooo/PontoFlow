# Correção do Erro ERR_UNSUPPORTED_ESM_URL_SCHEME no Windows

## Problema
O erro `ERR_UNSUPPORTED_ESM_URL_SCHEME` ocorre ao usar `next/font` no Windows devido a problemas com caminhos absolutos que não são convertidos corretamente para URLs `file://`.

## Correções Aplicadas

### 1. Conversão do PostCSS para CommonJS
- **Arquivo**: `postcss.config.mjs` → `postcss.config.cjs`
- **Mudança**: Convertido de ESM (`export default`) para CommonJS (`module.exports`)
- **Motivo**: Evita problemas de carregamento de módulos ESM no Windows

### 2. Configuração do Webpack no next.config.js
Adicionadas configurações para lidar com caminhos Windows:

```javascript
webpack: (config, { dev, isServer }) => {
  // Fix for Windows ESM URL scheme error with next/font
  config.resolve = {
    ...config.resolve,
    extensionAlias: {
      '.js': ['.js', '.ts', '.tsx'],
      '.mjs': ['.mjs', '.ts', '.tsx'],
    },
  };

  // Fix for Windows path handling in ESM modules (client-side)
  if (!isServer) {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
    };
  }
  // ... resto da configuração
}
```

### 3. Configuração do Webpack no next.config.ts
Mesmas correções aplicadas no arquivo TypeScript de configuração.

## Próximos Passos

### Limpar Cache do Next.js
Execute os seguintes comandos para limpar o cache:

```powershell
cd web
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
npm run build
```

### Verificar Versão do Next.js
A versão atual é `14.2.0`. A versão mais recente disponível é `16.0.1`, mas essa é uma atualização major que pode causar breaking changes.

**Recomendação**: Primeiro teste se as correções aplicadas resolvem o problema. Se o erro persistir, considere atualizar para uma versão mais recente da série 14.x:

```powershell
cd web
npm install next@14.2.18
```

Ou, se necessário atualizar para a versão mais recente (requer verificação de compatibilidade):

```powershell
cd web
npm install next@latest
```

### Testar o Build
Após as correções, teste o build:

```powershell
cd web
npm run build
```

## Arquivos Modificados
1. `web/postcss.config.cjs` (criado)
2. `web/postcss.config.mjs` (removido)
3. `web/next.config.js` (atualizado)
4. `web/next.config.ts` (atualizado)

## Referências
- [Next.js GitHub Issue #64372](https://github.com/vercel/next.js/issues/64372)
- [Node.js ESM URL Scheme Documentation](https://nodejs.org/api/esm.html#esm_urls)

