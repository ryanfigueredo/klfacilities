/**
 * Script para remover vínculos de unidades de um usuário específico
 * 
 * Uso: npx tsx scripts/remover-vinculos-usuario.ts <email-do-usuario>
 * Exemplo: npx tsx scripts/remover-vinculos-usuario.ts givaldo.paixao@klfacilities.com.br
 */

import { prisma } from '../src/lib/prisma';

async function removerVinculosUnidades(email: string) {
  try {
    console.log(`Buscando usuário com email: ${email}`);
    
    // Buscar o usuário pelo email
    const usuario = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
      },
    });

    if (!usuario) {
      console.error(`Usuário com email ${email} não encontrado.`);
      process.exit(1);
    }

    console.log(`Usuário encontrado: ${usuario.name} (${usuario.email})`);

    // Buscar todos os vínculos de unidades do usuário
    const vinculos = await prisma.supervisorScope.findMany({
      where: {
        supervisorId: usuario.id,
        unidadeId: { not: null },
      },
      select: {
        id: true,
        unidadeId: true,
        unidade: {
          select: {
            nome: true,
          },
        },
      },
    });

    console.log(`\nVínculos encontrados: ${vinculos.length}`);
    if (vinculos.length > 0) {
      console.log('Unidades vinculadas:');
      vinculos.forEach((v, index) => {
        console.log(`  ${index + 1}. ${v.unidade?.nome || 'N/A'} (ID: ${v.unidadeId})`);
      });
    }

    if (vinculos.length === 0) {
      console.log('\nNenhum vínculo de unidade encontrado para remover.');
      return;
    }

    // Remover todos os vínculos de unidades
    const result = await prisma.supervisorScope.deleteMany({
      where: {
        supervisorId: usuario.id,
        unidadeId: { not: null },
      },
    });

    console.log(`\n✅ ${result.count} vínculo(s) de unidade removido(s) com sucesso!`);
    
  } catch (error) {
    console.error('Erro ao remover vínculos:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Executar o script
const email = process.argv[2];

if (!email) {
  console.error('Por favor, forneça o email do usuário como argumento.');
  console.error('Uso: npx tsx scripts/remover-vinculos-usuario.ts <email-do-usuario>');
  process.exit(1);
}

removerVinculosUnidades(email);
