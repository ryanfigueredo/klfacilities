"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

import { ImageUpload } from '../../_components/ImageUpload';

interface NovaRotaFormProps {
  vehicle:
    | {
        id: string;
        placa: string;
        modelo: string | null;
      }
    | null;
}

export function NovaRotaForm({ vehicle }: NovaRotaFormProps) {
  const router = useRouter();
  const [kmSaida, setKmSaida] = useState('');
  const [partida, setPartida] = useState('');
  const [destino, setDestino] = useState('');
  const [fotoKm, setFotoKm] = useState<File | null>(null);
  const [alterouRota, setAlterouRota] = useState(false);
  const [alteracaoRota, setAlteracaoRota] = useState('');
  const [realizouAbastecimento, setRealizouAbastecimento] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!vehicle?.id) {
      toast.warning('Vincule um veículo antes de registrar a rota.');
      return;
    }
    if (!fotoKm) {
      toast.warning('A foto do odômetro é obrigatória.');
      return;
    }
    if (!kmSaida || !partida || !destino) {
      toast.warning('Preencha todos os campos obrigatórios.');
      return;
    }

    const formData = new FormData();
    formData.append('kmSaida', kmSaida);
    formData.append('partida', partida);
    formData.append('destino', destino);
    formData.append('alterouRota', String(alterouRota));
    if (alterouRota) {
      formData.append('alteracaoRota', alteracaoRota);
    }
    formData.append('realizouAbastecimento', String(realizouAbastecimento));
    formData.append('veiculoId', vehicle.id);
    formData.append('fotoKm', fotoKm);

    try {
      setSubmitting(true);
      const response = await fetch('/api/controle-gasolina/rotas', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => null);
        throw new Error(error?.error || 'Falha ao registrar rota');
      }

      toast.success('Rota registrada com sucesso.');
      router.push('/operacional/controle-gasolina');
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error ? error.message : 'Erro ao registrar a rota.'
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Registrar nova rota</CardTitle>
        {vehicle ? (
          <p className="text-sm text-muted-foreground">
            Veículo: <span className="font-medium">{vehicle.placa}</span>
            {vehicle.modelo ? ` · ${vehicle.modelo}` : null}
          </p>
        ) : (
          <p className="text-sm text-destructive">
            Nenhum veículo vinculado. Solicite o administrador.
          </p>
        )}
      </CardHeader>
      <CardContent>
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Foto do odômetro *</Label>
            <ImageUpload
              onChange={file => setFotoKm(file)}
              label="Tirar foto do odômetro"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="kmSaida">KM de saída *</Label>
              <Input
                id="kmSaida"
                type="number"
                inputMode="numeric"
                value={kmSaida}
                onChange={event => setKmSaida(event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="partida">Local de partida *</Label>
              <Input
                id="partida"
                value={partida}
                onChange={event => setPartida(event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="destino">Local de destino *</Label>
              <Input
                id="destino"
                value={destino}
                onChange={event => setDestino(event.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex items-center justify-between rounded-md border p-3">
              <div className="space-y-1">
                <Label>Alterou a rota?</Label>
                <p className="text-xs text-muted-foreground">
                  Informe se houve alteração de percurso.
                </p>
              </div>
              <Switch
                checked={alterouRota}
                onCheckedChange={value => setAlterouRota(value)}
              />
            </div>

            <div className="flex items-center justify-between rounded-md border p-3">
              <div className="space-y-1">
                <Label>Realizou abastecimento?</Label>
                <p className="text-xs text-muted-foreground">
                  Marque se o abastecimento ocorreu nesta rota.
                </p>
              </div>
              <Switch
                checked={realizouAbastecimento}
                onCheckedChange={value => setRealizouAbastecimento(value)}
              />
            </div>
          </div>

          {alterouRota && (
            <div className="space-y-2">
              <Label htmlFor="alteracaoRota">Descreva a alteração *</Label>
              <Input
                id="alteracaoRota"
                value={alteracaoRota}
                onChange={event => setAlteracaoRota(event.target.value)}
                required
              />
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting || !vehicle}>
              {submitting ? 'Registrando…' : 'Registrar rota'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

