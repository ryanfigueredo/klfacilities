# 🚀 Guia: Configurar Vercel para Monorepo (SEM QUEBRAR NADA)

## ⚠️ IMPORTANTE: Faça isso ANTES de conectar o novo repositório

### Passo 1: Anotar Variáveis de Ambiente Atuais

Antes de qualquer coisa, anote TODAS as variáveis de ambiente do projeto atual no Vercel:

1. Vá no Vercel Dashboard
2. Acesse o projeto atual
3. Vá em **Settings > Environment Variables**
4. **COPIE TODAS** as variáveis (ou exporte como JSON)

### Passo 2: Conectar Novo Repositório

1. Acesse: https://vercel.com/dashboard
2. Clique em **Add New... > Project**
3. Importe o repositório: `ryanfigueredo/klfacilities`
4. **NÃO CLIQUE EM DEPLOY AINDA!**

### Passo 3: Configurar Root Directory (CRÍTICO!)

1. Na tela de configuração do projeto, role até **"Configure Project"**
2. Em **"Root Directory"**, clique em **"Edit"**
3. Digite: `enterprise-erp-nextjs-aws`
4. ✅ Isso faz o Vercel trabalhar apenas nessa pasta

### Passo 4: Configurar Build Settings

O `vercel.json` já está configurado, mas verifique:

- **Framework Preset**: Next.js (deve detectar automaticamente)
- **Build Command**: Deixe vazio (usa o do vercel.json: `pnpm run build`)
- **Output Directory**: Deixe vazio (usa `.next` automaticamente)
- **Install Command**: Deixe vazio (usa o do vercel.json: `npm install --legacy-peer-deps`)

### Passo 5: Adicionar TODAS as Variáveis de Ambiente

**CRÍTICO**: Adicione TODAS as variáveis que você anotou no Passo 1:

1. Vá em **Environment Variables**
2. Adicione cada variável:
   - `DATABASE_URL`
   - `NEXTAUTH_URL`
   - `NEXTAUTH_SECRET`
   - `NEXT_PUBLIC_USE_S3_ASSETS`
   - `NEXT_PUBLIC_S3_PUBLIC_BUCKET`
   - `NEXT_PUBLIC_AWS_S3_BUCKET`
   - `NEXT_PUBLIC_AWS_REGION`
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`
   - `AWS_S3_BUCKET`
   - `AWS_REGION`
   - `AWS_S3_PUBLIC_BUCKET`
   - `RESEND_API_KEY`
   - `EVOLUTION_API_KEY`
   - `EVOLUTION_INSTANCE_NAME`
   - `EVOLUTION_API_URL`
   - `FEATURE_TICKET_LOG`
   - `NEXT_PUBLIC_ANALYTICS_V2`
   - `NEXT_PUBLIC_APP_URL` (ajuste para produção)
   - `NEXT_PUBLIC_BASE_URL`
   - E qualquer outra que você tenha

3. Para cada variável, selecione os ambientes:
   - ✅ Production
   - ✅ Preview
   - ✅ Development (opcional)

### Passo 6: Ajustar NEXTAUTH_URL e NEXT_PUBLIC_APP_URL

**IMPORTANTE**: Ajuste estas variáveis para o domínio correto:

- `NEXTAUTH_URL`: Deve ser o domínio de produção (ex: `https://financeiro.klfacilities.com.br`)
- `NEXT_PUBLIC_APP_URL`: Deve ser o domínio de produção

### Passo 7: Deploy!

1. Clique em **Deploy**
2. Aguarde o build completar
3. Verifique os logs para garantir que não há erros

### Passo 8: Verificar Domínios

1. Vá em **Settings > Domains**
2. Verifique se todos os domínios estão configurados:
   - `financeiro.klfacilities.com.br`
   - `colaborador.klfacilities.com.br`
   - `ponto.klfacilities.com.br`
   - `checklist.klfacilities.com.br`

### Passo 9: Testar Tudo

Após o deploy, teste:
- ✅ Login funciona
- ✅ APIs respondem (`/api/*`)
- ✅ Imagens carregam (S3)
- ✅ Dashboard carrega
- ✅ Todas as funcionalidades principais

## 🔧 Troubleshooting

### Erro: "Cannot find module"
- Verifique se o Root Directory está correto: `enterprise-erp-nextjs-aws`

### Erro: "Environment variable not found"
- Verifique se todas as variáveis foram adicionadas no Vercel

### Build falha
- Verifique os logs do build
- O `vercel.json` já tem `--legacy-peer-deps` configurado

### APIs não funcionam
- As URLs das APIs NÃO mudam, devem funcionar normalmente
- Verifique se o `NEXTAUTH_URL` está correto

## ✅ Checklist Final

- [ ] Root Directory configurado: `enterprise-erp-nextjs-aws`
- [ ] Todas as variáveis de ambiente adicionadas
- [ ] `NEXTAUTH_URL` aponta para domínio correto
- [ ] Build completou com sucesso
- [ ] Domínios configurados
- [ ] Testado login
- [ ] Testado APIs
- [ ] Testado imagens do S3
