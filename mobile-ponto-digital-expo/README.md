# 📱 KL Colaboradores - Mobile App

Aplicativo móvel desenvolvido para colaboradores registrarem seus pontos de forma rápida, segura e com validação de localização e biometria facial.

## 🎯 Sobre o App

O **KL Colaboradores** é um aplicativo React Native desenvolvido com Expo que permite aos funcionários:

- ⏰ Registrar ponto de entrada e saída
- 📸 Validação com selfie (biometria facial)
- 📍 Validação de localização (GPS) para garantir presença na unidade
- 📊 Visualizar histórico de pontos registrados
- 🔄 Funcionamento offline com sincronização automática
- 🚫 Sem necessidade de QR Code - apenas CPF

## 🔗 Integração com o Backend (Desktop)

Este aplicativo é parte do ecossistema **KL Facilities** e está totalmente integrado com o backend web (`desktop`):

### Arquitetura

```
┌──────────────────────┐
│ mobile-colaborador   │  ← Este app (React Native/Expo)
└──────────┬───────────┘
           │ HTTPS/REST API
           │ Autenticação por CPF
           ▼
┌──────────────────────┐
│  desktop             │  ← Backend Next.js (API Routes)
│  (Next.js)           │
└──────────┬───────────┘
           │ Prisma ORM
           ▼
┌──────────────────────┐
│  PostgreSQL          │  ← Banco de dados compartilhado
└──────────────────────┘
```

### Conexão com o Backend

- **URL da API**: Configurada em `src/config/api.ts`
  - **Produção**: `https://www.klfacilities.com.br`
  - **Desenvolvimento**: Configurável via `EXPO_PUBLIC_API_URL`

- **Autenticação**: Baseada em CPF
  - Endpoint: `/api/mobile/auth`
  - Validação do funcionário no banco de dados
  - Retorna informações da unidade e grupo do funcionário

- **Endpoints Principais**:
  - `/api/mobile/auth` - Autenticação por CPF
  - `/api/mobile/ponto` - Registro de ponto (POST com FormData)
  - `/api/mobile/pontos-hoje` - Lista de pontos registrados hoje
  - `/api/mobile/historico` - Histórico de pontos do funcionário

### Banco de Dados Compartilhado

O app utiliza o **mesmo banco de dados PostgreSQL** que o sistema web (`desktop`), garantindo:
- ✅ Dados unificados entre web e mobile
- ✅ Validação de funcionários em tempo real
- ✅ Histórico completo de pontos
- ✅ Sincronização automática

## 🛠️ Tecnologias

- **Framework**: React Native com Expo (~54.0.31)
- **Navegação**: React Navigation (Native Stack)
- **HTTP Client**: Axios
- **Câmera**: `expo-image-picker` (apenas câmera, sem acesso à galeria)
- **Localização**: `expo-location` (validação de presença na unidade)
- **Armazenamento**: 
  - `expo-secure-store` (dados sensíveis)
  - `@react-native-async-storage/async-storage` (fila offline)
- **File System**: `expo-file-system` (verificação de arquivos offline)
- **Build & Deploy**: EAS Build (Expo Application Services)

## 📦 Instalação e Desenvolvimento

### Pré-requisitos

- Node.js (versão especificada no `.nvmrc` do projeto)
- Yarn (gerenciador de pacotes)
- Expo CLI (`npm install -g expo-cli`)
- Conta Expo (para builds)

### Configuração

1. **Instalar dependências**:
```bash
yarn install
```

2. **Configurar variável de ambiente** (opcional, para desenvolvimento local):
```bash
export EXPO_PUBLIC_API_URL=http://SEU_IP_LOCAL:3000
```

Ou crie um arquivo `.env` na raiz:
```
EXPO_PUBLIC_API_URL=http://192.168.1.100:3000
```

3. **Iniciar o servidor de desenvolvimento**:
```bash
yarn start
# ou
yarn start:lan  # Para acesso via rede local
```

### Scripts Disponíveis

- `yarn start` - Inicia o servidor Expo
- `yarn android` - Abre no emulador Android
- `yarn ios` - Abre no simulador iOS
- `yarn build:android:production` - Build Android para produção
- `yarn build:ios:production` - Build iOS para produção
- `yarn build:android:apk` - Build APK Android (para distribuição direta)
- `yarn build-and-submit:android` - Build e submete automaticamente ao Play Store
- `yarn build-and-submit:ios` - Build e submete automaticamente ao App Store

## 📁 Estrutura do Projeto

```
mobile-colaborador/
├── src/
│   ├── components/          # Componentes reutilizáveis
│   │   ├── UpdateBanner.tsx # Banner de atualização do app
│   │   └── ErrorBoundary.tsx # Tratamento de erros
│   ├── config/              # Configurações
│   │   └── api.ts          # Configuração da API e endpoints
│   ├── contexts/            # Context API
│   │   └── LocationContext.tsx # Contexto de localização
│   ├── hooks/               # Custom hooks
│   │   └── useAppUpdate.ts  # Hook para verificar atualizações
│   ├── screens/             # Telas do app
│   │   ├── LoginScreen.tsx # Tela de login (CPF)
│   │   └── PontoScreen.tsx # Tela principal de registro de ponto
│   ├── services/            # Serviços e lógica de negócio
│   │   ├── api.ts          # Cliente HTTP e funções de API
│   │   └── offlineQueue.ts # Gerenciamento de fila offline
│   └── utils/               # Utilitários
│       └── errorLogger.ts   # Logger de erros global
├── assets/                  # Imagens, ícones, etc.
├── app.json                 # Configuração do Expo
├── app.plugin.js            # Plugin customizado (remove permissões Android)
├── eas.json                 # Configuração do EAS Build
└── package.json
```

## 🔐 Autenticação e Segurança

- **Autenticação por CPF**: Validação simples e rápida
- **Validação de Localização**: 
  - Verifica se o funcionário está dentro do raio da unidade
  - Coordenadas GPS enviadas com cada registro
- **Selfie Obrigatória**: Foto capturada no momento do registro
- **HTTPS**: Todas as comunicações com o backend são criptografadas
- **Offline Support**: Pontos salvos localmente quando offline

## 📱 Build e Deploy

O app está configurado para builds via **EAS Build**:

### Android
- **Package**: `com.kl.colaboradores`
- **Min SDK**: 24
- **Target SDK**: 35
- **Permissões**: Apenas câmera e localização (sem acesso à galeria)

### iOS
- **Bundle ID**: `com.kl.colaboradores`
- **Suporte**: Apenas iPhone (não iPad)

### Comandos de Build

```bash
# Build Android
eas build --platform android --profile production

# Build iOS
eas build --platform ios --profile production

# Build APK (para distribuição direta)
eas build --platform android --profile apk-production

# Build e submissão automática
yarn build-and-submit:android
yarn build-and-submit:ios
```

## 🔄 Sincronização Offline

O app possui um sistema robusto de sincronização offline:

### Funcionalidades Offline

- ✅ **Fila de Pontos**: Pontos registrados offline são salvos em uma fila local
- ✅ **Sincronização Automática**: Quando a conexão é restaurada, os pontos são enviados automaticamente
- ✅ **Validação de Arquivos**: Verifica se as selfies ainda existem antes de sincronizar
- ✅ **Retry Logic**: Sistema de tentativas com limite máximo
- ✅ **Indicadores Visuais**: Mostra status de sincronização ao usuário

### Implementação

A lógica de sincronização está em `src/services/offlineQueue.ts`:
- Armazena pontos em `AsyncStorage`
- Verifica conexão com `@react-native-community/netinfo`
- Sincroniza automaticamente quando online
- Remove pontos sincronizados com sucesso
- Remove pontos com muitas tentativas falhadas

## 📊 Funcionalidades Principais

### Registro de Ponto

1. **Login**: Funcionário informa apenas o CPF
2. **Validação**: Sistema valida CPF e retorna dados do funcionário
3. **Registro**:
   - Captura de selfie obrigatória
   - Validação de localização (deve estar dentro do raio da unidade)
   - Registro de entrada ou saída
   - Envio de dados ao backend (ou salvamento offline)

### Histórico

- Visualização de pontos registrados hoje
- Histórico completo de pontos do funcionário
- Informações detalhadas (horário, localização, selfie)

### Validações

- **Localização**: Verifica se está dentro do raio configurado da unidade
- **Selfie**: Obrigatória para cada registro
- **Horário**: Validações de horário de trabalho (configuradas no backend)

## 🔧 Plugin Customizado

O app inclui um plugin customizado (`app.plugin.js`) que remove permissões desnecessárias do Android:
- Remove `READ_MEDIA_IMAGES`
- Remove `READ_MEDIA_VIDEO`
- Remove `READ_EXTERNAL_STORAGE`
- Remove `WRITE_EXTERNAL_STORAGE`

Isso garante compliance com políticas do Google Play Store, já que o app usa apenas a câmera diretamente, sem acesso à galeria.

## 🐛 Debugging

O app inclui logs detalhados em modo de desenvolvimento:
- Requests HTTP (método, URL, dados)
- Responses (status, dados)
- Erros de autenticação e API
- Status de sincronização offline
- Logs da fila offline (`[offlineQueue]`)

## 📄 Licença

Este projeto é privado e proprietário da KL Facilities.

## 👥 Contribuindo

Este é um projeto interno. Para questões ou sugestões, entre em contato com a equipe de desenvolvimento.

---

**Desenvolvido com ❤️ para KL Facilities**
