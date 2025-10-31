import React from 'react';

type TableProps = React.TableHTMLAttributes<HTMLTableElement> & { compact?: boolean };

export function Table({ children, className = '', compact, ...rest }: TableProps) {
  return (
    <div className="overflow-x-auto">
      <table
        {...rest}
        className={`min-w-full text-left border-collapse bg-white dark:bg-gray-900 ${compact ? 'text-sm' : ''} ${className}`}
      >
        {children}
      </table>
    </div>
  );
}

export function THead({ children }: { children: React.ReactNode }) {
  return (
    <thead className="bg-gray-50 dark:bg-gray-800/50">
      {children}
    </thead>
  );
}

export function TRow({ children }: { children: React.ReactNode }) {
  return <tr className="border-b border-gray-200 dark:border-gray-800">{children}</tr>;
}

export function TH({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">{children}</th>;
}

export function TD({ children }: { children: React.ReactNode }) {
  return <td className="px-4 py-3 text-sm text-gray-800 dark:text-gray-200">{children}</td>;
}

