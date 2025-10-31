# Configuração de E-mail

- Modo inicial: Gmail via Nodemailer (gratuito). Use senha de App do Gmail.
- Onde obter credenciais:
  1) Projeto Employee Hub: arquivo .env local (SMTP_* ou equivalentes)
  2) Supabase do painelabz: ver tabela/secretos onde você armazena SMTP (se aplicável)
- Variáveis esperadas (ver .env.example):

```env
# SMTP padrão
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seu_email@gmail.com
SMTP_PASS=senha_de_app
MAIL_FROM="ABZ Timesheet <seu_email@gmail.com>"

# Alternativo (fallback): se usar GMAIL_* em ambientes (ex.: Netlify)
GMAIL_USER=seu_email@gmail.com
GMAIL_PASSWORD=senha_de_app

# Alternativo (fallback): se usar EMAIL_* (padrão de alguns projetos)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=seu_email@gmail.com
EMAIL_PASSWORD=senha_de_app
EMAIL_FROM=seu_email@gmail.com
```

Notas:

- O código tenta `SMTP_*` e, na ausência, usa `GMAIL_USER`/`GMAIL_PASSWORD`.
- Se as credenciais estiverem criptografadas no Hub, informe o método de decriptação (ex.: JWT/AES) para automatizarmos.
- Em Netlify, verifique as Environment Variables do site (Production/Deploy Previews) para os nomes acima.

Recomendação futura: Resend/SendGrid para melhor entregabilidade e métricas.
