/**
 * Comprime uma imagem antes do upload para reduzir o tamanho do payload
 * e evitar erro 413 (Payload Too Large)
 */
export async function compressImage(
  file: File,
  options: {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
    maxSizeMB?: number;
  } = {}
): Promise<File> {
  const {
    maxWidth = 1920,
    maxHeight = 1920,
    quality = 0.8,
    maxSizeMB = 1,
  } = options;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // Calcular novas dimensões mantendo proporção
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        // Criar canvas e redimensionar
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Não foi possível criar contexto do canvas'));
          return;
        }

        // Desenhar imagem redimensionada
        ctx.drawImage(img, 0, 0, width, height);

        // Converter para blob com compressão
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Erro ao comprimir imagem'));
              return;
            }

            // Se o tamanho já está abaixo do limite, retornar
            if (blob.size <= maxSizeMB * 1024 * 1024) {
              const compressedFile = new File(
                [blob],
                file.name.replace(/\.[^/.]+$/, '.jpg'),
                { type: 'image/jpeg' }
              );
              resolve(compressedFile);
              return;
            }

            // Se ainda está muito grande, reduzir qualidade progressivamente
            let currentQuality = quality;
            const reduceQuality = () => {
              canvas.toBlob(
                (reducedBlob) => {
                  if (!reducedBlob) {
                    reject(new Error('Erro ao comprimir imagem'));
                    return;
                  }

                  if (
                    reducedBlob.size <= maxSizeMB * 1024 * 1024 ||
                    currentQuality <= 0.3
                  ) {
                    const compressedFile = new File(
                      [reducedBlob],
                      file.name.replace(/\.[^/.]+$/, '.jpg'),
                      { type: 'image/jpeg' }
                    );
                    resolve(compressedFile);
                  } else {
                    currentQuality -= 0.1;
                    reduceQuality();
                  }
                },
                'image/jpeg',
                currentQuality
              );
            };
            reduceQuality();
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = () => reject(new Error('Erro ao carregar imagem'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
    reader.readAsDataURL(file);
  });
}

/**
 * Comprime múltiplas imagens em paralelo
 */
export async function compressImages(
  files: File[],
  options?: Parameters<typeof compressImage>[1]
): Promise<File[]> {
  return Promise.all(files.map((file) => compressImage(file, options)));
}

