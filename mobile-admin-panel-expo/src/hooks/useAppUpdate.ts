import { useState, useEffect } from 'react';
import { Platform } from 'react-native';
import * as Application from 'expo-application';
import { API_URL } from '../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const UPDATE_CHECK_KEY = '@app_update_check';
const UPDATE_CHECK_INTERVAL = 3600000; // 1 hora

interface AppVersion {
  version: string;
  buildNumber: string;
  required: boolean;
  message?: string;
}

interface UpdateCheckResponse {
  hasUpdate: boolean;
  latestVersion?: string;
  latestBuildNumber?: string;
  required?: boolean;
  message?: string;
}

export function useAppUpdate() {
  const [hasUpdate, setHasUpdate] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<AppVersion | null>(null);

  const checkForUpdate = async (force = false) => {
    try {
      // Verificar se já verificamos recentemente (a menos que seja forçado)
      if (!force) {
        const lastCheck = await AsyncStorage.getItem(UPDATE_CHECK_KEY);
        if (lastCheck) {
          const lastCheckTime = parseInt(lastCheck, 10);
          const now = Date.now();
          if (now - lastCheckTime < UPDATE_CHECK_INTERVAL) {
            // Verificação recente, não precisa verificar novamente
            return;
          }
        }
      }

      setIsChecking(true);

      const currentVersion = Application.nativeApplicationVersion || '1.0.0';
      const currentBuildNumber = Application.nativeBuildVersion || '1';

      // Tentar verificar na API
      try {
        const response = await fetch(`${API_URL}/api/mobile/app-version?platform=${Platform.OS}&app=admin`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 5000,
        } as any);

        if (response.ok) {
          const data: UpdateCheckResponse = await response.json();
          
          if (data.hasUpdate && data.latestVersion && data.latestBuildNumber) {
            // Comparar versões
            const needsUpdate = compareVersions(currentVersion, data.latestVersion) < 0 ||
                               compareBuildNumbers(currentBuildNumber, data.latestBuildNumber) < 0;

            if (needsUpdate) {
              setHasUpdate(true);
              setUpdateInfo({
                version: data.latestVersion,
                buildNumber: data.latestBuildNumber,
                required: data.required || false,
                message: data.message,
              });
            } else {
              setHasUpdate(false);
              setUpdateInfo(null);
            }
          } else {
            setHasUpdate(false);
            setUpdateInfo(null);
          }
        }
      } catch (error) {
        // Se a API não responder, não mostrar banner
        console.log('[useAppUpdate] Erro ao verificar atualização na API:', error);
        setHasUpdate(false);
        setUpdateInfo(null);
      }

      // Salvar timestamp da verificação
      await AsyncStorage.setItem(UPDATE_CHECK_KEY, Date.now().toString());
    } catch (error) {
      console.error('[useAppUpdate] Erro ao verificar atualização:', error);
      setHasUpdate(false);
      setUpdateInfo(null);
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    // Verificar ao montar o componente
    checkForUpdate();

    // Verificar periodicamente (a cada hora)
    const interval = setInterval(() => {
      checkForUpdate();
    }, UPDATE_CHECK_INTERVAL);

    return () => clearInterval(interval);
  }, []);

  return {
    hasUpdate,
    isChecking,
    updateInfo,
    checkForUpdate: () => checkForUpdate(true),
  };
}

// Função auxiliar para comparar versões (ex: "1.2.3" vs "1.2.4")
function compareVersions(v1: string, v2: string): number {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);
  
  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const part1 = parts1[i] || 0;
    const part2 = parts2[i] || 0;
    
    if (part1 < part2) return -1;
    if (part1 > part2) return 1;
  }
  
  return 0;
}

// Função auxiliar para comparar build numbers
function compareBuildNumbers(b1: string, b2: string): number {
  const num1 = parseInt(b1, 10) || 0;
  const num2 = parseInt(b2, 10) || 0;
  return num1 - num2;
}
