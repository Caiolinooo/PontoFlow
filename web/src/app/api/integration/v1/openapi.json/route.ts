import { apiOk } from '@/lib/integration/v1/http';

const ERROR_SCHEMA = {
  type: 'object',
  properties: {
    error: {
      type: 'object',
      properties: {
        code: { type: 'string' },
        message: { type: 'string' },
        details: {},
      },
      required: ['code', 'message'],
    },
  },
  required: ['error'],
};

const WORK_SCHEDULE_SCHEMA = {
  oneOf: [
    {
      type: 'object',
      properties: {
        kind: { const: 'pattern' },
        daysOn: { type: 'integer', minimum: 1 },
        daysOff: { type: 'integer', minimum: 1 },
        anchor: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
      },
      required: ['kind', 'daysOn', 'daysOff', 'anchor'],
    },
    {
      type: 'object',
      properties: {
        kind: { const: 'weekly' },
        workdays: {
          type: 'array',
          items: { type: 'integer', enum: [1, 2, 3, 4, 5, 6, 7] },
          minItems: 1,
        },
      },
      required: ['kind', 'workdays'],
    },
  ],
};

const PERSON_UPSERT_SCHEMA = {
  type: 'object',
  properties: {
    externalId: { type: 'string' },
    email: { type: 'string', format: 'email' },
    displayName: { type: 'string' },
    cpf: { type: 'string', pattern: '^\\d{11}$' },
    active: { type: 'boolean' },
    schedule: WORK_SCHEDULE_SCHEMA,
    managerExternalId: { type: 'string' },
    attributes: { type: 'object', additionalProperties: { type: 'string' } },
  },
  required: ['externalId', 'email', 'displayName', 'active'],
};

const PERSON_RESULT_SCHEMA = {
  type: 'object',
  properties: {
    employeeId: { type: ['string', 'null'] },
    externalId: { type: 'string' },
    state: { type: 'string', enum: ['invited', 'active', 'inactive'] },
    created: { type: 'boolean' },
  },
  required: ['employeeId', 'externalId', 'state', 'created'],
};

const EVENT_TYPES = [
  'person.provisioned',
  'person.deactivated',
  'timesheet.submitted',
  'timesheet.approved',
  'timesheet.rejected',
  'period.locked',
];

const SPEC = {
  openapi: '3.0.3',
  info: {
    title: 'PontoFlow Integration API',
    version: '1.0.0',
    description:
      'Contrato público de integração do PontoFlow (Time-Sheet). Auth via X-API-Key; ' +
      'todas as respostas trazem o header X-PontoFlow-Api: v1 e erros no formato ' +
      '{ error: { code, message, details? } }. Mudanças breaking => /v2.',
  },
  servers: [{ url: '/api/integration/v1' }],
  components: {
    securitySchemes: {
      ApiKeyAuth: { type: 'apiKey', in: 'header', name: 'X-API-Key' },
    },
    schemas: {
      Error: ERROR_SCHEMA,
      WorkSchedule: WORK_SCHEDULE_SCHEMA,
      PersonUpsert: PERSON_UPSERT_SCHEMA,
      PersonResult: PERSON_RESULT_SCHEMA,
    },
  },
  security: [{ ApiKeyAuth: [] }],
  paths: {
    '/people': {
      put: {
        summary: 'Upsert de pessoa por (tenant, externalId). Idempotente.',
        description:
          'Ordem de busca: external_id → cpf → email. Vínculo por email/cpf quando sem external_id; ' +
          '409 email_conflict/cpf_conflict em colisão. Tenant sso_only cria login sem senha; ' +
          'tenant password cria convite pelo fluxo existente. active:false => deactivated_at. ' +
          'Suporta ?dryRun=true (não grava).',
        parameters: [
          { name: 'dryRun', in: 'query', schema: { type: 'boolean' } },
          {
            name: 'Idempotency-Key',
            in: 'header',
            required: true,
            schema: { type: 'string' },
          },
        ],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: PERSON_UPSERT_SCHEMA } },
        },
        responses: {
          '200': { description: 'Atualizado', content: { 'application/json': { schema: PERSON_RESULT_SCHEMA } } },
          '201': { description: 'Criado/convidado', content: { 'application/json': { schema: PERSON_RESULT_SCHEMA } } },
          '400': { description: 'invalid_body / idempotency_key_required', content: { 'application/json': { schema: ERROR_SCHEMA } } },
          '401': { description: 'unauthorized', content: { 'application/json': { schema: ERROR_SCHEMA } } },
          '403': { description: 'forbidden_scope / forbidden_ip', content: { 'application/json': { schema: ERROR_SCHEMA } } },
          '409': { description: 'email_conflict / cpf_conflict / idempotency_conflict', content: { 'application/json': { schema: ERROR_SCHEMA } } },
        },
      },
      get: {
        summary: 'Lista pessoas provisionadas (com external_id) do tenant.',
        parameters: [
          { name: 'active', in: 'query', schema: { type: 'boolean' } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 50, maximum: 200 } },
          { name: 'offset', in: 'query', schema: { type: 'integer', default: 0 } },
        ],
        responses: { '200': { description: 'Lista paginada' } },
      },
    },
    '/people/{externalId}': {
      get: {
        summary: 'Estado da pessoa (active/inactive).',
        parameters: [{ name: 'externalId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Pessoa' },
          '404': { description: 'not_found', content: { 'application/json': { schema: ERROR_SCHEMA } } },
        },
      },
      patch: {
        summary: 'Liga/desliga pessoa (nunca deleta; flag off => active:false).',
        parameters: [{ name: 'externalId', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { active: { type: 'boolean' } },
                required: ['active'],
              },
            },
          },
        },
        responses: {
          '200': { description: 'Atualizado', content: { 'application/json': { schema: PERSON_RESULT_SCHEMA } } },
          '404': { description: 'not_found', content: { 'application/json': { schema: ERROR_SCHEMA } } },
        },
      },
    },
    '/sso': {
      post: {
        summary: 'Cria link SSO de uso único (token 60s). 404 se pessoa inativa.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { externalId: { type: 'string' } },
                required: ['externalId'],
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Link criado',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    url: { type: 'string' },
                    expiresAt: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
          '404': { description: 'not_found / employee_inactive', content: { 'application/json': { schema: ERROR_SCHEMA } } },
        },
      },
    },
    '/timesheets': {
      get: {
        summary: 'Resumo derivado de timesheets por pessoa e período (read-only).',
        parameters: [
          { name: 'externalId', in: 'query', required: true, schema: { type: 'string' } },
          { name: 'from', in: 'query', required: true, schema: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' } },
          { name: 'to', in: 'query', required: true, schema: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' } },
        ],
        responses: {
          '200': {
            description: 'Resumos',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    timesheets: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          timesheetId: { type: 'string' },
                          externalId: { type: 'string' },
                          periodStart: { type: 'string' },
                          periodEnd: { type: 'string' },
                          status: { type: 'string', enum: ['rascunho', 'enviado', 'aprovado', 'recusado', 'bloqueado'] },
                          workedDays: { type: 'integer' },
                          workedMinutes: { type: 'integer' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          '404': { description: 'not_found', content: { 'application/json': { schema: ERROR_SCHEMA } } },
        },
      },
    },
    '/punches': {
      post: {
        summary: 'Registra entrada ou saída. externalId = id do colaborador no sistema de origem.',
        parameters: [{ name: 'Idempotency-Key', in: 'header', required: true, schema: { type: 'string' } }],
        responses: {
          '201': { description: 'Batida gravada' },
          '404': { description: 'not_found' },
          '409': { description: 'employee_inactive, no_open_punch ou period_locked' },
        },
      },
    },
    '/punches/today': {
      get: {
        summary: 'Última batida do dia civil America/Sao_Paulo.',
        parameters: [{ name: 'externalId', in: 'query', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Estado do dia' }, '404': { description: 'not_found' } },
      },
    },
    '/webhook-endpoints': {
      post: {
        summary: 'Cria endpoint de webhook. O secret HMAC é retornado UMA única vez.',
        description:
          `Tipos de evento: ${EVENT_TYPES.join(', ')}. Entrega at-least-once com ` +
          'X-PontoFlow-Signature: t=<unix>,v1=<hmac_sha256(t.body)>; consumidor faz dedup por id.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  url: { type: 'string', format: 'uri' },
                  eventTypes: { type: 'array', items: { type: 'string', enum: EVENT_TYPES }, minItems: 1 },
                  enabled: { type: 'boolean' },
                },
                required: ['url', 'eventTypes'],
              },
            },
          },
        },
        responses: { '201': { description: 'Criado (inclui secret)' } },
      },
      get: { summary: 'Lista endpoints do tenant.', responses: { '200': { description: 'Lista' } } },
      delete: {
        summary: 'Remove endpoint por ?id=.',
        parameters: [{ name: 'id', in: 'query', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Removido' },
          '404': { description: 'not_found', content: { 'application/json': { schema: ERROR_SCHEMA } } },
        },
      },
    },
  },
};

/** GET /api/integration/v1/openapi.json — contrato público (sem auth). */
export async function GET() {
  return apiOk(SPEC);
}
