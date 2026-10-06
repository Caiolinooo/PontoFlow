import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';
import { supabase } from '../lib/supabase';
import { onPortalUnlockedChange, restorePortalSession } from '../lib/portal-auth';
import '../global.css';

import { useColorScheme } from '@/components/useColorScheme';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: '(tabs)',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();

  const [session, setSession] = useState<any>(null);
  const [portalUnlocked, setPortalUnlocked] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    const unsubscribePortal = onPortalUnlockedChange(setPortalUnlocked);

    Promise.all([
      supabase.auth.getSession().then(({ data: { session } }) => setSession(session)),
      // Cold start: restaura sessão do portal (com unlock biométrico, se ativo)
      restorePortalSession(),
    ]).finally(() => setIsInitialized(true));

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => {
      subscription.unsubscribe();
      unsubscribePortal();
    };
  }, []);

  useEffect(() => {
    if (!isInitialized) return;

    const inLoginScreen = segments[0] === 'login';
    const authed = !!session || portalUnlocked;

    if (!authed && !inLoginScreen) {
      // Block unauthenticated access
      router.replace('/login');
    } else if (authed && inLoginScreen) {
      // Redirect logged-in users away from auth
      router.replace('/');
    }
  }, [session, portalUnlocked, isInitialized, segments]);

  if (!isInitialized) return null;

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false, animation: 'fade' }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
        <Stack.Screen name="ponto-portal" options={{ headerShown: false, animation: 'fade' }} />
      </Stack>
    </ThemeProvider>
  );
}
