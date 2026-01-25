import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { can, forbiddenPayload } from '@/lib/auth/policy';
import {
  filterWhereByUnidades,
  getSupervisorScope,
} from '@/lib/supervisor-scope';
import ExcelJS from 'exceljs';

export async function GET(request: NextRequest): Promise<Response> {
  const me = await getCurrentUser(request);

  if (!me?.id) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  if (!can(me.role, 'incidentes', 'list')) {
    return NextResponse.json(forbiddenPayload('incidentes', 'list'), {
      status: 403,
    });
  }

  const { searchParams } = new URL(request.url);
  const statusParam = searchParams.get('status');
  const grupoId = searchParams.get('grupoId');
  const unidadeId = searchParams.get('unidadeId');
  const search = searchParams.get('q');

  let where: any = {};

  if (statusParam && ['ABERTO', 'CONCLUIDO'].includes(statusParam)) {
    where.status = statusParam;
  }

  if (grupoId) {
    where.grupoId = grupoId;
  }

  if (unidadeId) {
    where.unidadeId = unidadeId;
  }

  if (search) {
    where.OR = [
      { titulo: { contains: search, mode: 'insensitive' } },
      { descricao: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (me.role === 'SUPERVISOR') {
    const scope = await getSupervisorScope(me.id);
    if (!scope.unidadeIds.length) {
      return NextResponse.json({ incidentes: [] });
    }

    where = filterWhereByUnidades(where, scope.unidadeIds);

    if (scope.grupoIds.length) {
      if (!where.grupoId) {
        where.grupoId = { in: scope.grupoIds };
      } else if (typeof where.grupoId === 'string') {
        if (!scope.grupoIds.includes(where.grupoId)) {
          return NextResponse.json({ incidentes: [] });
        }
      } else if (where.grupoId?.in) {
        const intersection = where.grupoId.in.filter((id: string) =>
          scope.grupoIds.includes(id)
        );
        if (!intersection.length) {
          return NextResponse.json({ incidentes: [] });
        }
        where.grupoId = { in: intersection };
      }
    }
  }

  const incidentes = await prisma.incidente.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      grupo: { select: { id: true, nome: true } },
      unidade: {
        select: { id: true, nome: true, cidade: true, estado: true },
      },
      criadoPor: { select: { id: true, name: true, email: true } },
      concluidoPor: { select: { id: true, name: true } },
      clienteFinal: { select: { id: true, email: true, nome: true } },
      categoriaUrgencia: {
        select: {
          id: true,
          urgenciaNivel: true,
          nome: true,
          prazoHoras: true,
          descricao: true,
        },
      },
    },
  });

  // Criar workbook Excel
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Relatório de Incidentes');

  // Definir colunas
  worksheet.columns = [
    { header: 'ID', key: 'id', width: 36 },
    { header: 'Título', key: 'titulo', width: 30 },
    { header: 'Categoria', key: 'categoria', width: 20 },
    { header: 'Urgência', key: 'urgencia', width: 15 },
    { header: 'Prazo (horas)', key: 'prazoHoras', width: 15 },
    { header: 'Descrição', key: 'descricao', width: 40 },
    { header: 'Status', key: 'status', width: 12 },
    { header: 'Grupo', key: 'grupo', width: 20 },
    { header: 'Unidade', key: 'unidade', width: 25 },
    { header: 'Criado Por', key: 'criadoPor', width: 25 },
    { header: 'Cliente Final', key: 'clienteFinal', width: 25 },
    { header: 'Data Criação', key: 'createdAt', width: 20 },
    { header: 'Concluído Por', key: 'concluidoPor', width: 25 },
    { header: 'Data Conclusão', key: 'concluidoEm', width: 20 },
    { header: 'O que foi feito', key: 'conclusaoNotas', width: 50 },
  ];

  // Estilizar cabeçalho
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' },
  };
  worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

  // Adicionar dados
  incidentes.forEach(incidente => {
    const row = worksheet.addRow({
      id: incidente.id,
      titulo: incidente.titulo,
      categoria: incidente.categoria || '—',
      urgencia: incidente.categoriaUrgencia
        ? `${incidente.categoriaUrgencia.urgenciaNivel} - ${incidente.categoriaUrgencia.nome}`
        : '—',
      prazoHoras: incidente.categoriaUrgencia
        ? `${incidente.categoriaUrgencia.prazoHoras}h`
        : '—',
      descricao: incidente.descricao,
      status: incidente.status === 'ABERTO' ? 'Aberto' : 'Concluído',
      grupo: incidente.grupo.nome,
      unidade: `${incidente.unidade.nome}${
        incidente.unidade.cidade
          ? ` - ${incidente.unidade.cidade}${
              incidente.unidade.estado ? `/${incidente.unidade.estado}` : ''
            }`
          : ''
      }`,
      criadoPor:
        incidente.clienteFinal?.email ||
        incidente.criadoPor?.name ||
        incidente.criadoPor?.email ||
        '—',
      clienteFinal: incidente.clienteFinal?.nome || '—',
      createdAt: new Date(incidente.createdAt).toLocaleString('pt-BR'),
      concluidoPor: incidente.concluidoPor?.name || '—',
      concluidoEm: incidente.concluidoEm
        ? new Date(incidente.concluidoEm).toLocaleString('pt-BR')
        : '—',
      conclusaoNotas: incidente.conclusaoNotas || '—',
    });

    // Colorir linha baseado na urgência
    if (incidente.categoriaUrgencia) {
      const nivel = incidente.categoriaUrgencia.urgenciaNivel;
      let color = 'FFFFFFFF'; // Branco padrão
      if (nivel === 'CRITICA') color = 'FFFFE5E5'; // Vermelho claro
      else if (nivel === 'ALTA') color = 'FFFFF4E5'; // Laranja claro
      else if (nivel === 'NORMAL') color = 'FFFFFFE5'; // Amarelo claro
      else if (nivel === 'BAIXA') color = 'FFE5F4FF'; // Azul claro
      else if (nivel === 'MUITO_BAIXA') color = 'FFF5F5F5'; // Cinza claro

      row.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: color },
      };
    }
  });

  // Gerar buffer
  const buffer = await workbook.xlsx.writeBuffer();

  // Nome do arquivo
  const dataStr = new Date().toISOString().split('T')[0];
  const nomeArquivo = `relatorio-incidentes-${dataStr}.xlsx`;

  return new NextResponse(buffer as unknown as BodyInit, {
    status: 200,
    headers: {
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${nomeArquivo}"`,
      'Cache-Control': 'no-store',
    },
  });
}

