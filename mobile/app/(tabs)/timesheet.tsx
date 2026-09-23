import { StyleSheet, Text, View, ScrollView, TextInput, Pressable, ActivityIndicator, Alert } from 'react-native';
import { useState, useRef, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect, router } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import BiometricWebView from '../../components/BiometricWebView';

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

function getCurrentTime() {
  const nowBRT = getBRTDate();
  const hours = String(nowBRT.getHours()).padStart(2, '0');
  const minutes = String(nowBRT.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

export default function TimesheetScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<any>(null);

  const [environments, setEnvironments] = useState<any[]>([]);
  const [selectedEnv, setSelectedEnv] = useState<string>('');
  const [observacao, setObservacao] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [employee, setEmployee] = useState<any>(null);
  const [referenceDescriptor, setReferenceDescriptor] = useState<number[] | null>(null);

  const [base64Image, setBase64Image] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      setSession(session);

      // Fetch Environments
      const { data: envs } = await supabase.from('environments').select('*').order('name');
      if (envs) setEnvironments(envs);

      // Fetch Employee and Profile
      const { data: emp } = await supabase
        .from('employees')
        .select('*')
        .eq('profile_id', session.user.id)
        .maybeSingle();

      const { data: prof } = await supabase
        .from('profiles')
        .select('face_descriptor')
        .eq('id', session.user.id)
        .maybeSingle();

      if (emp) setEmployee(emp);
      
      if (prof?.face_descriptor) {
        try {
          // Parse descriptor if it's a JSON string
          const descArray = typeof prof.face_descriptor === 'string' 
            ? JSON.parse(prof.face_descriptor) 
            : prof.face_descriptor;
            
          setReferenceDescriptor(descArray);
        } catch (e) {
          console.error("Failed to parse face_descriptor", e);
        }
      }

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
      // Reset state on focus
      setBase64Image(null);
      setProcessing(false);
      setObservacao('');
      setSelectedEnv('');
    }, [])
  );

  const handlePunch = async () => {
    if (!selectedEnv) {
      Alert.alert("Erro", "Por favor, selecione um ambiente de trabalho.");
      return;
    }

    if (!referenceDescriptor) {
      Alert.alert(
        "Biometria não cadastrada", 
        "Você precisa cadastrar sua face no sistema web antes de poder registrar o ponto pelo aplicativo.",
        [{ text: "Ok", onPress: () => router.push('/(tabs)') }]
      );
      return;
    }

    if (cameraRef.current) {
      try {
        setProcessing(true);
        const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.5 });
        // Setting base64Image triggers the BiometricWebView to process it
        setBase64Image(photo.base64);
      } catch (err) {
        Alert.alert("Erro na Câmera", "Não foi possível capturar a imagem.");
        setProcessing(false);
      }
    }
  };

  const handleDescriptorResult = async (descriptor: any, error?: string) => {
    if (error) {
      Alert.alert("Erro na Biometria", error);
      setProcessing(false);
      setBase64Image(null);
      return;
    }

    if (!descriptor) {
      Alert.alert("Rosto não detectado", "Por favor, posicione seu rosto claramente na frente da câmera e tente novamente.");
      setProcessing(false);
      setBase64Image(null);
      return;
    }

    const match = descriptor.match;
    if (!match || !match.isMatch) {
      Alert.alert("Biometria Incorreta", "O rosto detectado não corresponde à sua biometria cadastrada. Score: " + (match ? (match.score * 100).toFixed(0) : 0) + "%");
      setProcessing(false);
      setBase64Image(null);
      return;
    }

    // Biometric matched successfully! Let's register it.
    try {
      const periodoIni = getPeriodoIni();
      let timesheetId = null;

      // Check if timesheet exists
      const { data: existingTs } = await supabase
        .from('timesheets')
        .select('id')
        .eq('employee_id', employee.id)
        .eq('periodo_ini', periodoIni)
        .maybeSingle();

      if (existingTs) {
        timesheetId = existingTs.id;
      } else {
        // Create new timesheet
        const { data: newTs, error: tsErr } = await supabase
          .from('timesheets')
          .insert({
            employee_id: employee.id,
            periodo_ini: periodoIni,
            status: 'rascunho'
          })
          .select('id')
          .single();
          
        if (tsErr) throw tsErr;
        timesheetId = newTs.id;
      }

      // Insert entry
      const { error: entryErr } = await supabase
        .from('timesheet_entries')
        .insert({
          timesheet_id: timesheetId,
          data: getTodayISO(),
          environment_id: selectedEnv,
          hora_ini: getCurrentTime(),
          observacao: observacao,
          face_score: match.score
        });

      if (entryErr) throw entryErr;

      // Success
      Alert.alert(
        "Ponto Registrado", 
        "Seu ponto foi registrado com sucesso!\nBiometria validada com " + (match.score * 100).toFixed(0) + "%",
        [{ text: "OK", onPress: () => router.push('/(tabs)') }]
      );
    } catch (dbErr: any) {
      console.error(dbErr);
      Alert.alert("Erro ao registrar no banco", dbErr.message);
    } finally {
      setProcessing(false);
      setBase64Image(null);
    }
  };

  if (!permission) {
    return <View className="flex-1 bg-slate-900 justify-center items-center"><ActivityIndicator color="#3B82F6" /></View>;
  }

  if (!permission.granted) {
    return (
      <View className="flex-1 bg-slate-900 justify-center items-center px-6">
        <Feather name="camera-off" size={64} color="#64748B" className="mb-4" />
        <Text className="text-white text-center text-lg font-bold mb-2">Câmera Necessária</Text>
        <Text className="text-slate-400 text-center mb-6">Para registrar o ponto, o sistema precisa da câmera para validação biométrica.</Text>
        <Pressable 
          onPress={requestPermission}
          className="bg-blue-600 px-6 py-3 rounded-xl w-full"
        >
          <Text className="text-white text-center font-bold text-base">Permitir Câmera</Text>
        </Pressable>
      </View>
    );
  }

  if (loading) {
    return <View className="flex-1 bg-slate-900 justify-center items-center"><ActivityIndicator color="#3B82F6" /></View>;
  }

  return (
    <ScrollView className="flex-1 bg-slate-900">
      {/* Hidden Biometric Verifier */}
      <BiometricWebView 
        base64Image={base64Image}
        referenceDescriptor={referenceDescriptor}
        onDescriptorReady={handleDescriptorResult}
      />

      <View className="px-5 py-6">
        <Text className="text-2xl font-bold text-white mb-2">Registro de Ponto</Text>
        <Text className="text-slate-400 text-sm mb-6">Validação biométrica obrigatória</Text>

        {/* Camera Container */}
        <View className="w-full aspect-[3/4] rounded-3xl overflow-hidden bg-slate-800 border-2 border-slate-700/50 mb-6 relative shadow-lg">
          <CameraView 
            ref={cameraRef}
            style={{ flex: 1 }}
            facing="front"
          />
          
          {/* Facial Overlay Guidelines */}
          <View className="absolute inset-0 border-4 border-blue-500/30 rounded-3xl pointer-events-none" />
          <View className="absolute inset-x-0 top-1/4 h-64 mx-8 border-2 border-dashed border-emerald-400/50 rounded-full items-center justify-end pb-4">
            <Text className="text-emerald-400/70 font-semibold text-xs tracking-widest bg-slate-900/50 px-3 py-1 rounded-full">ENQUADRE SEU ROSTO</Text>
          </View>

          {processing && (
            <View className="absolute inset-0 bg-slate-900/80 justify-center items-center">
              <ActivityIndicator size="large" color="#3B82F6" />
              <Text className="text-white font-bold mt-4 text-lg">Analisando Biometria...</Text>
            </View>
          )}
        </View>

        {/* Environment Selection */}
        <Text className="text-slate-300 font-semibold mb-3 ml-1 text-sm uppercase tracking-wider">Selecione o Ambiente</Text>
        <View className="flex-row flex-wrap justify-between mb-6">
          {environments.map((env) => (
            <Pressable
              key={env.id}
              onPress={() => setSelectedEnv(env.id)}
              className={`w-[48%] py-3 px-4 rounded-xl border mb-3 flex-row items-center justify-center ${
                selectedEnv === env.id 
                  ? 'bg-blue-600/20 border-blue-500' 
                  : 'bg-slate-800 border-slate-700'
              }`}
            >
              <View className={`w-3 h-3 rounded-full mr-2 ${selectedEnv === env.id ? 'bg-blue-400' : 'bg-slate-600'}`}></View>
              <Text className={`font-semibold text-sm ${selectedEnv === env.id ? 'text-blue-400' : 'text-slate-400'}`}>
                {env.name}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Observation Field */}
        <Text className="text-slate-300 font-semibold mb-3 ml-1 text-sm uppercase tracking-wider">Observação (Opcional)</Text>
        <TextInput
          value={observacao}
          onChangeText={setObservacao}
          placeholder="Ex: Ponto atrasado devido ao trânsito"
          placeholderTextColor="#64748B"
          className="bg-slate-800 text-white rounded-xl p-4 border border-slate-700 mb-8 font-medium"
        />

        {/* Punch Button */}
        <Pressable
          onPress={handlePunch}
          disabled={processing || !referenceDescriptor}
          className={`flex-row items-center justify-center py-4 rounded-2xl shadow-lg shadow-blue-500/30 w-full mb-10 ${
            processing || !referenceDescriptor ? 'bg-slate-700' : 'bg-blue-600'
          }`}
        >
          <Feather name="camera" size={24} color={processing || !referenceDescriptor ? "#94A3B8" : "#fff"} className="mr-3" />
          <Text className={`font-bold text-lg ${processing || !referenceDescriptor ? 'text-slate-400' : 'text-white'}`}>
            {processing ? 'Processando...' : !referenceDescriptor ? 'Biometria Pendente' : 'Bater Ponto Agora'}
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
