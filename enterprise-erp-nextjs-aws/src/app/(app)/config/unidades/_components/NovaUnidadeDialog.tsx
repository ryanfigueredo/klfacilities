'use client';
import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { createUnidadeWithMapping } from '../actions';
import { toast } from 'sonner';

type Opt = { id: string; nome: string };

// Estados brasileiros com siglas
const ESTADOS_BRASIL = [
  { sigla: 'AC', nome: 'Acre' },
  { sigla: 'AL', nome: 'Alagoas' },
  { sigla: 'AP', nome: 'Amapá' },
  { sigla: 'AM', nome: 'Amazonas' },
  { sigla: 'BA', nome: 'Bahia' },
  { sigla: 'CE', nome: 'Ceará' },
  { sigla: 'DF', nome: 'Distrito Federal' },
  { sigla: 'ES', nome: 'Espírito Santo' },
  { sigla: 'GO', nome: 'Goiás' },
  { sigla: 'MA', nome: 'Maranhão' },
  { sigla: 'MT', nome: 'Mato Grosso' },
  { sigla: 'MS', nome: 'Mato Grosso do Sul' },
  { sigla: 'MG', nome: 'Minas Gerais' },
  { sigla: 'PA', nome: 'Pará' },
  { sigla: 'PB', nome: 'Paraíba' },
  { sigla: 'PR', nome: 'Paraná' },
  { sigla: 'PE', nome: 'Pernambuco' },
  { sigla: 'PI', nome: 'Piauí' },
  { sigla: 'RJ', nome: 'Rio de Janeiro' },
  { sigla: 'RN', nome: 'Rio Grande do Norte' },
  { sigla: 'RS', nome: 'Rio Grande do Sul' },
  { sigla: 'RO', nome: 'Rondônia' },
  { sigla: 'RR', nome: 'Roraima' },
  { sigla: 'SC', nome: 'Santa Catarina' },
  { sigla: 'SP', nome: 'São Paulo' },
  { sigla: 'SE', nome: 'Sergipe' },
  { sigla: 'TO', nome: 'Tocantins' },
];

export default function NovaUnidadeDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [nome, setNome] = useState('');
  const [grupoId, setGrupoId] = useState<string>('');
  const [estado, setEstado] = useState<string>('');
  const [cidade, setCidade] = useState<string>('');
  const [grupos, setGrupos] = useState<Opt[]>([]);
  const [cidadesDisponiveis, setCidadesDisponiveis] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    const url = new URL('/api/unidades/form-options', window.location.origin);
    const d = await fetch(url).then(r => r.json());
    setGrupos(Array.isArray(d.grupos) ? d.grupos : []);

    // Carregar cidades existentes
    try {
      const unidadesRes = await fetch(
        '/api/unidades?view=table&status=todas&pageSize=1000'
      );
      if (unidadesRes.ok) {
        const unidadesData = await unidadesRes.json();
        const rows: any[] = Array.isArray(unidadesData?.rows)
          ? unidadesData.rows
          : Array.isArray(unidadesData)
            ? unidadesData
            : [];
        const cidadesUnicas: string[] = Array.from(
          new Set(
            rows
              .map((r: any) => r.cidade)
              .filter((c: any): c is string => Boolean(c))
          )
        ) as string[];
        cidadesUnicas.sort();
        setCidadesDisponiveis(cidadesUnicas);
      }
    } catch (e) {
      console.warn('Erro ao carregar cidades:', e);
    }
  }

  useEffect(() => {
    if (open) {
      load();
      // Resetar campos ao abrir
      setNome('');
      setGrupoId('');
      setEstado('');
      setCidade('');
    }
  }, [open]);

  async function onSubmit() {
    if (!nome || !grupoId) {
      toast.error('Nome e grupo são obrigatórios');
      return;
    }
    setLoading(true);
    try {
      await createUnidadeWithMapping({
        nome: nome.trim(),
        grupoId,
        estado: estado.trim() || null,
        cidade: cidade.trim() || null,
      });
      setNome('');
      setGrupoId('');
      setEstado('');
      setCidade('');
      onOpenChange(false);
      toast.success('Unidade criada com sucesso');
      // Recarregar a página para atualizar a lista
      window.location.reload();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erro ao criar unidade';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        a11yTitle="Nova Unidade"
        aria-describedby="nova-unidade-desc"
      >
        <DialogHeader>
          <DialogTitle>Nova Unidade</DialogTitle>
          <DialogDescription id="nova-unidade-desc">
            Informe os dados da unidade para criá-la.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Nome da Unidade *</Label>
            <Input
              value={nome}
              onChange={e => setNome(e.target.value)}
              placeholder="Ex.: Barra Funda"
            />
          </div>

          <div>
            <Label>Grupo *</Label>
            <Select value={grupoId} onValueChange={setGrupoId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o grupo" />
              </SelectTrigger>
              <SelectContent>
                {grupos.map(g => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Estado</Label>
            <Select value={estado} onValueChange={setEstado}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o estado" />
              </SelectTrigger>
              <SelectContent>
                {ESTADOS_BRASIL.map(est => (
                  <SelectItem key={est.sigla} value={est.sigla}>
                    {est.sigla} - {est.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Cidade</Label>
            <div className="space-y-2">
              <Select
                value={
                  cidade && cidadesDisponiveis.includes(cidade)
                    ? cidade
                    : undefined
                }
                onValueChange={v => {
                  setCidade(v);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione uma cidade existente ou digite uma nova" />
                </SelectTrigger>
                <SelectContent>
                  {cidadesDisponiveis.map(c => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2">
                <div className="h-px flex-1 bg-border"></div>
                <span className="text-xs text-muted-foreground">ou</span>
                <div className="h-px flex-1 bg-border"></div>
              </div>
              <Input
                type="text"
                value={
                  cidade && !cidadesDisponiveis.includes(cidade) ? cidade : ''
                }
                onChange={e => setCidade(e.target.value)}
                placeholder="Digite para criar uma nova cidade"
                className="w-full"
                onFocus={e => {
                  // Se já tinha uma cidade selecionada da lista, limpa para permitir digitar nova
                  if (cidade && cidadesDisponiveis.includes(cidade)) {
                    setCidade('');
                  }
                }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {cidadesDisponiveis.length > 0
                ? `Selecione uma das ${cidadesDisponiveis.length} cidades existentes ou digite para criar uma nova.`
                : 'Digite o nome da cidade. Cidades são compartilhadas entre unidades.'}
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={onSubmit} disabled={loading || !nome || !grupoId}>
              {loading ? 'Salvando...' : 'Criar Unidade'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
