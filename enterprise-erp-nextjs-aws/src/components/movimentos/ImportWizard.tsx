'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
  Upload,
  X,
  FileText,
  Loader2,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import * as XLSX from 'xlsx';

type Movimento = {
  titulo: string;
  descricao: string;
  valor: number;
  tipo: 'RECEITA' | 'DESPESA';
  categoria: string;
  dataLanc: Date;
  unidadeId: string;
  grupoId?: string;
};

type Unidade = {
  id: string;
  nome: string;
};

type Grupo = {
  id: string;
  nome: string;
};

interface ImportWizardProps {
  onSuccess?: () => void;
}

export function ImportWizard({ onSuccess }: ImportWizardProps) {
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [mappedData, setMappedData] = useState<Movimento[]>([]);
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>(
    {}
  );
  const [rawData, setRawData] = useState<any[]>([]);
  const [availableColumns, setAvailableColumns] = useState<string[]>([]);
  const [conflicts, setConflicts] = useState<
    { row: number; message: string }[]
  >([]);
  const [filterCurrentMonth, setFilterCurrentMonth] = useState(true);
  const [allowFutureDates, setAllowFutureDates] = useState(true);
  const [duplicates, setDuplicates] = useState<
    { row: number; message: string }[]
  >([]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setFile(file);

    const reader = new FileReader();
    reader.onload = e => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (jsonData.length > 1) {
          const headers = jsonData[0] as string[];
          const rows = jsonData.slice(1).map((row: any, index) => {
            const obj: any = {};
            headers.forEach((header, colIndex) => {
              if (header && row[colIndex] !== undefined) {
                obj[header] = row[colIndex];
              }
            });
            return obj;
          });

          setAvailableColumns(headers.filter(Boolean));
          setRawData(rows);
          setStep(2);
        }
      } catch (error) {
        console.error('Erro ao ler arquivo:', error);
        toast.error('Erro ao ler arquivo. Verifique se é um arquivo válido.');
      }
    };

    reader.readAsArrayBuffer(file);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': [
        '.xlsx',
      ],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv'],
    },
    multiple: false,
  });

  const handleColumnMapping = () => {
    if (!rawData.length) return;

    const mapped: Movimento[] = [];
    const conflicts: { row: number; message: string }[] = [];
    const duplicates: { row: number; message: string }[] = [];
    const seen = new Set<string>();

    // Filtros de data
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    for (let i = 0; i < rawData.length; i++) {
      const row = rawData[i];
      try {
        // Mapear e validar dados
        const dataStr =
          row[columnMapping.data] || row[columnMapping.data?.toLowerCase()];
        const data = new Date(dataStr);
        if (isNaN(data.getTime())) {
          conflicts.push({ row: i + 1, message: 'Data inválida' });
          continue;
        }

        const tipoStr = (
          row[columnMapping.tipo] ||
          row[columnMapping.tipo?.toLowerCase()] ||
          ''
        ).toUpperCase();
        if (!['RECEITA', 'DESPESA'].includes(tipoStr)) {
          conflicts.push({
            row: i + 1,
            message: 'Tipo deve ser RECEITA ou DESPESA',
          });
          continue;
        }

        const descricao =
          row[columnMapping.descricao] ||
          row[columnMapping.descricao?.toLowerCase()];
        if (!descricao) {
          conflicts.push({ row: i + 1, message: 'Descrição é obrigatória' });
          continue;
        }

        const valorStr = (
          row[columnMapping.valor] ||
          row[columnMapping.valor?.toLowerCase()] ||
          ''
        ).toString();
        const valor = parseFloat(
          valorStr.replace(/[^\d.,]/g, '').replace(',', '.')
        );
        if (isNaN(valor) || valor <= 0) {
          conflicts.push({ row: i + 1, message: 'Valor inválido' });
          continue;
        }

        // Aplicar filtros de data
        if (
          filterCurrentMonth &&
          (data < firstDayOfMonth || data > lastDayOfMonth)
        ) {
          conflicts.push({ row: i + 1, message: 'Data fora do mês atual' });
          continue;
        }

        if (!allowFutureDates && data > now) {
          conflicts.push({ row: i + 1, message: 'Data futura não permitida' });
          continue;
        }

        // Detectar duplicatas
        const grupoNome = row[columnMapping.grupo] || '';
        const unidadeNome = row[columnMapping.unidade] || '';
        const duplicateKey = `${data.toISOString().split('T')[0]}_${valor}_${grupoNome}_${unidadeNome}`;
        if (seen.has(duplicateKey)) {
          duplicates.push({
            row: i + 1,
            message: 'Possível duplicata (mesma data, valor, grupo e unidade)',
          });
        } else {
          seen.add(duplicateKey);
        }

        // Buscar IDs por nome
        const grupo = grupos.find(
          g => g.nome.toLowerCase() === grupoNome.toLowerCase()
        );
        const unidade = unidades.find(
          u => u.nome.toLowerCase() === unidadeNome.toLowerCase()
        );

        mapped.push({
          titulo: descricao, // Assuming 'descricao' is the 'titulo'
          descricao,
          valor,
          tipo: tipoStr as 'RECEITA' | 'DESPESA',
          categoria:
            row[columnMapping.categoria] ||
            row[columnMapping.categoria?.toLowerCase()],
          dataLanc: data,
          unidadeId: unidade?.id || '', // Assuming 'unidade' is the 'unidadeId'
          grupoId: grupo?.id,
        });
      } catch (error) {
        conflicts.push({ row: i + 1, message: 'Erro ao processar linha' });
      }
    }

    setMappedData(mapped);
    setConflicts(conflicts);
    setDuplicates(duplicates);
    setStep(3);
  };

  const handleImport = async () => {
    if (!mappedData.length) return;

    setIsLoading(true);
    let successCount = 0;
    let errorCount = 0;

    for (const row of mappedData) {
      try {
        const response = await fetch('/api/movimentos', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(row),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Erro ao importar linha');
        }
        successCount++;
      } catch (error) {
        console.error('Erro ao importar linha:', error);
        errorCount++;
      }
    }

    setIsLoading(false);

    if (successCount > 0) {
      toast.success(`${successCount} movimentos importados com sucesso`);
      onSuccess?.();
    }

    if (errorCount > 0) {
      toast.error(`${errorCount} movimentos falharam na importação`);
    }

    if (successCount > 0) {
      setIsOpen(false);
      setStep(1);
      setFile(null);
      setRawData([]);
      setMappedData([]);
      setColumnMapping({});
      setConflicts([]);
      window.location.reload();
    }
  };

  const resetWizard = () => {
    setStep(1);
    setFile(null);
    setRawData([]);
    setMappedData([]);
    setColumnMapping({});
    setConflicts([]);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="h-4 w-4 mr-2" />
          Importar Movimentos
        </Button>
      </DialogTrigger>
      <DialogContent
        className="max-w-4xl max-h-[90vh] overflow-y-auto"
        a11yTitle="Importar Movimentos"
      >
        <DialogHeader>
          <DialogTitle>Importar Movimentos</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Importe movimentos de um arquivo Excel ou CSV
          </p>
        </DialogHeader>

        <div className="space-y-6">
          {/* Step 1: Upload */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="text-lg font-medium mb-2">
                  Passo 1: Upload do Arquivo
                </h3>
                <p className="text-sm text-muted-foreground">
                  Arraste e solte um arquivo Excel (.xlsx, .xls) ou CSV, ou
                  clique para selecionar
                </p>
              </div>

              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                  isDragActive
                    ? 'border-primary bg-primary/5'
                    : 'border-muted-foreground/25'
                }`}
              >
                <input {...getInputProps()} />
                <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                {isDragActive ? (
                  <p className="text-primary">Solte o arquivo aqui...</p>
                ) : (
                  <div>
                    <p className="text-muted-foreground mb-2">
                      <FileText className="inline h-5 w-5 mr-2" />
                      Suporta arquivos Excel (.xlsx, .xls) e CSV
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Clique ou arraste para selecionar
                    </p>
                  </div>
                )}
              </div>

              {file && (
                <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                  <FileText className="h-4 w-4" />
                  <span className="text-sm font-medium">{file.name}</span>
                  <span className="text-sm text-muted-foreground">
                    ({(file.size / 1024).toFixed(1)} KB)
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Column Mapping */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="text-lg font-medium mb-2">
                  Passo 2: Mapeamento de Colunas
                </h3>
                <p className="text-sm text-muted-foreground">
                  Mapeie as colunas do arquivo para os campos do sistema
                </p>
              </div>

              {/* Controles de Filtro */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="filterCurrentMonth"
                    checked={filterCurrentMonth}
                    onChange={e => setFilterCurrentMonth(e.target.checked)}
                    className="rounded"
                  />
                  <label
                    htmlFor="filterCurrentMonth"
                    className="text-sm font-medium"
                  >
                    Apenas mês atual
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="allowFutureDates"
                    checked={allowFutureDates}
                    onChange={e => setAllowFutureDates(e.target.checked)}
                    className="rounded"
                  />
                  <label
                    htmlFor="allowFutureDates"
                    className="text-sm font-medium"
                  >
                    Permitir datas futuras
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {[
                  { key: 'data', label: 'Data', required: true },
                  { key: 'tipo', label: 'Tipo', required: true },
                  { key: 'descricao', label: 'Descrição', required: true },
                  { key: 'grupo', label: 'Grupo', required: false },
                  { key: 'unidade', label: 'Unidade', required: false },
                  { key: 'categoria', label: 'Categoria', required: false },
                  { key: 'valor', label: 'Valor', required: true },
                  { key: 'documento', label: 'Documento', required: false },
                  {
                    key: 'formaPagamento',
                    label: 'Forma de Pagamento',
                    required: false,
                  },
                ].map(field => (
                  <div key={field.key} className="space-y-2">
                    <Label htmlFor={field.key}>
                      {field.label}{' '}
                      {field.required && (
                        <span className="text-red-500">*</span>
                      )}
                    </Label>
                    <Select
                      value={columnMapping[field.key] ?? undefined}
                      onValueChange={value =>
                        setColumnMapping(prev => {
                          const next = { ...prev };
                          if (value === '__none') {
                            delete next[field.key];
                          } else {
                            next[field.key] = value;
                          }
                          return next;
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a coluna" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none">Nenhuma</SelectItem>
                        {availableColumns.map(col => (
                          <SelectItem key={col} value={col}>
                            {col}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(1)}>
                  Voltar
                </Button>
                <Button
                  onClick={handleColumnMapping}
                  disabled={
                    !columnMapping.data ||
                    !columnMapping.tipo ||
                    !columnMapping.descricao ||
                    !columnMapping.valor
                  }
                >
                  Continuar
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Preview and Commit */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="text-lg font-medium mb-2">
                  Passo 3: Preview e Confirmação
                </h3>
                <p className="text-sm text-muted-foreground">
                  Revise os dados antes de importar
                </p>
              </div>

              {/* Resumo */}
              <div className="grid grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {mappedData.length}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Total de Linhas
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {mappedData.filter(r => r.tipo === 'RECEITA').length}
                  </div>
                  <div className="text-sm text-muted-foreground">Receitas</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {mappedData.filter(r => r.tipo === 'DESPESA').length}
                  </div>
                  <div className="text-sm text-muted-foreground">Despesas</div>
                </div>
              </div>

              {/* Conflitos */}
              {conflicts.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-red-600 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    Conflitos Encontrados ({conflicts.length})
                  </h4>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {conflicts.map((conflict, index) => (
                      <div
                        key={index}
                        className="text-sm text-red-600 bg-red-50 p-2 rounded"
                      >
                        Linha {conflict.row}: {conflict.message}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Duplicatas */}
              {duplicates.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-yellow-600 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Duplicatas Encontradas ({duplicates.length})
                  </h4>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {duplicates.map((duplicate, index) => (
                      <div
                        key={index}
                        className="text-sm text-yellow-600 bg-yellow-50 p-2 rounded"
                      >
                        Linha {duplicate.row}: {duplicate.message}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Preview da primeira linha */}
              {mappedData.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium">Preview da Primeira Linha:</h4>
                  <div className="p-3 bg-muted rounded-md text-sm">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <strong>Data:</strong>{' '}
                        {mappedData[0].dataLanc.toLocaleDateString('pt-BR')}
                      </div>
                      <div>
                        <strong>Tipo:</strong> {mappedData[0].tipo}
                      </div>
                      <div>
                        <strong>Descrição:</strong> {mappedData[0].descricao}
                      </div>
                      <div>
                        <strong>Valor:</strong>{' '}
                        {new Intl.NumberFormat('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        }).format(mappedData[0].valor)}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(2)}>
                  Voltar
                </Button>
                <Button
                  onClick={handleImport}
                  disabled={isLoading || conflicts.length > 0}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isLoading && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Importar {mappedData.length} Movimentos
                  {duplicates.length > 0 && (
                    <span className="ml-2 text-xs bg-yellow-200 text-yellow-800 px-2 py-1 rounded">
                      (com duplicatas)
                    </span>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={resetWizard}>
            Reiniciar
          </Button>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
