import React, { useRef, useState, useEffect, useMemo } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';

interface Props {
  base64Image: string | null;
  onDescriptorReady: (descriptor: number[] | null, error?: string, match?: any) => void;
  referenceDescriptor?: number[] | null;
  onStatusChange?: (status: string) => void;
}

/**
 * BiometricWebView - Componente de verificacao biométrica facial
 * 
 * Funcionamento:
 * 1. Carrega face-api.js de CDN (ou local se disponivel)
 * 2. Carrega modelos de IA (prioriza assets locais, fallback para CDN)
 * 3. Processa imagem base64 enviada do React Native
 * 4. Retorna descriptor facial para comparacao
 * 
 * Offline Support:
 * - Se os modelos estiverem em assets/models/face-api/, usa local
 * - Caso contrario, faz download automatico do CDN
 * - Cache persistido no dispositivo para uso futuro
 */

// Modelos necessarios para face recognition
const FACE_API_MODELS = [
  'tiny_face_detector',
  'face_landmark_68',
  'face_recognition'
];

// URLs CDN fallback
const CDN_BASE = 'https://github.com/justadoggeth/face-api.js/raw/master/test/model';

function getLocalModelPath(modelName: string): string | null {
  try {
    // Tenta carregar de assets locais (bundle)
    const asset = Asset.fromModule(require(`../assets/models/face-api/${modelName}/weights_manifest.json`));
    
    if (asset.localUri) {
      return asset.localUri;
    }
    
    // Para assets no bundle, usa file:// protocol
    return `file://${asset.uri}`;
  } catch {
    return null;
  }
}

async function getLocalModelUrl(modelName: string): Promise<string | null> {
  try {
    // Verifica se os arquivos locais existem
    const modelDir = FileSystem.cacheDirectory + 'face-api-models/' + modelName;
    
    const shardExists = await FileSystem.getInfoAsync(modelDir + '-shard1');
    const manifestExists = await FileSystem.getInfoAsync(modelDir + '-weights_manifest.json');
    
    if (shardExists.exists && manifestExists.exists) {
      return modelDir;
    }
    
    return null;
  } catch {
    return null;
  }
}

async function downloadModelsIfNeeded(): Promise<boolean> {
  try {
    const baseDir = FileSystem.cacheDirectory + 'face-api-models/';
    await FileSystem.makeDirectoryAsync(baseDir, { intermediates: true });
    
    let success = true;
    
    for (const modelName of FACE_API_MODELS) {
      const modelDir = baseDir + modelName + '/';
      await FileSystem.makeDirectoryAsync(modelDir, { intermediates: true });
      
      const sources: Record<string, Record<string, string>> = {
        tiny_face_detector: {
          'shard1': `${CDN_BASE}/${modelName}-model-shard1`,
          'weights_manifest.json': `${CDN_BASE}/${modelName}-model-weights_manifest.json`
        },
        face_landmark_68: {
          'shard1': `${CDN_BASE}/${modelName}-model-shard1`,
          'weights_manifest.json': `${CDN_BASE}/${modelName}-model-weights_manifest.json`
        },
        face_recognition: {
          'shard1': `${CDN_BASE}/${modelName}-model-shard1`,
          'shard2': `${CDN_BASE}/${modelName}-model-shard2`,
          'weights_manifest.json': `${CDN_BASE}/${modelName}-model-weights_manifest.json`
        }
      };
      
      if (sources[modelName]) {
        for (const [filename, url] of Object.entries(sources[modelName])) {
          try {
            const { uri } = await FileSystem.downloadAsync(
              url,
              modelDir + filename
            );
            if (!uri) {
              console.error('[BiometricWebView] Failed to download:', filename);
              success = false;
            }
          } catch (err: any) {
            console.error('[BiometricWebView] Download error for', filename, ':', err.message);
            success = false;
          }
        }
      }
    }
    
    return success;
  } catch (err: any) {
    console.error('[BiometricWebView] Model download error:', err.message);
    return false;
  }
}

export default function BiometricWebView({ 
  base64Image, 
  onDescriptorReady, 
  referenceDescriptor,
  onStatusChange 
}: Props) {
  const webViewRef = useRef<WebView>(null);
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [modelSource, setModelSource] = useState<'local' | 'cdn' | 'unknown'>('unknown');

  // Detecta disponibilidade de modelos locais
  useEffect(() => {
    async function checkModels() {
      try {
        // Tenta verificar modelos locais no cache
        const cacheDir = FileSystem.cacheDirectory + 'face-api-models/';
        const info = await FileSystem.getInfoAsync(cacheDir);
        
        if (info.exists) {
          setModelSource('local');
          setIsLoading(false);
          return;
        }
        
        // Se nao existe, marca para download
        setModelSource('cdn');
        setIsLoading(false);
      } catch (err: any) {
        console.error('[BiometricWebView] Error checking models:', err);
        setIsLoading(false);
      }
    }
    
    checkModels();
  }, []);

  // Inicia download de modelos quando necessario
  useEffect(() => {
    async function initModels() {
      if (modelSource === 'cdn' && !modelsLoaded) {
        onStatusChange?.('Baixando modelos de IA...');
        const success = await downloadModelsIfNeeded();
        if (success) {
          setModelSource('local');
          setModelsLoaded(true);
          onStatusChange?.('Modelos prontos');
        } else {
          onStatusChange?.('Erro ao baixar modelos');
        }
      }
    }
    
    if (!isLoading) {
      initModels();
    }
  }, [isLoading, modelSource, modelsLoaded, onStatusChange]);

  // URL dos modelos baseado na disponibilidade
  const modelUrl = useMemo(() => {
    if (modelSource === 'local') {
      const cacheDir = FileSystem.cacheDirectory + 'face-api-models/';
      return cacheDir;
    }
    return CDN_BASE;
  }, [modelSource]);

  // Envia imagem para processamento quando pronto
  useEffect(() => {
    if (isReady && base64Image && modelsLoaded) {
      setTimeout(() => {
        webViewRef.current?.injectJavaScript(`
          window.postMessage(JSON.stringify({
            type: 'PROCESS',
            base64: "${base64Image}",
            refDescriptor: ${referenceDescriptor ? JSON.stringify(referenceDescriptor) : 'null'}
          }), '*');
          true;
        `);
      }, 500);
    }
  }, [base64Image, isReady, referenceDescriptor, modelsLoaded]);

  const onMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      
      if (data.type === 'READY') {
        setIsReady(true);
        onStatusChange?.('Biometria pronta');
      } else if (data.type === 'STATUS') {
        onStatusChange?.(data.message);
      } else if (data.type === 'RESULT') {
        if (data.descriptor) {
          onDescriptorReady(data.descriptor, undefined, data.match);
        } else {
          onDescriptorReady(null, 'Nenhum rosto detectado na imagem');
        }
      } else if (data.type === 'ERROR') {
        setIsReady(false);
        onDescriptorReady(null, data.message);
        onStatusChange?.('Erro: ' + data.message);
      }
    } catch (e) {
      console.error('[BiometricWebView] Message parse error:', e);
    }
  };

  return (
    <View style={styles.container}>
      {!modelsLoaded && !isLoading && modelSource === 'cdn' && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Baixando modelos...</Text>
        </View>
      )}
      
      <WebView
        ref={webViewRef}
        source={{ html: getHtmlContent(modelUrl) }}
        onMessage={onMessage}
        originWhitelist={['*']}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        allowsInlineMediaPlayback={true}
        style={styles.webview}
      />
    </View>
  );
}

function getHtmlContent(modelUrl: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <script src="https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.12/dist/face-api.min.js"></script>
      <style>
        body { 
          margin: 0; 
          background: transparent; 
          font-family: sans-serif; 
        }
        #status {
          position: fixed;
          top: 10px;
          left: 10px;
          color: white;
          background: rgba(0,0,0,0.7);
          padding: 8px 12px;
          border-radius: 4px;
          font-size: 12px;
          z-index: 1000;
          display: none;
        }
      </style>
    </head>
    <body>
      <div id="status"></div>
      <img id="image" style="display:none;" />

      <script>
        const statusEl = document.getElementById('status');
        const imgEl = document.getElementById('image');
        let modelsLoaded = false;
        let modelSource = '${modelUrl.startsWith('file://') ? 'local' : 'cdn'}';
        
        function showStatus(msg) {
          if (statusEl) {
            statusEl.innerText = msg;
            statusEl.style.display = 'block';
            window.ReactNativeWebView.postMessage(JSON.stringify({ 
              type: 'STATUS', 
              message: msg 
            }));
          }
        }

        async function init() {
          try {
            showStatus("Carregando modelos de IA...");
            
            const modelUrl = '${modelUrl}';
            const isLocal = modelUrl.startsWith('file://');
            
            // Load models from local or CDN
            await Promise.all([
              faceapi.nets.tinyFaceDetector.loadFromUri(isLocal ? modelUrl : '${CDN_BASE}'),
              faceapi.nets.faceLandmark68Net.loadFromUri(isLocal ? modelUrl : '${CDN_BASE}'),
              faceapi.nets.faceRecognitionNet.loadFromUri(isLocal ? modelUrl : '${CDN_BASE}')
            ]);
            
            modelsLoaded = true;
            showStatus("Modelos carregados (" + (isLocal ? 'local' : 'CDN') + ")");
            
            // Notify React Native that we are ready
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'READY' }));
          } catch (e) {
            showStatus("Erro ao carregar modelos");
            window.ReactNativeWebView.postMessage(JSON.stringify({ 
              type: 'ERROR', 
              message: "Models failed to load: " + e.message 
            }));
          }
        }

        async function processImage(base64, refDescriptor) {
          if (!modelsLoaded) {
            window.ReactNativeWebView.postMessage(JSON.stringify({ 
              type: 'ERROR', 
              message: "Models not loaded yet" 
            }));
            return;
          }

          try {
            showStatus("Processando rosto...");
            imgEl.src = "data:image/jpeg;base64," + base64;
            
            await new Promise(resolve => { imgEl.onload = resolve; });

            const detection = await faceapi
              .detectSingleFace(imgEl, new faceapi.TinyFaceDetectorOptions({ 
                inputSize: 224, 
                scoreThreshold: 0.5 
              }))
              .withFaceLandmarks()
              .withFaceDescriptor();

            if (!detection) {
              showStatus("Nenhum rosto detectado");
              window.ReactNativeWebView.postMessage(JSON.stringify({ 
                type: 'RESULT', 
                descriptor: null 
              }));
              return;
            }

            showStatus("Rosto detectado!");
            const descArray = Array.from(detection.descriptor);

            if (refDescriptor && refDescriptor.length > 0) {
              const refFloat32 = new Float32Array(refDescriptor);
              const distance = faceapi.euclideanDistance(detection.descriptor, refFloat32);
              const threshold = 0.5;
              const isMatch = distance < threshold;
              const score = Math.max(0, 1 - (distance / 1.0));
              
              window.ReactNativeWebView.postMessage(JSON.stringify({ 
                type: 'RESULT', 
                descriptor: descArray,
                match: { isMatch, distance: parseFloat(distance.toFixed(4)), score: parseFloat(score.toFixed(4)) } 
              }));
            } else {
              window.ReactNativeWebView.postMessage(JSON.stringify({ 
                type: 'RESULT', 
                descriptor: descArray 
              }));
            }
          } catch (e) {
            showStatus("Erro ao processar");
            window.ReactNativeWebView.postMessage(JSON.stringify({ 
              type: 'ERROR', 
              message: e.message 
            }));
          }
        }

        // Listen for messages from React Native
        document.addEventListener('message', function(event) {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'PROCESS') {
              processImage(data.base64, data.refDescriptor);
            }
          } catch (e) { /* ignore */ }
        });

        window.addEventListener('message', function(event) {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'PROCESS') {
              processImage(data.base64, data.refDescriptor);
            }
          } catch (e) { /* ignore */ }
        });

        init();
      </script>
    </body>
    </html>
  `;
}

const styles = StyleSheet.create({
  container: {
    height: 0,
    width: 0,
    opacity: 0,
    display: 'none',
  },
  webview: {
    height: 0,
    width: 0,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 8,
  },
  loadingText: {
    color: '#FFFFFF',
    marginTop: 8,
    fontSize: 12,
  },
});

// Exportar funcao para verificar status dos modelos
export async function checkBiometricModelsStatus(): Promise<{
  available: boolean;
  source: 'local' | 'cdn' | 'unknown';
  message: string;
}> {
  try {
    const cacheDir = FileSystem.cacheDirectory + 'face-api-models/';
    const info = await FileSystem.getInfoAsync(cacheDir);
    
    if (info.exists) {
      return {
        available: true,
        source: 'local',
        message: 'Modelos locais disponiveis'
      };
    }
    
    return {
      available: false,
      source: 'cdn',
      message: 'Usando CDN (modelos nao cacheados)'
    };
  } catch (err: any) {
    return {
      available: false,
      source: 'unknown',
      message: 'Erro ao verificar modelos: ' + err.message
    };
  }
}
