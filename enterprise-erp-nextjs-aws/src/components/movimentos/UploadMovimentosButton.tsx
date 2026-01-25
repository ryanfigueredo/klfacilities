'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Upload } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';

type Props = {
  onImported?: () => void;
  className?: string;
};

export default function UploadMovimentosButton({
  onImported,
  className,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast?.() ?? { toast: console.log };
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [lastBatch, setLastBatch] = useState<{
    id: string;
    summary: any;
  } | null>(null);

  const handleClick = () => inputRef.current?.click();

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);

      const res = await fetch('/api/movimentos/import', {
        method: 'POST',
        body: fd,
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Falha no import');

      // resumo
      const s = json?.summary || {};
      toast({
        title: 'Importação concluída',
        description: `Lidas: ${s.lidas || 0} | Importadas: ${s.importadas || 0} | Provisões: ${s.provisoes || 0} | Puladas: ${s.puladas || 0} | Duplicadas: ${s.duplicadas || 0} | Unidades criadas: ${s.unidadesCriadas || 0}`,
      });

      // baixa o CSV do relatório (se veio)
      if (json?.reportCsv) {
        const blob = new Blob([json.reportCsv], {
          type: 'text/csv;charset=utf-8',
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `import_report_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      }

      onImported?.();

      if (json?.batchId) {
        setLastBatch({ id: json.batchId, summary: s });
        setDrawerOpen(true);
      }

      // Se criou provisões, direciona para a tela de Provisionamento
      if ((s.provisoes || 0) > 0) {
        router.push('/provisionamento?status=PENDENTE');
      }
    } catch (err: any) {
      toast({
        title: 'Erro no upload',
        description: String(err.message || err),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className={className}>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,.xlsx,.xls"
        className="hidden"
        onChange={handleChange}
      />
      <Button
        variant="outline"
        size="sm"
        onClick={handleClick}
        disabled={loading}
        className="gap-2"
      >
        <Upload size={16} />
        {loading ? 'Importando...' : 'Upload CSV/XLSX'}
      </Button>

      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Resumo do Upload</DrawerTitle>
            <DrawerDescription>
              {lastBatch ? `Batch: ${lastBatch.id}` : '—'}
            </DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-2 text-sm">
            {lastBatch && (
              <div className="grid grid-cols-2 gap-2">
                <div>Lidas: {lastBatch.summary?.lidas || 0}</div>
                <div>Importadas: {lastBatch.summary?.importadas || 0}</div>
                <div>Provisões: {lastBatch.summary?.provisoes || 0}</div>
                <div>Puladas: {lastBatch.summary?.puladas || 0}</div>
                <div>Duplicadas: {lastBatch.summary?.duplicadas || 0}</div>
                <div>
                  Unidades criadas: {lastBatch.summary?.unidadesCriadas || 0}
                </div>
              </div>
            )}
          </div>
          <DrawerFooter>
            <Button
              variant="destructive"
              disabled={!lastBatch}
              onClick={async () => {
                if (!lastBatch) return;
                try {
                  const r = await fetch(
                    `/api/movimentos/batch?batchId=${encodeURIComponent(lastBatch.id)}`,
                    { method: 'DELETE' }
                  );
                  const j = await r.json().catch(() => ({}));
                  if (!r.ok) throw new Error(j?.error || 'Falha ao reverter');
                  toast({ title: 'Upload revertido com sucesso' });
                  setDrawerOpen(false);
                  setLastBatch(null);
                  router.refresh();
                } catch (e: any) {
                  toast({
                    title: 'Erro ao reverter',
                    description: e?.message,
                    variant: 'destructive',
                  });
                }
              }}
            >
              Reverter upload
            </Button>
            <Button variant="outline" onClick={() => setDrawerOpen(false)}>
              Fechar
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
