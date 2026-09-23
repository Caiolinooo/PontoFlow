import { StyleSheet, Text, View, ScrollView, RefreshControl, ActivityIndicator, Image } from 'react-native';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';

function getBRTDate() {
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  return new Date(utc + (3600000 * -3));
}

// Utility to get current month period_ini format (YYYY-MM-01)
function getPeriodoIni() {
  const nowBRT = getBRTDate();
  const year = nowBRT.getFullYear();
  const month = String(nowBRT.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}-01`;
}

function getTodayISO() {
  const nowBRT = getBRTDate();
  const year = nowBRT.getFullYear();
  const month = String(nowBRT.getMonth() + 1).padStart(2, '0');
  const day = String(nowBRT.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function HomeScreen() {
  const [session, setSession] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const [employee, setEmployee] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [metrics, setMetrics] = useState({
    totalHours: 0,
    timesheetStatus: 'Sem planilhas',
    todayEntriesCount: 0,
    todayEntries: [] as any[]
  });

  const loadData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      setSession(session);

      // Fetch Employee and Profile
      const { data: emp, error: empErr } = await supabase
        .from('employees')
        .select(`
          id, 
          name, 
          tenant_id
        `)
        .eq('profile_id', session.user.id)
        .maybeSingle();
      
      const { data: prof } = await supabase
        .from('profiles')
        .select('avatar_url')
        .eq('id', session.user.id)
        .maybeSingle();

      if (emp) setEmployee(emp);
      if (prof) setProfile(prof);

      if (emp) {
        const periodoIni = getPeriodoIni();
        
        // Fetch Timesheet
        const { data: ts } = await supabase
          .from('timesheets')
          .select('id, status')
          .eq('employee_id', emp.id)
          .eq('periodo_ini', periodoIni)
          .maybeSingle();

        if (ts) {
          // Fetch Entries for timesheet
          const { data: entries } = await supabase
            .from('timesheet_entries')
            .select('*')
            .eq('timesheet_id', ts.id);

          const allEntries = entries || [];
          
          let totalHours = 0;
          allEntries.forEach(e => {
            totalHours += (e.horas || 0);
          });

          const todayStr = getTodayISO();
          const todayEntries = allEntries.filter(e => e.data === todayStr)
            .sort((a, b) => (a.hora_ini || '').localeCompare(b.hora_ini || ''));

          setMetrics({
            totalHours,
            timesheetStatus: ts.status,
            todayEntriesCount: todayEntries.length,
            todayEntries
          });
        }
      }
    } catch (err) {
      console.error("Dashboard Load Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <View className="flex-1 bg-slate-900 justify-center items-center">
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  const username = employee?.name || session?.user?.email?.split('@')[0] || 'Colaborador';
  const avatarUrl = profile?.avatar_url;

  return (
    <ScrollView 
      className="flex-1 bg-slate-900"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3B82F6" />}
    >
      {/* Header */}
      <View className="px-6 py-8 flex-row justify-between items-center bg-slate-800 rounded-b-3xl border-b border-slate-700 shadow-lg">
        <View>
          <Text className="text-sm text-slate-400 font-medium tracking-wider uppercase mb-1">VISÃO GERAL</Text>
          <Text className="text-2xl font-bold text-white">Olá, {username.split(' ')[0]}!</Text>
        </View>
        <View className="w-14 h-14 bg-slate-700 rounded-full justify-center items-center border-2 border-slate-600 overflow-hidden">
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} className="w-full h-full" />
          ) : (
            <Feather name="user" size={24} color="#94A3B8" />
          )}
        </View>
      </View>

      {/* Metrics Cards */}
      <View className="px-5 pt-6 flex-row flex-wrap justify-between">
        
        {/* Card 1 */}
        <View className="w-[48%] bg-slate-800 rounded-2xl p-4 mb-4 border border-slate-700/50 shadow-md flex-col justify-between">
          <View className="w-10 h-10 bg-blue-500/20 rounded-full justify-center items-center mb-3">
            <Feather name="clock" size={20} color="#3B82F6" />
          </View>
          <Text className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">Horas Totais Mês</Text>
          <Text className="text-white text-2xl font-bold">{metrics.totalHours.toFixed(1)}h</Text>
        </View>

        {/* Card 2 */}
        <View className="w-[48%] bg-slate-800 rounded-2xl p-4 mb-4 border border-slate-700/50 shadow-md flex-col justify-between">
          <View className="w-10 h-10 bg-emerald-500/20 rounded-full justify-center items-center mb-3">
            <Feather name="calendar" size={20} color="#10B981" />
          </View>
          <Text className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">Pontos de Hoje</Text>
          <Text className="text-white text-2xl font-bold">{metrics.todayEntriesCount}</Text>
        </View>

        {/* Card 3 - Status */}
        <View className="w-full bg-slate-800 rounded-2xl p-4 mb-4 border border-slate-700/50 shadow-md flex-row items-center">
          <View className={`w-3 h-3 rounded-full mr-3 ${metrics.timesheetStatus === 'aprovado' ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`}></View>
          <View>
            <Text className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Status Planilha Atual</Text>
            <Text className="text-white text-lg font-bold capitalize">{metrics.timesheetStatus}</Text>
          </View>
        </View>
      </View>

      {/* Today's Punches Timeline */}
      <View className="px-5 pb-8 mt-2">
        <View className="flex-row justify-between items-center mb-4">
          <Text className="text-white text-lg font-bold">Registros de Hoje</Text>
          <Text className="text-slate-400 text-xs">{getTodayISO().split('-').reverse().join('/')}</Text>
        </View>

        {metrics.todayEntries.length === 0 ? (
          <View className="bg-slate-800 rounded-2xl p-8 border border-slate-700/50 flex items-center justify-center border-dashed">
            <Feather name="info" size={32} color="#475569" className="mb-3" />
            <Text className="text-slate-400 text-center font-medium">Nenhum ponto registrado hoje.</Text>
            <Text className="text-slate-500 text-sm text-center mt-1">Vá na aba 'Bater Ponto' para registrar.</Text>
          </View>
        ) : (
          <View className="bg-slate-800 rounded-2xl p-5 border border-slate-700/50">
            {metrics.todayEntries.map((entry, index) => (
              <View key={entry.id || index} className="flex-row items-start mb-4 last:mb-0">
                <View className="w-2 h-full absolute left-[11px] top-6 border-l-2 border-slate-600 border-dashed"></View>
                <View className="w-6 h-6 rounded-full bg-blue-500/20 border-2 border-blue-500 justify-center items-center z-10 mt-1">
                  <View className="w-2 h-2 rounded-full bg-blue-400"></View>
                </View>
                <View className="ml-4 flex-1">
                  <Text className="text-white text-base font-bold">{entry.hora_ini ? entry.hora_ini.substring(0,5) : '--:--'}</Text>
                  <Text className="text-slate-400 text-sm">{entry.observacao || 'Registro de Ponto'}</Text>
                  {entry.face_score && (
                    <View className="flex-row items-center mt-1">
                      <Feather name="check-circle" size={12} color="#10B981" />
                      <Text className="text-emerald-400 text-xs ml-1 font-medium">Biometria: {(entry.face_score * 100).toFixed(0)}%</Text>
                    </View>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}
