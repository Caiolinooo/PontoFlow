import { NextRequest, NextResponse } from 'next/server';
import { requireApiRole } from '@/lib/auth/server';
import { getServerSupabase } from '@/lib/supabase/server';

function defaultTemplate() {
  return `
  <html>
    <head>
      <meta charset="utf-8" />
      <style>
        body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Helvetica, Arial, \"Apple Color Emoji\", \"Segoe UI Emoji\"; color: #111; }
        .container { max-width: 800px; margin: 24px auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 8px; position: relative; }
        .watermark { position: absolute; top: 40%; left: 50%; transform: translate(-50%, -50%) rotate(-20deg); font-size: 64px; color: rgba(0,0,0,0.06); white-space: nowrap; pointer-events: none; }
        h1 { font-size: 20px; margin: 0 0 8px; }
        h2 { font-size: 16px; margin: 16px 0 8px; }
        p, li { font-size: 14px; line-height: 1.5; }
        table { width: 100%; border-collapse: collapse; margin: 8px 0 16px; }
        th, td { border: 1px solid #e5e7eb; padding: 8px; text-align: left; font-size: 13px; }
        .muted { color: #6b7280; font-size: 12px; }
        .footer { margin-top: 24px; font-size: 12px; color: #374151; }
        .meta { font-size: 12px; color: #374151; }
        .header { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; }
        .logo { height: 40px; }
      </style>
    </head>
    <body>
      <div class="container">
        {{#if watermark_text}}<div class="watermark">{{watermark_text}}</div>{{/if}}
        <div class="header">
          {{#if logo_url}}<img class="logo" src="{{logo_url}}" alt="logo" />{{/if}}
          <div>
            <h1>Termo de Justificativa e Responsabilidade por Ajuste de Registro de Ponto</h1>
            <div class="muted">{{company_legal_name}} ({{company_document}}){{#if address_line1}}, {{address_line1}}{{/if}}{{#if city}}, {{city}}/{{state}}{{/if}}</div>
          </div>
        </div>

        <p>
          Pelo presente termo, {{manager_name}} ({{manager_identifier}}), na qualidade de gestor responsável, declara, para os devidos fins, que os ajustes abaixo descritos foram efetuados no registro de jornada de {{employee_name}} ({{employee_identifier}}), referente ao período {{period}}.
        </p>

        <h2>Ajustes realizados</h2>
        {{adjustments_table}}

        <h2>Justificativa</h2>
        <p>{{justification}}</p>

        <h2>Base legal e conformidade</h2>
        <ul>
          <li>O ajuste foi realizado em caráter excepcional, com a finalidade de correção de inconsistências e preservação da fidedignidade do registro de jornada, em conformidade com o art. 74 da CLT e com a Portaria MTP nº 671/2021.</li>
          <li>Os dados pessoais aqui tratados observam os princípios e regras da Lei Geral de Proteção de Dados Pessoais (Lei nº 13.709/2018 - LGPD), sendo utilizados exclusivamente para a finalidade de gestão de ponto e cumprimento de obrigações legais e regulatórias.</li>
          <li>Todos os eventos e alterações são registrados em trilha de auditoria com identificação do responsável, data, hora, endereço IP e agente de usuário, permanecendo acessíveis para verificação pelas partes interessadas e autoridades competentes.</li>
          <li>Os ajustes efetuados não implicam supressão indevida de horas extras, intervalos ou adicionais eventualmente devidos, que permanecerão sujeitos à apuração e pagamento conforme legislação aplicável e normas internas.</li>
        </ul>

        <h2>Ciência</h2>
        <p>
          O empregado será cientificado por meio dos canais internos da empresa, com possibilidade de manifestação eletrônica de ciência quanto aos ajustes ora realizados.
        </p>

        <div class="meta">
          Emitido por: {{company_name}} | Responsável: {{manager_name}} | Data: {{issued_at}}
          {{#if ip_address}}<br/>IP: {{ip_address}} | User-Agent: {{user_agent}}{{/if}}
        </div>

        <div class="footer">
          Este documento pode conter marca d'água e elementos gráficos adicionais definidos nas configurações da empresa. Para dúvidas, contate: {{email}} | {{website}}
        </div>
      </div>
    </body>
  </html>`;
}

function renderTemplate(tpl: string, vars: Record<string, any>) {
  // very small mustache-like replacement
  return tpl.replace(/\{\{(#if\s+([^}]+))\}\}([\s\S]*?)\{\{\/if\}\}/g, (_m, _g1, key, inner) => {
    const v = vars[key.trim()];
    return v ? inner : '';
  }).replace(/\{\{([^}]+)\}\}/g, (_m, key) => {
    const k = key.trim();
    return (vars[k] ?? '').toString();
  });
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ auditId: string }> }) {
  try {
    const user = await requireApiRole(['ADMIN']);
    const { auditId } = await ctx.params;

    const supabase = await getServerSupabase();
    const { data: audit } = await supabase
      .from('audit_log')
      .select('*')
      .eq('tenant_id', user.tenant_id)
      .eq('id', auditId)
      .single();

    if (!audit) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    const { data: settings } = await supabase
      .from('tenant_settings')
      .select('*')
      .eq('tenant_id', user.tenant_id)
      .maybeSingle();

    const tpl = settings?.legal_declaration_template || defaultTemplate();

    // Build adjustments table (best effort from audit newValues/oldValues)
    const rows: string[] = [];
    const oldV = audit.old_values || {};
    const newV = audit.new_values || {};
    const keys = Array.from(new Set([...Object.keys(oldV), ...Object.keys(newV)]));
    keys.forEach(k => {
      if (k === 'justification') return;
      const oldVal = typeof oldV[k] === 'object' ? JSON.stringify(oldV[k]) : oldV[k];
      const newVal = typeof newV[k] === 'object' ? JSON.stringify(newV[k]) : newV[k];
      if (oldVal !== newVal) rows.push(`<tr><td>${k}</td><td>${oldVal ?? ''}</td><td>${newVal ?? ''}</td></tr>`);
    });

    const adjustmentsTable = rows.length
      ? `<table><thead><tr><th>Campo</th><th>Antes</th><th>Depois</th></tr></thead><tbody>${rows.join('')}</tbody></table>`
      : '<p class="muted">Sem alterações de campos rastreáveis.</p>';

    const html = renderTemplate(tpl, {
      company_name: settings?.company_name || '',
      company_legal_name: settings?.company_legal_name || '',
      company_document: settings?.company_document || '',
      address_line1: settings?.address_line1 || '',
      city: settings?.city || '',
      state: settings?.state || '',
      email: settings?.email || '',
      website: settings?.website || '',
      logo_url: settings?.logo_url || '',
      watermark_text: settings?.watermark_text || '',

      employee_name: audit.subject_name || '',
      employee_identifier: audit.subject_identifier || '',
      manager_name: audit.user_name || '',
      manager_identifier: audit.user_identifier || audit.user_id || '',
      period: audit.period || '',
      justification: newV.justification || '',
      adjustments_table: adjustmentsTable,

      issued_at: new Date().toLocaleString('pt-BR'),
      ip_address: audit.ip_address || '',
      user_agent: audit.user_agent || '',
    });

    const format = (req.nextUrl?.searchParams.get('format') || '').toLowerCase();
    if (format === 'pdf') {
      try {
        const mod: any = await import('puppeteer');
        const puppeteer = mod?.default ?? mod;
        const browser = await puppeteer.launch({ args: ['--no-sandbox','--disable-setuid-sandbox'] });
        try {
          const page = await browser.newPage();
          await page.setContent(html, { waitUntil: 'networkidle0' });
          const pdf = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '12mm', right: '10mm', bottom: '12mm', left: '10mm' } });
          const headers = new Headers();
          headers.set('Content-Type', 'application/pdf');
          headers.set('Content-Disposition', `inline; filename="declaracao-ajuste-${auditId}.pdf"`);
          const ab: ArrayBuffer = (pdf as any).buffer as ArrayBuffer;
          const blob = new Blob([ab], { type: 'application/pdf' });
          return new NextResponse(blob, { status: 200, headers });
        } finally {
          await browser.close();
        }
      } catch {
        return NextResponse.json({ error: 'pdf_not_supported' }, { status: 501 });
      }
    }

    return new NextResponse(html, {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  } catch (e) {
    if (e instanceof Error && (e.message === 'Unauthorized' || e.message === 'Forbidden')) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}

