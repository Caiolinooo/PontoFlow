"use client";
import React from 'react';

export default function RoleSelect({ userId, current }: { userId: string; current: string }) {
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const role = (form.elements.namedItem('role') as HTMLSelectElement).value;
    const resp = await fetch(`/api/admin/users/${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role })
    });
    if (!resp.ok) alert('Falha ao atualizar papel');
    else window.location.reload();
  }

  return (
    <form onSubmit={onSubmit} className="flex items-center">
      <select name="role" defaultValue={current} className="border rounded p-1 text-sm">
        <option value="ADMIN">ADMIN</option>
        <option value="MANAGER">MANAGER</option>
        <option value="MANAGER_TIMESHEET">MANAGER_TIMESHEET</option>
        <option value="USER">USER</option>
      </select>
      <button type="submit" className="ml-2 px-2 py-1 rounded bg-[var(--primary)] text-[var(--primary-foreground)]">Salvar</button>
    </form>
  );
}

