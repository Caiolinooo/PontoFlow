import { requireRole } from '@/lib/auth/server';
import Link from 'next/link';
import { getServerSupabase } from '@/lib/supabase/server';
import RoleSelect from '@/components/admin/RoleSelect';

export default async function AccessControlPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  await requireRole(locale, ['ADMIN']);

  const supabase = await getServerSupabase();
  // Listar usuários e papel atual
  const { data: users } = await supabase
    .from('users_unified')
    .select('id, email, name, role, active, created_at')
    .order('created_at', { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--foreground)]">Acessos e Permissões</h1>
          <p className="text-sm text-[var(--muted-foreground)]">Defina papéis e gerencie delegações (grupos) dos usuários.</p>
        </div>
        <Link href={`/${locale}/admin/delegations`} className="px-3 py-1.5 rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90">Gerenciar Delegações</Link>
      </div>

      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[var(--muted)]/40 text-[var(--muted-foreground)]">
            <tr>
              <th className="text-left px-6 py-3 font-medium">Usuário</th>
              <th className="text-left px-6 py-3 font-medium">E-mail</th>
              <th className="text-left px-6 py-3 font-medium">Papel</th>
              <th className="text-left px-6 py-3 font-medium">Ativo</th>
              <th className="text-right px-6 py-3 font-medium">Ações</th>
            </tr>
          </thead>
          <tbody>
            {(users ?? []).map((u) => (
              <tr key={u.id} className="border-t border-[var(--border)]">
                <td className="px-6 py-3 text-[var(--foreground)]">{u.name ?? u.id}</td>
                <td className="px-6 py-3 text-[var(--foreground)]">{u.email}</td>
                <td className="px-6 py-3">
                  <RoleSelect userId={u.id} current={u.role} />
                </td>
                <td className="px-6 py-3">{u.active ? 'Sim' : 'Não'}</td>
                <td className="px-6 py-3 text-right">
                  <Link href={`/${locale}/admin/users/${u.id}`} className="px-2 py-1 rounded-md bg-[var(--muted)] text-[var(--foreground)]">Editar</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="text-sm text-[var(--muted-foreground)]">
        Para permissões finas por módulo/função (ex.: só leitura em Relatórios), vou adicionar uma tabela de permissões granuladas com migração segura. Posso aplicar isso na próxima rodada.
      </div>
    </div>
  );
}


