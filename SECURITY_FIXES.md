# GUIA DE CORREÇÕES - Vulnerabilidades de Segurança

## FIX #1: Adicionar Autenticação em /api/cron/deadline-reminders

### Antes:
```typescript
export async function POST() {
  let supabase;
  try {
    supabase = getServiceSupabase();
  } catch {
    return NextResponse.json({ok: false, error: 'service_key_missing'}, {status: 500});
  }
  // ... resto do código
}
```

### Depois:
```typescript
export async function POST(req: NextRequest) {
  try {
    // Verify cron secret (como em lock-periods)
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (!cronSecret) {
      console.error('CRON_SECRET not configured');
      return NextResponse.json({ error: 'Cron not configured' }, { status: 500 });
    }

    const providedSecret = authHeader?.replace('Bearer ', '') || req.nextUrl.searchParams.get('secret');
    
    if (providedSecret !== cronSecret) {
      console.error('Invalid cron secret');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let supabase;
    try {
      supabase = getServiceSupabase();
    } catch {
      return NextResponse.json({ok: false, error: 'service_key_missing'}, {status: 500});
    }
    // ... resto do código
  } catch (error) {
    console.error('Cron job error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

---

## FIX #2: Remover Senha do Response

### Antes:
```typescript
return NextResponse.json({ 
  success: true,
  message: 'Password reset successfully',
  temporaryPassword // CRÍTICO!
});
```

### Depois:
```typescript
// Gerar e enviar password via email
const temporaryPassword = generateTemporaryPassword();
const password_hash = await bcrypt.hash(temporaryPassword, 10);

// ... database update ...

// Enviar email em background
sendPasswordResetEmail({
  email: targetUser.email,
  password: temporaryPassword,
  userName: targetUser.first_name
}).catch(err => {
  console.error('Failed to send password reset email:', err);
  // Não falha a requisição se email falhar
});

// Retornar sucesso SEM a senha
return NextResponse.json({ 
  success: true,
  message: 'Password reset. User will receive email with temporary password'
});
```

---

## FIX #3: Proteger /api/admin/config/env

### Antes:
```typescript
export async function PUT(req: NextRequest) {
  await requireApiRole(['ADMIN']);
  
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'config_write_disabled' }, { status: 405 });
  }

  const body = await req.json();
  const envPath = path.join(process.cwd(), '.env.local');
  let content = '';
  
  try { 
    content = fs.readFileSync(envPath, 'utf8'); 
  } catch { 
    content = '# Environment Variables\n'; 
  }

  // Update ALL keys - PERIGO!
  for (const [key, value] of Object.entries(body)) {
    if (typeof value === 'string' && value.trim()) {
      content = upsertEnv(content, key, value);
    }
  }

  fs.writeFileSync(envPath, content, 'utf8');
  // ...
}
```

### Depois:
```typescript
// Whitelist de variáveis permitidas
const ALLOWED_ENV_KEYS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'NEXT_PUBLIC_BASE_URL',
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'MAIL_FROM',
  // ... outras chaves seguras
];

// Validadores por tipo
const ENV_VALIDATORS: Record<string, (val: string) => boolean> = {
  'NEXT_PUBLIC_SUPABASE_URL': (v) => /^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(v),
  'SMTP_PORT': (v) => /^\d{2,5}$/.test(v) && parseInt(v) > 0 && parseInt(v) < 65536,
  'MAIL_FROM': (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
  // ... outros validadores
};

export async function PUT(req: NextRequest) {
  const user = await requireApiRole(['ADMIN']);
  
  // Desabilitar completamente em production
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ 
      error: 'config_write_disabled_in_production',
      message: 'Configure environment variables in your deployment platform'
    }, { status: 405 });
  }

  const body = await req.json();

  // Validar cada chave
  const updates: Record<string, string> = {};
  for (const [key, value] of Object.entries(body)) {
    // Whitelist check
    if (!ALLOWED_ENV_KEYS.includes(key)) {
      return NextResponse.json({ 
        error: 'invalid_key',
        message: `Key "${key}" not allowed`
      }, { status: 400 });
    }

    // Type validation
    if (typeof value !== 'string') {
      return NextResponse.json({ 
        error: 'invalid_value_type',
        message: `Value for "${key}" must be string`
      }, { status: 400 });
    }

    // Format validation
    const validator = ENV_VALIDATORS[key];
    if (validator && !validator(value)) {
      return NextResponse.json({ 
        error: 'invalid_value_format',
        message: `Value for "${key}" has invalid format`
      }, { status: 400 });
    }

    updates[key] = value;
  }

  // Auditoria ANTES de fazer mudanças
  const envPath = path.join(process.cwd(), '.env.local');
  const oldContent = fs.readFileSync(envPath, 'utf8');

  try {
    let content = oldContent;
    for (const [key, value] of Object.entries(updates)) {
      content = upsertEnv(content, key, value);
    }

    fs.writeFileSync(envPath, content, 'utf8');

    // Log audit
    await logAudit({
      userId: user.id,
      action: 'env_config_updated',
      resourceType: 'config',
      resourceId: 'env_local',
      oldValues: { keys: Object.keys(updates) },
      newValues: { keys: Object.keys(updates) },
      tenantId: user.tenant_id
    });

    return NextResponse.json({ 
      ok: true,
      message: 'Configuration updated. Restart server to apply changes.',
      updated: Object.keys(updates).length
    });
  } catch (error) {
    console.error('Config write error:', error);
    return NextResponse.json({ 
      error: 'write_failed',
      message: 'Failed to write configuration'
    }, { status: 500 });
  }
}
```

---

## FIX #4: Implementar Rate Limiting

### Criar arquivo `/web/src/lib/rate-limit.ts`:
```typescript
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Initialize Upstash Redis
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
});

// Rate limiters
export const loginLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '5 m'), // 5 requests per 5 minutes
  analytics: true,
  prefix: 'ratelimit:login',
});

export const signupLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(3, '1 h'), // 3 signups per hour per IP
  analytics: true,
  prefix: 'ratelimit:signup',
});

export const passwordResetLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(3, '24 h'), // 3 resets per email per day
  analytics: true,
  prefix: 'ratelimit:password_reset',
});

// Helper function
export async function checkRateLimit(
  limiter: Ratelimit,
  key: string
): Promise<{ success: boolean; remaining: number; resetIn: number }> {
  try {
    const result = await limiter.limit(key);
    return {
      success: result.success,
      remaining: result.remaining,
      resetIn: result.resetAfter,
    };
  } catch (error) {
    console.error('Rate limit check error:', error);
    // Fail open - allow request if Redis is down
    return { success: true, remaining: 999, resetIn: 0 };
  }
}
```

### Usar em /api/auth/signin:
```typescript
import { loginLimiter, checkRateLimit } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  const { email, password } = await request.json();

  // Rate limit by email
  const rateLimit = await checkRateLimit(loginLimiter, `signin:${email}`);
  if (!rateLimit.success) {
    return NextResponse.json(
      { 
        error: 'too_many_requests',
        retryAfter: Math.ceil(rateLimit.resetIn / 1000)
      },
      { status: 429 }
    );
  }

  // ... resto do código
}
```

---

## FIX #5: Sanitizar Logs

### Criar `/web/src/lib/logger.ts`:
```typescript
export function redactEmail(email?: string): string {
  if (!email) return 'unknown';
  const [local, domain] = email.split('@');
  if (local.length <= 2) return `***@${domain}`;
  return `${local.substring(0, 2)}****@${domain}`;
}

export function redactToken(token?: string): string {
  if (!token || token.length < 20) return 'REDACTED';
  return `${token.substring(0, 10)}...${token.substring(token.length - 5)}`;
}

export function logAuth(level: 'info' | 'error', message: string, data?: any) {
  const redacted = {
    ...data,
    email: data?.email ? redactEmail(data.email) : undefined,
    token: data?.token ? redactToken(data.token) : undefined,
    password: 'REDACTED',
  };
  
  console[level](`[AUTH] ${message}`, redacted);
}
```

### Usar em /api/auth/signin:
```typescript
import { logAuth } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    logAuth('info', 'Login attempt', { email });

    const result = await signInWithCredentials(email, password);

    if ('error' in result) {
      logAuth('info', 'Login failed', { email, error: result.error });
      return NextResponse.json({ error: result.error }, { status: 401 });
    }

    logAuth('info', 'Login successful', { email, userId: result.user.id });
    // ... resto do código
  } catch (error) {
    console.error('Sign in error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

---

## FIX #6: Input Validation com Zod

### /api/admin/users route.ts:
```typescript
import { z } from 'zod';

// Search filter schema
const SearchSchema = z.object({
  q: z.string()
    .max(100)
    .regex(/^[a-zA-Z0-9\s\.\-@]*$/, 'Invalid characters in search'),
  limit: z.coerce
    .number()
    .min(1)
    .max(100)
    .default(50),
  offset: z.coerce
    .number()
    .min(0)
    .default(0),
});

export async function GET(request: NextRequest) {
  const adminUser = await requireApiRole(['ADMIN']);

  const { searchParams } = new URL(request.url);
  
  const searchInput = {
    q: searchParams.get('q') || '',
    limit: searchParams.get('limit') || '50',
    offset: searchParams.get('offset') || '0',
  };

  const parsed = SearchSchema.safeParse(searchInput);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_query', issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const { q, limit, offset } = parsed.data;

  const supabase = getServiceSupabase();
  
  let query = supabase
    .from('users_unified')
    .select('id, email, first_name, last_name, name, role, active, created_at')
    .range(offset, offset + limit - 1)
    .order('created_at', { ascending: false });

  if (q) {
    // Use parameterized search with safe operators
    query = query.ilike('email', `%${q}%`)
      .or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%`);
  }

  const { data: users, error } = await query;

  if (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { error: 'database_error' },
      { status: 500 }
    );
  }

  return NextResponse.json({ users: users ?? [] });
}
```

---

## FIX #7: Adicionar Idempotency Keys

### Criar middleware `/web/src/lib/idempotency.ts`:
```typescript
import { createClient } from '@supabase/supabase-js';

interface IdempotencyRecord {
  key: string;
  response: string;
  status: number;
  createdAt: Date;
}

// In-memory cache (usar Redis em production)
const idempotencyCache = new Map<string, IdempotencyRecord>();

export async function checkIdempotency(
  key: string,
  expirySeconds = 3600
): Promise<IdempotencyRecord | null> {
  const cached = idempotencyCache.get(key);
  if (!cached) return null;

  const age = Date.now() - cached.createdAt.getTime();
  if (age > expirySeconds * 1000) {
    idempotencyCache.delete(key);
    return null;
  }

  return cached;
}

export function storeIdempotency(
  key: string,
  response: any,
  status: number
) {
  idempotencyCache.set(key, {
    key,
    response: JSON.stringify(response),
    status,
    createdAt: new Date(),
  });
}
```

### Usar em approve endpoint:
```typescript
import { checkIdempotency, storeIdempotency } from '@/lib/idempotency';

export async function POST(req: NextRequest, context: {params: Promise<{id: string}>}) {
  try {
    const user = await requireApiRole(['ADMIN', 'MANAGER', 'MANAGER_TIMESHEET']);
    const {id} = await context.params;

    // Check idempotency
    const idempotencyKey = req.headers.get('idempotency-key');
    if (idempotencyKey) {
      const cached = await checkIdempotency(idempotencyKey);
      if (cached) {
        return NextResponse.json(
          JSON.parse(cached.response),
          { status: cached.status }
        );
      }
    }

    // ... main logic ...

    const response = { ok: true, id };
    
    // Store for idempotency
    if (idempotencyKey) {
      storeIdempotency(idempotencyKey, response, 200);
    }

    return NextResponse.json(response);
  } catch (error) {
    // ...
  }
}
```

