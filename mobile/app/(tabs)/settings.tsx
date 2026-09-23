import { Text, View, ScrollView, Image, Pressable, Alert } from 'react-native';
import { useState, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect, router } from 'expo-router';

export default function SettingsScreen() {
  const [session, setSession] = useState<any>(null);
  const [employee, setEmployee] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);

  const loadData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      setSession(session);

      const { data: prof } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle();

      const { data: emp } = await supabase
        .from('employees')
        .select(`*`)
        .eq('profile_id', session.user.id)
        .maybeSingle();

      if (prof) setProfile(prof);
      if (emp) setEmployee(emp);
    } catch (err) {
      console.error(err);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const handleSignOut = async () => {
    Alert.alert(
      "Sair da conta",
      "Deseja realmente sair do aplicativo?",
      [
        { text: "Cancelar", style: "cancel" },
        { 
          text: "Sair", 
          style: "destructive",
          onPress: async () => {
            await supabase.auth.signOut();
            router.replace('/login');
          }
        }
      ]
    );
  };

  const username = employee?.name || profile?.name || session?.user?.email?.split('@')[0] || 'Colaborador';
  const email = session?.user?.email || '';
  const avatarUrl = profile?.avatar_url;

  return (
    <ScrollView className="flex-1 bg-slate-900">
      <View className="items-center pt-10 pb-6 bg-slate-800 rounded-b-3xl border-b border-slate-700 shadow-lg">
        <View className="w-28 h-28 bg-slate-700 rounded-full justify-center items-center border-4 border-slate-600 mb-4 overflow-hidden relative">
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} className="w-full h-full" />
          ) : (
            <Feather name="user" size={40} color="#94A3B8" />
          )}
        </View>
        <Text className="text-2xl font-bold text-white mb-1">{username}</Text>
        <Text className="text-slate-400 text-sm">{email}</Text>
        
        {employee?.position && (
          <View className="bg-blue-500/20 px-3 py-1 rounded-full mt-3">
            <Text className="text-blue-400 text-xs font-bold uppercase">{employee.position}</Text>
          </View>
        )}
      </View>

      <View className="px-5 pt-8 pb-10">
        <Text className="text-slate-500 text-xs font-bold tracking-wider uppercase mb-3 ml-2">Configurações e Conta</Text>
        
        <View className="bg-slate-800 rounded-2xl border border-slate-700/50 overflow-hidden">
          
          <Pressable className="flex-row items-center p-4 border-b border-slate-700/50">
            <View className="w-10 h-10 bg-slate-700 rounded-full justify-center items-center mr-4">
              <Feather name="shield" size={18} color="#E2E8F0" />
            </View>
            <View className="flex-1">
              <Text className="text-white font-semibold text-base">Segurança</Text>
              <Text className="text-slate-400 text-xs mt-0.5">Senha e biometria</Text>
            </View>
            <Feather name="chevron-right" size={20} color="#64748B" />
          </Pressable>

          <Pressable className="flex-row items-center p-4 border-b border-slate-700/50">
            <View className="w-10 h-10 bg-slate-700 rounded-full justify-center items-center mr-4">
              <Feather name="bell" size={18} color="#E2E8F0" />
            </View>
            <View className="flex-1">
              <Text className="text-white font-semibold text-base">Notificações</Text>
              <Text className="text-slate-400 text-xs mt-0.5">Alertas e avisos sonoros</Text>
            </View>
            <Feather name="chevron-right" size={20} color="#64748B" />
          </Pressable>

          <Pressable className="flex-row items-center p-4 border-b border-slate-700/50">
            <View className="w-10 h-10 bg-slate-700 rounded-full justify-center items-center mr-4">
              <Feather name="help-circle" size={18} color="#E2E8F0" />
            </View>
            <View className="flex-1">
              <Text className="text-white font-semibold text-base">Suporte</Text>
              <Text className="text-slate-400 text-xs mt-0.5">Central de ajuda</Text>
            </View>
            <Feather name="chevron-right" size={20} color="#64748B" />
          </Pressable>

          <Pressable 
            onPress={handleSignOut}
            className="flex-row items-center p-4"
          >
            <View className="w-10 h-10 bg-red-500/10 rounded-full justify-center items-center mr-4">
              <Feather name="log-out" size={18} color="#EF4444" />
            </View>
            <View className="flex-1">
              <Text className="text-red-400 font-semibold text-base">Sair da Conta</Text>
            </View>
          </Pressable>

        </View>

        <Text className="text-slate-600 text-center text-xs mt-8">
          PontoFlow © 2025 ABZ Group
        </Text>
        <Text className="text-slate-600 text-center text-xs mt-1">
          Versão 2.4.0
        </Text>
      </View>
    </ScrollView>
  );
}
