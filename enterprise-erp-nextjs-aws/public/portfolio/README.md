# Pasta de Imagens do Portfolio

Esta pasta contém as imagens dos clientes/parceiros exibidos na seção de portfolio do site.

## Imagens Necessárias

As seguintes imagens devem ser colocadas nesta pasta:

### Clientes do Portfolio:
- `andreGuimaraes.png` - André Guimarães
- `assai.svg` - Assaí Atacadista
- `atacadao.png` - Atacadão
- `comper.png` - Comper
- `estapar.png` - Estapar
- `fortatacadista.jpg` - Fort Atacadista
- `gigaatacado.png` - Giga Atacado
- `grupomateus.png` - Grupo Mateus
- `grupopereira.jpg` - Grupo Pereira
- `jmacedo.jpg` - J. Macêdo
- `magalu.png` - Magazine Luiza
- `mundial.png` - Mercantil Mundial
- `mixmateus.png` - Mix Mateus
- `logo-profarma-2048.png` - Profarma
- `rofatto.jpg` - Rofatto
- `spani.png` - Spani
- `totalatacado.png` - Total Atacado
- `vilabeneresidencial.jpg` - Vila Bene Residencial
- `wika.png` - Wika

## Alternativa: Usar AWS S3

Se preferir usar AWS S3 para armazenar as imagens:

1. Configure as variáveis de ambiente no arquivo `.env`:
   ```
   NEXT_PUBLIC_USE_S3_ASSETS=true
   NEXT_PUBLIC_S3_PUBLIC_BUCKET=true
   NEXT_PUBLIC_AWS_S3_BUCKET=seu-bucket-name
   NEXT_PUBLIC_AWS_REGION=us-east-1
   AWS_ACCESS_KEY_ID=sua-access-key
   AWS_SECRET_ACCESS_KEY=sua-secret-key
   AWS_S3_BUCKET=seu-bucket-name
   AWS_REGION=us-east-1
   AWS_S3_PUBLIC_BUCKET=true
   ```

2. Faça upload das imagens para o S3 no caminho: `s3://seu-bucket/assets/portfolio/`

3. As imagens serão buscadas automaticamente do S3 quando as variáveis estiverem configuradas.
