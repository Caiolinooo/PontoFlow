-- ============================================================================
-- CHECK EXISTING DATA - Execute ANTES do FIX-USER-INVITATIONS-COMPLETE.sql
-- ============================================================================
-- Este script verifica se há dados existentes na tabela user_invitations
-- Execute este script PRIMEIRO para ver se há convites que precisam ser preservados
-- ============================================================================

-- Verificar se a tabela existe
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'user_invitations'
    ) THEN '✅ Tabela user_invitations existe'
    ELSE '❌ Tabela user_invitations NÃO existe'
  END as table_status;

-- Verificar quantos registros existem (se a tabela existir)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'user_invitations'
  ) THEN
    RAISE NOTICE '📊 Verificando dados existentes...';
    
    -- Contar registros
    PERFORM COUNT(*) FROM public.user_invitations;
    
    -- Mostrar registros (se houver)
    RAISE NOTICE '📋 Listando convites existentes:';
  ELSE
    RAISE NOTICE '⚠️ Tabela não existe - pode prosseguir com o FIX-USER-INVITATIONS-COMPLETE.sql';
  END IF;
END $$;

-- Listar todos os convites existentes (se houver)
SELECT 
  id,
  email,
  first_name,
  last_name,
  role,
  status,
  invited_at,
  expires_at
FROM public.user_invitations
ORDER BY invited_at DESC;

-- ============================================================================
-- INTERPRETAÇÃO DOS RESULTADOS:
-- ============================================================================
-- 
-- Se retornar "Tabela NÃO existe":
--   ✅ Pode executar FIX-USER-INVITATIONS-COMPLETE.sql sem preocupações
--
-- Se retornar "Tabela existe" e 0 registros:
--   ✅ Pode executar FIX-USER-INVITATIONS-COMPLETE.sql sem preocupações
--
-- Se retornar "Tabela existe" e HOUVER registros:
--   ⚠️ ATENÇÃO: Há convites pendentes!
--   📋 Anote os dados mostrados acima
--   💾 Considere fazer backup antes de executar o FIX
--   
--   Para fazer backup:
--   1. Copie os dados mostrados acima
--   2. Ou execute: 
--      SELECT * FROM public.user_invitations;
--   3. Salve o resultado em um arquivo
--
-- ============================================================================

