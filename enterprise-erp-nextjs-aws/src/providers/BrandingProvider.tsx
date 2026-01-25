'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

export interface BrandingSettings {
  id: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  sidebarBackground: string;
  sidebarTextColor: string;
  sidebarLogoDataUrl: string | null;
  loginLogoDataUrl: string | null;
  updatedAt: string | null;
  updatedById: string | null;
}

interface BrandingContextValue {
  branding: BrandingSettings;
  loading: boolean;
  refresh: () => Promise<void>;
  setBranding: (settings: BrandingSettings) => void;
}

const DEFAULT_BRANDING: BrandingSettings = {
  id: 'default',
  primaryColor: '#009ee2',
  secondaryColor: '#e8f5ff',
  accentColor: '#0088c7',
  sidebarBackground: '#f6fbff',
  sidebarTextColor: '#0b2b4f',
  sidebarLogoDataUrl: null,
  loginLogoDataUrl: null,
  updatedAt: null,
  updatedById: null,
};

const BrandingContext = createContext<BrandingContextValue>({
  branding: DEFAULT_BRANDING,
  loading: true,
  refresh: async () => {},
  setBranding: () => {},
});

function normalizeHex(color: string): string {
  if (!color) return '#000000';
  const trimmed = color.trim().toLowerCase();
  const hexRegex = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/;
  if (!hexRegex.test(trimmed)) {
    return '#000000';
  }
  if (trimmed.length === 4) {
    const r = trimmed[1];
    const g = trimmed[2];
    const b = trimmed[3];
    return `#${r}${r}${g}${g}${b}${b}`;
  }
  if (trimmed.length === 9) {
    return trimmed.slice(0, 7);
  }
  return trimmed;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const normalized = normalizeHex(hex);
  const bigint = parseInt(normalized.slice(1), 16);
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255,
  };
}

function mixColors(colorA: string, colorB: string, weight: number) {
  const w = Math.min(Math.max(weight, 0), 1);
  const { r: rA, g: gA, b: bA } = hexToRgb(colorA);
  const { r: rB, g: gB, b: bB } = hexToRgb(colorB);

  const r = Math.round(rA * (1 - w) + rB * w);
  const g = Math.round(gA * (1 - w) + gB * w);
  const b = Math.round(bA * (1 - w) + bB * w);

  const toHex = (value: number) => value.toString(16).padStart(2, '0');

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function getContrastColor(color: string) {
  const { r, g, b } = hexToRgb(color);
  const [rLin, gLin, bLin] = [r, g, b].map(value => {
    const channel = value / 255;
    return channel <= 0.03928
      ? channel / 12.92
      : Math.pow((channel + 0.055) / 1.055, 2.4);
  });

  const luminance = 0.2126 * rLin + 0.7152 * gLin + 0.0722 * bLin;
  return luminance > 0.55 ? '#061426' : '#ffffff';
}

function applyBrandingToCss(branding: BrandingSettings) {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;

  const primary = normalizeHex(branding.primaryColor || DEFAULT_BRANDING.primaryColor);
  const secondary = normalizeHex(
    branding.secondaryColor || DEFAULT_BRANDING.secondaryColor
  );
  const accent = normalizeHex(branding.accentColor || DEFAULT_BRANDING.accentColor);
  const sidebarBg = normalizeHex(
    branding.sidebarBackground || DEFAULT_BRANDING.sidebarBackground
  );
  const sidebarText = normalizeHex(
    branding.sidebarTextColor || DEFAULT_BRANDING.sidebarTextColor
  );

  const primaryForeground = getContrastColor(primary);
  const secondaryForeground = getContrastColor(secondary);
  const accentForeground = getContrastColor(accent);
  const sidebarPrimaryForeground = getContrastColor(primary);
  const borderColor = mixColors(sidebarBg, sidebarText, 0.12);
  const mutedBackground = mixColors(secondary, '#ffffff', 0.35);
  const mutedForeground = mixColors(sidebarText, '#1f2937', 0.25);

  root.style.setProperty('--primary', primary);
  root.style.setProperty('--primary-foreground', primaryForeground);
  root.style.setProperty('--ring', primary);

  root.style.setProperty('--secondary', secondary);
  root.style.setProperty('--secondary-foreground', secondaryForeground);

  root.style.setProperty('--accent', accent);
  root.style.setProperty('--accent-foreground', accentForeground);

  root.style.setProperty('--muted', mutedBackground);
  root.style.setProperty('--muted-foreground', mutedForeground);

  root.style.setProperty('--foreground', sidebarText);
  root.style.setProperty('--border', borderColor);
  root.style.setProperty('--input', borderColor);

  root.style.setProperty('--sidebar', sidebarBg);
  root.style.setProperty('--sidebar-foreground', sidebarText);
  root.style.setProperty('--sidebar-primary', primary);
  root.style.setProperty('--sidebar-primary-foreground', sidebarPrimaryForeground);
  root.style.setProperty('--sidebar-accent', accent);
  root.style.setProperty('--sidebar-accent-foreground', accentForeground);
  root.style.setProperty('--sidebar-border', borderColor);
  root.style.setProperty('--sidebar-ring', primary);
}

function mapResponseToBranding(data: Partial<BrandingSettings>): BrandingSettings {
  return {
    id: data.id ?? DEFAULT_BRANDING.id,
    primaryColor: data.primaryColor ?? DEFAULT_BRANDING.primaryColor,
    secondaryColor: data.secondaryColor ?? DEFAULT_BRANDING.secondaryColor,
    accentColor: data.accentColor ?? DEFAULT_BRANDING.accentColor,
    sidebarBackground: data.sidebarBackground ?? DEFAULT_BRANDING.sidebarBackground,
    sidebarTextColor: data.sidebarTextColor ?? DEFAULT_BRANDING.sidebarTextColor,
    sidebarLogoDataUrl: data.sidebarLogoDataUrl ?? DEFAULT_BRANDING.sidebarLogoDataUrl,
    loginLogoDataUrl: data.loginLogoDataUrl ?? DEFAULT_BRANDING.loginLogoDataUrl,
    updatedAt: data.updatedAt ?? DEFAULT_BRANDING.updatedAt,
    updatedById: data.updatedById ?? DEFAULT_BRANDING.updatedById,
  };
}

export function BrandingProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [branding, setBranding] = useState<BrandingSettings>(DEFAULT_BRANDING);
  const [loading, setLoading] = useState(true);

  const loadBranding = useCallback(async () => {
    try {
      const response = await fetch('/api/config/branding', {
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error('Falha ao carregar branding');
      }

      const data = await response.json();
      const mapped = mapResponseToBranding(data);
      setBranding(mapped);
    } catch (error) {
      console.error('Erro ao carregar branding', error);
      setBranding(DEFAULT_BRANDING);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBranding();
  }, [loadBranding]);

  useEffect(() => {
    applyBrandingToCss(branding);
  }, [branding]);

  const value = useMemo<BrandingContextValue>(() => ({
    branding,
    loading,
    refresh: async () => {
      setLoading(true);
      await loadBranding();
    },
    setBranding: (settings: BrandingSettings) => {
      setBranding(settings);
    },
  }), [branding, loading, loadBranding]);

  return (
    <BrandingContext.Provider value={value}>{children}</BrandingContext.Provider>
  );
}

export function useBranding() {
  return useContext(BrandingContext);
}

