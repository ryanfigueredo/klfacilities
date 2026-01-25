'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';
import { toast } from 'sonner';
import { getUrgenciaColor, getUrgenciaLabel } from '@/lib/urgencia-helper';

type Grupo = { id: string; nome: string };
type Unidade = { id: string; nome: string; grupoId?: string };

interface CategoriaUrgencia {
  id: string;
  urgenciaNivel: 'CRITICA' | 'ALTA' | 'NORMAL' | 'BAIXA' | 'MUITO_BAIXA';
  nome: string;
  prazoHoras: number;
  descricao: string | null;
  ordem: number;
}

export default function ChamadosPage() {
  const [email, setEmail] = useState('');
  const [categoriaUrgenciaId, setCategoriaUrgenciaId] = useState<string>('');
  const [descricao, setDescricao] = useState('');
  const [imagem, setImagem] = useState<File | null>(null);
  const [grupoId, setGrupoId] = useState<string>('');
  const [unidadeId, setUnidadeId] = useState<string>('');
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [categorias, setCategorias] = useState<CategoriaUrgencia[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [loadingCategorias, setLoadingCategorias] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailValidated, setEmailValidated] = useState(false);

  // Carregar categorias ao montar o componente
  useEffect(() => {
    const loadCategorias = async () => {
      try {
        const response = await fetch('/api/chamados/categorias');
        if (response.ok) {
          const data = await response.json();
          setCategorias(data.categorias || []);
        }
      } catch (error) {
        console.error('Erro ao carregar categorias:', error);
      } finally {
        setLoadingCategorias(false);
      }
    };
    loadCategorias();
  }, []);

  // Buscar grupos e unidades permitidos quando email for informado
  useEffect(() => {
    // Validar formato básico de email antes de fazer requisição
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isValidFormat = emailRegex.test(email);
    
    if (!email || !isValidFormat || email.length < 5) {
      setGrupos([]);
      setUnidades([]);
      setGrupoId('');
      setUnidadeId('');
      setEmailValidated(false);
      setError(null);
      setLoadingOptions(false);
      return;
    }

    // Debounce maior para evitar muitas requisições enquanto digita
    const timeoutId = setTimeout(async () => {
      try {
        setLoadingOptions(true);
        setError(null);
        
        const response = await fetch(
          `/api/chamados/opcoes?email=${encodeURIComponent(email.trim())}`
        );

        if (!response.ok) {
          const data = await response.json();
          setError(data.error || 'Email não encontrado ou inativo');
          setGrupos([]);
          setUnidades([]);
          setGrupoId('');
          setUnidadeId('');
          setEmailValidated(false);
          setLoadingOptions(false);
          return;
        }

        const data = await response.json();
        
        const gruposRecebidos = Array.isArray(data.grupos) ? data.grupos : [];
        const unidadesRecebidas = Array.isArray(data.unidades) ? data.unidades : [];
        
        setGrupos(gruposRecebidos);
        setUnidades(unidadesRecebidas);
        setEmailValidated(true);
        setError(null);

        // Se houver apenas um grupo, selecionar automaticamente
        if (gruposRecebidos.length === 1) {
          setGrupoId(gruposRecebidos[0].id);
        } else {
          setGrupoId('');
        }

        // Se houver apenas uma unidade e não houver grupos para escolher, selecionar automaticamente
        if (unidadesRecebidas.length === 1 && gruposRecebidos.length === 0) {
          setUnidadeId(unidadesRecebidas[0].id);
        } else {
          setUnidadeId('');
        }
      } catch (err) {
        console.error('Erro ao validar email:', err);
        setError('Erro ao validar email. Tente novamente.');
        setGrupos([]);
        setUnidades([]);
        setGrupoId('');
        setUnidadeId('');
        setEmailValidated(false);
      } finally {
        setLoadingOptions(false);
      }
    }, 1000); // Debounce de 1 segundo para evitar requisições excessivas

    return () => clearTimeout(timeoutId);
  }, [email]);

  // Atualizar unidades quando grupo for selecionado (filtrar das unidades já carregadas)
  useEffect(() => {
    if (!grupoId) {
      setUnidadeId('');
      return;
    }
    // Reset unidade quando grupo muda
    setUnidadeId('');
  }, [grupoId]);

  // Filtrar unidades baseado no grupo selecionado
  const unidadesFiltradas = grupoId
    ? unidades.filter(u => {
        // Se a unidade tem grupoId, verificar se corresponde
        if (u.grupoId) {
          return u.grupoId === grupoId;
        }
        // Caso contrário, incluir todas (já vêm filtradas da API)
        return true;
      })
    : unidades;

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('A imagem deve ter no máximo 5MB');
        return;
      }
      setImagem(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!email || !emailValidated) {
      setError('Por favor, informe um email válido cadastrado no sistema');
      toast.error('Por favor, informe um email válido cadastrado no sistema');
      setLoading(false);
      return;
    }

    if (!grupoId || !unidadeId || !categoriaUrgenciaId) {
      setError('Por favor, preencha todos os campos obrigatórios');
      toast.error('Por favor, preencha todos os campos obrigatórios');
      setLoading(false);
      return;
    }

    // Validar que o grupo e unidade selecionados estão nas opções permitidas
    const grupoPermitido = grupos.find(g => g.id === grupoId);
    const unidadePermitida = unidades.find(u => u.id === unidadeId);

    if (!grupoPermitido) {
      setError('Grupo selecionado não está disponível para seu email');
      toast.error('Grupo selecionado não está disponível para seu email');
      setLoading(false);
      return;
    }

    if (!unidadePermitida) {
      setError('Unidade selecionada não está disponível para seu email');
      toast.error('Unidade selecionada não está disponível para seu email');
      setLoading(false);
      return;
    }

    try {
      const categoriaSelecionada = categorias.find(c => c.id === categoriaUrgenciaId);
      if (!categoriaSelecionada) {
        setError('Categoria inválida');
        toast.error('Categoria inválida');
        setLoading(false);
        return;
      }

      const formData = new FormData();
      formData.append('email', email);
      formData.append('categoriaUrgenciaId', categoriaUrgenciaId);
      formData.append('titulo', categoriaSelecionada.nome);
      formData.append('descricao', descricao);
      formData.append('grupoId', grupoId);
      formData.append('unidadeId', unidadeId);
      if (imagem) {
        formData.append('imagem', imagem);
      }

      const response = await fetch('/api/chamados/publico', {
        method: 'POST',
        body: formData,
      });

      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        console.error('Erro ao parsear resposta:', parseError);
        throw new Error('Erro ao processar resposta do servidor');
      }

      if (!response.ok) {
        const errorMsg =
          data?.error || data?.message || 'Erro ao abrir chamado';
        console.error('Erro na resposta:', { status: response.status, data });
        throw new Error(errorMsg);
      }

      setSuccess(true);
      setEmail('');
      setCategoriaUrgenciaId('');
      setDescricao('');
      setImagem(null);
      setGrupoId('');
      setUnidadeId('');
      setGrupos([]);
      setUnidades([]);
      setEmailValidated(false);
      toast.success('Chamado aberto com sucesso!');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erro ao abrir chamado';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <div className="text-center">
              <CheckCircle2 className="h-12 w-12 sm:h-16 sm:w-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2 px-2">
                Chamado Aberto com Sucesso!
              </h2>
              <p className="text-sm sm:text-base text-gray-600 mb-6 px-2">
                Seu chamado foi registrado e será analisado pela nossa equipe.
                Você receberá atualizações por email.
              </p>
              <Button
                onClick={() => {
                  setSuccess(false);
                  setError(null);
                }}
                className="w-full h-12 text-base font-semibold"
                size="lg"
              >
                Abrir Novo Chamado
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-4 sm:py-8 px-3 sm:px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-4 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            Abertura de Chamados
          </h1>
          <p className="text-sm sm:text-base text-gray-600 px-2">
            Registre incidentes ou solicitações relacionadas às unidades
          </p>
        </div>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg sm:text-xl">Novo Chamado</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {error && (
              <Alert variant="destructive" className="mb-4 sm:mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-sm">{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  value={email}
                  onChange={e => {
                    setEmail(e.target.value);
                    setError(null);
                  }}
                  placeholder="seu@email.com"
                  required
                  disabled={loadingOptions}
                  className="h-11 text-base"
                />
                {loadingOptions && (
                  <p className="text-xs text-muted-foreground flex items-center gap-2">
                    <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Validando email...
                  </p>
                )}
                {emailValidated && !loadingOptions && grupos.length > 0 && (
                  <p className="text-xs text-green-600">
                    ✓ Email validado. {grupos.length} grupo(s) e {unidades.length} unidade(s) disponível(is)
                  </p>
                )}
                {error && email && !loadingOptions && (
                  <p className="text-xs text-destructive">{error}</p>
                )}
                {!emailValidated && email && !loadingOptions && !error && email.includes('@') && (
                  <p className="text-xs text-muted-foreground">
                    Aguarde a validação do email...
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="grupo" className="text-sm font-medium">Grupo *</Label>
                  <Select
                    value={grupoId}
                    onValueChange={setGrupoId}
                    disabled={
                      loadingOptions || !emailValidated || grupos.length === 0
                    }
                  >
                    <SelectTrigger id="grupo" className="h-11 text-base">
                      <SelectValue
                        placeholder={
                          !emailValidated
                            ? 'Informe o email primeiro'
                            : grupos.length === 0
                              ? 'Nenhum grupo disponível'
                              : 'Selecione o grupo'
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {grupos.length === 0 ? (
                        <SelectItem value="__empty" disabled>
                          {!emailValidated
                            ? 'Informe o email primeiro'
                            : 'Nenhum grupo disponível'}
                        </SelectItem>
                      ) : (
                        grupos.map(grupo => (
                          <SelectItem key={grupo.id} value={grupo.id}>
                            {grupo.nome}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  {emailValidated && grupos.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Grupos disponíveis para seu email
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="unidade" className="text-sm font-medium">Unidade *</Label>
                  <Select
                    value={unidadeId}
                    onValueChange={setUnidadeId}
                    disabled={
                      loadingOptions ||
                      !emailValidated ||
                      !grupoId ||
                      unidadesFiltradas.length === 0
                    }
                  >
                    <SelectTrigger id="unidade" className="h-11 text-base">
                      <SelectValue
                        placeholder={
                          !emailValidated
                            ? 'Informe o email primeiro'
                            : !grupoId
                              ? 'Selecione primeiro o grupo'
                              : unidadesFiltradas.length === 0
                                ? 'Nenhuma unidade disponível'
                                : 'Selecione a unidade'
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {unidadesFiltradas.length === 0 ? (
                        <SelectItem value="__empty" disabled>
                          {!emailValidated
                            ? 'Informe o email primeiro'
                            : !grupoId
                              ? 'Selecione primeiro o grupo'
                              : 'Nenhuma unidade disponível'}
                        </SelectItem>
                      ) : (
                        unidadesFiltradas.map(unidade => (
                          <SelectItem key={unidade.id} value={unidade.id}>
                            {unidade.nome}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  {emailValidated &&
                    grupoId &&
                    unidadesFiltradas.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Unidades disponíveis para o grupo selecionado
                      </p>
                    )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="categoria" className="text-sm font-medium">Categoria do Chamado *</Label>
                {loadingCategorias ? (
                  <div className="h-11 flex items-center justify-center border rounded-md">
                    <p className="text-sm text-muted-foreground">Carregando categorias...</p>
                  </div>
                ) : (
                  <Select
                    value={categoriaUrgenciaId}
                    onValueChange={setCategoriaUrgenciaId}
                    required
                    disabled={categorias.length === 0}
                  >
                    <SelectTrigger id="categoria" className="h-11 text-base">
                      <SelectValue 
                        placeholder={
                          categorias.length === 0 
                            ? 'Nenhuma categoria disponível' 
                            : 'Selecione a categoria do chamado'
                        } 
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {categorias.length === 0 ? (
                        <SelectItem value="__empty" disabled>
                          Nenhuma categoria disponível
                        </SelectItem>
                      ) : (
                        categorias.map(cat => (
                          <SelectItem key={cat.id} value={cat.id}>
                            <div className="flex items-center gap-2">
                              <span
                                className={`h-3 w-3 rounded-full ${getUrgenciaColor(cat.urgenciaNivel)}`}
                              />
                              <span>{cat.nome}</span>
                              <span className="text-xs text-muted-foreground">
                                ({getUrgenciaLabel(cat.urgenciaNivel)} - {cat.prazoHoras}h)
                              </span>
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                )}
                <p className="text-xs text-muted-foreground">
                  Selecione o tipo de problema ou solicitação
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="descricao" className="text-sm font-medium">Descrição *</Label>
                <Textarea
                  id="descricao"
                  value={descricao}
                  onChange={e => setDescricao(e.target.value)}
                  placeholder="Descreva o problema ou solicitação em detalhes..."
                  rows={5}
                  required
                  className="text-base resize-none"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="imagem" className="text-sm font-medium">Foto (opcional)</Label>
                <div className="space-y-2">
                  <Input
                    id="imagem"
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleImageChange}
                    className="cursor-pointer text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                  />
                  {imagem && (
                    <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                      <span className="text-sm text-foreground flex-1 truncate">
                        {imagem.name}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setImagem(null)}
                        className="h-8 w-8 p-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Máximo 5MB. Toque para tirar foto ou escolher da galeria
                </p>
              </div>

              <Button 
                type="submit" 
                className="w-full h-12 text-base font-semibold" 
                disabled={loading}
                size="lg"
              >
                {loading ? 'Abrindo Chamado...' : 'Abrir Chamado'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="mt-4 sm:mt-6">
          <CardContent className="pt-4 sm:pt-6">
            <div className="text-center text-xs sm:text-sm text-muted-foreground px-2">
              <p>
                Ao abrir um chamado, você concorda que nossa equipe entrará em
                contato através do email informado.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
