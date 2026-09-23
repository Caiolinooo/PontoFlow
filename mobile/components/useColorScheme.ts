import { useColorScheme as useColorSchemeCore } from 'react-native';

/**
 * Normalized color scheme hook: always returns 'light' or 'dark'.
 * Maps null/undefined/unspecified schemes to 'light' so consumers can
 * index theme maps safely.
 */
export const useColorScheme = (): 'light' | 'dark' => {
  const coreScheme = useColorSchemeCore();
  return coreScheme === 'dark' ? 'dark' : 'light';
};
