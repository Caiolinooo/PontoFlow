"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import InviteUserModal from './InviteUserModal';

interface UsersPageClientProps {
  locale: string;
  newUserLabel: string;
  inviteUserLabel: string;
}

export default function UsersPageClient({ locale, newUserLabel, inviteUserLabel }: UsersPageClientProps) {
  const [showInviteModal, setShowInviteModal] = useState(false);

  const handleInviteSuccess = () => {
    // Refresh the page to show updated invitations
    window.location.reload();
  };

  return (
    <>
      <div className="flex items-center gap-3">
        <button
          onClick={() => setShowInviteModal(true)}
          className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all shadow-md"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76" />
          </svg>
          {inviteUserLabel}
        </button>
        
        <Link
          href={`/${locale}/admin/users/new`}
          className="inline-flex items-center px-4 py-2 bg-[var(--primary)] text-[var(--primary-foreground)] rounded-lg hover:opacity-90 transition-colors"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {newUserLabel}
        </Link>
      </div>

      <InviteUserModal
        open={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        onSuccess={handleInviteSuccess}
      />
    </>
  );
}

