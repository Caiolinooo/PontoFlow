import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  // Non-visual build/runtime configuration only
  turbopack: {
    // Ensure Turbopack uses this web/ directory as the root (multiple lockfiles in monorepo)
    root: __dirname
  },
  eslint: {
    // Do not fail production builds on ESLint errors; keep warnings in output
    ignoreDuringBuilds: true
  },
  typescript: {
    // Ignore TypeScript errors during build (for production deployment)
    ignoreBuildErrors: false
  }
};

export default withNextIntl(nextConfig);
