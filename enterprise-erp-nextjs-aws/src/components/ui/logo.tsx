'use client';

import { useTheme } from 'next-themes';
import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import { useBranding } from '@/providers/BrandingProvider';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'sidebar' | 'login';
}

/**
 * Comportamento:
 * - O wrapper define as dimensões-máximas.
 * - <Image fill object-contain> preserva a proporção sem crop e sem distorcer.
 * - O width/height reais do arquivo deixam de forçar quadrado.
 * - Evita warnings de hidratação mantendo o skeleton até montar.
 */
export function Logo({ className = '', size = 'md', variant = 'sidebar' }: LogoProps) {
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string>('');
  const { branding } = useBranding();
  const isLoginVariant = variant === 'login';
  const customLogo = useMemo(() => {
    if (isLoginVariant) {
      return branding.loginLogoDataUrl ?? null;
    }
    return branding.sidebarLogoDataUrl ?? null;
  }, [branding.loginLogoDataUrl, branding.sidebarLogoDataUrl, isLoginVariant]);
  
  // Dimensões do BOX por tamanho (ajuste os valores de largura conforme seu header)
  const sizeToBox: Record<'sm' | 'md' | 'lg', string> = {
    // altura fixa + largura-limite; object-contain mantém proporção
    sm: 'h-6 w-[96px]', // ~24px x 96px
    md: 'h-10 w-[160px]', // ~40px x 160px
    lg: 'h-16 w-[256px]', // ~64px x 256px
  };

  const box = sizeToBox[size] ?? sizeToBox.md;
  const currentTheme = resolvedTheme || theme;
  const isLight = (currentTheme ?? 'light') === 'light';
  const assetName = isLight ? 'logo-kl-light.png' : 'logo-kl-dark.svg';
  const useS3 = process.env.NEXT_PUBLIC_USE_S3_ASSETS === 'true';

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted) return;
    
    if (customLogo) {
      setLogoUrl(customLogo);
      return;
    }

    setLogoUrl('');

    if (useS3) {
      fetch(`/api/assets/${encodeURIComponent(assetName)}`)
        .then(res => {
          if (res.ok) {
            return res.text();
          }
          throw new Error('Failed to get asset URL');
        })
        .then(url => setLogoUrl(url))
        .catch(() => {
          setLogoUrl(`/${assetName}`);
        });
    } else {
      setLogoUrl(`/${assetName}`);
    }
  }, [assetName, useS3, mounted, customLogo]);

  if (!mounted || !logoUrl) {
    return (
      <div className={`relative ${box} ${className}`}>
        <div className="absolute inset-0 rounded bg-gray-200/60 animate-pulse" />
      </div>
    );
  }

  const isCustomLogo = Boolean(customLogo);
  const altText = isCustomLogo ? 'Logo personalizada' : 'KL Financeiro';

  return (
    <div
      className={`relative ${box} shrink-0 ${className}`}
      aria-label={altText}
    >
      <Image
        src={logoUrl}
        alt={altText}
        fill
        priority
        className="object-contain overflow-clip"
        sizes="(max-width: 640px) 120px, (max-width: 1024px) 160px, 256px"
        unoptimized={useS3 || isCustomLogo}
      />
    </div>
  );
}
