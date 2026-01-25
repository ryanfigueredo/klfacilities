'use client';

import useSWR from 'swr';
import { useState, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Camera, Upload, Save, Lock } from 'lucide-react';
import { toast } from 'sonner';

const fetcher = (u: string) => fetch(u).then(r => r.json());

export default function PerfilPage() {
  const { data, mutate } = useSWR('/api/profile', fetcher);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [cur, setCur] = useState('');
  const [nw, setNw] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const ready = !!data;

  // preload
  if (ready && !name && !email) {
    setName(data.name ?? '');
    setEmail(data.email ?? '');
  }

  const initials = name
    .split(' ')
    .map((s: string) => s[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  async function saveProfile() {
    setLoading(true);
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email }),
      });
      
      if (res.ok) {
        await mutate();
        toast.success('Perfil atualizado com sucesso');
      } else {
        toast.error('Erro ao salvar perfil');
      }
    } catch (error) {
      toast.error('Erro ao salvar perfil');
    } finally {
      setLoading(false);
    }
  }

  async function changePassword() {
    if (!nw || nw.length < 6) {
      toast.error('Senha nova deve ter 6+ caracteres');
      return;
    }
    
    setLoading(true);
    try {
      const res = await fetch('/api/profile/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: cur, newPassword: nw }),
      });
      
      if (res.ok) {
        setCur('');
        setNw('');
        toast.success('Senha alterada com sucesso');
      } else {
        const j = await res.json();
        toast.error(j?.error ?? 'Erro ao alterar senha');
      }
    } catch (error) {
      toast.error('Erro ao alterar senha');
    } finally {
      setLoading(false);
    }
  }

  async function handlePhotoUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar tipo e tamanho
    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecione uma imagem válida');
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB
      toast.error('A imagem deve ter menos de 5MB');
      return;
    }

    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append('photo', file);

      const res = await fetch('/api/profile/photo', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        await mutate();
        toast.success('Foto atualizada com sucesso');
      } else {
        toast.error('Erro ao fazer upload da foto');
      }
    } catch (error) {
      toast.error('Erro ao fazer upload da foto');
    } finally {
      setUploadingPhoto(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Perfil</h1>
        <p className="text-muted-foreground">
          Gerencie suas informações pessoais e configurações de conta
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Informações do Perfil */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Informações do Perfil
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Foto do Perfil */}
            <div className="flex items-center gap-4">
              <div className="relative">
                <Avatar className="w-20 h-20">
                  <AvatarImage src={data?.photoUrl} alt={name} />
                  <AvatarFallback className="text-lg">{initials}</AvatarFallback>
                </Avatar>
                <Button
                  size="sm"
                  variant="outline"
                  className="absolute -bottom-1 -right-1 h-8 w-8 p-0 rounded-full"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingPhoto}
                >
                  <Upload className="h-4 w-4" />
                </Button>
              </div>
              <div>
                <p className="text-sm font-medium">Foto do perfil</p>
                <p className="text-xs text-muted-foreground">
                  Clique no ícone para alterar sua foto
                </p>
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
              className="hidden"
            />

            <Separator />

            {/* Dados do Perfil */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome completo</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Seu nome completo"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                />
              </div>

              <Button 
                onClick={saveProfile} 
                disabled={loading}
                className="w-full"
              >
                <Save className="h-4 w-4 mr-2" />
                {loading ? 'Salvando...' : 'Salvar alterações'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Alterar Senha */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Alterar Senha
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Senha atual</Label>
              <Input
                id="currentPassword"
                type="password"
                value={cur}
                onChange={e => setCur(e.target.value)}
                placeholder="Digite sua senha atual"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="newPassword">Nova senha</Label>
              <Input
                id="newPassword"
                type="password"
                value={nw}
                onChange={e => setNw(e.target.value)}
                placeholder="Digite a nova senha"
              />
              <p className="text-xs text-muted-foreground">
                A senha deve ter pelo menos 6 caracteres
              </p>
            </div>

            <Button
              variant="secondary"
              onClick={changePassword}
              disabled={loading}
              className="w-full"
            >
              <Lock className="h-4 w-4 mr-2" />
              {loading ? 'Alterando...' : 'Alterar senha'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
