'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Phone,
  Mail,
  Save,
  Edit3,
  ChevronUp,
  ChevronDown,
  CheckCircle2,
  AlertCircle,
  Upload,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface UnidadeSupervisor {
  id: string;
  name: string;
  email: string;
  whatsapp: string | null;
  origem: 'UNIDADE' | 'GRUPO';
}

interface Unidade {
  id: string;
  nome: string;
  whatsappLider?: string;
  whatsappSupervisor?: string;
  emailSupervisor?: string;
  grupoNome?: string;
  supervisores?: UnidadeSupervisor[];
}

export default function ContatosPage() {
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [expandedUnidades, setExpandedUnidades] = useState<Set<string>>(
    new Set()
  );
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [editData, setEditData] = useState<{
    whatsappLider: string;
    whatsappSupervisor: string;
    emailSupervisor: string;
  }>({ whatsappLider: '', whatsappSupervisor: '', emailSupervisor: '' });

  const fetchUnidades = useCallback(async () => {
    try {
      const response = await fetch('/api/checklist/unidades');
      const result = await response.json();
      if (response.ok) {
        setUnidades(result.data || []);
        // Abre todos os grupos por padrão na primeira carga
        const groups: Record<string, boolean> = {};
        (result.data || []).forEach((u: Unidade) => {
          const g = u.grupoNome || 'Sem Grupo';
          if (!(g in groups)) groups[g] = true;
        });
        setOpenGroups(groups);
      }
    } catch (err) {
      console.error('Erro ao buscar unidades:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUnidades();
  }, [fetchUnidades]);

  const handleEdit = (unidade: Unidade) => {
    setEditingId(unidade.id);
    const supervisorComTelefone =
      unidade.supervisores?.find(s => !!s.whatsapp) ?? null;
    const supervisorReferencia = unidade.supervisores?.[0] ?? supervisorComTelefone;
    setEditData({
      whatsappLider: unidade.whatsappLider || '',
      whatsappSupervisor:
        unidade.whatsappSupervisor ||
        (supervisorComTelefone ? formatWhatsApp(supervisorComTelefone.whatsapp) : ''),
      emailSupervisor:
        unidade.emailSupervisor || supervisorReferencia?.email || '',
    });
  };

  const handleSave = async (unidadeId: string) => {
    try {
      const response = await fetch(`/api/unidades/${unidadeId}/contatos`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editData),
      });

      const result = await response.json();

      if (response.ok) {
        toast.success('Contatos salvos com sucesso!');
        await fetchUnidades(); // Recarregar dados
        setEditingId(null);
      } else {
        toast.error(result.error || 'Erro ao salvar contatos');
      }
    } catch (err) {
      toast.error('Erro de conexão ao salvar contatos');
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditData({
      whatsappLider: '',
      whatsappSupervisor: '',
      emailSupervisor: '',
    });
  };

  const applySupervisorSuggestion = (supervisor: UnidadeSupervisor) => {
    setEditData(prev => ({
      ...prev,
      whatsappSupervisor: supervisor.whatsapp
        ? formatWhatsApp(supervisor.whatsapp)
        : prev.whatsappSupervisor,
      emailSupervisor: supervisor.email || prev.emailSupervisor,
    }));
  };

  const formatWhatsApp = (phone?: string | null) => {
    if (!phone) return '';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
    }
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
  };

  const getUnidadeStats = (unidade: Unidade) => {
    const total = 3; // WhatsApp Líder, WhatsApp Supervisor, Email Supervisor
    const preenchidos = [
      unidade.whatsappLider,
      unidade.whatsappSupervisor,
      unidade.emailSupervisor,
    ].filter(Boolean).length;
    return { total, preenchidos };
  };

  // Agrupar unidades por grupo
  const unidadesPorGrupo = useMemo(() => {
    const groups: Record<string, Unidade[]> = {};
    for (const u of unidades) {
      const g = u.grupoNome || 'Sem Grupo';
      if (!groups[g]) groups[g] = [];
      groups[g].push(u);
    }
    // Ordena grupos por nome e unidades por nome
    const ordered: Array<[string, Unidade[]]> = Object.entries(groups)
      .sort(([a], [b]) => a.localeCompare(b, 'pt-BR'))
      .map(([g, list]) => [
        g,
        [...list].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')),
      ]);
    return ordered;
  }, [unidades]);

  const toggleGroup = (groupName: string) => {
    setOpenGroups(prev => ({ ...prev, [groupName]: !prev[groupName] }));
  };

  const toggleUnidade = (unidadeId: string) => {
    setExpandedUnidades(prev => {
      const next = new Set(prev);
      if (next.has(unidadeId)) {
        next.delete(unidadeId);
      } else {
        next.add(unidadeId);
      }
      return next;
    });
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.name.match(/\.(xlsx|xls)$/i)) {
        toast.error('Por favor, selecione um arquivo Excel (.xlsx ou .xls)');
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleImport = async () => {
    if (!selectedFile) {
      toast.error('Por favor, selecione um arquivo');
      return;
    }

    setImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await fetch('/api/checklist/import-contatos', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao importar');
      }

      const { stats } = result;

      toast.success(
        `Importação concluída! ${stats.linhasProcessadas} linhas processadas, ` +
          `${stats.gruposCriados} grupos criados, ${stats.unidadesCriadas} unidades criadas, ` +
          `${stats.contatosAtualizados} contatos atualizados.`
      );

      if (stats.erros.length > 0) {
        console.warn('Erros durante importação:', stats.erros);
        toast.warning(
          `${stats.erros.length} erros encontrados (verifique o console)`
        );
      }

      setImportDialogOpen(false);
      setSelectedFile(null);
      await fetchUnidades(); // Recarregar dados
    } catch (error: any) {
      console.error('Erro ao importar:', error);
      toast.error(error.message || 'Erro ao importar contatos');
    } finally {
      setImporting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 p-4">
        <div>
          <h1 className="text-xl font-semibold">Contatos das Unidades</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie os contatos WhatsApp e email para notificações
          </p>
        </div>
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Contatos das Unidades</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie os contatos WhatsApp e email para notificações
          </p>
        </div>
        <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Importar da Planilha
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Importar Contatos da Planilha</DialogTitle>
              <DialogDescription>
                Faça upload da planilha Excel com os contatos (GRUPO, CARGO,
                NOME, SUPERVISOR, WHATS APP)
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Arquivo Excel (.xlsx)
                </label>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileSelect}
                  className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={importing}
                />
                {selectedFile && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Arquivo selecionado: {selectedFile.name}
                  </p>
                )}
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setImportDialogOpen(false);
                    setSelectedFile(null);
                  }}
                  disabled={importing}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleImport}
                  disabled={!selectedFile || importing}
                >
                  {importing ? 'Importando...' : 'Importar'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {unidadesPorGrupo.map(([grupoNome, lista]) => {
          const totalConfigurados = lista.reduce((acc, u) => {
            const stats = getUnidadeStats(u);
            return acc + stats.preenchidos;
          }, 0);
          const totalCampos = lista.length * 3;
          const percentualConfigurado =
            totalCampos > 0
              ? Math.round((totalConfigurados / totalCampos) * 100)
              : 0;

          return (
            <div
              key={grupoNome}
              className="border border-gray-200 rounded-lg shadow-md bg-white hover:shadow-lg transition-shadow"
            >
              <button
                className="w-full text-left px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white flex items-center justify-between hover:from-gray-100 hover:to-gray-50 transition-all"
                onClick={() => toggleGroup(grupoNome)}
              >
                <div className="flex items-center gap-3">
                  <div className="transition-transform duration-300">
                    {openGroups[grupoNome] ? (
                      <ChevronUp className="h-5 w-5 text-gray-600" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-gray-600" />
                    )}
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      {grupoNome}
                    </h2>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-gray-500">
                        {lista.length}{' '}
                        {lista.length === 1 ? 'unidade' : 'unidades'}
                      </span>
                      {totalCampos > 0 && (
                        <>
                          <span className="text-gray-300">•</span>
                          <span
                            className={`text-xs font-medium ${
                              percentualConfigurado >= 80
                                ? 'text-green-600'
                                : percentualConfigurado >= 50
                                  ? 'text-yellow-600'
                                  : 'text-orange-600'
                            }`}
                          >
                            {percentualConfigurado}% configurado
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </button>

              <div
                className={`overflow-hidden transition-all duration-300 ease-in-out ${
                  openGroups[grupoNome]
                    ? 'max-h-[2000px] opacity-100'
                    : 'max-h-0 opacity-0'
                }`}
              >
                <div className="divide-y divide-gray-100">
                  {lista.map(unidade => {
                    const stats = getUnidadeStats(unidade);

                    const isUnidadeExpanded = expandedUnidades.has(unidade.id);
                    const supervisorComTelefone =
                      unidade.supervisores?.find(s => !!s.whatsapp) ?? null;
                    const supervisorReferencia =
                      unidade.supervisores?.[0] ?? supervisorComTelefone;
                    const renderedWhatsapp = unidade.whatsappSupervisor
                      ? formatWhatsApp(unidade.whatsappSupervisor)
                      : supervisorComTelefone
                        ? formatWhatsApp(supervisorComTelefone.whatsapp)
                        : '';
                    const renderedEmail =
                      unidade.emailSupervisor || supervisorReferencia?.email || '';
                    const hasWhatsappSupervisor = !!renderedWhatsapp;
                    const hasEmailSupervisor = !!renderedEmail;

                    return (
                      <div
                        key={unidade.id}
                        className="p-5 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center justify-between gap-4">
                          <button
                            onClick={() => toggleUnidade(unidade.id)}
                            className="flex-1 min-w-0 text-left flex items-center gap-2 hover:opacity-80 transition-opacity"
                          >
                            <div className="transition-transform duration-300">
                              {isUnidadeExpanded ? (
                                <ChevronUp className="h-4 w-4 text-gray-600 flex-shrink-0" />
                              ) : (
                                <ChevronDown className="h-4 w-4 text-gray-600 flex-shrink-0" />
                              )}
                            </div>
                            <h3 className="font-semibold text-gray-900">
                              {unidade.nome}
                            </h3>
                            {stats.preenchidos === stats.total ? (
                              <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                            ) : stats.preenchidos > 0 ? (
                              <AlertCircle className="h-4 w-4 text-yellow-500 flex-shrink-0" />
                            ) : (
                              <AlertCircle className="h-4 w-4 text-gray-400 flex-shrink-0" />
                            )}
                            <span className="text-xs text-gray-500">
                              ({stats.preenchidos}/{stats.total} preenchidos)
                            </span>
                          </button>

                          {editingId !== unidade.id && (
                            <button
                              onClick={e => {
                                e.stopPropagation();
                                handleEdit(unidade);
                              }}
                              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 shadow-sm hover:shadow transition-all flex-shrink-0"
                            >
                              <Edit3 className="h-4 w-4" />
                              Editar
                            </button>
                          )}
                        </div>

                        <div
                          className={`overflow-hidden transition-all duration-300 ease-in-out ${
                            isUnidadeExpanded
                              ? 'max-h-[500px] opacity-100 mt-3'
                              : 'max-h-0 opacity-0'
                          }`}
                        >
                          {editingId === unidade.id ? (
                            <div className="space-y-3 pt-3">
                              <div>
                                <label className="block text-sm font-medium mb-1">
                                  WhatsApp do Líder
                                </label>
                                <input
                                  type="tel"
                                  value={editData.whatsappLider}
                                  onChange={e =>
                                    setEditData(prev => ({
                                      ...prev,
                                      whatsappLider: e.target.value,
                                    }))
                                  }
                                  placeholder="(11) 99999-9999"
                                  className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium mb-1">
                                  WhatsApp do Supervisor
                                </label>
                                <input
                                  type="tel"
                                  value={editData.whatsappSupervisor}
                                  onChange={e =>
                                    setEditData(prev => ({
                                      ...prev,
                                      whatsappSupervisor: e.target.value,
                                    }))
                                  }
                                  placeholder="(11) 99999-9999"
                                  className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium mb-1">
                                  Email do Supervisor
                                </label>
                                <input
                                  type="email"
                                  value={editData.emailSupervisor}
                                  onChange={e =>
                                    setEditData(prev => ({
                                      ...prev,
                                      emailSupervisor: e.target.value,
                                    }))
                                  }
                                  placeholder="supervisor@empresa.com"
                                  className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </div>
                            {unidade.supervisores && unidade.supervisores.length > 0 ? (
                              <div className="rounded-md border border-dashed border-blue-200 bg-blue-50/60 p-3">
                                <p className="text-xs font-medium text-blue-700">
                                  Supervisores vinculados a esta unidade ou grupo
                                </p>
                                <div className="mt-2 flex flex-wrap gap-2">
                                  {unidade.supervisores.map(supervisor => (
                                    <Button
                                      key={supervisor.id}
                                      type="button"
                                      size="sm"
                                      variant="secondary"
                                      onClick={() => applySupervisorSuggestion(supervisor)}
                                      className="text-xs"
                                    >
                                      Usar {supervisor.name.split(' ')[0]}
                                    </Button>
                                  ))}
                                </div>
                                <div className="mt-3 space-y-1 text-[11px] text-blue-700">
                                  {unidade.supervisores.map(supervisor => (
                                    <div
                                      key={`${supervisor.id}-info`}
                                      className="flex flex-wrap items-center gap-1"
                                    >
                                      <span className="font-medium">
                                        {supervisor.name}
                                      </span>
                                      <span>
                                        ({supervisor.origem === 'UNIDADE' ? 'Unidade' : 'Grupo'})
                                      </span>
                                      {supervisor.whatsapp ? (
                                        <span>• {formatWhatsApp(supervisor.whatsapp)}</span>
                                      ) : null}
                                      <span>• {supervisor.email}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : null}
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleSave(unidade.id)}
                                  className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm flex items-center gap-1"
                                >
                                  <Save className="h-3 w-3" />
                                  Salvar
                                </button>
                                <button
                                  onClick={handleCancel}
                                  className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded text-sm"
                                >
                                  Cancelar
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              <div
                                className={`flex items-center gap-3 p-2 rounded-md ${
                                  unidade.whatsappLider
                                    ? 'bg-green-50 border border-green-100'
                                    : 'bg-gray-50 border border-gray-100'
                                }`}
                              >
                                <Phone
                                  className={`h-4 w-4 flex-shrink-0 ${
                                    unidade.whatsappLider
                                      ? 'text-green-600'
                                      : 'text-gray-400'
                                  }`}
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="text-xs text-gray-500 mb-0.5">
                                    WhatsApp Líder
                                  </div>
                                  <div
                                    className={`text-sm font-medium ${
                                      unidade.whatsappLider
                                        ? 'text-gray-900'
                                        : 'text-gray-500 italic'
                                    }`}
                                  >
                                    {unidade.whatsappLider
                                      ? formatWhatsApp(unidade.whatsappLider)
                                      : 'Não informado'}
                                  </div>
                                </div>
                              </div>
                              <div
                                className={`flex items-center gap-3 p-2 rounded-md ${
                                  hasWhatsappSupervisor
                                    ? 'bg-green-50 border border-green-100'
                                    : 'bg-gray-50 border border-gray-100'
                                }`}
                              >
                                <Phone
                                  className={`h-4 w-4 flex-shrink-0 ${
                                    hasWhatsappSupervisor
                                      ? 'text-green-600'
                                      : 'text-gray-400'
                                  }`}
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="text-xs text-gray-500 mb-0.5">
                                    WhatsApp Supervisor
                                  </div>
                                  <div
                                    className={`text-sm font-medium ${
                                      hasWhatsappSupervisor
                                        ? 'text-gray-900'
                                        : 'text-gray-500 italic'
                                    }`}
                                  >
                                    {renderedWhatsapp || 'Não informado'}
                                  </div>
                                  {!unidade.whatsappSupervisor && supervisorComTelefone ? (
                                    <div className="text-[11px] text-muted-foreground">
                                      Sugestão: {supervisorComTelefone.name}
                                    </div>
                                  ) : null}
                                </div>
                              </div>
                              <div
                                className={`flex items-center gap-3 p-2 rounded-md ${
                                  hasEmailSupervisor
                                    ? 'bg-green-50 border border-green-100'
                                    : 'bg-gray-50 border border-gray-100'
                                }`}
                              >
                                <Mail
                                  className={`h-4 w-4 flex-shrink-0 ${
                                    hasEmailSupervisor
                                      ? 'text-green-600'
                                      : 'text-gray-400'
                                  }`}
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="text-xs text-gray-500 mb-0.5">
                                    Email Supervisor
                                  </div>
                                  <div
                                    className={`text-sm font-medium ${
                                      hasEmailSupervisor
                                        ? 'text-gray-900'
                                        : 'text-gray-500 italic'
                                    }`}
                                  >
                                    {renderedEmail || 'Não informado'}
                                  </div>
                                  {!unidade.emailSupervisor && supervisorReferencia?.email ? (
                                    <div className="text-[11px] text-muted-foreground">
                                      Sugestão: {supervisorReferencia.email}
                                    </div>
                                  ) : null}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
