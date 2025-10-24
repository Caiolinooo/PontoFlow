export const branding = {
  // Human brand name
  companyName: process.env.NEXT_PUBLIC_COMPANY_NAME || 'PontoFlow',
  // Site title shown in browser tab (fallback to i18n app.title when available)
  siteTitle: process.env.NEXT_PUBLIC_SITE_TITLE || 'PontoFlow',
  // Primary logo (PNG). Using the Employee Hub logo by default
  logoUrl: process.env.NEXT_PUBLIC_LOGO_URL || '/brand/logo.svg',
  // Optional background image for auth pages
  loginBackgroundUrl: process.env.NEXT_PUBLIC_LOGIN_BG || undefined,
};

export type Branding = typeof branding;

