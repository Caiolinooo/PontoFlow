export function isMetaUI(): boolean {
  // Default: ON (Meta UI habilitado). Pode desabilitar com NEXT_PUBLIC_META_UI=0.
  if (typeof process === 'undefined') return true;
  const v = process.env.NEXT_PUBLIC_META_UI;
  return (v ?? '1') === '1';
}

