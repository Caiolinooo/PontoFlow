export const locales = ['pt-BR', 'en-GB'] as const;
export type AppLocale = typeof locales[number];
export const defaultLocale: AppLocale = 'pt-BR';

