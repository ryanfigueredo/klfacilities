// Firebase Admin será inicializado apenas se necessário (tipo evita resolução do módulo em build)
let firebaseAdmin: { messaging: () => { sendEachForMulticast: (m: unknown) => Promise<{ successCount: number; failureCount: number; responses: { success: boolean }[] }> }; apps: { length: number }; initializeApp: (opts: unknown) => void; credential: { cert: (c: unknown) => unknown } } | null = null;

async function getFirebaseAdmin() {
  if (firebaseAdmin) return firebaseAdmin;

  try {
    const adminModule = await import('firebase-admin');
    firebaseAdmin = adminModule;

    if (!adminModule.apps.length) {
      const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;

      if (serviceAccount) {
        const serviceAccountJson = JSON.parse(serviceAccount);
        adminModule.initializeApp({
          credential: adminModule.credential.cert(serviceAccountJson),
        });
      } else {
        console.warn(
          'FIREBASE_SERVICE_ACCOUNT não configurado. Notificações push não funcionarão.'
        );
        return null;
      }
    }

    return firebaseAdmin;
  } catch (error) {
    console.error('Erro ao inicializar Firebase Admin:', error);
    return null;
  }
}

export interface PontoNotificationPayload {
  registroId: string;
  funcionarioId: string;
  funcionarioNome: string;
  tipo: string;
  timestamp: string;
  unidadeNome: string;
  protocolo?: string;
}

/**
 * Verificar quais supervisores têm acesso ao funcionário específico
 */
async function getSupervisorsWithAccessToFuncionario(
  funcionarioUnidadeId: string,
  funcionarioGrupoId: string | null
): Promise<string[]> {
  const { prisma } = await import('@/lib/prisma');
  const { getSupervisorScope, supervisorHasAccessToUnidade } = await import('@/lib/supervisor-scope');

  // Buscar todos os supervisores que podem ter acesso (via unidade ou grupo)
  const supervisorScopes = await prisma.supervisorScope.findMany({
    where: {
      OR: [
        { unidadeId: funcionarioUnidadeId },
        ...(funcionarioGrupoId ? [{ grupoId: funcionarioGrupoId }] : []),
      ],
    },
    select: {
      supervisorId: true,
    },
    distinct: ['supervisorId'],
  });

  const candidateSupervisorIds = supervisorScopes.map(s => s.supervisorId);

  if (candidateSupervisorIds.length === 0) {
    return [];
  }

  // Verificar cada supervisor para garantir que realmente tem acesso à unidade
  const supervisorsWithAccess: string[] = [];
  
  for (const supervisorId of candidateSupervisorIds) {
    try {
      const scope = await getSupervisorScope(supervisorId);
      if (supervisorHasAccessToUnidade(funcionarioUnidadeId, scope.unidadeIds)) {
        supervisorsWithAccess.push(supervisorId);
      }
    } catch (error) {
      console.error(`Erro ao verificar acesso do supervisor ${supervisorId}:`, error);
    }
  }

  return supervisorsWithAccess;
}

/**
 * Enviar notificação push para supervisores quando um colaborador bater ponto
 */
export async function sendPontoNotificationToSupervisors(
  payload: PontoNotificationPayload,
  supervisorIds: string[]
): Promise<void> {
  // Usar a versão com Prisma
  return sendPontoNotificationToSupervisorsPrisma(payload, supervisorIds);
}

/**
 * Buscar tokens FCM de supervisores usando Prisma
 */
export async function getSupervisorFcmTokens(supervisorIds: string[]): Promise<string[]> {
  const { prisma } = await import('@/lib/prisma');
  
  const tokens = await prisma.fcmToken.findMany({
    where: {
      userId: { in: supervisorIds },
    },
    select: {
      token: true,
    },
  });

  return tokens.map(t => t.token);
}

/**
 * Enviar notificação usando Prisma para buscar tokens
 */
export async function sendPontoNotificationToSupervisorsPrisma(
  payload: PontoNotificationPayload,
  supervisorIds: string[]
): Promise<void> {
  const admin = await getFirebaseAdmin();
  
  if (!admin) {
    console.warn('Firebase Admin não inicializado. Pulando envio de notificação.');
    return;
  }

  try {
    // Buscar tokens FCM dos supervisores usando Prisma
    const fcmTokens = await getSupervisorFcmTokens(supervisorIds);

    if (fcmTokens.length === 0) {
      console.log('Nenhum token FCM encontrado para os supervisores');
      return;
    }

    // Preparar mensagem no formato solicitado: "Ryan Figueredo acabou de bater ponto no Giga Raposo"
    const tipoNome = getTipoNome(payload.tipo);
    const title = 'Ponto Batido';
    const body = `${payload.funcionarioNome} acabou de bater ${tipoNome.toLowerCase()} no ${payload.unidadeNome}`;

    const message = {
      notification: {
        title,
        body,
      },
      data: {
        tipo: 'PONTO_BATIDO',
        registroId: payload.registroId,
        funcionarioId: payload.funcionarioId,
        funcionarioNome: payload.funcionarioNome,
        tipoPonto: payload.tipo,
        timestamp: payload.timestamp,
        unidadeNome: payload.unidadeNome,
        protocolo: payload.protocolo || '',
      },
      tokens: fcmTokens,
      android: {
        priority: 'high' as const,
        notification: {
          channelId: 'ponto_notifications',
          sound: 'default',
        },
      },
    };

    // Enviar notificação
    const response = await admin.messaging().sendEachForMulticast(message);
    
    console.log(`Notificações enviadas: ${response.successCount}/${fcmTokens.length}`);
    
    if (response.failureCount > 0) {
      console.error('Falhas ao enviar notificações:', response.responses.filter(r => !r.success));
    }
  } catch (error) {
    console.error('Erro ao enviar notificações FCM:', error);
    // Não lançar erro para não bloquear o registro de ponto
  }
}

/**
 * Enviar notificação para supervisores que cuidam do funcionário específico
 */
export async function notifySupervisorsAboutPonto(
  funcionarioId: string,
  funcionarioUnidadeId: string,
  funcionarioGrupoId: string | null,
  payload: PontoNotificationPayload
): Promise<void> {
  try {
    // Buscar apenas supervisores que realmente têm acesso ao funcionário
    const supervisorIds = await getSupervisorsWithAccessToFuncionario(
      funcionarioUnidadeId,
      funcionarioGrupoId
    );

    if (supervisorIds.length === 0) {
      console.log(`Nenhum supervisor encontrado para o funcionário ${funcionarioId}`);
      return;
    }

    console.log(`Enviando notificação para ${supervisorIds.length} supervisor(es) sobre ponto do funcionário ${payload.funcionarioNome}`);

    // Enviar notificação
    await sendPontoNotificationToSupervisorsPrisma(payload, supervisorIds);
  } catch (error) {
    console.error('Erro ao notificar supervisores sobre ponto:', error);
    // Não lançar erro para não bloquear o registro de ponto
  }
}

function getTipoNome(tipo: string): string {
  const tipos: Record<string, string> = {
    ENTRADA: 'ponto',
    SAIDA: 'ponto',
    INTERVALO_INICIO: 'início de intervalo',
    INTERVALO_FIM: 'fim de intervalo',
    HORA_EXTRA_INICIO: 'início de hora extra',
    HORA_EXTRA_FIM: 'fim de hora extra',
  };
  return tipos[tipo] || 'ponto';
}
