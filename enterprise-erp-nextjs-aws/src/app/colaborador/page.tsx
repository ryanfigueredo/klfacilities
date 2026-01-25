'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { MessageSquare, CheckCircle2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface Grupo {
  id: string;
  nome: string;
}

interface Unidade {
  id: string;
  nome: string;
}

export default function ColaboradorPage() {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [unidadesFiltradas, setUnidadesFiltradas] = useState<Unidade[]>([]);
  const [formData, setFormData] = useState({
    tipo: 'ELOGIO',
    mensagem: '',
    funcionarioNome: '',
    funcionarioCpf: '',
    grupoId: '',
    unidadeId: '',
  });

  useEffect(() => {
    // Buscar grupos
    const fetchData = async () => {
      try {
        // Buscar grupos (endpoint público ou sem autenticação)
        const gruposRes = await fetch('/api/grupos');
        if (gruposRes.ok) {
          const gruposData = await gruposRes.json();
          const gruposArray = Array.isArray(gruposData?.data) 
            ? gruposData.data 
            : Array.isArray(gruposData) 
              ? gruposData 
              : [];
          setGrupos(gruposArray.filter((g: any) => g.ativo !== false).map((g: any) => ({ id: g.id, nome: g.nome })));
        }
      } catch (error) {
        console.error('Erro ao carregar grupos:', error);
      }
    };

    fetchData();
  }, []);

  // Carregar unidades quando o grupo for selecionado
  useEffect(() => {
    if (!formData.grupoId) {
      setUnidadesFiltradas([]);
      setFormData(prev => ({ ...prev, unidadeId: '' }));
      return;
    }

    (async () => {
      try {
        const res = await fetch(
          `/api/mapeamento?grupoId=${encodeURIComponent(formData.grupoId)}`
        );
        if (res.ok) {
          const data = await res.json();
          setUnidadesFiltradas(
            Array.isArray(data.unidades) ? data.unidades : []
          );
        } else {
          setUnidadesFiltradas([]);
        }
        // Limpar unidade selecionada quando mudar o grupo
        setFormData(prev => ({ ...prev, unidadeId: '' }));
      } catch (error) {
        console.error('Erro ao carregar unidades do grupo:', error);
        setUnidadesFiltradas([]);
      }
    })();
  }, [formData.grupoId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.mensagem.trim()) {
      toast.error('Por favor, escreva sua mensagem');
      return;
    }

    if (!formData.grupoId) {
      toast.error('Por favor, selecione o grupo');
      return;
    }

    if (!formData.unidadeId) {
      toast.error('Por favor, selecione a unidade');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/manifestacoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: formData.tipo,
          mensagem: formData.mensagem,
          funcionarioNome: formData.funcionarioNome || undefined,
          funcionarioCpf: formData.funcionarioCpf || undefined,
          grupoId: formData.grupoId || undefined,
          unidadeId: formData.unidadeId || undefined,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao enviar manifestação');
      }

      setSubmitted(true);
      toast.success('Manifestação enviada com sucesso! Obrigado pelo seu feedback.');
    } catch (error: any) {
      console.error('Erro ao enviar manifestação:', error);
      toast.error(
        error.message || 'Erro ao enviar manifestação. Tente novamente.'
      );
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Manifestação Enviada!
          </h2>
          <p className="text-gray-600 mb-6">
            Recebemos sua manifestação com sucesso. Nossa equipe analisará e
            entrará em contato se necessário.
          </p>
          <Button
            onClick={() => {
              setSubmitted(false);
              setFormData({
                tipo: 'ELOGIO',
                mensagem: '',
                funcionarioNome: '',
                funcionarioCpf: '',
                grupoId: '',
                unidadeId: '',
              });
            }}
            className="w-full"
          >
            Enviar Outra Manifestação
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <Link
          href="/"
          className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Link>

        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-blue-100 p-3 rounded-lg">
              <MessageSquare className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Central de Atendimento ao Funcionário
              </h1>
              <p className="text-gray-600 mt-1">
                Este crachá também é sua voz. Registre elogios, sugestões ou
                denúncias.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="tipo"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Tipo de Manifestação <span className="text-red-500">*</span>
              </label>
              <select
                id="tipo"
                value={formData.tipo}
                onChange={(e) =>
                  setFormData({ ...formData, tipo: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="ELOGIO">Elogio</option>
                <option value="SUGESTAO">Sugestão</option>
                <option value="DENUNCIA">Denúncia</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="funcionarioNome"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Seu Nome (opcional)
              </label>
              <input
                type="text"
                id="funcionarioNome"
                value={formData.funcionarioNome}
                onChange={(e) =>
                  setFormData({ ...formData, funcionarioNome: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Seu nome (opcional)"
              />
            </div>

            <div>
              <label
                htmlFor="funcionarioCpf"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                CPF (opcional)
              </label>
              <input
                type="text"
                id="funcionarioCpf"
                value={formData.funcionarioCpf}
                onChange={(e) =>
                  setFormData({ ...formData, funcionarioCpf: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="000.000.000-00 (opcional)"
                maxLength={14}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="grupoId"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Grupo <span className="text-red-500">*</span>
                </label>
                <select
                  id="grupoId"
                  value={formData.grupoId}
                  onChange={(e) =>
                    setFormData({ ...formData, grupoId: e.target.value, unidadeId: '' })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Selecione o grupo</option>
                  {grupos.map((grupo) => (
                    <option key={grupo.id} value={grupo.id}>
                      {grupo.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="unidadeId"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Unidade <span className="text-red-500">*</span>
                </label>
                <select
                  id="unidadeId"
                  value={formData.unidadeId}
                  onChange={(e) =>
                    setFormData({ ...formData, unidadeId: e.target.value })
                  }
                  disabled={!formData.grupoId}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  required
                >
                  <option value="">
                    {!formData.grupoId
                      ? 'Selecione o grupo primeiro'
                      : unidadesFiltradas.length === 0
                        ? 'Nenhuma unidade disponível'
                        : 'Selecione a unidade'}
                  </option>
                  {unidadesFiltradas.map((unidade) => (
                    <option key={unidade.id} value={unidade.id}>
                      {unidade.nome}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label
                htmlFor="mensagem"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Sua Mensagem <span className="text-red-500">*</span>
              </label>
              <textarea
                id="mensagem"
                value={formData.mensagem}
                onChange={(e) =>
                  setFormData({ ...formData, mensagem: e.target.value })
                }
                rows={6}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Descreva sua manifestação aqui..."
                required
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            >
              {loading ? 'Enviando...' : 'Enviar Manifestação'}
            </Button>
          </form>

          <p className="mt-6 text-sm text-gray-500 text-center">
            Suas manifestações são confidenciais e serão analisadas pela nossa
            equipe de RH.
          </p>
        </div>
      </div>
    </div>
  );
}

