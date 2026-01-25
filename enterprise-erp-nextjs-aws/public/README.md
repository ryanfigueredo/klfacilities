# Pasta Public - Assets Estáticos

Esta pasta contém os assets estáticos do Next.js que são servidos diretamente.

## Estrutura de Pastas

- `/portfolio/` - Imagens dos clientes/parceiros (logos do portfolio)
- `/fonts/` - Fontes customizadas
- `/models/` - Modelos de IA para reconhecimento facial

## Imagens Necessárias na Raiz

- `logo-kl-light.png` - Logo da KL Facilities (versão clara)
- `logo-kl-dark.svg` - Logo da KL Facilities (versão escura)
- `movie.mp4` - Vídeo promocional (se aplicável)

## Configuração

### Opção 1: Assets Locais (Desenvolvimento)
Mantenha as imagens nesta pasta e não configure as variáveis de ambiente do S3.

### Opção 2: Assets no AWS S3 (Produção)
Configure as variáveis de ambiente no `.env`:
- `NEXT_PUBLIC_USE_S3_ASSETS=true`
- `NEXT_PUBLIC_S3_PUBLIC_BUCKET=true`
- `NEXT_PUBLIC_AWS_S3_BUCKET=seu-bucket`
- `NEXT_PUBLIC_AWS_REGION=us-east-1`
- `AWS_ACCESS_KEY_ID=...`
- `AWS_SECRET_ACCESS_KEY=...`
- `AWS_S3_BUCKET=seu-bucket`
- `AWS_REGION=us-east-1`
- `AWS_S3_PUBLIC_BUCKET=true`

As imagens devem estar no S3 em: `s3://bucket/assets/portfolio/` e `s3://bucket/assets/logo-kl-light.png`
