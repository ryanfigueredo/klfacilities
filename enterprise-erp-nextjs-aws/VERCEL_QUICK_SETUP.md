# ⚡ Setup Rápido Vercel - Monorepo

## Passo a Passo Rápido

### 1. No Vercel Dashboard

1. **Add New Project** → Import `ryanfigueredo/klfacilities`
2. **Root Directory**: `enterprise-erp-nextjs-aws` ⚠️ **CRÍTICO**
3. **Framework**: Next.js (auto-detectado)
4. **Build & Output Settings**: Deixe vazio (usa vercel.json)

### 2. Variáveis de Ambiente

Copie TODAS do projeto antigo ou use estas (do seu .env):

```env
DATABASE_URL=postgresql://neondb_owner:npg_KfwVqvaB6p2F@ep-floral-field-ae0cjvm9-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require
NEXTAUTH_URL=https://klfacilities.com.br/
NEXTAUTH_SECRET=XBVArzUsFeFbz/XlgK+d+b1tJaWOo04a1vWVs2mlQLw=
NEXT_PUBLIC_USE_S3_ASSETS=true
NEXT_PUBLIC_S3_PUBLIC_BUCKET=true
NEXT_PUBLIC_AWS_S3_BUCKET=kl-checklist
NEXT_PUBLIC_AWS_REGION=us-east-1
NEXT_PUBLIC_CLOUDFRONT_URL=
NEXT_PUBLIC_BASE_URL=https://financeiro.klfacilities.com.br
EVOLUTION_API_KEY=8415b176774d4168b2e98fe022f0ccad
EVOLUTION_INSTANCE_NAME=41991892907
EVOLUTION_API_URL=http://100.27.204.193:8080
AWS_ACCESS_KEY_ID=AKIA5PNKSJDXSSJ6FCHG
AWS_SECRET_ACCESS_KEY=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
AWS_S3_BUCKET=kl-checklist
AWS_REGION=us-east-1
AWS_S3_PUBLIC_BUCKET=true
RESEND_API_KEY=re_RiM5VNpC_ApzmbeqMkgPXHqwVPjbpJb6h
FEATURE_TICKET_LOG=false
NEXT_PUBLIC_ANALYTICS_V2=true
NEXT_PUBLIC_APP_URL=https://financeiro.klfacilities.com.br
```

### 3. Deploy

Clique em **Deploy** e aguarde.

### 4. Domínios

Configure os domínios em **Settings > Domains**:
- financeiro.klfacilities.com.br
- colaborador.klfacilities.com.br
- ponto.klfacilities.com.br
- checklist.klfacilities.com.br

## ✅ Pronto!

As URLs das APIs continuam funcionando normalmente. Nada quebra! 🎉
