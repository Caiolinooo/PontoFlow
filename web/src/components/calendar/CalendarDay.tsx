"use client";

import React, { memo, useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';

interface CalendarDayProps {
  date: string;
  dayNum: number;
  entries: any[];
  isToday: boolean;
  isBlocked: boolean;
  onDayClick: (date: string) => void;
  getEnvironmentColor: (id: string | null | undefined) => string;
  getEnvironmentName: (id: string | null | undefined) => string;
}

const CalendarDay = memo(function CalendarDay({
  date,
  dayNum,
  entries,
  isToday,
  isBlocked,
  onDayClick,
  getEnvironmentColor,
  getEnvironmentName,
}: CalendarDayProps) {
  const handleClick = useCallback(() => {
    if (!isBlocked) {
      onDayClick(date);
    }
  }, [date, isBlocked, onDayClick]);

  return (
    <button
      onClick={handleClick}
      disabled={isBlocked}
      className={`
        relative aspect-square w-full p-1 sm:p-1.5 rounded border transition-all group flex flex-col
        ${isToday
          ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/20 shadow-sm ring-1 ring-blue-300 dark:ring-blue-700'
          : 'border-[var(--border)] bg-[var(--card)]'}
        ${!isBlocked
          ? 'hover:border-blue-400 hover:shadow-md hover:scale-[1.02] hover:z-10 cursor-pointer hover:bg-gradient-to-br hover:from-blue-50/50 hover:to-transparent dark:hover:from-blue-900/20'
          : 'opacity-60 cursor-not-allowed'}
        ${entries.length > 0 ? 'bg-gradient-to-br from-[var(--card)] to-[var(--muted)]/40' : ''}
      `}
    >
      <div className="flex items-start justify-between mb-0.5 sm:mb-1">
        <span className={`text-xs sm:text-sm font-bold ${
          isToday ? 'text-blue-600 dark:text-blue-400' : 'text-[var(--foreground)]'
        }`}>
          {dayNum}
        </span>
        {entries.length > 0 && (
          <span className="text-[8px] sm:text-[10px] font-semibold px-1 py-0.5 rounded-full bg-blue-500 text-white leading-none">
            {entries.length}
          </span>
        )}
      </div>

      <div className="space-y-0.5 flex-1 overflow-hidden">
        {entries.slice(0, 5).map((entry) => {
          const envColor = getEnvironmentColor(entry.environment_id);
          const envName = getEnvironmentName(entry.environment_id);
          return (
            <div
              key={entry.id}
              className="text-[8px] sm:text-[10px] px-1 sm:px-1.5 py-0.5 rounded truncate font-medium text-white"
              style={{ backgroundColor: envColor }}
              title={`${envName}${entry.hora_ini ? ` • ${entry.hora_ini}` : ''}`}
            >
              <span className="hidden md:inline">{envName}</span>
              <span className="md:hidden">{envName.substring(0, 3)}</span>
              {entry.hora_ini && (
                <span className="ml-0.5 opacity-90 hidden lg:inline text-[8px]">
                  • {entry.hora_ini}
                </span>
              )}
            </div>
          );
        })}
        {entries.length > 5 && (
          <div className="text-[8px] sm:text-[10px] text-[var(--muted-foreground)] font-semibold text-center">
            +{entries.length - 5}
          </div>
        )}
      </div>
    </button>
  );
});

export default CalendarDay;