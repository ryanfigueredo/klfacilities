'use client';

import { useState, useEffect } from 'react';
import {
  Upload,
  CheckCircle,
  AlertCircle,
  Loader2,
  Mail,
  Phone,
  MapPin,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import Link from 'next/link';
import { Navbar } from '@/components/landing/Navbar';
import { Footer } from '@/components/landing/Footer';

interface Estado {
  sigla: string;
  cidades: string[];
}

interface Cidade {
  id: string;
  nome: string;
}

const ESTADOS_NOMES: Record<string, string> = {
  AC: 'Acre',
  AL: 'Alagoas',
  AP: 'Amapá',
  AM: 'Amazonas',
  BA: 'Bahia',
  CE: 'Ceará',
  DF: 'Distrito Federal',
  ES: 'Espírito Santo',
  GO: 'Goiás',
  MA: 'Maranhão',
  MT: 'Mato Grosso',
  MS: 'Mato Grosso do Sul',
  MG: 'Minas Gerais',
  PA: 'Pará',
  PB: 'Paraíba',
  PR: 'Paraná',
  PE: 'Pernambuco',
  PI: 'Piauí',
  RJ: 'Rio de Janeiro',
  RN: 'Rio Grande do Norte',
  RS: 'Rio Grande do Sul',
  RO: 'Rondônia',
  RR: 'Roraima',
  SC: 'Santa Catarina',
  SP: 'São Paulo',
  SE: 'Sergipe',
  TO: 'Tocantins',
};

export default function BancoTalentosPage() {
  const [estados, setEstados] = useState<Estado[]>([]);
  const [cidades, setCidades] = useState<Cidade[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    nome: '',
    sobrenome: '',
    telefone: '',
    email: '',
    estado: '',
    cidade: '',
    endereco: '',
  });
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    fetchEstados();
  }, []);

  useEffect(() => {
    if (formData.estado) {
      fetchCidadesPorEstado(formData.estado);
    } else {
      setCidades([]);
      // Não atualizar formData aqui para evitar loop infinito
    }
  }, [formData.estado]);

  const fetchEstados = async () => {
    try {
      const response = await fetch('/api/curriculos/unidades');
      const result = await response.json();
      if (response.ok) {
        setEstados(result.estados || []);
      }
    } catch (error) {
      console.error('Erro ao carregar estados:', error);
      toast.error('Erro ao carregar estados disponíveis');
    } finally {
      setLoading(false);
    }
  };

  const fetchCidadesPorEstado = async (estado: string) => {
    if (!estado) {
      setCidades([]);
      return;
    }
    
    try {
      const response = await fetch(`/api/curriculos/unidades?estado=${encodeURIComponent(estado)}`);
      
      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.cidades && Array.isArray(result.cidades)) {
        setCidades(
          result.cidades.map((c: string) => ({
            id: c,
            nome: c,
          }))
        );
      } else {
        setCidades([]);
      }
    } catch (error) {
      console.error('Erro ao carregar cidades:', error);
      setCidades([]);
      toast.error('Erro ao carregar cidades disponíveis');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!arquivo) {
      toast.error('Por favor, anexe seu currículo');
      return;
    }

    if (
      !formData.nome ||
      !formData.sobrenome ||
      !formData.telefone ||
      !formData.estado ||
      !formData.cidade
    ) {
      toast.error('Por favor, preencha todos os campos obrigatórios');
      return;
    }

    setSubmitting(true);

    try {
      const uploadFormData = new FormData();
      uploadFormData.append('arquivo', arquivo);
      uploadFormData.append('nome', formData.nome);
      uploadFormData.append('sobrenome', formData.sobrenome);
      uploadFormData.append('telefone', formData.telefone);
      uploadFormData.append('email', formData.email || '');
      uploadFormData.append('unidadeId', formData.cidade); // Usar cidade como identificador
      uploadFormData.append('estado', formData.estado);
      uploadFormData.append('endereco', formData.endereco || '');

      const response = await fetch('/api/curriculos/upload', {
        method: 'POST',
        body: uploadFormData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao enviar currículo');
      }

      toast.success(
        'Currículo enviado com sucesso! Entraremos em contato em breve.'
      );
      setSubmitted(true);
      setFormData({
        nome: '',
        sobrenome: '',
        telefone: '',
        email: '',
        estado: '',
        cidade: '',
        endereco: '',
      });
      setArquivo(null);
    } catch (error: any) {
      console.error('Erro ao enviar currículo:', error);
      toast.error(
        error.message || 'Erro ao enviar currículo. Tente novamente.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const formatPhone = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length <= 10) {
      return cleaned.replace(/(\d{2})(\d{4})(\d{0,4})/, (_, d1, d2, d3) =>
        d3 ? `(${d1}) ${d2}-${d3}` : d2 ? `(${d1}) ${d2}` : d1 ? `(${d1}` : ''
      );
    } else {
      return cleaned.replace(/(\d{2})(\d{5})(\d{0,4})/, (_, d1, d2, d3) =>
        d3 ? `(${d1}) ${d2}-${d3}` : d2 ? `(${d1}) ${d2}` : d1 ? `(${d1}` : ''
      );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-white">
        <Navbar />
        <div className="flex-1 flex items-center justify-center pt-16">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-[#009ee2] mx-auto mb-4" />
            <p className="text-slate-600">Carregando...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex flex-col bg-white">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-4 pt-32">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center border border-gray-200">
            <div className="mb-6">
              <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="h-12 w-12 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">
                Currículo Enviado!
              </h2>
              <p className="text-slate-600">
                Recebemos seu currículo com sucesso. Nossa equipe de RH entrará
                em contato em breve.
              </p>
            </div>
            <Button
              onClick={() => setSubmitted(false)}
              className="w-full bg-gradient-to-r from-[#009ee2] to-[#006996] hover:from-[#0088c7] hover:to-[#005a7a] text-white"
            >
              Enviar Outro Currículo
            </Button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar />

      {/* Main Content */}
      <main className="flex-1 py-12 px-4 sm:px-6 lg:px-8 pt-32 pb-0">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-slate-800 mb-3">
              Banco de Talentos
            </h1>
            <p className="text-lg text-slate-600">
              Estamos sempre em busca de talentos para fazer parte da nossa
              equipe. Cadastre seu currículo e venha crescer conosco!
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-200">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label
                    htmlFor="nome"
                    className="block text-sm font-medium text-slate-700 mb-2"
                  >
                    Nome <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="nome"
                    value={formData.nome}
                    onChange={e =>
                      setFormData({ ...formData, nome: e.target.value })
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#009ee2] focus:border-[#009ee2] text-slate-800"
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor="sobrenome"
                    className="block text-sm font-medium text-slate-700 mb-2"
                  >
                    Sobrenome <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="sobrenome"
                    value={formData.sobrenome}
                    onChange={e =>
                      setFormData({ ...formData, sobrenome: e.target.value })
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#009ee2] focus:border-[#009ee2] text-slate-800"
                    required
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="telefone"
                  className="block text-sm font-medium text-slate-700 mb-2"
                >
                  Telefone <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  id="telefone"
                  value={formData.telefone}
                  onChange={e => {
                    const formatted = formatPhone(e.target.value);
                    setFormData({ ...formData, telefone: formatted });
                  }}
                  placeholder="(11) 99999-9999"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-800 focus:border-blue-800 text-slate-800"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-slate-700 mb-2"
                >
                  E-mail (opcional)
                </label>
                <input
                  type="email"
                  id="email"
                  value={formData.email}
                  onChange={e =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-800 focus:border-blue-800 text-slate-800"
                />
              </div>

              <div>
                <label
                  htmlFor="estado"
                  className="block text-sm font-medium text-slate-700 mb-2"
                >
                  Estado <span className="text-red-500">*</span>
                </label>
                <select
                  id="estado"
                  value={formData.estado}
                  onChange={e => {
                    const novoEstado = e.target.value;
                    setFormData({ ...formData, estado: novoEstado, cidade: '' });
                    setCidades([]); // Limpar cidades quando mudar estado
                  }}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#009ee2] focus:border-[#009ee2] text-slate-800"
                  required
                >
                  <option value="">Selecione um estado</option>
                  {estados.map(estado => (
                    <option key={estado.sigla} value={estado.sigla}>
                      {estado.sigla} - {ESTADOS_NOMES[estado.sigla] || estado.sigla}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="cidade"
                  className="block text-sm font-medium text-slate-700 mb-2"
                >
                  Cidade de Interesse <span className="text-red-500">*</span>
                </label>
                <select
                  id="cidade"
                  value={formData.cidade}
                  onChange={e =>
                    setFormData({ ...formData, cidade: e.target.value })
                  }
                  disabled={!formData.estado || cidades.length === 0}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#009ee2] focus:border-[#009ee2] text-slate-800 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  required
                >
                  <option value="">
                    {!formData.estado
                      ? 'Selecione primeiro um estado'
                      : cidades.length === 0
                        ? 'Carregando cidades...'
                        : 'Selecione uma cidade'}
                  </option>
                  {cidades.map(cidade => (
                    <option key={cidade.id} value={cidade.nome}>
                      {cidade.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="endereco"
                  className="block text-sm font-medium text-slate-700 mb-2"
                >
                  <MapPin className="inline h-4 w-4 mr-1" />
                  Endereço Completo (para cálculo de VT)
                </label>
                <input
                  type="text"
                  id="endereco"
                  value={formData.endereco}
                  onChange={e =>
                    setFormData({ ...formData, endereco: e.target.value })
                  }
                  placeholder="Ex: Rua Exemplo, 123 - Bairro - Cidade/UF - CEP"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#009ee2] focus:border-[#009ee2] text-slate-800"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Informe seu endereço completo para cálculo do Vale Transporte
                  para as lojas.
                </p>
              </div>

              <div>
                <label
                  htmlFor="arquivo"
                  className="block text-sm font-medium text-slate-700 mb-2"
                >
                  Currículo (PDF) <span className="text-red-500">*</span>
                </label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-[#009ee2] transition-colors">
                  <div className="space-y-1 text-center">
                    {arquivo ? (
                      <div className="flex items-center justify-center gap-2 text-green-600">
                        <CheckCircle className="h-5 w-5" />
                        <span className="text-sm font-medium">
                          {arquivo.name}
                        </span>
                      </div>
                    ) : (
                      <>
                        <Upload className="mx-auto h-12 w-12 text-slate-400" />
                        <div className="flex text-sm text-slate-600">
                          <label
                            htmlFor="arquivo"
                            className="relative cursor-pointer bg-white rounded-md font-medium text-[#009ee2] hover:text-[#006996] focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-[#009ee2]"
                          >
                            <span>Clique para anexar</span>
                            <input
                              id="arquivo"
                              name="arquivo"
                              type="file"
                              accept=".pdf"
                              className="sr-only"
                              onChange={e => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  if (file.size > 5 * 1024 * 1024) {
                                    toast.error(
                                      'Arquivo muito grande. Tamanho máximo: 5MB'
                                    );
                                    return;
                                  }
                                  setArquivo(file);
                                }
                              }}
                            />
                          </label>
                          <p className="pl-1">ou arraste o arquivo aqui</p>
                        </div>
                        <p className="text-xs text-slate-500">PDF até 5MB</p>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                disabled={submitting}
                className="w-full py-3 text-lg font-semibold bg-gradient-to-r from-[#009ee2] to-[#006996] hover:from-[#0088c7] hover:to-[#005a7a] text-white"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-5 w-5" />
                    Enviar Currículo
                  </>
                )}
              </Button>
            </form>
          </div>

          <div className="mt-8 mb-8 text-center text-sm text-slate-600">
            <p>
              Seus dados serão utilizados exclusivamente para processos
              seletivos.
              <br />
              Para mais informações, entre em contato conosco.
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
