import { NextResponse } from 'next/server';
import type { IntegrationErrorBody, IntegrationErrorCode } from './types';

export const API_VERSION_HEADER = 'X-PontoFlow-Api';

/** Envelope de erro padrão da Integration API v1 + header de versão. */
export function apiError(
  status: number,
  code: IntegrationErrorCode,
  message: string,
  details?: unknown
): NextResponse<IntegrationErrorBody> {
  return NextResponse.json(
    { error: { code, message, ...(details !== undefined ? { details } : {}) } },
    { status, headers: { [API_VERSION_HEADER]: 'v1' } }
  );
}

/** Resposta de sucesso com header de versão. */
export function apiOk<T>(body: T, status = 200, extraHeaders?: Record<string, string>): NextResponse<T> {
  return NextResponse.json(body, {
    status,
    headers: { [API_VERSION_HEADER]: 'v1', ...(extraHeaders ?? {}) },
  });
}
