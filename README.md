# KL Facilities - Monorepo

Repositório monorepo contendo todos os projetos da KL Facilities.

## Estrutura

```
klfacilities/
├── enterprise-erp-nextjs-aws/    # Sistema ERP principal (Next.js)
├── mobile-admin-panel-expo/       # App mobile para administradores
└── mobile-ponto-digital-expo/     # App mobile para ponto digital
```

## Projetos

### enterprise-erp-nextjs-aws
Sistema ERP principal desenvolvido em Next.js 15 com:
- Autenticação (NextAuth)
- Banco de dados (PostgreSQL + Prisma)
- APIs REST
- Dashboard administrativo
- Sistema de checklists operacionais
- Gestão de ponto digital
- Analytics e relatórios

**URLs de produção:**
- https://financeiro.klfacilities.com.br
- https://colaborador.klfacilities.com.br
- https://ponto.klfacilities.com.br
- https://checklist.klfacilities.com.br

### mobile-admin-panel-expo
Aplicativo mobile React Native (Expo) para administradores.

### mobile-ponto-digital-expo
Aplicativo mobile React Native (Expo) para registro de ponto digital.

## Deploy

### Vercel (enterprise-erp-nextjs-aws)

O projeto principal está configurado para deploy no Vercel como monorepo:

- **Root Directory**: `enterprise-erp-nextjs-aws`
- **Build Command**: `cd enterprise-erp-nextjs-aws && pnpm run build`
- **Install Command**: `cd enterprise-erp-nextjs-aws && npm install --legacy-peer-deps`

As configurações estão no arquivo `enterprise-erp-nextjs-aws/vercel.json`.

## Desenvolvimento Local

### Pré-requisitos
- Node.js 18.17+ (verificar `.nvmrc` em cada projeto)
- npm ou pnpm
- PostgreSQL (ou usar Neon DB)

### Setup

```bash
# Instalar dependências do projeto principal
cd enterprise-erp-nextjs-aws
npm install --legacy-peer-deps

# Configurar variáveis de ambiente
cp .env.example .env
# Editar .env com suas credenciais

# Gerar Prisma Client
npx prisma generate

# Rodar migrations
npx prisma migrate deploy

# Iniciar servidor de desenvolvimento
npm run dev
```

## Variáveis de Ambiente

Ver `enterprise-erp-nextjs-aws/.env.example` para lista completa de variáveis necessárias.

Principais:
- `DATABASE_URL` - URL de conexão PostgreSQL
- `NEXTAUTH_URL` - URL base da aplicação
- `NEXTAUTH_SECRET` - Secret para NextAuth
- `AWS_S3_BUCKET` - Bucket S3 para assets
- `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` - Credenciais AWS

## Assets (Imagens)

As imagens estão armazenadas no AWS S3:
- Portfolio: `s3://kl-checklist/assets/portfolio/`
- Logos: `s3://kl-checklist/assets/logo-kl-light.png`

Configure `NEXT_PUBLIC_USE_S3_ASSETS=true` no `.env` para usar S3.

## Licença

Proprietário - KL Facilities
