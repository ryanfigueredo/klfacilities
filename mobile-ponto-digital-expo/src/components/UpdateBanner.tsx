import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface UpdateBannerProps {
  onDismiss?: () => void;
  appName?: string;
}

export default function UpdateBanner({ onDismiss, appName = 'KL Colaboradores' }: UpdateBannerProps) {
  const handleUpdate = () => {
    if (Platform.OS === 'ios') {
      Linking.openURL('https://apps.apple.com/app/id6739522000'); // Substitua pelo ID real do app
    } else {
      Linking.openURL('https://play.google.com/store/apps/details?id=com.kl.colaboradores');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Ionicons name="cloud-download-outline" size={20} color="#fff" style={styles.icon} />
        <View style={styles.textContainer}>
          <Text style={styles.title}>Atualização disponível</Text>
          <Text style={styles.message}>
            Uma nova versão do {appName} está disponível. Atualize para ter acesso às melhorias.
          </Text>
        </View>
        {onDismiss && (
          <TouchableOpacity onPress={onDismiss} style={styles.dismissButton}>
            <Ionicons name="close" size={20} color="#fff" />
          </TouchableOpacity>
        )}
      </View>
      <TouchableOpacity style={styles.updateButton} onPress={handleUpdate}>
        <Text style={styles.updateButtonText}>Atualizar agora</Text>
        <Ionicons name="arrow-forward" size={16} color="#009ee2" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#009ee2',
    padding: 12,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  icon: {
    marginRight: 10,
    marginTop: 2,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  message: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.9,
    lineHeight: 16,
  },
  dismissButton: {
    padding: 4,
    marginLeft: 8,
  },
  updateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
    gap: 6,
  },
  updateButtonText: {
    color: '#009ee2',
    fontSize: 14,
    fontWeight: '600',
  },
});
