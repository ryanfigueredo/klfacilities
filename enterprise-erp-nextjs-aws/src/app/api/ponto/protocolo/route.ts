import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createHash } from 'crypto';

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: process.env.AWS_ACCESS_KEY_ID
    ? {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      }
    : undefined,
});

function b64urlDecode(input: string): string {
  const b64 = input.replace(/-/g, '+').replace(/_/g, '/');
  const pad = b64.length % 4 === 0 ? '' : '='.repeat(4 - (b64.length % 4));
  return Buffer.from(b64 + pad, 'base64').toString('utf8');
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const proto = (searchParams.get('proto') || '').trim();
    console.log('[Protocolo] Buscando protocolo:', proto);
    
    if (!proto || !proto.startsWith('KL-')) {
      console.log('[Protocolo] Protocolo inválido - não começa com KL-');
      return NextResponse.json({ error: 'Protocolo inválido: deve começar com KL-' }, { status: 400 });
    }

    const encoded = proto.slice(3);
    console.log('[Protocolo] Encoded (após remover KL-):', encoded, 'Tamanho:', encoded.length);
    let funcionarioId: string | null = null;
    let unidadeId: string | null = null;
    let ym: string | null = null;

    // Tentar decodificar como base64url (formato antigo)
    let decodedSuccessfully = false;
    try {
      const decoded = b64urlDecode(encoded);
      const parts = decoded.split('.');
      if (parts.length === 3 && /^\d{4}-\d{2}$/.test(parts[2])) {
        funcionarioId = parts[0];
        unidadeId = parts[1];
        ym = parts[2];
        decodedSuccessfully = true;
        console.log('[Protocolo] Decodificado como base64url:', { funcionarioId, unidadeId, ym });
      }
    } catch (e) {
      console.log('[Protocolo] Falha ao decodificar base64url, tentando hash curto');
    }
    
    // Se não decodificou como base64url, tentar buscar usando hash curto (formato novo do PDF)
    if (!decodedSuccessfully) {
      console.log('[Protocolo] Entrando no bloco de busca por hash curto. Encoded:', encoded);
      const hashCurto = encoded.toUpperCase();
      
      // Validar que o hash curto tem 12 caracteres
      if (hashCurto.length !== 12) {
        console.log('[Protocolo] Hash curto com tamanho incorreto:', hashCurto.length);
        return NextResponse.json({ error: 'Protocolo inválido: formato incorreto' }, { status: 400 });
      }
      
      console.log('[Protocolo] Hash curto válido:', hashCurto);
      
      // PRIMEIRO: Tentar buscar diretamente nos registros que têm o protocolo salvo
      // Isso é mais rápido e preciso
      // O protocolo pode estar no formato KL-YYYYMMDD-HASH ou KL-HASH
      console.log('[Protocolo] Buscando registro com protocolo no banco...');
      const registroComProtocolo = await prisma.registroPonto.findFirst({
        where: {
          OR: [
            { protocolo: { contains: hashCurto } },
            { protocolo: { endsWith: hashCurto } },
            { protocolo: { startsWith: `KL-${hashCurto}` } },
          ],
        },
        select: {
          funcionarioId: true,
          unidadeId: true,
          timestamp: true,
          protocolo: true, // Adicionar para debug
        },
        orderBy: {
          timestamp: 'desc',
        },
      });

      if (registroComProtocolo && registroComProtocolo.funcionarioId) {
        console.log('[Protocolo] Encontrado registro com protocolo salvo:', registroComProtocolo.protocolo);
        const date = new Date(registroComProtocolo.timestamp as any);
        const y = date.getUTCFullYear();
        const m = String(date.getUTCMonth() + 1).padStart(2, '0');
        funcionarioId = registroComProtocolo.funcionarioId;
        unidadeId = registroComProtocolo.unidadeId;
        ym = `${y}-${m}`;
        console.log('[Protocolo] Dados encontrados:', { funcionarioId, unidadeId, ym });
      } else {
        console.log('[Protocolo] Não encontrado registro com protocolo salvo, tentando busca reversa');
        
        // Verificar se há algum protocolo similar no banco para debug
        const protocolosSimilares = await prisma.registroPonto.findMany({
          where: {
            protocolo: {
              contains: '8BF82248',
            },
          },
          select: {
            protocolo: true,
            timestamp: true,
          },
          take: 5,
        });
        console.log('[Protocolo] Protocolos similares encontrados:', protocolosSimilares.map(p => p.protocolo));
      }
      
      // Buscar nos últimos 36 meses para ter mais cobertura (3 anos)
      const now = new Date();
      const mesesParaBuscar: string[] = [];
      for (let i = 0; i < 36; i++) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        mesesParaBuscar.push(`${y}-${m}`);
      }
      console.log('[Protocolo] Meses para buscar:', mesesParaBuscar.slice(0, 5), '... (total:', mesesParaBuscar.length, ')');

      // Buscar funcionários com registros nesses meses - aumentar limite
      console.log('[Protocolo] Buscando funcionários com registros...');
      const funcionariosComRegistros = await prisma.registroPonto.findMany({
        where: {
          timestamp: {
            gte: new Date(Date.UTC(now.getFullYear() - 2, now.getMonth(), 1)),
          },
        },
        select: {
          funcionarioId: true,
          unidadeId: true,
          timestamp: true,
        },
        distinct: ['funcionarioId', 'unidadeId'],
        take: 5000, // Aumentar limite para encontrar mais combinações
      });
      console.log('[Protocolo] Encontrados', funcionariosComRegistros.length, 'funcionários com registros');

      // Criar um mapa de combinações únicas para todos os meses possíveis
      const combinacoes = new Set<string>();
      funcionariosComRegistros.forEach(r => {
        if (r.funcionarioId) {
          // Gerar combinações para todos os meses no período
          // Considerar tanto com unidadeId quanto sem (vazio)
          mesesParaBuscar.forEach(ym => {
            if (r.unidadeId) {
              combinacoes.add(`${r.funcionarioId}.${r.unidadeId}.${ym}`);
            }
            // Também tentar com unidadeId vazio (caso o protocolo tenha sido gerado sem unidadeId)
            combinacoes.add(`${r.funcionarioId}..${ym}`);
          });
        }
      });

      // Tentar encontrar a combinação que gera o hash
      console.log('[Protocolo] Testando', combinacoes.size, 'combinações');
      let tested = 0;
      for (const comb of combinacoes) {
        tested++;
        if (tested % 1000 === 0) {
          console.log('[Protocolo] Testadas', tested, 'combinações...');
        }
        const hash = createHash('sha256').update(comb).digest('hex');
        const shortHash = hash.substring(0, 12).toUpperCase();
        if (shortHash === hashCurto) {
          console.log('[Protocolo] Hash encontrado! Combinação:', comb);
          const parts = comb.split('.');
          funcionarioId = parts[0];
          unidadeId = parts[1] || null; // Pode ser vazio
          ym = parts[2];
          break;
        }
      }
      console.log('[Protocolo] Total de combinações testadas:', tested);
      
      // Se ainda não encontrou, buscar em TODOS os funcionários ativos (fallback mais lento mas completo)
      // Mas limitar a busca para evitar timeout - buscar apenas nos últimos 12 meses
      if (!funcionarioId || !ym) {
        console.log('[Protocolo] Busca reversa não encontrou, tentando buscar em todos os funcionários...');
        const mesesLimitados = mesesParaBuscar.slice(0, 24); // Últimos 24 meses para evitar timeout mas ter boa cobertura
        
        const todosFuncionarios = await prisma.funcionario.findMany({
          select: {
            id: true,
            unidadeId: true,
          },
          take: 10000, // Aumentar limite para garantir que encontre
        });
        
        console.log('[Protocolo] Encontrados', todosFuncionarios.length, 'funcionários ativos');
        
        // Adicionar combinações de todos os funcionários para os meses limitados
        todosFuncionarios.forEach(func => {
          if (func.id) {
            mesesLimitados.forEach(ym => {
              if (func.unidadeId) {
                combinacoes.add(`${func.id}.${func.unidadeId}.${ym}`);
              }
              combinacoes.add(`${func.id}..${ym}`);
            });
          }
        });
        
        console.log('[Protocolo] Total de combinações após adicionar todos funcionários:', combinacoes.size);
        
        // Tentar novamente com todas as combinações
        let tested2 = 0;
        for (const comb of combinacoes) {
          tested2++;
          if (tested2 % 5000 === 0) {
            console.log('[Protocolo] Testadas', tested2, 'combinações na busca completa...');
          }
          const hash = createHash('sha256').update(comb).digest('hex');
          const shortHash = hash.substring(0, 12).toUpperCase();
          if (shortHash === hashCurto) {
            console.log('[Protocolo] Hash encontrado na busca completa! Combinação:', comb);
            const parts = comb.split('.');
            funcionarioId = parts[0];
            unidadeId = parts[1] || null;
            ym = parts[2];
            break;
          }
        }
        console.log('[Protocolo] Total de combinações testadas na busca completa:', tested2);
      }

      // Se ainda não encontrou após todas as tentativas
      if (!funcionarioId || !ym) {
        console.log('[Protocolo] Protocolo não encontrado após todas as tentativas');
        return NextResponse.json({ error: 'Protocolo não encontrado' }, { status: 404 });
      }
    }

    console.log('[Protocolo] Validação final:', { funcionarioId, unidadeId, ym });
    
    if (!funcionarioId) {
      console.log('[Protocolo] Validação final falhou: funcionarioId vazio');
      return NextResponse.json({ error: 'Protocolo inválido: funcionário não encontrado' }, { status: 400 });
    }
    
    if (!ym) {
      console.log('[Protocolo] Validação final falhou: ym vazio');
      return NextResponse.json({ error: 'Protocolo inválido: mês não encontrado' }, { status: 400 });
    }
    
    if (!/^\d{4}-\d{2}$/.test(ym)) {
      console.log('[Protocolo] Validação final falhou: formato de ym inválido:', ym);
      return NextResponse.json({ error: 'Protocolo inválido: formato de data inválido' }, { status: 400 });
    }

    const [y, m] = ym.split('-').map(Number);
    const start = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0));
    const end = new Date(Date.UTC(y, m, 1, 0, 0, 0));

    // Buscar informações do funcionário
    const funcionario = await prisma.funcionario.findUnique({
      where: { id: funcionarioId },
      include: {
        grupo: true,
        unidade: true,
      },
    });

    const rows = await prisma.registroPonto.findMany({
      where: {
        funcionarioId,
        ...(unidadeId ? { unidadeId } : {}),
        timestamp: { gte: start, lt: end },
      },
      orderBy: { timestamp: 'asc' },
      select: { 
        id: true, 
        timestamp: true, 
        tipo: true, 
        selfieUrl: true,
        lat: true,
        lng: true,
        accuracy: true,
      },
    });

    // Processar URLs: usar proxy para evitar problemas de CORS
    console.log('[Protocolo] Processando', rows.length, 'registros para gerar URLs via proxy');
    console.log('[Protocolo] Primeiros registros (amostra):', rows.slice(0, 3).map(r => ({
      id: r.id,
      tipo: r.tipo,
      timestamp: r.timestamp,
      temSelfieUrl: !!r.selfieUrl,
      selfieUrl: r.selfieUrl ? r.selfieUrl.substring(0, 50) + '...' : null,
    })));
    
    const presigned = rows.map(r => {
        // Sempre usar proxy para evitar problemas de CORS
        // O proxy busca a imagem do S3, otimiza (redimensiona e comprime) e retorna com headers CORS corretos
        let finalUrl: string | null = null;
        if (r.selfieUrl) {
          if (r.selfieUrl.startsWith('s3://')) {
            // Usar proxy com otimização: w=400 (largura máxima) e q=80 (qualidade JPEG)
            finalUrl = `/api/ponto/protocolo/image?url=${encodeURIComponent(r.selfieUrl)}&w=400&q=80`;
            console.log('[Protocolo] ✅ URL proxy otimizada gerada para s3://:', r.selfieUrl.substring(0, 80) + '...');
          } else if (r.selfieUrl.startsWith('http://') || r.selfieUrl.startsWith('https://')) {
            // Se já é HTTP, também usar proxy para garantir CORS e otimização
            finalUrl = `/api/ponto/protocolo/image?url=${encodeURIComponent(r.selfieUrl)}&w=400&q=80`;
            console.log('[Protocolo] ✅ URL proxy otimizada gerada para HTTP:', r.selfieUrl.substring(0, 80) + '...');
          } else {
            console.log('[Protocolo] ⚠️ Formato de selfieUrl não reconhecido:', r.selfieUrl?.substring(0, 100));
          }
        } else {
          console.log('[Protocolo] ⚠️ Registro sem selfieUrl - ID:', r.id, 'Tipo:', r.tipo);
        }
      
        return { 
          ...r, 
        selfieHttpUrl: finalUrl,
          lat: r.lat ? Number(r.lat) : null,
          lng: r.lng ? Number(r.lng) : null,
          accuracy: r.accuracy ? Number(r.accuracy) : null,
        };
    });
    const comFotos = presigned.filter(r => r.selfieHttpUrl).length;
    const semFotos = presigned.filter(r => !r.selfieHttpUrl).length;
    console.log('[Protocolo] 📊 Resumo:', {
      total: presigned.length,
      comFotos,
      semFotos,
      percentualComFotos: presigned.length > 0 ? ((comFotos / presigned.length) * 100).toFixed(1) + '%' : '0%',
    });
    
    // Log detalhado dos registros sem fotos para debug
    if (semFotos > 0) {
      const semFoto = presigned.filter(r => !r.selfieHttpUrl);
      console.log('[Protocolo] ⚠️ Registros sem fotos (' + semFotos + '):', semFoto.map(r => ({
        id: r.id,
        tipo: r.tipo,
        timestamp: r.timestamp,
        temSelfieUrlOriginal: !!r.selfieUrl,
        selfieUrlOriginal: r.selfieUrl ? r.selfieUrl.substring(0, 80) + '...' : null,
      })));
    }
    
    // Log de amostra dos registros COM fotos
    if (comFotos > 0) {
      const comFoto = presigned.filter(r => r.selfieHttpUrl).slice(0, 3);
      console.log('[Protocolo] ✅ Amostra de registros COM fotos:', comFoto.map(r => ({
        id: r.id,
        tipo: r.tipo,
        timestamp: r.timestamp,
        urlLength: r.selfieHttpUrl?.length,
        urlPreview: r.selfieHttpUrl?.substring(0, 80) + '...',
      })));
    }

    // Agrupar por dia (YYYY-MM-DD)
    const grouped: Record<string, any[]> = {};
    for (const r of presigned) {
      const d = new Date(r.timestamp as any);
      const ymd = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(
        d.getUTCDate()
      ).padStart(2, '0')}`;
      (grouped[ymd] ||= []).push(r);
    }

    // Log final antes de retornar
    const totalRegistros = Object.values(grouped).reduce((acc, registros) => acc + registros.length, 0);
    const totalComFotos = Object.values(grouped).reduce((acc, registros) => 
      acc + registros.filter((r: any) => r.selfieHttpUrl).length, 0
    );
    console.log('[Protocolo] 📤 Retornando resposta:', {
      totalRegistros,
      totalComFotos,
      dias: Object.keys(grouped).length,
      funcionario: funcionario?.nome,
      month: ym,
    });

    return NextResponse.json({ 
      ok: true, 
      data: grouped,
      funcionario: funcionario ? {
        id: funcionario.id,
        nome: funcionario.nome,
        cpf: funcionario.cpf,
        grupo: funcionario.grupo ? {
          id: funcionario.grupo.id,
          nome: funcionario.grupo.nome,
        } : null,
        unidade: funcionario.unidade ? {
          id: funcionario.unidade.id,
          nome: funcionario.unidade.nome,
        } : null,
      } : null,
      month: ym,
    });
  } catch (e: any) {
    console.error('Erro ao buscar protocolo:', e);
    return NextResponse.json(
      { error: e?.message || 'Erro ao processar protocolo' },
      { status: 500 }
    );
  }
}


