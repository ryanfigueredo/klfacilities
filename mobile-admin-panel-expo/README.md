# 📱 KL Administração - Mobile App

Aplicativo móvel desenvolvido para supervisores e equipes administrativas gerenciarem checklists operacionais, pontos de funcionários e outras funcionalidades do sistema KL Facilities diretamente do celular.

## 🎯 Sobre o App

O **KL Administração** é um aplicativo React Native desenvolvido com Expo que permite aos supervisores e administradores:

- ✅ Responder e gerenciar checklists operacionais em campo
- 📸 Capturar fotos diretamente do dispositivo para documentação
- 📍 Registrar localização GPS automática para rastreabilidade
- ✍️ Sistema de assinaturas digitais para validação de processos
- 📊 Visualizar histórico de pontos dos funcionários
- 📋 Gerenciar checklists pendentes, em aberto e respondidos
- 🔄 Sincronização offline com backup automático

## 🔗 Integração com o Backend (Desktop)

Este aplicativo é parte do ecossistema **KL Facilities** e está totalmente integrado com o backend web (`desktop`):

### Arquitetura

```
┌─────────────────┐
│  mobile-admin   │  ← Este app (React Native/Expo)
└────────┬────────┘
         │ HTTPS/REST API
         │ JWT Authentication
         ▼
┌─────────────────┐
│  desktop        │  ← Backend Next.js (API Routes)
│  (Next.js)      │
└────────┬────────┘
         │ Prisma ORM
         ▼
┌─────────────────┐
│  PostgreSQL     │  ← Banco de dados compartilhado
└─────────────────┘
```

### Conexão com o Backend

- **URL da API**: Configurada em `src/config/api.ts`
  - **Produção**: `https://www.klfacilities.com.br`
  - **Desenvolvimento**: Configurável via `EXPO_PUBLIC_API_URL`

- **Autenticação**: JWT (JSON Web Tokens)
  - Endpoint: `/api/mobile/auth-admin`
  - Token armazenado em `expo-secure-store` para segurança

- **Endpoints Principais**:
  - `/api/mobile/auth-admin` - Autenticação de supervisores
  - `/api/checklists-operacionais/*` - Gerenciamento de checklists
  - `/api/mobile/admin/*` - Funcionalidades administrativas
  - `/api/ponto/*` - Gestão de pontos de funcionários

### Banco de Dados Compartilhado

O app utiliza o **mesmo banco de dados PostgreSQL** que o sistema web (`desktop`), garantindo:
- ✅ Sincronização em tempo real
- ✅ Dados consistentes entre web e mobile
- ✅ Histórico unificado
- ✅ Permissões baseadas em roles (RBAC)

## 🛠️ Tecnologias

- **Framework**: React Native com Expo (~54.0.31)
- **Navegação**: React Navigation (Native Stack)
- **HTTP Client**: Axios
- **Autenticação**: JWT via `expo-secure-store`
- **Câmera**: `expo-image-picker`
- **Localização**: `expo-location`
- **Assinaturas**: `react-native-signature-canvas`
- **Armazenamento**: `@react-native-async-storage/async-storage`
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
- `yarn build-and-submit:android` - Build e submete automaticamente ao Play Store
- `yarn build-and-submit:ios` - Build e submete automaticamente ao App Store

## 📁 Estrutura do Projeto

```
mobile-admin/
├── src/
│   ├── components/          # Componentes reutilizáveis
│   │   ├── UpdateBanner.tsx # Banner de atualização do app
│   │   └── ErrorBoundary.tsx # Tratamento de erros
│   ├── config/              # Configurações
│   │   └── api.ts          # Configuração da API e endpoints
│   ├── hooks/               # Custom hooks
│   │   └── useAppUpdate.ts  # Hook para verificar atualizações
│   ├── screens/             # Telas do app
│   │   ├── LoginScreen.tsx
│   │   ├── DashboardScreen.tsx
│   │   ├── ChecklistsScreen.tsx
│   │   ├── ResponderChecklistScreen.tsx
│   │   ├── PontosScreen.tsx
│   │   └── ...
│   └── services/            # Serviços e lógica de negócio
│       └── api.ts          # Cliente HTTP e funções de API
├── assets/                  # Imagens, ícones, etc.
├── app.json                 # Configuração do Expo
├── eas.json                 # Configuração do EAS Build
└── package.json
```

## 🔐 Autenticação e Segurança

- **JWT Tokens**: Armazenados de forma segura usando `expo-secure-store`
- **HTTPS**: Todas as comunicações com o backend são criptografadas
- **Role-Based Access Control (RBAC)**: Permissões gerenciadas pelo backend
- **Offline Support**: Dados salvos localmente quando offline

## 📱 Build e Deploy

O app está configurado para builds via **EAS Build**:

### Android
- **Package**: `com.kl.adm`
- **Min SDK**: 24
- **Target SDK**: 35

### iOS
- **Bundle ID**: `com.kl.adm`
- **Suporte**: iPhone e iPad

### Comandos de Build

```bash
# Build Android
eas build --platform android --profile production

# Build iOS
eas build --platform ios --profile production

# Build e submissão automática
yarn build-and-submit:android
yarn build-and-submit:ios
```

## 🔄 Sincronização Offline

O app suporta trabalho offline:
- ✅ Rascunhos de checklists salvos localmente
- ✅ Sincronização automática quando a conexão é restaurada
- ✅ Indicadores visuais de status de conexão

## 📊 Funcionalidades Principais

### Checklists Operacionais
- Visualizar checklists pendentes, em aberto e respondidos
- Responder checklists com múltiplos tipos de questões
- Upload de fotos (simples ou múltiplas por pergunta)
- Assinaturas digitais (supervisor e gerente)
- Geolocalização automática

### Gestão de Pontos
- Visualizar histórico de pontos dos funcionários
- Editar pontos (com permissões apropriadas)
- Exportar folhas de ponto
- Protocolos de ponto

### Outras Funcionalidades
- Banco de Talentos
- Incidentes
- Avaliações
- Checklist Digital (Banheiros)

## 🐛 Debugging

O app inclui logs detalhados em modo de desenvolvimento:
- Requests HTTP (método, URL, dados)
- Responses (status, dados)
- Erros de autenticação e API
- Status de sincronização offline

## 📄 Licença

Este projeto é privado e proprietário da KL Facilities.

## 👥 Contribuindo

Este é um projeto interno. Para questões ou sugestões, entre em contato com a equipe de desenvolvimento.

---

**Desenvolvido com ❤️ por Ryan Figueredo
