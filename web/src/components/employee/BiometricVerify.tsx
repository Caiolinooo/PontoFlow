'use client';

import { useState, useRef, useEffect } from 'react';
import { extractFaceDescriptor, compareFaceDescriptors, loadFaceModels, attachStreamToVideo, cameraErrorMessage, type FaceMatchResult } from '@/lib/face-recognition';

interface Props {
  employeeId: string;
  cachedDescriptor: Float32Array;
  onSuccess: (score: number, verificationId?: string, offline?: boolean) => void;
  onCancel: () => void;
  locale?: string;
}

// Best-effort GPS for audit traceability (3s cap, silently null when denied/unavailable)
function getBrowserGeolocation(): Promise<{ latitude: number; longitude: number } | null> {
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return resolve(null);
    const timer = setTimeout(() => resolve(null), 3000);
    navigator.geolocation.getCurrentPosition(
      (pos) => { clearTimeout(timer); resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }); },
      () => { clearTimeout(timer); resolve(null); },
      { timeout: 3000, maximumAge: 60000 }
    );
  });
}

export default function BiometricVerify({ employeeId, cachedDescriptor, onSuccess, onCancel, locale = 'pt' }: Props) {

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

  // Load models and start the camera once
  useEffect(() => {
    let activeStream: MediaStream | null = null;
    let isMounted = true;

    async function init() {
      try {
        setStatus('loading_models');
        await loadFaceModels();
        if (!isMounted) return;

        setStatus('starting_camera');
        activeStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }
        });
        if (!isMounted) {
          activeStream.getTracks().forEach(track => track.stop());
          return;
        }

        // Mounts the <video>; the verification effect binds srcObject below.
        setStream(activeStream);
      } catch (err) {
        if (!isMounted) return;
        console.error('Biometric verification error:', err);
        setStatus('error');
        setErrorMsg(cameraErrorMessage(err));
      }
    }

    init();

    return () => {
      isMounted = false;
      if (activeStream) {
        activeStream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Attach the stream to the mounted <video> and run the verification round
  // only once real frames are playing. Runs once per stream (retry = remount).
  const verificationStartedRef = useRef(false);
  useEffect(() => {
    const video = videoRef.current;
    const activeStream = stream;
    if (!video || !activeStream || verificationStartedRef.current) return;
    verificationStartedRef.current = true;
    let isMounted = true;

    async function runVerificationRound(videoEl: HTMLVideoElement, mediaStream: MediaStream) {
      try {
        await attachStreamToVideo(videoEl, mediaStream);
        if (!isMounted) return;
        setStatus('processing');

        // Take a few attempts to get a clear face
        let matchResult: FaceMatchResult | null = null;
        let liveDescriptor: Float32Array | null = null;
        for (let attempt = 0; attempt < 3; attempt++) {
          if (!isMounted) return;
          const descriptor = await extractFaceDescriptor(videoEl);
          if (descriptor) {
            matchResult = compareFaceDescriptors(descriptor, cachedDescriptor);
            if (matchResult.isMatch) { liveDescriptor = descriptor; break; }
          }
          await new Promise(r => setTimeout(r, 500));
        }

        if (!isMounted) return;
        if (matchResult?.isMatch && liveDescriptor) {
          const score = matchResult.score;

          // Server-side verification: the server recomputes the distance against
          // the stored template and issues a single-use verification_id that the
          // punch entry must present. Without connectivity (TypeError), fall back
          // to an explicitly client-attested offline punch.
          try {
            const gps = await getBrowserGeolocation();
            const res = await fetch('/api/employee/face-recognition/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                employee_id: employeeId,
                face_encoding: Array.from(liveDescriptor),
                gps_latitude: gps?.latitude,
                gps_longitude: gps?.longitude,
                device_info: { platform: navigator.platform, language: navigator.language },
              }),
            });
            const data = await res.json().catch(() => ({}));
            if (!isMounted) return;
            if (res.ok && data.is_verified && data.verification_id) {
              setStatus('success');
              setTimeout(() => { if (isMounted) onSuccess(score, data.verification_id, false); }, 1000);
            } else {
              setStatus('error');
              setErrorMsg('Identidade não confirmada pelo servidor. Tente novamente em um local iluminado e mantenha o rosto reto.');
            }
          } catch (netErr) {
            if (!isMounted) return;
            if (netErr instanceof TypeError) {
              // Offline: local match already passed; punch is queued and the
              // attestation is persisted as client-attested on sync.
              setStatus('success');
              setTimeout(() => { if (isMounted) onSuccess(score, undefined, true); }, 1000);
            } else {
              throw netErr;
            }
          }
        } else {
          setStatus('error');
          setErrorMsg('Identidade não reconhecida. Tente novamente em um local iluminado e mantenha o rosto reto.');
        }
      } catch (err) {
        if (!isMounted) return;
        console.error('Biometric verification error:', err);
        setStatus('error');
        setErrorMsg(cameraErrorMessage(err));
      }
    }

    runVerificationRound(video, activeStream);

    return () => {
      isMounted = false;
    };
  }, [stream, cachedDescriptor, onSuccess]);

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
