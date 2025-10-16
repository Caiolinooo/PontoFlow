# Configuração de E-mail

- Modo inicial: Gmail via Nodemailer (gratuito). Use senha de App do Gmail.
- Onde obter credenciais:
  1) Projeto Employee Hub: arquivo .env local (SMTP_* ou equivalentes)
  2) Supabase do painelabz: ver tabela/secretos onde você armazena SMTP (se aplicável)
- Variáveis esperadas (ver .env.example):
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seu_email@gmail.com
SMTP_PASS=senha_de_app
MAIL_FROM="ABZ Timesheet <seu_email@gmail.com>"
```

Recomendação futura: Resend/SendGrid para melhor entregabilidade e métricas.

