'use client';

import { useState, useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { captureLiveFace, loadFaceModels, attachStreamToVideo, cameraErrorMessage } from '@/lib/face-recognition';

interface Props {
  employeeId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function BiometricSetup({ employeeId, onSuccess, onCancel }: Props) {
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
        console.error('Biometric setup error:', err);
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

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !stream) return;
    let isMounted = true;

    attachStreamToVideo(video, stream)
      .then(() => {
        if (isMounted) setStatus(current => (current === 'starting_camera' ? 'ready' : current));
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error('Biometric video attach error:', err);
        setStatus('error');
        setErrorMsg(cameraErrorMessage(err));
      });

    return () => {
      isMounted = false;
    };
  }, [stream]);

  const handleCapture = async () => {
    if (!videoRef.current) return;

    setStatus('processing');
    try {
      const live = await captureLiveFace(videoRef.current);
      if (!live) {
        throw new Error(t('livenessFailed'));
      }

      const faceEncodingStr = JSON.stringify(Array.from(live.descriptor));
      const res = await fetch('/api/employee/face-recognition/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: employeeId,
          face_encoding: faceEncodingStr,
        })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || t('registerFailed'));
      }

      setStatus('success');
      setTimeout(() => {
        onSuccess();
      }, 1500);
    } catch (err: unknown) {
      console.error(err);
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : t('livenessFailed'));
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
      <div className="bg-[var(--card)] w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-[var(--border)] animate-scale-in flex flex-col">
        <div className="p-5 border-b border-[var(--border)] text-center">
          <h2 className="text-xl font-bold text-[var(--foreground)]">{t('setupTitle')}</h2>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">{t('setupSubtitle')}</p>
        </div>

        <div className="relative bg-black aspect-video flex-shrink-0 flex items-center justify-center overflow-hidden">
          {stream && (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover transition-opacity duration-300 ${status === 'processing' ? 'opacity-50' : 'opacity-100'}`}
              style={{ transform: 'scaleX(-1)' }}
            />
          )}

          <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
            {status === 'loading_models' && (
              <div className="bg-black/60 text-white px-4 py-2 rounded-lg backdrop-blur-md flex items-center gap-3">
                <span className="font-medium text-sm text-center">{t('loadingModels')}</span>
              </div>
            )}
            {status === 'starting_camera' && (
              <div className="bg-black/60 text-white px-4 py-2 rounded-lg backdrop-blur-md">
                <span className="font-medium text-sm text-center">{t('startingCamera')}</span>
              </div>
            )}
            {status === 'processing' && (
              <div className="bg-blue-600/90 text-white px-4 py-2 rounded-lg backdrop-blur-md flex items-center gap-3 animate-pulse">
                <span className="font-medium text-sm">{t('processing')}</span>
              </div>
            )}
            {status === 'success' && (
              <div className="bg-green-500/90 text-white p-4 rounded-full backdrop-blur-md animate-scale-in">
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
              </div>
            )}
          </div>

          {status === 'ready' && (
            <div className="absolute inset-0 pointer-events-none p-8 flex items-center justify-center">
              <div className="w-48 h-56 border-2 border-white/50 rounded-full border-dashed" />
            </div>
          )}
        </div>

        <div className="p-5 flex flex-col gap-3">
          {status === 'ready' && (
            <p className="text-sm text-center text-[var(--muted-foreground)]">{t('ready')}</p>
          )}
          {status === 'error' && (
            <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg text-sm text-center border border-red-200 dark:border-red-800">
              <span className="font-bold">{t('errorPrefix')}</span> {errorMsg}
            </div>
          )}

          <button
            onClick={handleCapture}
            disabled={status !== 'ready' && status !== 'error'}
            className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {status === 'success' ? t('successEnroll') : status === 'ready' || status === 'error' ? t('capture') : '...'}
          </button>

          <button
            onClick={onCancel}
            disabled={status === 'processing' || status === 'success'}
            className="w-full h-10 rounded-xl bg-transparent border border-[var(--border)] hover:bg-[var(--muted)] text-[var(--foreground)] font-medium transition-all"
          >
            {t('cancel')}
          </button>
        </div>
      </div>
    </div>
  );
}
