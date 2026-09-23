'use client';

import { useState, useRef, useEffect } from 'react';
import { extractFaceDescriptor, loadFaceModels } from '@/lib/face-recognition';

interface Props {
  employeeId: string;
  onSuccess: () => void;
  onCancel: () => void;
  locale?: string;
}

export default function BiometricSetup({ employeeId, onSuccess, onCancel, locale = 'pt' }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [status, setStatus] = useState<'loading_models' | 'starting_camera' | 'ready' | 'processing' | 'error' | 'success'>('loading_models');
  const [errorMsg, setErrorMsg] = useState('');

  // Translations mockup (adjust based on actual i18n setup)
  const dict = {
    pt: {
      title: 'Configuração de Biometria Facial',
      subtitle: 'Precisamos cadastrar o seu rosto para que você possa bater o ponto com segurança, mesmo offline.',
      loadingModels: 'Carregando modelos de inteligência artificial...',
      startingCamera: 'Iniciando câmera...',
      ready: 'Posicione seu rosto no centro da câmera.',
      processing: 'Analisando rosto, por favor aguarde...',
      success: 'Rosto cadastrado com sucesso!',
      error: 'Erro: ',
      btnCapture: 'Capturar e Cadastrar',
      btnCancel: 'Cancelar'
    },
    en: {
      title: 'Facial Biometric Setup',
      subtitle: 'We need to register your face securely so you can clock in even when offline.',
      loadingModels: 'Loading AI models...',
      startingCamera: 'Starting camera...',
      ready: 'Position your face in the center of the camera.',
      processing: 'Analyzing face, please wait...',
      success: 'Face registered successfully!',
      error: 'Error: ',
      btnCapture: 'Capture & Register',
      btnCancel: 'Cancel'
    }
  };
  const t = dict[locale as keyof typeof dict] || dict.pt;

  // Initialize models and camera
  useEffect(() => {
    let activeStream: MediaStream | null = null;
    
    async function init() {
      try {
        setStatus('loading_models');
        await loadFaceModels();
        
        setStatus('starting_camera');
        activeStream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } } 
        });
        
        setStream(activeStream);
        if (videoRef.current) {
          videoRef.current.srcObject = activeStream;
        }
        
        setStatus('ready');
      } catch (err: any) {
        console.error('Biometric setup error:', err);
        setStatus('error');
        setErrorMsg(err.message || 'Falha ao acessar câmera');
      }
    }
    
    init();
    
    return () => {
      // Cleanup camera on unmount
      if (activeStream) {
        activeStream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const handleCapture = async () => {
    if (!videoRef.current) return;
    
    setStatus('processing');
    try {
      // Extract descriptor
      const descriptor = await extractFaceDescriptor(videoRef.current);
      
      if (!descriptor) {
        throw new Error('Nenhum rosto detectado na imagem. Tente melhorar a iluminação e olhar para a câmera.');
      }
      
      // We have the Float32Array of length 128
      const faceEncodingStr = JSON.stringify(Array.from(descriptor));
      
      // Save to server
      const res = await fetch('/api/employee/face-recognition/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: employeeId,
          face_encoding: faceEncodingStr,
        })
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to register face on server');
      }
      
      setStatus('success');
      
      // Wait a moment so user sees success message
      setTimeout(() => {
        onSuccess();
      }, 1500);
      
    } catch (err: any) {
      console.error(err);
      setStatus('error');
      setErrorMsg(err.message || 'Falha ao processar biometria');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
      <div className="bg-[var(--card)] w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-[var(--border)] animate-scale-in flex flex-col">
        
        {/* Header */}
        <div className="p-5 border-b border-[var(--border)] text-center">
          <h2 className="text-xl font-bold text-[var(--foreground)]">{t.title}</h2>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">{t.subtitle}</p>
        </div>
        
        {/* Camera View */}
        <div className="relative bg-black aspect-video flex-shrink-0 flex items-center justify-center overflow-hidden">
          {stream && (
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted 
              className={`w-full h-full object-cover transition-opacity duration-300 ${status === 'processing' ? 'opacity-50' : 'opacity-100'}`}
              style={{ transform: 'scaleX(-1)' }} // Mirror mode for better UX
            />
          )}

          {/* Overlay Status UI */}
          <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
            {status === 'loading_models' && (
              <div className="bg-black/60 text-white px-4 py-2 rounded-lg backdrop-blur-md flex items-center gap-3">
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                <span className="font-medium text-sm text-center">{t.loadingModels}</span>
              </div>
            )}
            
            {status === 'processing' && (
              <div className="bg-blue-600/90 text-white px-4 py-2 rounded-lg backdrop-blur-md flex items-center gap-3 animate-pulse">
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                <span className="font-medium text-sm">{t.processing}</span>
              </div>
            )}

            {status === 'success' && (
              <div className="bg-green-500/90 text-white p-4 rounded-full backdrop-blur-md animate-scale-in">
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
              </div>
            )}
          </div>
          
          {/* Face Guideline Box */}
          {status === 'ready' && (
            <div className="absolute inset-0 pointer-events-none p-8 flex items-center justify-center">
              <div className="w-48 h-56 border-2 border-white/50 rounded-full border-dashed animate-[pulse_3s_ease-in-out_infinite]" />
            </div>
          )}
        </div>
        
        {/* Footer Controls */}
        <div className="p-5 flex flex-col gap-3">
          {status === 'error' && (
            <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg text-sm text-center border border-red-200 dark:border-red-800">
              <span className="font-bold">Error:</span> {errorMsg}
            </div>
          )}
          
          <button 
            onClick={handleCapture}
            disabled={status !== 'ready' && status !== 'error'} 
            className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {status === 'ready' || status === 'error' ? (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                {t.btnCapture}
              </>
            ) : status === 'success' ? (
              t.success
            ) : (
             '...' 
            )}
          </button>
          
          <button 
            onClick={onCancel}
            disabled={status === 'processing' || status === 'success'}
            className="w-full h-10 rounded-xl bg-transparent border border-[var(--border)] hover:bg-[var(--muted)] text-[var(--foreground)] font-medium transition-all"
          >
            {t.btnCancel}
          </button>
        </div>
        
      </div>
    </div>
  );
}
