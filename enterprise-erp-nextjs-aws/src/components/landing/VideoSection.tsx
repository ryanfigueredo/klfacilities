'use client';

import React, { useRef, useEffect, useState } from 'react';

export function VideoSection() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoUrl, setVideoUrl] = useState<string>('');
  const useS3 = process.env.NEXT_PUBLIC_USE_S3_ASSETS === 'true';

  useEffect(() => {
    if (useS3) {
      fetch('/api/assets/movie.mp4')
        .then(res => res.ok ? res.text() : Promise.reject())
        .then(url => setVideoUrl(url))
        .catch(() => setVideoUrl('/movie.mp4'));
    } else {
      setVideoUrl('/movie.mp4');
    }
  }, [useS3]);

  useEffect(() => {
    const video = videoRef.current;
    if (video && videoUrl) {
      // Garantir loop infinito suave
      video.loop = true;
      
      const handleTimeUpdate = () => {
        // Cortar o vídeo em 28 segundos para evitar o final feio e fazer loop infinito
        if (video.currentTime >= 28) {
          video.currentTime = 0;
          video.play().catch(() => {});
        }
      };

      const handleEnded = () => {
        // Garantir que reinicie automaticamente
        video.currentTime = 0;
        video.play().catch(() => {});
      };

      video.addEventListener('timeupdate', handleTimeUpdate);
      video.addEventListener('ended', handleEnded);
      
      // Carregar e tocar automaticamente
      video.load();
      video.play().catch(() => {
        // Ignorar erros de autoplay
      });

      return () => {
        video.removeEventListener('timeupdate', handleTimeUpdate);
        video.removeEventListener('ended', handleEnded);
      };
    }
  }, [videoUrl]);

  return (
    <div id="operacoes" className="relative w-full py-16 sm:py-24 bg-gradient-to-b from-slate-50 via-white to-slate-50 scroll-mt-20">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mb-12 text-center">
          <p className="text-sm font-medium text-[#0088c7] mb-3 uppercase tracking-wide">
            Nossas Operações
          </p>
          <h2 className="text-4xl sm:text-5xl font-bold text-[#1a1d5e] mb-6 max-w-3xl mx-auto leading-tight">
            Veja a{' '}
            <span className="bg-gradient-to-r from-[#009ee2] to-[#006996] bg-clip-text text-transparent">excelência</span>{' '}
            em ação
          </h2>
        </div>
        
        {/* Container com altura fixa para remover barras pretas */}
        <div className="relative w-full rounded-2xl overflow-hidden shadow-2xl bg-black" style={{ aspectRatio: '16/9', height: 'auto' }}>
          {videoUrl && (
            <video
              ref={videoRef}
              autoPlay
              muted
              loop
              playsInline
              className="w-full h-full overflow-clip"
              style={{
                objectFit: 'cover', // Corta as bordas para preencher completamente
                objectPosition: 'center', // Centraliza o vídeo
                display: 'block',
                width: '100%',
                height: '100%',
              }}
            >
              <source src={videoUrl} type="video/mp4" />
              Seu navegador não suporta vídeos.
            </video>
          )}
        </div>
      </div>
    </div>
  );
}

