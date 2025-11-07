'use client';

/**
 * Super Admin Management Modal
 *
 * SECURITY: This component is ONLY visible to super admins
 * Regular admins, managers, and users NEVER see this
 *
 * Features:
 * - List all super admins
 * - Add new super admins
 * - Remove super admins
 * - Shows system owner (cannot be removed)
 */

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';

interface SuperAdmin {
  id: string;
  email: string;
  created_at: string;
  created_by: string | null;
  notes: string | null;
}

interface SuperAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SuperAdminModal({ isOpen, onClose }: SuperAdminModalProps) {
  const t = useTranslations('admin');
  const [superAdmins, setSuperAdmins] = useState<SuperAdmin[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Add new super admin form
  const [newEmail, setNewEmail] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [adding, setAdding] = useState(false);

  // Fetch super admins
  const fetchSuperAdmins = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/super-admins');
      if (!response.ok) {
        throw new Error('Failed to fetch super admins');
      }

      const data = await response.json();
      setSuperAdmins(data.super_admins || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  // Add super admin
  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdding(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/admin/super-admins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newEmail,
          notes: newNotes || undefined
        })
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to add super admin');
      }

      setSuccess(`Super admin ${newEmail} added successfully`);
      setNewEmail('');
      setNewNotes('');
      fetchSuperAdmins();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setAdding(false);
    }
  };

  // Remove super admin
  const handleRemove = async (id: string, email: string) => {
    if (!confirm(`Remove super admin ${email}?`)) {
      return;
    }

    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/admin/super-admins', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to remove super admin');
      }

      setSuccess(`Super admin ${email} removed successfully`);
      fetchSuperAdmins();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  // Fetch on mount
  useEffect(() => {
    if (isOpen) {
      fetchSuperAdmins();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 animate-fade-in">
      <div className="bg-[var(--surface)] rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col animate-scale-in">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between">
          <h2 className="text-xl font-semibold text-[var(--foreground)]">
            🔒 Super Admin Management
          </h2>
          <button
            onClick={onClose}
            className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Alerts */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 px-4 py-3 rounded">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-200 px-4 py-3 rounded">
              {success}
            </div>
          )}

          {/* Add New Super Admin Form */}
          <div className="border border-[var(--border)] rounded-lg p-4 bg-[var(--muted)]/30">
            <h3 className="text-lg font-medium text-[var(--foreground)] mb-4">
              Add New Super Admin
            </h3>
            <form onSubmit={handleAdd} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  required
                  placeholder="admin@example.com"
                  className="w-full px-3 py-2 border border-[var(--border)] rounded-md bg-[var(--surface)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
                  Notes (optional)
                </label>
                <input
                  type="text"
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="e.g., Support team member"
                  className="w-full px-3 py-2 border border-[var(--border)] rounded-md bg-[var(--surface)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                />
              </div>
              <button
                type="submit"
                disabled={adding}
                className="w-full bg-[var(--primary)] text-white px-4 py-2 rounded-md hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {adding ? 'Adding...' : 'Add Super Admin'}
              </button>
            </form>
          </div>

          {/* List Super Admins */}
          <div>
            <h3 className="text-lg font-medium text-[var(--foreground)] mb-4">
              Current Super Admins
            </h3>

            {loading ? (
              <div className="text-center py-8 text-[var(--muted-foreground)]">
                Loading...
              </div>
            ) : (
              <div className="space-y-2">
                {/* System Owner (always first) */}
                <div className="border border-[var(--border)] rounded-lg p-4 bg-yellow-50 dark:bg-yellow-900/10">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-[var(--foreground)]">
                        🔐 System Owner (Permanent)
                      </div>
                      <div className="text-sm text-[var(--muted-foreground)]">
                        Hardcoded - Cannot be removed
                      </div>
                    </div>
                    <div className="px-3 py-1 bg-yellow-200 dark:bg-yellow-800 text-yellow-900 dark:text-yellow-100 rounded-full text-xs font-medium">
                      PERMANENT
                    </div>
                  </div>
                </div>

                {/* Database Super Admins */}
                {superAdmins.length === 0 ? (
                  <div className="text-center py-8 text-[var(--muted-foreground)]">
                    No additional super admins
                  </div>
                ) : (
                  superAdmins.map((admin) => (
                    <div
                      key={admin.id}
                      className="border border-[var(--border)] rounded-lg p-4 bg-[var(--surface)] hover:bg-[var(--muted)]/30 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-[var(--foreground)] truncate">
                            {admin.email}
                          </div>
                          <div className="text-sm text-[var(--muted-foreground)] space-y-0.5">
                            {admin.notes && (
                              <div>📝 {admin.notes}</div>
                            )}
                            <div>
                              Added: {new Date(admin.created_at).toLocaleDateString()}
                              {admin.created_by && ` by ${admin.created_by}`}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemove(admin.id, admin.email)}
                          className="ml-4 px-3 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors text-sm"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[var(--border)] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[var(--muted)] text-[var(--foreground)] rounded-md hover:bg-[var(--muted)]/80 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
