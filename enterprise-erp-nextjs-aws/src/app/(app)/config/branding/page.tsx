'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { Loader2, Upload, X, RefreshCcw } from 'lucide-react';
import { toast } from 'sonner';

import { useBranding } from '@/providers/BrandingProvider';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type BrandingFormState = {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  sidebarBackground: string;
  sidebarTextColor: string;
};

const DEFAULT_FORM_STATE: BrandingFormState = {
  primaryColor: '#009ee2',
  secondaryColor: '#e8f5ff',
  accentColor: '#0088c7',
  sidebarBackground: '#f6fbff',
  sidebarTextColor: '#0b2b4f',
};

const COLOR_FIELDS: Array<{
  key: keyof BrandingFormState;
  label: string;
  description: string;
}> = [
  {
    key: 'primaryColor',
    label: 'Cor primária',
    description: 'Botões principais, destaques e links de ação.',
  },
  {
    key: 'accentColor',
    label: 'Cor de destaque',
    description: 'Estados de hover, badges e componentes secundários.',
  },
  {
    key: 'secondaryColor',
    label: 'Plano de fundo suave',
    description: 'Cartões informativos, estados neutros e tooltips.',
  },
  {
    key: 'sidebarBackground',
    label: 'Fundo do sidebar',
    description: 'Plano de fundo do menu lateral e overlays afins.',
  },
  {
    key: 'sidebarTextColor',
    label: 'Texto do sidebar',
    description: 'Títulos, ícones e textos em áreas de navegação.',
  },
];

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error('Erro ao ler arquivo'));
    reader.readAsDataURL(file);
  });
}

export default function BrandingConfigPage() {
  const { branding, loading, refresh } = useBranding();
  const [formState, setFormState] = useState<BrandingFormState>(DEFAULT_FORM_STATE);
  const [saving, setSaving] = useState(false);

  const [sidebarLogoFile, setSidebarLogoFile] = useState<File | null>(null);
  const [loginLogoFile, setLoginLogoFile] = useState<File | null>(null);
  const [sidebarLogoPreview, setSidebarLogoPreview] = useState<string | null>(null);
  const [loginLogoPreview, setLoginLogoPreview] = useState<string | null>(null);
  const [removeSidebarLogo, setRemoveSidebarLogo] = useState(false);
  const [removeLoginLogo, setRemoveLoginLogo] = useState(false);

  useEffect(() => {
    if (!loading && branding) {
      setFormState({
        primaryColor: branding.primaryColor,
        secondaryColor: branding.secondaryColor,
        accentColor: branding.accentColor,
        sidebarBackground: branding.sidebarBackground,
        sidebarTextColor: branding.sidebarTextColor,
      });
      setSidebarLogoPreview(branding.sidebarLogoDataUrl ?? null);
      setLoginLogoPreview(branding.loginLogoDataUrl ?? null);
      setSidebarLogoFile(null);
      setLoginLogoFile(null);
      setRemoveSidebarLogo(false);
      setRemoveLoginLogo(false);
    }
  }, [branding, loading]);

  const handleColorChange = (key: keyof BrandingFormState, value: string) => {
    setFormState(prev => ({ ...prev, [key]: value }));
  };

  const handleSidebarLogoChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Selecione uma imagem válida para o sidebar');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('A logo do sidebar deve ter no máximo 5MB');
      return;
    }

    try {
      const preview = await readFileAsDataUrl(file);
      setSidebarLogoFile(file);
      setSidebarLogoPreview(preview);
      setRemoveSidebarLogo(false);
    } catch (error) {
      console.error(error);
      toast.error('Não foi possível pré-visualizar a nova logo');
    }
  };

  const handleLoginLogoChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Selecione uma imagem válida para a tela de login');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('A logo da tela de login deve ter no máximo 5MB');
      return;
    }

    try {
      const preview = await readFileAsDataUrl(file);
      setLoginLogoFile(file);
      setLoginLogoPreview(preview);
      setRemoveLoginLogo(false);
    } catch (error) {
      console.error(error);
      toast.error('Não foi possível pré-visualizar a nova logo');
    }
  };

  const handleResetToDefaults = () => {
    setFormState(DEFAULT_FORM_STATE);
    setSidebarLogoFile(null);
    setLoginLogoFile(null);
    setSidebarLogoPreview(null);
    setLoginLogoPreview(null);
    setRemoveSidebarLogo(true);
    setRemoveLoginLogo(true);
    toast.info('As cores foram restauradas para o padrão. Salve para aplicar.');
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const formData = new FormData();
    Object.entries(formState).forEach(([key, value]) => {
      formData.append(key, value);
    });

    if (sidebarLogoFile) {
      formData.append('sidebarLogo', sidebarLogoFile);
    }
    if (loginLogoFile) {
      formData.append('loginLogo', loginLogoFile);
    }
    if (removeSidebarLogo) {
      formData.append('sidebarLogoRemove', 'true');
    }
    if (removeLoginLogo) {
      formData.append('loginLogoRemove', 'true');
    }

    try {
      setSaving(true);
      const response = await fetch('/api/config/branding', {
        method: 'PUT',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Erro ao salvar' }));
        throw new Error(error.error ?? 'Erro ao salvar');
      }

      await refresh();
      toast.success('Branding atualizado com sucesso');
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar branding');
    } finally {
      setSaving(false);
    }
  };

  const colorPreview = useMemo(
    () => ({
      background: formState.sidebarBackground,
      text: formState.sidebarTextColor,
      primary: formState.primaryColor,
      accent: formState.accentColor,
    }),
    [formState]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold">Branding & White Label</h2>
        <p className="text-muted-foreground">
          Personalize o ERP com a identidade visual da sua marca. As alterações são
          aplicadas imediatamente para todos os usuários.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Cores principais</CardTitle>
            <CardDescription>
              Defina a paleta utilizada nos botões, links, sidebar e componentes padrão.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {COLOR_FIELDS.map(field => (
                <div key={field.key} className="space-y-2">
                  <Label htmlFor={field.key}>{field.label}</Label>
                  <div className="flex items-center gap-3">
                    <Input
                      id={field.key}
                      type="color"
                      value={formState[field.key]}
                      onChange={event => handleColorChange(field.key, event.target.value)}
                      className="w-16 h-10 p-1"
                    />
                    <code className="text-sm px-2 py-1 rounded-md bg-muted text-foreground">
                      {formState[field.key]}
                    </code>
                  </div>
                  <p className="text-xs text-muted-foreground">{field.description}</p>
                </div>
              ))}
            </div>

            <div className="rounded-lg border border-border p-4">
              <p className="text-sm font-medium mb-3">Pré-visualização rápida</p>
              <div
                className="rounded-lg p-4 border"
                style={{
                  background: colorPreview.background,
                  color: colorPreview.text,
                  borderColor: colorPreview.accent,
                }}
              >
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-semibold">Botão primário</span>
                  <span
                    className="rounded-md px-3 py-1 text-sm"
                    style={{ background: colorPreview.primary, color: '#ffffff' }}
                  >
                    Ação principal
                  </span>
                  <span
                    className="rounded-md px-3 py-1 text-sm"
                    style={{ background: colorPreview.accent, color: '#ffffff' }}
                  >
                    Hover / Destaque
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Logotipos</CardTitle>
            <CardDescription>
              Atualize a logo usada no menu lateral e na tela de login. PNG com fundo
              transparente é recomendado para melhor resultado.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Logo do sidebar</Label>
                    <p className="text-xs text-muted-foreground">
                      Exibida no topo do menu lateral e no cabeçalho interno.
                    </p>
                  </div>
                  {sidebarLogoPreview ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setSidebarLogoFile(null);
                        setSidebarLogoPreview(null);
                        setRemoveSidebarLogo(true);
                      }}
                    >
                      <X className="h-4 w-4" />
                      <span className="sr-only">Remover logo do sidebar</span>
                    </Button>
                  ) : null}
                </div>

                {sidebarLogoPreview ? (
                  <div className="relative h-24 rounded-lg border bg-muted/40 flex items-center justify-center">
                    <Image
                      src={sidebarLogoPreview}
                      alt="Pré-visualização da logo do sidebar"
                      fill
                      className="object-contain p-4"
                      sizes="(max-width: 768px) 200px, 280px"
                      unoptimized
                    />
                  </div>
                ) : (
                  <div className="h-24 rounded-lg border border-dashed flex items-center justify-center text-sm text-muted-foreground">
                    Nenhuma logo definida
                  </div>
                )}

                <Button asChild variant="outline" type="button">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Upload className="h-4 w-4" />
                    Selecionar arquivo
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={handleSidebarLogoChange}
                    />
                  </label>
                </Button>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Logo da tela de login</Label>
                    <p className="text-xs text-muted-foreground">
                      Exibida para usuários que acessam o ERP antes de autenticar.
                    </p>
                  </div>
                  {loginLogoPreview ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setLoginLogoFile(null);
                        setLoginLogoPreview(null);
                        setRemoveLoginLogo(true);
                      }}
                    >
                      <X className="h-4 w-4" />
                      <span className="sr-only">Remover logo de login</span>
                    </Button>
                  ) : null}
                </div>

                {loginLogoPreview ? (
                  <div className="relative h-24 rounded-lg border bg-muted/40 flex items-center justify-center">
                    <Image
                      src={loginLogoPreview}
                      alt="Pré-visualização da logo da tela de login"
                      fill
                      className="object-contain p-4"
                      sizes="(max-width: 768px) 200px, 280px"
                      unoptimized
                    />
                  </div>
                ) : (
                  <div className="h-24 rounded-lg border border-dashed flex items-center justify-center text-sm text-muted-foreground">
                    Nenhuma logo definida
                  </div>
                )}

                <Button asChild variant="outline" type="button">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Upload className="h-4 w-4" />
                    Selecionar arquivo
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={handleLoginLogoChange}
                    />
                  </label>
                </Button>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleResetToDefaults}
              className="gap-2"
            >
              <RefreshCcw className="h-4 w-4" />
              Restaurar padrão
            </Button>
            <Button type="submit" disabled={saving} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Salvar alterações
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}

