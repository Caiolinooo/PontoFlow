"use client";
import React from 'react';

export default function AckStatus({ timesheetId }: { timesheetId: string }) {
  const [data, setData] = React.useState<{ total: number; withJustification: number; pendingAck: number; contested: number; acknowledged: number } | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/manager/timesheets/${timesheetId}/ack-status`, { cache: 'no-store' });
        if (!res.ok) throw new Error('Falha ao carregar status de ciência');
        const j = await res.json();
        setData(j);
      } catch (e: any) {
        setError(e?.message || 'Erro');
      }
    })();
  }, [timesheetId]);

  if (error) return <div className="text-[var(--destructive)] text-sm">{error}</div>;
  if (!data) return <div className="text-[var(--muted-foreground)] text-sm">Carregando ciência...</div>;

  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-3 text-sm">
      <div className="font-medium text-[var(--foreground)] mb-1">Ciência do colaborador</div>
      <div className="text-[var(--muted-foreground)]">
        Ajustes com justificativa: <strong>{data.withJustification}</strong><br />
        Ciência pendente: <strong className={data.pendingAck>0? 'text-yellow-700': ''}>{data.pendingAck}</strong><br />
        Contestações: <strong className={data.contested>0? 'text-red-700': ''}>{data.contested}</strong><br />
        Com ciência registrada: <strong className="text-green-700">{data.acknowledged}</strong>
      </div>
    </div>
  );
}

