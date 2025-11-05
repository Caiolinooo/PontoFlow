/**
 * Email Context Utilities
 * Fetches tenant branding and user locale for multi-tenant, multi-language emails
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export type EmailLocale = 'pt-BR' | 'en-GB';

export interface TenantBranding {
  tenantId: string;
  tenantName: string;
  logoUrl?: string;
  bannerUrl?: string;
  watermarkUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  companyNameOverride?: string;
}

export interface EmailContext {
  locale: EmailLocale;
  branding: TenantBranding;
}

/**
 * Get tenant branding information
 */
export async function getTenantBranding(tenantId: string): Promise<TenantBranding> {
  try {
    const { data: tenant, error } = await supabase
      .from('tenants')
      .select('id, name, settings')
      .eq('id', tenantId)
      .single();

    if (error || !tenant) {
      console.warn(`[email-context] Tenant not found: ${tenantId}, using defaults`);
      return {
        tenantId,
        tenantName: 'PontoFlow',
      };
    }

    const branding = tenant.settings?.branding || {};

    return {
      tenantId: tenant.id,
      tenantName: tenant.name,
      logoUrl: branding.logo_url,
      bannerUrl: branding.banner_url,
      watermarkUrl: branding.watermark_url,
      primaryColor: branding.primary_color,
      secondaryColor: branding.secondary_color,
      companyNameOverride: branding.company_name_override,
    };
  } catch (error) {
    console.error('[email-context] Error fetching tenant branding:', error);
    return {
      tenantId,
      tenantName: 'PontoFlow',
    };
  }
}

/**
 * Get user's locale preference from profiles table
 */
export async function getUserLocale(userId: string): Promise<EmailLocale> {
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('locale')
      .eq('user_id', userId)
      .single();

    if (error || !profile) {
      console.warn(`[email-context] Profile not found for user: ${userId}, using default locale`);
      return 'pt-BR';
    }

    // Validate and return locale
    const locale = profile.locale as EmailLocale;
    return locale === 'en-GB' ? 'en-GB' : 'pt-BR';
  } catch (error) {
    console.error('[email-context] Error fetching user locale:', error);
    return 'pt-BR';
  }
}

/**
 * Get user's locale by email (for invitations where user doesn't exist yet)
 */
export async function getUserLocaleByEmail(email: string): Promise<EmailLocale> {
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('locale')
      .eq('email', email.toLowerCase())
      .single();

    if (error || !profile) {
      // User doesn't exist yet, use default
      return 'pt-BR';
    }

    const locale = profile.locale as EmailLocale;
    return locale === 'en-GB' ? 'en-GB' : 'pt-BR';
  } catch (error) {
    console.error('[email-context] Error fetching user locale by email:', error);
    return 'pt-BR';
  }
}

/**
 * Get complete email context (locale + branding) for a user and tenant
 */
export async function getEmailContext(
  userId: string,
  tenantId: string
): Promise<EmailContext> {
  const [locale, branding] = await Promise.all([
    getUserLocale(userId),
    getTenantBranding(tenantId),
  ]);

  return { locale, branding };
}

/**
 * Get complete email context by email (for invitations)
 */
export async function getEmailContextByEmail(
  email: string,
  tenantId: string
): Promise<EmailContext> {
  const [locale, branding] = await Promise.all([
    getUserLocaleByEmail(email),
    getTenantBranding(tenantId),
  ]);

  return { locale, branding };
}

