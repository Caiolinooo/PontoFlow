"use client";

import React, { memo, useMemo } from 'react';
import CalendarDay from './CalendarDay';
import { useTranslations } from 'next-intl';

interface Environment {
  id: string;
  name: string;
  slug: string;
  color?: string;
}

interface CalendarGridProps {
  days: string[];
  entries: any[];
  firstDayOfWeek: number;
  periodo_ini: string;
  isBlocked: boolean;
  onDayClick: (date: string) => void;
  environments: Environment[];
  locale: string;
}

const CalendarGrid = memo(function CalendarGrid({
  days,
  entries,
  firstDayOfWeek,
  periodo_ini,
  isBlocked,
  onDayClick,
  environments,
  locale,
}: CalendarGridProps) {
  const t = useTranslations('admin.myTimesheet');

  const environmentHelpers = useMemo(() => ({
    getEnvironment: (envId: string | null | undefined) => {
      if (!envId) return null;
      return environments.find(e => e.id === envId) || null;
    },
    getEnvironmentColor: (envId: string | null | undefined): string => {
      const env = environmentHelpers.getEnvironment(envId);
      return env?.color || '#3B82F6';
    },
    getEnvironmentName: (envId: string | null | undefined): string => {
      const env = environmentHelpers.getEnvironment(envId);
      return env?.name || 'N/A';
    },
  }), [environments]);

  const calendarDays = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const dayEntries = new Map();
    
    // Group entries by date for efficient lookup
    entries.forEach(entry => {
      if (!dayEntries.has(entry.data)) {
        dayEntries.set(entry.data, []);
      }
      dayEntries.get(entry.data).push(entry);
    });

    return days.map(date => {
      const dayNum = Number(date.split('-')[2]);
      const dayEntryList = dayEntries.get(date) || [];
      const isToday = date === today;
      
      return (
        <CalendarDay
          key={date}
          date={date}
          dayNum={dayNum}
          entries={dayEntryList}
          isToday={isToday}
          isBlocked={isBlocked}
          onDayClick={onDayClick}
          getEnvironmentColor={environmentHelpers.getEnvironmentColor}
          getEnvironmentName={environmentHelpers.getEnvironmentName}
        />
      );
    });
  }, [days, entries, isBlocked, onDayClick, environmentHelpers]);

  return (
    <div className="bg-gradient-to-br from-[var(--card)] to-[var(--muted)]/20 rounded-lg shadow-lg border border-[var(--border)] p-2 sm:p-3 animate-scale-in">
      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-0.5 sm:gap-1 mb-2">
        {[
          t('weekdays.sun'), 
          t('weekdays.mon'), 
          t('weekdays.tue'), 
          t('weekdays.wed'), 
          t('weekdays.thu'), 
          t('weekdays.fri'), 
          t('weekdays.sat')
        ].map((day, i) => (
          <div 
            key={i} 
            className="text-center text-[10px] sm:text-xs font-bold text-[var(--foreground)] uppercase tracking-wide py-1 sm:py-1.5 bg-[var(--muted)]/50 rounded"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
        {/* Empty cells for offset */}
        {Array.from({ length: firstDayOfWeek }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}

        {/* Day cells */}
        {calendarDays}
      </div>

      {/* Legend - Environments */}
      <div className="mt-3 pt-3 border-t border-[var(--border)]">
        <h3 className="text-xs sm:text-sm font-semibold text-[var(--foreground)] mb-2">
          {t('legend')}
        </h3>
        <div className="flex flex-wrap gap-2 sm:gap-3">
          {environments.map((env) => (
            <div key={env.id} className="flex items-center gap-1 sm:gap-1.5">
              <div
                className="w-3 h-3 rounded"
                style={{ backgroundColor: env.color || '#3B82F6' }}
              />
              <span className="text-xs sm:text-sm text-[var(--muted-foreground)]">
                {env.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

export default CalendarGrid;