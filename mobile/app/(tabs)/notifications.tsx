import { Text, View, ScrollView, RefreshControl, ActivityIndicator, Pressable } from 'react-native';
import { useState, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadNotifications = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(30);

      if (data) {
        setNotifications(data);
      }
    } catch (err) {
      console.error("Notifications Load Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadNotifications();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadNotifications();
    setRefreshing(false);
  };

  const markAsRead = async (id: string, readAt: string | null) => {
    if (readAt) return; // Already read
    
    try {
      // Optimistic update
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n));
      
      await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', id);
    } catch (err) {
      console.error("Error marking as read", err);
    }
  };

  const getIconForType = (type: string, title?: string) => {
    const t = (title || type || '').toLowerCase();
    if (t.includes('aprovad')) return <Feather name="check-circle" size={20} color="#10B981" />;
    if (t.includes('recusad')) return <Feather name="x-circle" size={20} color="#EF4444" />;
    if (t.includes('lembrete')) return <Feather name="clock" size={20} color="#F59E0B" />;
    return <Feather name="bell" size={20} color="#3B82F6" />;
  };

  const getBadgeColor = (title?: string) => {
    const t = (title || '').toLowerCase();
    if (t.includes('aprovad')) return 'bg-emerald-500/20';
    if (t.includes('recusad')) return 'bg-red-500/20';
    if (t.includes('lembrete')) return 'bg-amber-500/20';
    return 'bg-blue-500/20';
  };

  if (loading) {
    return (
      <View className="flex-1 bg-slate-900 justify-center items-center">
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <ScrollView 
      className="flex-1 bg-slate-900"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3B82F6" />}
    >
      <View className="px-5 py-6">
        <Text className="text-2xl font-bold text-white mb-6">Meus Avisos</Text>
        
        {notifications.length === 0 ? (
          <View className="bg-slate-800 rounded-2xl p-8 border border-slate-700/50 flex items-center justify-center border-dashed mt-10">
            <View className="w-16 h-16 bg-slate-700/50 rounded-full justify-center items-center mb-4">
              <Feather name="bell-off" size={28} color="#64748B" />
            </View>
            <Text className="text-slate-300 text-center font-bold text-lg">Tudo limpo por aqui</Text>
            <Text className="text-slate-500 text-sm text-center mt-2">Você não tem novas notificações no momento.</Text>
          </View>
        ) : (
          <View>
            {notifications.map((notif) => {
              const dateObj = new Date(notif.created_at);
              const isUnread = !notif.read_at;
              
              return (
                <Pressable
                  key={notif.id}
                  onPress={() => markAsRead(notif.id, notif.read_at)}
                  className={`flex-row p-4 mb-3 rounded-2xl border ${isUnread ? 'bg-slate-800 border-slate-600' : 'bg-slate-800/50 border-slate-800'}`}
                >
                  <View className={`w-12 h-12 rounded-full justify-center items-center mr-4 ${getBadgeColor(notif.title)}`}>
                    {getIconForType(notif.event || '', notif.title)}
                  </View>
                  <View className="flex-1 justify-center">
                    <View className="flex-row justify-between items-start mb-1">
                      <Text className={`text-white font-bold flex-1 mr-2 ${isUnread ? 'text-base' : 'text-sm text-slate-300'}`}>
                        {notif.title || 'Aviso do Sistema'}
                      </Text>
                      {isUnread && <View className="w-2 h-2 rounded-full bg-blue-500 mt-1"></View>}
                    </View>
                    <Text className={`text-slate-400 text-sm ${isUnread ? '' : 'opacity-70'}`} numberOfLines={2}>
                      {notif.message}
                    </Text>
                    <Text className="text-slate-500 text-xs mt-2 font-medium">
                      {dateObj.toLocaleDateString('pt-BR')} às {dateObj.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
      </View>
    </ScrollView>
  );
}
