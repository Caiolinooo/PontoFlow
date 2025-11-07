import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  // Disable Turbopack completely to avoid build issues
  reactStrictMode: true,
  swcMinify: true,
  output: 'standalone',
  // Fix for Windows ESM URL scheme error with next/font
  webpack: (config, { isServer }) => {
    // Ensure proper path resolution for Windows absolute paths
    // This fixes the ERR_UNSUPPORTED_ESM_URL_SCHEME error
    config.resolve = {
      ...config.resolve,
      extensionAlias: {
        '.js': ['.js', '.ts', '.tsx'],
        '.mjs': ['.mjs', '.ts', '.tsx'],
      },
    };

    // Fix for Windows path handling in ESM modules
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
      };
    }

    // Ensure next-intl chunks are properly handled in standalone mode
    if (isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          ...config.optimization?.splitChunks,
          chunks: 'all',
          cacheGroups: {
            ...config.optimization?.splitChunks?.cacheGroups,
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              chunks: 'all',
            },
            nextIntl: {
              test: /[\\/]node_modules[\\/](next-intl|use-intl)[\\/]/,
              name: 'next-intl',
              chunks: 'all',
            },
          },
        },
      };
    }

    return config;
  },
  // Include PDFKit fonts and next-intl in standalone build
  ...(process.env.NODE_ENV === 'production' && {
    experimental: {
      outputFileTracingIncludes: {
        '*': [
          'node_modules/pdfkit/js/data/**/*',
          'node_modules/pdfkit/js/vendor/**/*',
          'node_modules/next-intl/dist/**/*',
          'node_modules/use-intl/**/*',
          'messages/**/*'
        ],
      },
    },
  }),
};

export default withNextIntl(nextConfig);