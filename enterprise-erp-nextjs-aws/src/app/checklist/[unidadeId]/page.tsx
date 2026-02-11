'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Sparkles, Droplets, Star } from 'lucide-react';
import { useParams } from 'next/navigation';
import { Logo } from '@/components/ui/logo';
import { ImageUpload } from '@/app/(app)/operacional/controle-gasolina/_components/ImageUpload';

interface UnidadeInfo {
  id: string;
  nome: string;
  grupoNome: string;
}

interface Stats {
  ultimos30Dias: Record<string, number>;
}

interface ChecklistData {
  unidade: UnidadeInfo;
  stats: Stats;
}

export default function ChecklistPage() {
  const params = useParams();
  const unidadeId = params.unidadeId as string;

  const [unidadeData, setUnidadeData] = useState<ChecklistData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<
    'LIMPEZA' | 'INSUMOS' | 'SATISFACAO' | null
  >(null);

  useEffect(() => {
    const fetchUnidadeData = async () => {
      try {
        const response = await fetch(`/api/checklist/unidade/${unidadeId}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Erro ao carregar dados da unidade');
        }

        setUnidadeData(data.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro desconhecido');
      } finally {
        setLoading(false);
      }
    };

    if (unidadeId) {
      fetchUnidadeData();
    }
  }, [unidadeId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  if (error || !unidadeData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <p className="font-bold">Erro</p>
            <p>{error || 'Unidade não encontrada'}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="bg-card shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <Logo size="lg" />
            </div>
            <p className="text-sm text-muted-foreground">
              {unidadeData.unidade.grupoNome} • {unidadeData.unidade.nome}
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1">
        <div className="max-w-4xl mx-auto px-4 py-8">
          {!selectedType ? (
            <ChecklistTypeSelector onSelectType={setSelectedType} />
          ) : (
            <ChecklistForm
              unidadeId={unidadeId}
              tipo={selectedType}
              onBack={() => setSelectedType(null)}
            />
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-card border-t mt-auto">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <p className="text-center text-muted-foreground text-xs">
            © 2025 KL ERP - Sistema de Checklist Digital
          </p>
        </div>
      </footer>
    </div>
  );
}

function ChecklistTypeSelector({
  onSelectType,
}: {
  onSelectType: (type: 'LIMPEZA' | 'INSUMOS' | 'SATISFACAO') => void;
}) {
  const options = [
    {
      type: 'LIMPEZA' as const,
      title: 'Serviços de Limpeza',
      description: 'Solicitar serviços de limpeza e retirada de lixo',
    },
    {
      type: 'INSUMOS' as const,
      title: 'Reposição de Insumos',
      description: 'Solicitar reposição de produtos de higiene',
    },
    {
      type: 'SATISFACAO' as const,
      title: 'Pesquisa de Satisfação',
      description: 'Avaliar a qualidade dos serviços prestados',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-xl font-semibold mb-2">
          Selecione uma das opções abaixo
        </h2>
        <p className="text-sm text-muted-foreground">
          Escolha o tipo de feedback que deseja enviar
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {options.map(option => (
          <button
            key={option.type}
            onClick={() => onSelectType(option.type)}
            className="group relative bg-white/80 backdrop-blur-sm border border-gray-200/50 hover:border-blue-300/50 text-foreground p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] focus:outline-none focus:ring-4 focus:ring-blue-500/20 hover:bg-gradient-to-br hover:from-white/90 hover:to-blue-50/30"
          >
            <div className="text-center">
              <h3 className="text-xl font-semibold mb-3 text-gray-800 group-hover:text-blue-700 transition-colors duration-300">
                {option.title}
              </h3>
              <p className="text-sm text-gray-600 group-hover:text-gray-700 leading-relaxed">
                {option.description}
              </p>
            </div>
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-transparent to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          </button>
        ))}
      </div>
    </div>
  );
}

function ChecklistForm({
  unidadeId,
  tipo,
  onBack,
}: {
  unidadeId: string;
  tipo: 'LIMPEZA' | 'INSUMOS' | 'SATISFACAO';
  onBack: () => void;
}) {
  const [formData, setFormData] = useState<any>({});
  const [foto, setFoto] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('unidadeId', unidadeId);
      formDataToSend.append('tipo', tipo);
      formDataToSend.append('data', JSON.stringify(formData));
      
      if (foto) {
        formDataToSend.append('foto', foto);
      }

      const response = await fetch('/api/checklist/submit', {
        method: 'POST',
        body: formDataToSend,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao enviar formulário');
      }

      setSubmitted(true);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Erro desconhecido');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="text-center">
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-6">
          <h3 className="font-bold text-lg mb-2">Formulário Enviado!</h3>
          <p>
            Obrigado pelo seu feedback. Sua solicitação foi registrada com
            sucesso.
          </p>
        </div>
        <button
          onClick={onBack}
          className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition-colors"
        >
          Voltar ao Menu
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold text-gray-900">
            {tipo === 'LIMPEZA' && 'Serviços de Limpeza'}
            {tipo === 'INSUMOS' && 'Reposição de Insumos'}
            {tipo === 'SATISFACAO' && 'Pesquisa de Satisfação'}
          </h2>
          <button
            onClick={onBack}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            ← Voltar
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {tipo === 'LIMPEZA' && (
            <LimpezaForm 
              formData={formData} 
              setFormData={setFormData}
              foto={foto}
              setFoto={setFoto}
            />
          )}
          {tipo === 'INSUMOS' && (
            <InsumosForm formData={formData} setFormData={setFormData} />
          )}
          {tipo === 'SATISFACAO' && (
            <SatisfacaoForm formData={formData} setFormData={setFormData} />
          )}

          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={onBack}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white rounded-lg transition-colors"
            >
              {submitting ? 'Enviando...' : 'Enviar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function LimpezaForm({
  formData,
  setFormData,
  foto,
  setFoto,
}: {
  formData: any;
  setFormData: (data: any) => void;
  foto: File | null;
  setFoto: (foto: File | null) => void;
}) {
  const handleCheckboxChange = (value: string, checked: boolean) => {
    const current = formData.servicosLimpeza || [];
    if (checked) {
      setFormData({ ...formData, servicosLimpeza: [...current, value] });
    } else {
      setFormData({
        ...formData,
        servicosLimpeza: current.filter((v: string) => v !== value),
      });
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Qual serviço você gostaria de solicitar? *
        </label>
        <div className="space-y-2">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={(formData.servicosLimpeza || []).includes('LIMPEZA')}
              onChange={e => handleCheckboxChange('LIMPEZA', e.target.checked)}
              className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="text-gray-700">Limpeza</span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={(formData.servicosLimpeza || []).includes(
                'RETIRADA_LIXO'
              )}
              onChange={e =>
                handleCheckboxChange('RETIRADA_LIXO', e.target.checked)
              }
              className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="text-gray-700">Retirada de lixo</span>
          </label>
        </div>
      </div>

      {/* Campo de anexo de foto */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-700">
          Anexar foto (opcional)
        </label>
        <p className="text-xs text-gray-500 mb-2">
          Você pode anexar uma foto como evidência da necessidade de limpeza
        </p>
        {foto && (
          <div className="flex items-center gap-2 p-2 border rounded-md bg-gray-50">
            <Image
              src={URL.createObjectURL(foto)}
              alt="Foto anexada"
              width={64}
              height={64}
              className="w-16 h-16 object-cover rounded"
              unoptimized
            />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-700">Foto anexada</p>
              <p className="text-xs text-gray-500">{foto.name}</p>
            </div>
            <button
              type="button"
              onClick={() => setFoto(null)}
              className="text-red-600 hover:text-red-700 text-sm font-medium"
            >
              Remover
            </button>
          </div>
        )}
        <ImageUpload
          onChange={setFoto}
          label="Anexar foto"
          description="Toque para capturar ou selecionar uma imagem"
        />
      </div>
    </div>
  );
}

function InsumosForm({
  formData,
  setFormData,
}: {
  formData: any;
  setFormData: (data: any) => void;
}) {
  const handleCheckboxChange = (value: string, checked: boolean) => {
    const current = formData.insumosSolicitados || [];
    if (checked) {
      setFormData({ ...formData, insumosSolicitados: [...current, value] });
    } else {
      setFormData({
        ...formData,
        insumosSolicitados: current.filter((v: string) => v !== value),
      });
    }
  };

  const insumos = [
    { value: 'ALCOOL_HIGIENIZACAO', label: 'Álcool higienização mãos' },
    { value: 'PAPEL_HIGIENICO', label: 'Papel higiênico' },
    { value: 'PAPEL_TOALHA', label: 'Papel toalha' },
    { value: 'SABONETE', label: 'Sabonete' },
  ];

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Quais insumos você gostaria de solicitar?
        </label>
        <div className="space-y-2">
          {insumos.map(insumo => (
            <label key={insumo.value} className="flex items-center">
              <input
                type="checkbox"
                checked={(formData.insumosSolicitados || []).includes(
                  insumo.value
                )}
                onChange={e =>
                  handleCheckboxChange(insumo.value, e.target.checked)
                }
                className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="text-gray-700">{insumo.label}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

function SatisfacaoForm({
  formData,
  setFormData,
}: {
  formData: any;
  setFormData: (data: any) => void;
}) {
  const handleRadioChange = (value: string) => {
    setFormData({ ...formData, avaliacaoLimpeza: value });
  };

  const handleCheckboxChange = (value: string, checked: boolean) => {
    const current = formData.fatoresInfluencia || [];
    if (checked) {
      setFormData({ ...formData, fatoresInfluencia: [...current, value] });
    } else {
      setFormData({
        ...formData,
        fatoresInfluencia: current.filter((v: string) => v !== value),
      });
    }
  };

  const avaliacoes = [
    { value: 'MUITO_RUIM', label: 'Muito ruim' },
    { value: 'RUIM', label: 'Ruim' },
    { value: 'REGULAR', label: 'Regular' },
    { value: 'BOM', label: 'Bom' },
    { value: 'MUITO_BOM', label: 'Muito bom' },
  ];

  const fatores = [
    { value: 'CHEIRO', label: 'Cheiro' },
    { value: 'DISPONIBILIDADE_INSUMOS', label: 'Disp. insumos de higiene' },
    { value: 'LIMPEZA_SUPERFICIES', label: 'Limpeza das superfícies' },
    { value: 'POSTURA_EQUIPE', label: 'Postura da equipe' },
    { value: 'RECOLHIMENTO_LIXO', label: 'Recolhimento do lixo' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Nos ajude a manter este espaço impecável. Como você avalia a limpeza
          deste local? *
        </label>
        <div className="space-y-2">
          {avaliacoes.map(avaliacao => (
            <label key={avaliacao.value} className="flex items-center">
              <input
                type="radio"
                name="avaliacaoLimpeza"
                value={avaliacao.value}
                checked={formData.avaliacaoLimpeza === avaliacao.value}
                onChange={e => handleRadioChange(e.target.value)}
                className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
              />
              <span className="text-gray-700">{avaliacao.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          O quê mais influenciou sua resposta?
        </label>
        <div className="space-y-2">
          {fatores.map(fator => (
            <label key={fator.value} className="flex items-center">
              <input
                type="checkbox"
                checked={(formData.fatoresInfluencia || []).includes(
                  fator.value
                )}
                onChange={e =>
                  handleCheckboxChange(fator.value, e.target.checked)
                }
                className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="text-gray-700">{fator.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Gostaria de incluir alguma sugestão, reclamação e/ou comentário?
        </label>
        <textarea
          value={formData.comentarios || ''}
          onChange={e =>
            setFormData({ ...formData, comentarios: e.target.value })
          }
          rows={4}
          maxLength={1000}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Digite seus comentários aqui..."
        />
        <p className="text-sm text-gray-500 mt-1">
          {(formData.comentarios || '').length}/1000 caracteres
        </p>
      </div>
    </div>
  );
}
