"use client";
import React from 'react';

export default function AdminDbConfig() {
  const [url, setUrl] = React.useState<string>(process.env.NEXT_PUBLIC_SUPABASE_URL || '');
  const [anon, setAnon] = React.useState<string>('');
  const [service, setService] = React.useState<string>('');
  const [saving, setSaving] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);

  async function save() {
    setSaving(true); setMsg(null);
    try {
      const r = await fetch('/api/admin/config/supabase', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url, anon, service }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || 'Falha ao salvar');
      setMsg('Salvo. Reinicie o servidor para aplicar.');
    } catch (e: any) {
      setMsg(e?.message || 'Erro');
    } finally { setSaving(false); }
  }

  return (
    <div className="rounded border p-4 space-y-3 bg-[var(--card)]">
      <h2 className="text-lg font-medium">Banco de Dados (Supabase)</h2>
      <p className="text-sm text-[var(--muted-foreground)]">Altere as chaves do projeto. Em produção, a edição pelo painel pode estar desabilitada e deve ser feita no provedor (Vercel/Render/etc.).</p>
      <div className="grid md:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm">NEXT_PUBLIC_SUPABASE_URL</label>
          <input className="mt-1 w-full rounded border p-2 bg-[var(--input)]" value={url} onChange={(e)=>setUrl(e.target.value)} placeholder="https://xxxx.supabase.co" />
        </div>
        <div>
          <label className="block text-sm">NEXT_PUBLIC_SUPABASE_ANON_KEY</label>
          <input className="mt-1 w-full rounded border p-2 bg-[var(--input)]" value={anon} onChange={(e)=>setAnon(e.target.value)} placeholder="anon key" />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm">SUPABASE_SERVICE_ROLE_KEY</label>
          <input className="mt-1 w-full rounded border p-2 bg-[var(--input)]" value={service} onChange={(e)=>setService(e.target.value)} placeholder="service role key" />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button onClick={save} disabled={saving} className="px-3 py-1 rounded bg-[var(--primary)] text-[var(--primary-foreground)]">
          {saving ? 'Salvando…' : 'Salvar (.env.local)'}
        </button>
        {msg && <span className="text-sm text-[var(--muted-foreground)]">{msg}</span>}
      </div>
    </div>
  );
}

