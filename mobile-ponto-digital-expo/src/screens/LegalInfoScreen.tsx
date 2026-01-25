import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from "@expo/vector-icons";

interface LegalInfoScreenProps {
  onClose: () => void;
}

export default function LegalInfoScreen({ onClose }: LegalInfoScreenProps) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Informações Legais</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close" size={24} color="#333" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <View style={styles.sectionTitleContainer}>
            <Ionicons name="document-text-outline" size={20} color="#009ee2" />
            <Text style={styles.sectionTitle}>Conformidade Legal</Text>
          </View>
          
          <View style={styles.item}>
            <Text style={styles.checkmark}>✓</Text>
            <View style={styles.itemContent}>
              <Text style={styles.itemTitle}>Portaria 671/2021 (REP-P)</Text>
              <Text style={styles.itemText}>
                Sistema de Registro Eletrônico de Ponto certificado e em conformidade com a legislação trabalhista.
              </Text>
            </View>
          </View>

          <View style={styles.item}>
            <Text style={styles.checkmark}>✓</Text>
            <View style={styles.itemContent}>
              <Text style={styles.itemTitle}>LGPD</Text>
              <Text style={styles.itemText}>
                Seus dados pessoais são protegidos e tratados conforme a Lei Geral de Proteção de Dados.
              </Text>
            </View>
          </View>

          <View style={styles.item}>
            <Text style={styles.checkmark}>✓</Text>
            <View style={styles.itemContent}>
              <Text style={styles.itemTitle}>Validação</Text>
              <Text style={styles.itemText}>
                GPS e selfie obrigatórios para garantir a autenticidade do registro.
              </Text>
            </View>
          </View>

          <View style={styles.item}>
            <Text style={styles.checkmark}>✓</Text>
            <View style={styles.itemContent}>
              <Text style={styles.itemTitle}>Auditoria</Text>
              <Text style={styles.itemText}>
                Todos os registros são criptografados, auditados e armazenados com segurança.
              </Text>
            </View>
          </View>
        </View>

        <View style={[styles.section, styles.securitySection]}>
          <Text style={styles.sectionTitle}>🔒 Segurança dos Dados</Text>
          <Text style={styles.securityText}>
            Suas informações são protegidas com criptografia de ponta a ponta e armazenadas em servidores seguros. O acesso é restrito e monitorado.
          </Text>
        </View>

        <View style={[styles.section, styles.infoSection]}>
          <Text style={styles.sectionTitle}>ℹ️ Sobre as Fotos</Text>
          <Text style={styles.infoText}>
            A foto será capturada automaticamente ao confirmar o ponto. Sua primeira foto será cadastrada automaticamente ao bater o ponto.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#009ee2',
    padding: 20,
    paddingTop: 50,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  section: {
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  securitySection: {
    backgroundColor: '#E8F5E9',
  },
  infoSection: {
    backgroundColor: '#FFF3E0',
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1976D2',
  },
  item: {
    flexDirection: 'row',
    marginBottom: 20,
    alignItems: 'flex-start',
  },
  checkmark: {
    color: '#4CAF50',
    fontSize: 20,
    fontWeight: 'bold',
    marginRight: 12,
    marginTop: 2,
  },
  itemContent: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1976D2',
    marginBottom: 6,
  },
  itemText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 22,
  },
  securityText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 22,
  },
  infoText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 22,
  },
});

