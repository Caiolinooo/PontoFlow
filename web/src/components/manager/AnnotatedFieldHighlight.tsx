'use client';

import { ReactNode } from 'react';

/**
 * Phase 13: AnnotatedFieldHighlight Component
 * 
 * Highlights fields that have annotations from manager review.
 * Shows visual indicator and tooltip with annotation message.
 */

interface AnnotatedFieldHighlightProps {
  fieldPath: string;
  message: string;
  children: ReactNode;
  severity?: 'warning' | 'error' | 'info';
}

export function AnnotatedFieldHighlight({
  message,
  children,
  severity = 'warning'
}: AnnotatedFieldHighlightProps) {
  const severityColors = {
    warning: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-300',
      icon: '⚠️'
    },
    error: {
      bg: 'bg-red-50',
      border: 'border-red-300',
      icon: '❌'
    },
    info: {
      bg: 'bg-blue-50',
      border: 'border-blue-300',
      icon: 'ℹ️'
    }
  };

  const colors = severityColors[severity];

  return (
    <div
      className={`relative p-3 rounded border-l-4 ${colors.bg} ${colors.border} group`}
      title={message}
    >
      <div className="flex items-start gap-2">
        <span className="text-lg flex-shrink-0">{colors.icon}</span>
        <div className="flex-1">
          {children}
        </div>
      </div>

      {/* Tooltip on hover */}
      <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block bg-gray-900 text-white text-sm rounded px-2 py-1 whitespace-nowrap z-10">
        {message}
        <div className="absolute top-full left-2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-900" />
      </div>
    </div>
  );
}

/**
 * AnnotatedEntryList Component
 * 
 * Displays timesheet entries with visual highlighting for annotated fields.
 */

interface Entry {
  id: string;
  tipo: string;
  data: string;
  hora_ini: string;
  hora_fim: string;
  comentario?: string;
}

interface Annotation {
  entry_id: string;
  field_path?: string;
  message: string;
}

interface AnnotatedEntryListProps {
  entries: Entry[];
  annotations: Annotation[];
  locale: 'pt-BR' | 'en-GB';
}

export function AnnotatedEntryList({
  entries,
  annotations,
  locale
}: AnnotatedEntryListProps) {
  const labels = {
    'pt-BR': {
      tipo: 'Tipo',
      data: 'Data',
      hora_ini: 'Hora Início',
      hora_fim: 'Hora Fim',
      comentario: 'Comentário',
      embarque: 'Embarque',
      desembarque: 'Desembarque',
      translado: 'Translado'
    },
    'en-GB': {
      tipo: 'Type',
      data: 'Date',
      hora_ini: 'Start Time',
      hora_fim: 'End Time',
      comentario: 'Comment',
      embarque: 'Boarding',
      desembarque: 'Disembarking',
      translado: 'Transfer'
    }
  }[locale];

  const getAnnotationsForField = (entryId: string, fieldPath?: string) => {
    return annotations.filter(
      a => a.entry_id === entryId && a.field_path === fieldPath
    );
  };

  return (
    <div className="space-y-4">
      {entries.map((entry) => {
        const entryAnnotations = annotations.filter(a => a.entry_id === entry.id);
        const hasAnnotations = entryAnnotations.length > 0;

        return (
          <div
            key={entry.id}
            className={`p-4 rounded border ${
              hasAnnotations
                ? 'border-yellow-300 bg-yellow-50'
                : 'border-gray-200 bg-white'
            }`}
          >
            <div className="grid grid-cols-2 gap-4">
              {/* Tipo */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  {labels.tipo}
                </label>
                {getAnnotationsForField(entry.id, 'tipo').length > 0 ? (
                  <AnnotatedFieldHighlight
                    fieldPath="tipo"
                    message={getAnnotationsForField(entry.id, 'tipo')[0].message}
                  >
                    <p className="text-sm text-gray-900">
                      {labels[entry.tipo as keyof typeof labels] || entry.tipo}
                    </p>
                  </AnnotatedFieldHighlight>
                ) : (
                  <p className="text-sm text-gray-900">
                    {labels[entry.tipo as keyof typeof labels] || entry.tipo}
                  </p>
                )}
              </div>

              {/* Data */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  {labels.data}
                </label>
                {getAnnotationsForField(entry.id, 'data').length > 0 ? (
                  <AnnotatedFieldHighlight
                    fieldPath="data"
                    message={getAnnotationsForField(entry.id, 'data')[0].message}
                  >
                    <p className="text-sm text-gray-900">{entry.data}</p>
                  </AnnotatedFieldHighlight>
                ) : (
                  <p className="text-sm text-gray-900">{entry.data}</p>
                )}
              </div>

              {/* Hora Ini */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  {labels.hora_ini}
                </label>
                {getAnnotationsForField(entry.id, 'hora_ini').length > 0 ? (
                  <AnnotatedFieldHighlight
                    fieldPath="hora_ini"
                    message={getAnnotationsForField(entry.id, 'hora_ini')[0].message}
                  >
                    <p className="text-sm text-gray-900">{entry.hora_ini}</p>
                  </AnnotatedFieldHighlight>
                ) : (
                  <p className="text-sm text-gray-900">{entry.hora_ini}</p>
                )}
              </div>

              {/* Hora Fim */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  {labels.hora_fim}
                </label>
                {getAnnotationsForField(entry.id, 'hora_fim').length > 0 ? (
                  <AnnotatedFieldHighlight
                    fieldPath="hora_fim"
                    message={getAnnotationsForField(entry.id, 'hora_fim')[0].message}
                  >
                    <p className="text-sm text-gray-900">{entry.hora_fim}</p>
                  </AnnotatedFieldHighlight>
                ) : (
                  <p className="text-sm text-gray-900">{entry.hora_fim}</p>
                )}
              </div>
            </div>

            {/* Comentário */}
            {entry.comentario && (
              <div className="mt-3">
                <label className="block text-sm font-medium text-gray-700">
                  {labels.comentario}
                </label>
                {getAnnotationsForField(entry.id, 'comentario').length > 0 ? (
                  <AnnotatedFieldHighlight
                    fieldPath="comentario"
                    message={getAnnotationsForField(entry.id, 'comentario')[0].message}
                  >
                    <p className="text-sm text-gray-900">{entry.comentario}</p>
                  </AnnotatedFieldHighlight>
                ) : (
                  <p className="text-sm text-gray-900">{entry.comentario}</p>
                )}
              </div>
            )}

            {/* Entry-level annotations */}
            {getAnnotationsForField(entry.id).filter(a => !a.field_path).map((ann) => (
              <div key={ann.message} className="mt-3 p-2 bg-orange-100 border border-orange-300 rounded text-sm text-orange-800">
                {ann.message}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

