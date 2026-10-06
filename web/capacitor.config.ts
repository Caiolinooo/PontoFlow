import type { CapacitorConfig } from '@capacitor/cli';

/**
 * appId configurável por white-label: defina CAPACITOR_APP_ID antes de
 * `npx cap sync`. O valor é replicado para android/ios no sync
 * (android/capacitor.config.json é gerado — não edite manualmente).
 * iOS usa o scheme derivado do appId.
 */
const appId = process.env.CAPACITOR_APP_ID ?? 'com.pontoflow.app';
const scheme = appId.split('.').pop() ?? 'pontoflow';

const config: CapacitorConfig = {
  appId,
  appName: process.env.CAPACITOR_APP_NAME ?? 'PontoFlow',
  webDir: 'out',
  server: {
    // Em desenvolvimento, apontar para o servidor Next.js local
    // url: 'http://192.168.1.100:3000',
    // cleartext: true,
    androidScheme: 'https',
  },
  ios: {
    scheme,
    contentInset: 'always',
  },
  android: {
    allowMixedContent: false,
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
