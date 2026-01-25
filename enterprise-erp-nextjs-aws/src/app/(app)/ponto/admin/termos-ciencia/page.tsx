'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { Search, FileText, CheckCircle2, XCircle } from 'lucide-react';

export default function TermosCienciaPage() {
  const [termos, setTermos] = useState<any[]>([]);
  const [funcionarios, setFuncionarios] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Buscar funcionários
      const funcionariosRes = await fetch('/api/funcionarios');
      const funcionariosData = await funcionariosRes.json();
      setFuncionarios(funcionariosData.rows || []);

      // Buscar termos de ciência
      const termosRes = await fetch('/api/ponto/termos-ciencia');
      if (termosRes.ok) {
        const termosData = await termosRes.json();
        setTermos(termosData.data || []);
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filtrar funcionários que não assinaram
  const funcionariosSemTermo = funcionarios.filter(f => {
    const temTermo = termos.some(t => t.funcionarioId === f.id);
    const matchSearch = !searchTerm || 
      f.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.cpf?.replace(/\D/g, '').includes(searchTerm.replace(/\D/g, ''));
    return !temTermo && matchSearch;
  });

  // Filtrar termos assinados
  const termosAssinados = termos.filter(t => {
    const funcionario = funcionarios.find(f => f.id === t.funcionarioId);
    if (!funcionario) return false;
    const matchSearch = !searchTerm || 
      funcionario.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      funcionario.cpf?.replace(/\D/g, '').includes(searchTerm.replace(/\D/g, ''));
    return matchSearch;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Termos de Ciência - Ponto Eletrônico
        </h1>
        <p className="text-gray-600">
          Visualize quais colaboradores assinaram o termo de ciência do sistema de ponto eletrônico
        </p>
      </div>

      {/* Busca */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Buscar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div>
            <Label htmlFor="search">Nome ou CPF</Label>
            <Input
              id="search"
              placeholder="Digite o nome ou CPF do colaborador..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Colaboradores sem termo */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-orange-600">
            <XCircle className="h-5 w-5" />
            Colaboradores sem Termo Assinado ({funcionariosSemTermo.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-500">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 mr-2"></div>
              Carregando...
            </div>
          ) : funcionariosSemTermo.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-2 text-green-500" />
              <p className="font-medium">Todos os colaboradores assinaram o termo!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>CPF</TableHead>
                    <TableHead>Grupo</TableHead>
                    <TableHead>Unidade</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {funcionariosSemTermo.map((f: any) => (
                    <TableRow key={f.id}>
                      <TableCell className="font-medium">{f.nome}</TableCell>
                      <TableCell>
                        {f.cpf
                          ? f.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
                          : '—'}
                      </TableCell>
                      <TableCell>{f.grupo || '—'}</TableCell>
                      <TableCell>{f.unidadeNome || '—'}</TableCell>
                      <TableCell>
                        <span className="px-2 py-1 rounded text-xs bg-orange-100 text-orange-800 font-medium">
                          Pendente
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Termos assinados */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-600">
            <CheckCircle2 className="h-5 w-5" />
            Termos Assinados ({termosAssinados.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-500">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 mr-2"></div>
              Carregando...
            </div>
          ) : termosAssinados.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="font-medium">Nenhum termo encontrado</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>CPF</TableHead>
                    <TableHead>Grupo</TableHead>
                    <TableHead>Unidade</TableHead>
                    <TableHead>Assinado em</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {termosAssinados.map((termo: any) => {
                    const funcionario = funcionarios.find(f => f.id === termo.funcionarioId);
                    if (!funcionario) return null;
                    return (
                      <TableRow key={termo.id}>
                        <TableCell className="font-medium">{funcionario.nome}</TableCell>
                        <TableCell>
                          {funcionario.cpf
                            ? funcionario.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
                            : '—'}
                        </TableCell>
                        <TableCell>{funcionario.grupo || '—'}</TableCell>
                        <TableCell>{funcionario.unidadeNome || '—'}</TableCell>
                        <TableCell>
                          {new Date(termo.assinadoEm).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </TableCell>
                        <TableCell>
                          <span className="px-2 py-1 rounded text-xs bg-green-100 text-green-800 font-medium">
                            Assinado
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

