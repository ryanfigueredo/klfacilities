'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProvisionamentoClient } from './ProvisionamentoClient';
import { TemplatesTable } from '@/components/provisionamento/TemplatesTable';
import { ProvisionamentoInfo } from '@/components/provisionamento/ProvisionamentoInfo';

export function ProvisionamentoPageClient() {
  return (
    <div className="space-y-6">
      <ProvisionamentoInfo />
      
      <Tabs defaultValue="provisoes" className="w-full">
        <TabsList>
          <TabsTrigger value="provisoes">Provisões Ativas</TabsTrigger>
          <TabsTrigger value="templates">Templates Recorrentes</TabsTrigger>
        </TabsList>
        <TabsContent value="provisoes" className="mt-6">
          <ProvisionamentoClient />
        </TabsContent>
        <TabsContent value="templates" className="mt-6">
          <TemplatesTable />
        </TabsContent>
      </Tabs>
    </div>
  );
}

