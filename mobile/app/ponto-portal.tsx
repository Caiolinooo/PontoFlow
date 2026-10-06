import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { WebView } from 'react-native-webview';
import type { WebViewNavigation } from 'react-native-webview';
import CookieManager from '@react-native-cookies/cookies';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import {
  TS_SESSION_COOKIE,
  PortalUnauthorizedError,
  clearPortalSession,
  getPortalToken,
  getStoredTimesheetSession,
  originOf,
  requestSsoUrl,
  saveTimesheetSession,
} from '../lib/portal-auth';

/**
 * Tela de ponto via Portal ABZ (SSO de uso único).
 *
 * - Com `?url=` (logo após o login): abre o link SSO, que consome o token e
 *   seta o cookie httpOnly `timesheet_session` no WebView.
 * - Sem `?url=` (reabertura): pede um novo link SSO com o token do portal
 *   persistido; se o portal estiver fora, cai para o cookie de sessão do TS
 *   persistido (restore via CookieManager nativo).
 * - A cada navegação no host do TS, captura/persiste o cookie de sessão para
 *   chamadas subsequentes.
 */
export default function PontoPortalScreen() {
  const params = useLocalSearchParams<{ url?: string }>();
  const initialUrl = typeof params.url === 'string' ? params.url : null;
  const router = useRouter();

  const [target, setTarget] = useState<string | null>(initialUrl);
  const [error, setError] = useState<string | null>(null);
  const lastCaptureRef = useRef(0);

  const handleExpired = useCallback(async () => {
    await clearPortalSession();
    Alert.alert('Sessão expirada', 'Entre novamente com sua conta do portal.');
    router.replace('/login');
  }, [router]);

  useEffect(() => {
    if (initialUrl) return;

    let cancelled = false;
    (async () => {
      const token = await getPortalToken();
      if (!token) {
        if (!cancelled) router.replace('/login');
        return;
      }
      try {
        const url = await requestSsoUrl(token);
        if (!cancelled) setTarget(url);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof PortalUnauthorizedError) {
          handleExpired();
          return;
        }
        // Portal/TS indisponível: tenta a sessão TS persistida (cookie).
        const stored = await getStoredTimesheetSession();
        if (stored) {
          await CookieManager.set(stored.origin, {
            name: TS_SESSION_COOKIE,
            value: stored.cookieValue,
            path: '/',
          });
          setTarget(stored.origin);
        } else {
          setError(err instanceof Error ? err.message : 'Não foi possível abrir o Time Sheet.');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [initialUrl, router, handleExpired]);

  // Captura o cookie de sessão do TS após cada navegação (throttle 3s).
  const handleNavigationChange = useCallback((nav: WebViewNavigation) => {
    const origin = originOf(nav.url);
    if (!origin) return;
    const now = Date.now();
    if (now - lastCaptureRef.current < 3000) return;
    lastCaptureRef.current = now;

    CookieManager.get(origin, true)
      .then((cookies) => {
        const sessionCookie = cookies?.[TS_SESSION_COOKIE];
        if (sessionCookie?.value) {
          saveTimesheetSession(origin, sessionCookie.value);
        }
      })
      .catch(() => {
        // CookieManager indisponível (ex.: web): sessão vale só neste WebView.
      });
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace('/')} style={styles.backButton}>
          <Feather name="arrow-left" size={22} color="#E2E8F0" />
        </TouchableOpacity>
        <Text style={styles.title}>Time Sheet</Text>
        <View style={styles.backButton} />
      </View>

      {error ? (
        <View style={styles.center}>
          <Feather name="wifi-off" size={40} color="#64748B" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => {
              setError(null);
              setTarget(null);
              router.setParams({ url: undefined });
              // força novo bootstrap recriando a tela
              router.replace('/ponto-portal');
            }}
          >
            <Text style={styles.retryText}>Tentar novamente</Text>
          </TouchableOpacity>
        </View>
      ) : target ? (
        <WebView
          source={{ uri: target }}
          style={styles.webview}
          javaScriptEnabled
          domStorageEnabled
          sharedCookiesEnabled
          thirdPartyCookiesEnabled
          startInLoadingState
          onNavigationStateChange={handleNavigationChange}
          renderLoading={() => (
            <View style={styles.center}>
              <ActivityIndicator size="large" color="#3B82F6" />
            </View>
          )}
        />
      ) : (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Abrindo Time Sheet…</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 48,
    paddingBottom: 12,
    paddingHorizontal: 12,
    backgroundColor: '#1E293B',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  backButton: { width: 36, alignItems: 'center' },
  title: { color: '#E2E8F0', fontSize: 16, fontWeight: '600' },
  webview: { flex: 1, backgroundColor: '#0F172A' },
  center: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F172A',
    padding: 24,
  },
  loadingText: { color: '#94A3B8', marginTop: 12 },
  errorText: { color: '#CBD5E1', marginTop: 16, textAlign: 'center' },
  retryButton: {
    marginTop: 20,
    backgroundColor: '#3B82F6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: { color: '#FFFFFF', fontWeight: '600' },
});
