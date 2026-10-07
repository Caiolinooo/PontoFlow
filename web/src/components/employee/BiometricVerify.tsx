'use client';

import { useState, useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { captureLiveFace, compareFaceDescriptors, loadFaceModels, attachStreamToVideo, cameraErrorMessage } from '@/lib/face-recognition';

interface Props {
  employeeId: string;
  cachedDescriptor: Float32Array;
  onSuccess: (score: number, verificationId?: string, offline?: boolean) => void;
  onCancel: () => void;
}

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

export default function BiometricVerify({ employeeId, cachedDescriptor, onSuccess, onCancel }: Props) {
  const t = useTranslations('biometrics');
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [status, setStatus] = useState<'loading_models' | 'starting_camera' | 'ready' | 'processing' | 'error' | 'success'>('loading_models');
  const [errorMsg, setErrorMsg] = useState('');

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

  const verificationStartedRef = useRef(false);
  const onSuccessRef = useRef(onSuccess);
  const tRef = useRef(t);
  onSuccessRef.current = onSuccess;
  tRef.current = t;
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

        const live = await captureLiveFace(videoEl);
        if (!isMounted) return;
        if (!live) {
          setStatus('error');
          setErrorMsg(tRef.current('livenessFailed'));
          return;
        }

        const localMatch = compareFaceDescriptors(live.descriptor, cachedDescriptor);
        try {
          const gps = await getBrowserGeolocation();
          const res = await fetch('/api/employee/face-recognition/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              employee_id: employeeId,
              face_encoding: Array.from(live.descriptor),
              gps_latitude: gps?.latitude,
              gps_longitude: gps?.longitude,
              device_info: { platform: navigator.platform, language: navigator.language },
            }),
          });
          const data = await res.json().catch(() => ({}));
          if (!isMounted) return;
          if (res.ok && data.is_verified && data.verification_id) {
            setStatus('success');
            setTimeout(() => { if (isMounted) onSuccessRef.current(data.face_match_score ?? localMatch.score, data.verification_id, false); }, 1000);
          } else {
            setStatus('error');
            setErrorMsg(tRef.current('notRecognized'));
          }
        } catch (netErr) {
          if (!isMounted) return;
          if (netErr instanceof TypeError && localMatch.isMatch) {
            setStatus('success');
              setTimeout(() => { if (isMounted) onSuccessRef.current(localMatch.score, undefined, true); }, 1000);
          } else {
            throw netErr;
          }
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
  }, [stream, cachedDescriptor, employeeId]);

  return (
    <div className="fixed inset-0 z-[110] bg-black/95 flex flex-col items-center justify-center p-4 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-sm flex flex-col items-center gap-6 animate-scale-in">
        <h2 className="text-2xl font-bold text-white text-center">
          {status === 'success' ? t('successVerify') : t('verifyTitle')}
        </h2>

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
              className="w-full h-full object-cover"
              style={{ transform: 'scaleX(-1)' }}
            />
          )}
        </div>

        <div className="h-16 flex items-center justify-center w-full px-4 text-center">
          {status === 'loading_models' && <p className="text-white/70 animate-pulse">{t('loadingModels')}</p>}
          {status === 'starting_camera' && <p className="text-white/70">{t('startingCamera')}</p>}
          {status === 'ready' && <p className="text-white/70">{t('ready')}</p>}
          {status === 'processing' && <p className="text-blue-300 font-medium animate-pulse">{t('processing')}</p>}
          {status === 'error' && <p className="text-red-300 text-sm font-medium leading-tight">{errorMsg}</p>}
        </div>

        <div className="w-full flex gap-3 px-8 mt-2">
          <button
            onClick={onCancel}
            className="flex-1 py-3 px-4 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium transition-colors"
          >
            {t('cancel')}
          </button>
          {status === 'error' && (
            <button
              onClick={onCancel}
              className="flex-1 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-colors"
            >
              {t('retry')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
