import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, Linking } from 'react-native';
import { supabase } from '../lib/supabase';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';

// Network status hook
function useNetworkStatus() {
  const [isConnected, setIsConnected] = useState<boolean>(true);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsConnected(!!state.isConnected);
    });
    return unsubscribe;
  }, []);

  return isConnected;
}

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [envStatus, setEnvStatus] = useState<{ valid: boolean; message?: string }>({ valid: true });
  const isConnected = useNetworkStatus();
  const router = useRouter();

  // Check environment configuration on mount
  useEffect(() => {
    checkEnvironment();
  }, []);

  const checkEnvironment = async () => {
    try {
      // Try to get session - this will fail if Supabase config is invalid
      const { error: envError } = await supabase.auth.getSession();
      if (envError) {
        setEnvStatus({
          valid: false,
          message: 'Configuracao do servidor nao encontrada. Verifique o arquivo .env.',
        });
      }
    } catch (err: any) {
      setEnvStatus({
        valid: false,
        message: 'Erro de configuracao: ' + (err.message || 'Configuracao invalida'),
      });
    }
  };

  async function signInWithEmail() {
    setError(null);

    // Validate inputs
    if (!email.trim()) {
      Alert.alert('Campo obrigatorio', 'Por favor, insira seu email.');
      return;
    }

    if (!password.trim()) {
      Alert.alert('Campo obrigatorio', 'Por favor, insira sua senha.');
      return;
    }

    // Check network connectivity
    if (!isConnected) {
      Alert.alert(
        'Sem conexao',
        'Verifique sua conexao com a internet e tente novamente.',
        [
          { text: 'Abrir configuracoes', onPress: () => Linking.openSettings() },
          { text: 'Cancelar', style: 'cancel' },
        ]
      );
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      if (error) {
        // Provide more user-friendly error messages
        let userMessage = 'Erro ao fazer login.';
        
        if (error.message.includes('Invalid login credentials')) {
          userMessage = 'Email ou senha incorretos.';
        } else if (error.message.includes('Email not confirmed')) {
          userMessage = 'Seu email ainda nao foi confirmado. Verifique sua caixa de entrada.';
        } else if (error.message.includes('rate limit')) {
          userMessage = 'Muitas tentativas. Aguarde alguns minutos e tente novamente.';
        } else if (error.message.includes('Network')) {
          userMessage = 'Erro de conexao com o servidor. Verifique sua internet.';
        } else {
          userMessage = error.message || userMessage;
        }
        
        setError(userMessage);
        Alert.alert('Erro no Login', userMessage);
      } else if (data.session) {
        // Login successful - the auth listener in _layout.tsx will handle navigation
        console.log('[Login] Autenticacao bem-sucedida para:', data.session.user.email);
      }
    } catch (err: any) {
      console.error('[Login] Erro inesperado:', err);
      setError('Erro inesperado. Tente novamente.');
      Alert.alert('Erro', 'Ocorreu um erro inesperado. Verifique sua conexao e tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  function handleForgotPassword() {
    Linking.openURL('https://your-app-url.com/reset-password');
  }

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Feather name="clock" size={60} color="#3B82F6" />
          </View>
          <Text style={styles.title}>PontoFlow</Text>
          <Text style={styles.subtitle}>Portal do Colaborador</Text>
        </View>

        {/* Environment status warning */}
        {!envStatus.valid && (
          <View style={styles.envWarning}>
            <Feather name="alert-triangle" size={16} color="#F59E0B" />
            <Text style={styles.envWarningText}>{envStatus.message}</Text>
          </View>
        )}

        {/* Network status indicator */}
        {!isConnected && (
          <View style={styles.networkWarning}>
            <Feather name="wifi-off" size={16} color="#EF4444" />
            <Text style={styles.networkWarningText}>Sem conexao com a internet</Text>
          </View>
        )}

        <View style={styles.form}>
          {error && (
            <View style={styles.errorContainer}>
              <Feather name="alert-circle" size={16} color="#EF4444" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <View style={styles.inputContainer}>
            <Feather name="mail" size={20} color="#94A3B8" style={styles.icon} />
            <TextInput
              style={styles.input}
              placeholder="Seu email"
              placeholderTextColor="#94A3B8"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              editable={!loading}
            />
          </View>

          <View style={styles.inputContainer}>
            <Feather name="lock" size={20} color="#94A3B8" style={styles.icon} />
            <TextInput
              style={styles.input}
              placeholder="Sua senha"
              placeholderTextColor="#94A3B8"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="password"
              editable={!loading}
            />
          </View>

          <TouchableOpacity 
            style={[styles.button, loading && styles.buttonDisabled]} 
            onPress={signInWithEmail} 
            disabled={loading || !isConnected}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>Entrar no Ponto</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.forgotPassword} 
            onPress={handleForgotPassword}
            disabled={loading}
          >
            <Text style={styles.forgotPasswordText}>Esqueceu sua senha?</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Versao 1.0.0</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A', // Slate 900
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#1E293B', // Slate 800
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#3B82F6', // Blue 500
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 16,
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 16,
    color: '#94A3B8', // Slate 400
    marginTop: 8,
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B', // Slate 800
    borderRadius: 12,
    marginBottom: 16,
    paddingHorizontal: 16,
    height: 56,
    borderWidth: 1,
    borderColor: '#334155',
  },
  icon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
  },
  button: {
    backgroundColor: '#3B82F6', // Blue 500
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    backgroundColor: '#64748B', // Slate 500
    opacity: 0.7,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  forgotPassword: {
    marginTop: 16,
    alignItems: 'center',
  },
  forgotPasswordText: {
    color: '#3B82F6',
    fontSize: 14,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2', // Red 50
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FECACA', // Red 200
  },
  errorText: {
    color: '#DC2626', // Red 600
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  envWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB', // Amber 50
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FDE68A', // Amber 200
  },
  envWarningText: {
    color: '#92400E', // Amber 800
    fontSize: 13,
    marginLeft: 8,
    flex: 1,
  },
  networkWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2', // Red 50
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FECACA', // Red 200,
  },
  networkWarningText: {
    color: '#DC2626', // Red 600
    fontSize: 13,
    marginLeft: 8,
    flex: 1,
  },
  footer: {
    marginTop: 48,
    alignItems: 'center',
  },
  footerText: {
    color: '#475569', // Slate 600
    fontSize: 12,
  },
});
