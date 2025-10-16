import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';

const HUB_PATH = process.env.HUB_PATH || 'D:/Projeto/Finalizados/Painel ABZ-BR-INT/painel-abz';
const OUT_ENV = path.resolve('.env.local');

function tryReadEnvFiles(dir) {
  const candidates = ['.env.local', '.env', '.env.production'];
  for (const f of candidates) {
    const p = path.join(dir, f);
    if (fs.existsSync(p)) {
      const txt = fs.readFileSync(p, 'utf8');
      const lines = txt.split(/\r?\n/).filter(l => /^(NEXT_PUBLIC_SUPABASE_URL|NEXT_PUBLIC_SUPABASE_ANON_KEY|SUPABASE_SERVICE_ROLE_KEY|SMTP_|MAIL_FROM)\s*=/.test(l));
      if (lines.length) return lines;
    }
  }
  return null;
}

function fetchRaw(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      if (res.statusCode !== 200) { resolve(null); return; }
      let data='';
      res.on('data', d => data += d);
      res.on('end', () => resolve(data));
    }).on('error', () => resolve(null));
  });
}

async function tryGithub() {
  const paths = ['.env.local', '.env', '.env.example'];
  for (const p of paths) {
    const raw = await fetchRaw(`https://raw.githubusercontent.com/Caiolinooo/painelabz/main/${p}`)
             || await fetchRaw(`https://raw.githubusercontent.com/Caiolinooo/painelabz/master/${p}`);
    if (!raw) continue;
    const lines = raw.split(/\r?\n/).filter(l => /^(NEXT_PUBLIC_SUPABASE_URL|NEXT_PUBLIC_SUPABASE_ANON_KEY|SUPABASE_SERVICE_ROLE_KEY|SMTP_|MAIL_FROM)\s*=/.test(l));
    if (lines.length) return lines;
  }
  return null;
}

(async () => {
  try {
    let lines = tryReadEnvFiles(HUB_PATH);
    if (!lines) lines = await tryGithub();

    if (!lines) {
      console.log('NO_KEYS_FOUND');
      process.exit(0);
    }

    const existing = fs.existsSync(OUT_ENV) ? fs.readFileSync(OUT_ENV, 'utf8') : '';
    const merged = new Map();
    for (const l of existing.split(/\r?\n/)) {
      if (!l) continue; const [k] = l.split('='); merged.set(k, l);
    }
    for (const l of lines) { const [k] = l.split('='); merged.set(k, l); }
    const out = Array.from(merged.values()).join('\n') + '\n';
    fs.writeFileSync(OUT_ENV, out, 'utf8');
    console.log('SUPABASE_KEYS_WRITTEN');
  } catch (e) {
    console.log('ERROR');
  }
})();

