import {getRequestConfig} from 'next-intl/server';



export default getRequestConfig(async ({locale}) => {
  const loaders = {
    'pt-BR': () => import('../../messages/pt-BR/common.json'),
    'en-GB': () => import('../../messages/en-GB/common.json')
  } as const;
  type Locale = keyof typeof loaders;
  const current: Locale = (locale && (locale in loaders) ? (locale as Locale) : 'pt-BR');
  let messages: any = {};
  try {
    messages = (await loaders[current]()).default;
  } catch {
    messages = (await loaders['pt-BR']()).default;
  }
  return {locale: current, messages};
});

