"use client";

import Link from 'next/link';
import { useState } from 'react';

interface Props {
  userId: string;
  locale: string;
  editLabel: string;
  deleteLabel: string;
}

export default function UserRowActions({ userId, locale, editLabel, deleteLabel }: Props) {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!confirm(deleteLabel + '?')) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.error) {
        alert(data?.error || 'Erro ao deletar usuário');
      } else {
        location.reload();
      }
    } catch {
      alert('Erro ao deletar usuário');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="whitespace-nowrap text-right text-sm font-medium space-x-2">
      <Link href={`/${locale}/admin/users/${userId}`} className="text-[var(--primary)] hover:opacity-90 transition-colors">
        {editLabel}
      </Link>
      <button onClick={handleDelete} disabled={loading} className="text-red-600 hover:text-red-800 transition-colors disabled:opacity-50">
        {deleteLabel}
      </button>
    </div>
  );
}

