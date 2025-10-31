"use client";

import React from 'react';

export function MetaCard({ children, className }: { children: React.ReactNode; className?: string }) {
  const base = "bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 shadow-sm";
  return (
    <div className={(className ? base + " " + className : base)}>
      {children}
    </div>
  );
}

export default MetaCard;

