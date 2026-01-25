import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import * as Location from 'expo-location';

interface LocationContextType {
  location: Location.LocationObject | null;
  locationPermission: boolean;
  isLoading: boolean;
  error: string | null;
  refreshLocation: () => Promise<void>;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export function LocationProvider({ children }: { children: ReactNode }) {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [locationPermission, setLocationPermission] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshLocation = useCallback(async () => {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        setLocationPermission(false);
        return;
      }

      setLocationPermission(true);

      // Obter localização atual com alta precisão
      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        maximumAge: 10000, // Aceitar localização com até 10 segundos
      });

      setLocation(currentLocation);
      setError(null);
      
      console.log('[LocationContext] Localização obtida:', {
        lat: currentLocation.coords.latitude,
        lng: currentLocation.coords.longitude,
        accuracy: currentLocation.coords.accuracy,
      });
    } catch (err: any) {
      console.error('[LocationContext] Erro ao atualizar localização:', err);
      setError(err?.message || 'Erro ao obter localização');
    }
  }, []);

  // Solicitar permissão e obter localização assim que o app abrir
  useEffect(() => {
    let subscription: Location.LocationSubscription | null = null;

    const initializeLocation = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Solicitar permissão de localização
        const { status } = await Location.requestForegroundPermissionsAsync();
        setLocationPermission(status === 'granted');

        if (status === 'granted') {
          // Obter localização imediatamente
          await refreshLocation();
          
          // Iniciar watch de localização para manter atualizada
          subscription = await Location.watchPositionAsync(
            {
              accuracy: Location.Accuracy.High,
              timeInterval: 5000, // Atualizar a cada 5 segundos
              distanceInterval: 10, // Ou a cada 10 metros
            },
            (newLocation) => {
              setLocation(newLocation);
              setError(null);
              console.log('[LocationContext] Localização atualizada:', {
                lat: newLocation.coords.latitude,
                lng: newLocation.coords.longitude,
                accuracy: newLocation.coords.accuracy,
              });
            }
          );
        } else {
          setError('Permissão de localização não concedida');
        }
      } catch (err: any) {
        console.error('[LocationContext] Erro ao inicializar localização:', err);
        setError(err?.message || 'Erro ao obter localização');
      } finally {
        setIsLoading(false);
      }
    };

    initializeLocation();

    // Cleanup quando o componente desmontar
    return () => {
      if (subscription) {
        subscription.remove();
      }
    };
  }, [refreshLocation]);

  return (
    <LocationContext.Provider
      value={{
        location,
        locationPermission,
        isLoading,
        error,
        refreshLocation,
      }}
    >
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation() {
  const context = useContext(LocationContext);
  if (context === undefined) {
    throw new Error('useLocation deve ser usado dentro de LocationProvider');
  }
  return context;
}
