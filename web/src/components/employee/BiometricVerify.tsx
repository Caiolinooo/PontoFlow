'use client';

import { useState, useRef, useEffect } from 'react';
import { extractFaceDescriptor, compareFaceDescriptors, loadFaceModels } from '@/lib/face-recognition';

interface Props {
  cachedDescriptor: Float32Array;
  onSuccess: (score: number) => void;
  onCancel: () => void;
  locale?: string;
}

export default function BiometricVerify({ cachedDescriptor, onSuccess, onCancel, locale = 'pt' }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [status, setStatus] = useState<'loading_models' | 'starting_camera' | 'ready' | 'processing' | 'error' | 'success'>('loading_models');
  const [errorMsg, setErrorMsg] = useState('');

  // Translations mockup
  const dict = {
    pt: {
      title: 'Validação Biométrica',
      loadingModels: 'Carregando...',
      startingCamera: 'Acessando câmera...',
      ready: 'Aguardando validação...',
      processing: 'Verificando rosto...',
      success: 'Identidade confirmada!',
      error: 'Erro: ',
      btnRetry: 'Tentar Novamente',
      btnCancel: 'Cancelar'
    },
    en: {
      title: 'Biometric Validation',
      loadingModels: 'Loading...',
      startingCamera: 'Accessing camera...',
      ready: 'Waiting for validation...',
      processing: 'Verifying face...',
      success: 'Identity confirmed!',
      error: 'Error: ',
      btnRetry: 'Try Again',
      btnCancel: 'Cancel'
    }
  };
  const t = dict[locale as keyof typeof dict] || dict.pt;

  // Auto-start and process
  useEffect(() => {
    let activeStream: MediaStream | null = null;
    let isMounted = true;
    
    async function runVerificationRound() {
      if (!isMounted) return;
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
        
        // Wait for video to start playing before capturing
        await new Promise(r => setTimeout(r, 1000));
        
        if (!isMounted) return;
        setStatus('processing');
        
        // Take a few attempts to get a clear face
        let matchResult = null;
        for (let attempt = 0; attempt < 3; attempt++) {
          if (!videoRef.current) break;
          
          const descriptor = await extractFaceDescriptor(videoRef.current);
          if (descriptor) {
            matchResult = compareFaceDescriptors(descriptor, cachedDescriptor);
            if (matchResult.isMatch) {
              break; // Stop trying if we have a match
            }
          }
          await new Promise(r => setTimeout(r, 500)); // wait halfway before next frame
        }
        
        if (!isMounted) return;

        if (matchResult && matchResult.isMatch) {
          setStatus('success');
          setTimeout(() => {
             if (isMounted) onSuccess(matchResult!.score);
          }, 1000);
        } else {
          throw new Error('Identidade não reconhecida. Tente novamente em um local iluminado e mantenha o rosto reto.');
        }

      } catch (err: any) {
        if (!isMounted) return;
        console.error('Biometric verification error:', err);
        setStatus('error');
        setErrorMsg(err.message || 'Falha ao validar biometria');
      }
    }
    
    runVerificationRound();
    
    return () => {
      isMounted = false;
      if (activeStream) {
        activeStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cachedDescriptor, onSuccess]);

  return (
    <div className="fixed inset-0 z-[110] bg-black/95 flex flex-col items-center justify-center p-4 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-sm flex flex-col items-center gap-6 animate-scale-in">
        
        {/* Title */}
        <h2 className="text-2xl font-bold text-white text-center">
          {status === 'success' ? t.success : status === 'error' ? t.error : t.title}
        </h2>
        
        {/* Camera Feed Circular Container */}
        <div className={`relative w-64 h-64 rounded-full overflow-hidden border-4 shadow-2xl transition-colors duration-500 flex-shrink-0
            ${status === 'success' ? 'border-green-500 shadow-green-500/50' : 
              status === 'error' ? 'border-red-500 shadow-red-500/50' : 
              status === 'processing' ? 'border-blue-500 shadow-blue-500/50' :
              'border-[var(--border)]'}
        `}>
          {stream && (
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted 
              className={`w-full h-full object-cover transition-all duration-300 ${status === 'processing' ? 'scale-110 blur-[2px]' : 'scale-100'}`}
              style={{ transform: 'scaleX(-1)' }}
            />
          )}

          {/* Status Overlay inside circle */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            {status === 'loading_models' && (
               <svg className="w-10 h-10 text-white animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            )}
            
            {status === 'processing' && (
              <svg className="w-16 h-16 text-blue-400 animate-[spin_2s_linear_infinite]" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeWidth="1" strokeDasharray="4 4" strokeLinecap="round" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"></path><path stroke="currentColor" strokeWidth="2" strokeLinecap="round" d="M12 6v6l4 2"></path></svg>
            )}

            {status === 'success' && (
              <div className="bg-green-500/80 w-full h-full flex items-center justify-center backdrop-blur-sm animate-fade-in">
                <svg className="w-24 h-24 text-white drop-shadow-md" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
              </div>
            )}
            
            {status === 'error' && (
              <div className="bg-red-500/80 w-full h-full flex items-center justify-center backdrop-blur-sm animate-fade-in">
                <svg className="w-24 h-24 text-white drop-shadow-md" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
              </div>
            )}
          </div>
        </div>
        
        {/* Status Text / Error Msg */}
        <div className="h-16 flex items-center justify-center w-full px-4 text-center">
            {status === 'loading_models' && <p className="text-white/70 animate-pulse">{t.loadingModels}</p>}
            {status === 'starting_camera' && <p className="text-white/70">{t.startingCamera}</p>}
            {status === 'ready' && <p className="text-white/70">{t.ready}</p>}
            {status === 'processing' && <p className="text-blue-300 font-medium animate-pulse">{t.processing}</p>}
            {status === 'error' && <p className="text-red-300 text-sm font-medium leading-tight">{errorMsg}</p>}
        </div>

        {/* Controls */}
        <div className="w-full flex gap-3 px-8 mt-2">
           <button 
              onClick={onCancel}
              className="flex-1 py-3 px-4 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium transition-colors"
           >
              {t.btnCancel}
           </button>
           
           {status === 'error' && (
             <button 
                onClick={() => {
                   setStatus('ready');
                   setErrorMsg('');
                   // Easiest replay is to let user wait or just retry extract descriptor here, 
                   // but for simplicity remounting the component from parent is safer, or doing a window refresh.
                   // Actually, we can just call onCancel and let them click punch again.
                   onCancel();
                }}
                className="flex-1 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-colors shadow-lg shadow-blue-900/50"
             >
                {t.btnRetry}
             </button>
           )}
        </div>
        
      </div>
    </div>
  );
}
