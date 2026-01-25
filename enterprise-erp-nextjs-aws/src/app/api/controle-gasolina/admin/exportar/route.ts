import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { requireControleGasolinaAdmin } from '@/lib/controle-gasolina/auth';

export const config = {
  api: { responseLimit: false },
};

export async function GET(req: NextRequest) {
  await requireControleGasolinaAdmin();

  const { searchParams } = new URL(req.url);
  const tipo = searchParams.get('tipo');
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const usuario = searchParams.get('usuario');
  const veiculo = searchParams.get('veiculo');
  const formato = searchParams.get('formato');

  const dateFilter: Record<string, Date> = {};
  if (startDate) dateFilter.gte = new Date(`${startDate}T00:00:00`);
  if (endDate) dateFilter.lte = new Date(`${endDate}T23:59:59`);

  const filtros = {
    createdAt: Object.keys(dateFilter).length > 0 ? dateFilter : undefined,
    usuarioId: usuario || undefined,
    veiculoId: veiculo || undefined,
  };

  type RegistroExportado = {
    tipo: string;
    placa: string;
    usuario: string;
    valor: number;
    km: number;
    data: string;
  };

  const registros: RegistroExportado[] = [];

  if (!tipo || tipo === 'KM') {
    const km = await prisma.kmRecord.findMany({
      where: filtros,
      include: { usuario: true, veiculo: true },
    });

    registros.push(
      ...km.map((r) => ({
        tipo: 'KM',
        placa: r.veiculo?.placa ?? '',
        usuario: r.usuario?.email ?? '',
        valor: 0,
        km: r.km,
        data: r.createdAt.toLocaleString('pt-BR'),
      }))
    );
  }

  if (!tipo || tipo === 'ABASTECIMENTO') {
    const fuel = await prisma.fuelRecord.findMany({
      where: filtros,
      include: { usuario: true, veiculo: true },
    });

    registros.push(
      ...fuel.map((r) => ({
        tipo: 'ABASTECIMENTO',
        placa: r.veiculo?.placa ?? '',
        usuario: r.usuario?.email ?? '',
        valor: r.valor,
        km: r.kmAtual,
        data: r.createdAt.toLocaleString('pt-BR'),
      }))
    );
  }

  if (formato === 'excel') {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Registros');

    sheet.columns = [
      { header: 'Tipo', key: 'tipo', width: 15 },
      { header: 'Placa', key: 'placa', width: 15 },
      { header: 'Usuário', key: 'usuario', width: 30 },
      { header: 'Valor', key: 'valor', width: 12 },
      { header: 'KM', key: 'km', width: 10 },
      { header: 'Data', key: 'data', width: 25 },
    ];

    sheet.addRows(registros);

    const buffer = await workbook.xlsx.writeBuffer();

    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename=registros_${Date.now()}.xlsx`,
      },
    });
  } else if (formato === 'pdf') {
    const stream = new PDFDocument({ size: 'A4', margin: 30 });
    const chunks: Uint8Array[] = [];

    return new Response(
      new ReadableStream({
        start(controller) {
          stream.on('data', (chunk) => {
            chunks.push(chunk);
            controller.enqueue(chunk);
          });
          stream.on('end', () => {
            controller.close();
          });
          stream.on('error', (err) => {
            controller.error(err);
          });

          stream
            .fontSize(16)
            .text('Relatório de Registros', { align: 'center' })
            .moveDown();

          registros.forEach((r) => {
            stream
              .fontSize(10)
              .text(
                `Tipo: ${r.tipo} | Placa: ${r.placa} | Usuário: ${r.usuario}`
              )
              .text(
                `Valor: R$ ${r.valor.toFixed(2)} | KM: ${r.km} | Data: ${
                  r.data
                }`
              )
              .moveDown(0.5);
          });

          stream.end();
        },
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename=registros_${Date.now()}.pdf`,
        },
      }
    );
  } else {
    return NextResponse.json({ error: 'Formato inválido' }, { status: 400 });
  }
}
