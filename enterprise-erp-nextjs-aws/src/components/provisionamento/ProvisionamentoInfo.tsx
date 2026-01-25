'use client';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';

export function ProvisionamentoInfo() {
  const [open, setOpen] = useState(false);

  return (
    <Alert className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-900">
      <Info className="h-5 w-5 text-blue-600 dark:text-blue-400" />
      <AlertTitle className="flex items-center justify-between">
        <span>O que é Provisionamento?</span>
        <Collapsible open={open} onOpenChange={setOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="h-auto p-1">
              {open ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </CollapsibleTrigger>
        </Collapsible>
      </AlertTitle>
      <AlertDescription className="space-y-2">
        <p className="font-medium text-foreground">
          Provisionamento é o ato de <strong>reservar recursos financeiros</strong> para
          cobrir despesas futuras conhecidas e previstas.
        </p>
        
        <Collapsible open={open} onOpenChange={setOpen}>
          <CollapsibleContent className="space-y-3 mt-3 pt-3 border-t">
            <div>
              <p className="font-medium mb-2 text-foreground">Para que serve?</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground text-sm ml-2">
                <li>
                  <strong>Reconhecimento antecipado:</strong> A despesa é reconhecida antes de
                  ser paga (princípio da competência contábil)
                </li>
                <li>
                  <strong>Reserva no passivo:</strong> Cria uma provisão estimada no balanço
                  patrimonial como obrigação futura
                </li>
                <li>
                  <strong>Efetivação:</strong> Quando paga, a provisão é baixada e o movimento
                  é registrado como despesa realizada
                </li>
              </ul>
            </div>

            <div>
              <p className="font-medium mb-2 text-foreground">Exemplos práticos:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground text-sm ml-2">
                <li><strong>13º salário:</strong> Provisionar 1/12 do valor mensalmente durante o ano</li>
                <li><strong>Férias e encargos trabalhistas:</strong> Reserva mensal para férias proporcionais</li>
                <li><strong>Impostos anuais:</strong> IRPJ, CSLL - provisionar conforme regime tributário</li>
                <li><strong>Aluguel mensal:</strong> Provisão recorrente para pagamentos fixos</li>
                <li><strong>Manutenções preventivas:</strong> Reserva para serviços programados</li>
              </ul>
            </div>

            <div className="bg-blue-100/50 dark:bg-blue-900/20 p-3 rounded-md border border-blue-200 dark:border-blue-800">
              <p className="text-sm font-medium text-foreground mb-1">Objetivo principal:</p>
              <p className="text-sm text-muted-foreground">
                Garantir <strong>estabilidade financeira</strong> e <strong>previsibilidade</strong>,
                evitando que grandes despesas impactem o fluxo de caixa de uma só vez. Ao provisionar
                mensalmente, você distribui o impacto financeiro ao longo do tempo.
              </p>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </AlertDescription>
    </Alert>
  );
}

