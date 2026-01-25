"use client";

import Image from 'next/image';
import { useRef, useState } from 'react';

interface ImageUploadProps {
  onChange: (file: File) => void;
  label?: string;
  description?: string;
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
}

export function ImageUpload({
  onChange,
  label = 'Selecionar imagem',
  description = 'Toque para capturar a foto do odômetro',
  maxWidth = 1280,
  maxHeight = 1280,
  quality = 0.75,
}: ImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);

  async function handleFile(file: File) {
    try {
      const compressed = await compressImage(file, {
        maxWidth,
        maxHeight,
        quality,
      });
      if (preview) URL.revokeObjectURL(preview);
      const url = URL.createObjectURL(compressed);
      setPreview(url);
      onChange(compressed);
    } catch {
      if (preview) URL.revokeObjectURL(preview);
      const url = URL.createObjectURL(file);
      setPreview(url);
      onChange(file);
    }
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    await handleFile(file);
  }

  return (
    <div className="flex flex-col gap-2">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        hidden
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="flex min-h-[160px] w-full flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-muted-foreground/40 bg-muted/40 p-4 text-sm text-muted-foreground transition hover:border-primary hover:text-primary"
      >
        {preview ? (
          <div className="relative h-40 w-full overflow-hidden rounded-md">
            <Image
              src={preview}
              alt="Pré-visualização"
              fill
              className="object-cover"
            />
          </div>
        ) : (
          <>
            <span className="text-lg font-medium text-foreground">
              {label}
            </span>
            <span className="text-xs text-muted-foreground">{description}</span>
          </>
        )}
      </button>
    </div>
  );
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = document.createElement('img');
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

async function compressImage(
  file: File,
  {
    maxWidth,
    maxHeight,
    quality,
  }: { maxWidth: number; maxHeight: number; quality: number }
): Promise<File> {
  const image = await loadImage(file);
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  if (!context) return file;

  let { width, height } = image;
  const bigFile = file.size > 8 * 1024 * 1024;
  const targetMaxWidth = bigFile ? Math.min(maxWidth, 1024) : maxWidth;
  const targetMaxHeight = bigFile ? Math.min(maxHeight, 1024) : maxHeight;
  const targetQuality = bigFile ? Math.min(quality, 0.7) : quality;

  const ratio = Math.min(targetMaxWidth / width, targetMaxHeight / height, 1);
  width = Math.round(width * ratio);
  height = Math.round(height * ratio);

  canvas.width = width;
  canvas.height = height;
  context.drawImage(image, 0, 0, width, height);

  const blob: Blob | null = await new Promise(resolve =>
    canvas.toBlob(resolve, 'image/jpeg', targetQuality)
  );
  if (!blob) return file;

  const extension = file.name.replace(/\.(png|jpg|jpeg|webp)$/i, '');
  return new File([blob], `${extension || 'registro'}.jpg`, {
    type: 'image/jpeg',
  });
}

