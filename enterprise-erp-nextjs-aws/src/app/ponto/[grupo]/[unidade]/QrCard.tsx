'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

export function QrCard({ url }: { url: string }) {
  const [src, setSrc] = useState('');

  useEffect(() => {
    // Garantir que estamos no cliente
    if (typeof window === 'undefined') return;
    
    (async () => {
      try {
        const QRCode = (await import('qrcode')).default;
        const absolute = url.startsWith('http')
          ? url
          : new URL(url, window.location.origin).toString();
        const dataUrl = await QRCode.toDataURL(absolute, {
          width: 240,
          margin: 2,
        });
        setSrc(dataUrl);
      } catch (error) {
        console.error('Erro ao gerar QR code:', error);
      }
    })();
  }, [url]);

  const printQr = () => {
    if (typeof window === 'undefined' || !src) return;
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(
      `<!doctype html><title>QR</title><body style="margin:0;display:flex;align-items:center;justify-content:center;height:100vh"><img src="${src}" style="width:360px;height:360px"/></body>`
    );
    win.document.close();
    win.focus();
    win.print();
  };

  if (!src) return null;

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <Image src={src} alt="QR" width={160} height={160} className="w-40 h-40 border rounded object-contain" unoptimized />
      <button onClick={printQr} className="px-2 py-1 rounded border text-sm">
        Imprimir QR
      </button>
    </div>
  );
}
