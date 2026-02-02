import * as FileSystem from "expo-file-system/legacy";

const DRAFT_PHOTOS_DIR = "draft_photos";

/**
 * Copia uma foto para armazenamento permanente (documentDirectory).
 * URIs temporários (cache/ImagePicker) são invalidados quando o app fecha.
 * Esta cópia garante que as fotos persistam após reabrir o app.
 */
export async function copyPhotoToPermanentStorage(
  uri: string,
  escopoId: string,
  key: string,
  index: number
): Promise<string> {
  try {
    // Se já for URI em documentDirectory, não precisa copiar
    if (uri.includes(DRAFT_PHOTOS_DIR) || uri.includes("draft_photos")) {
      return uri;
    }
    // URLs HTTP já estão no servidor, não copiar
    if (uri.startsWith("http://") || uri.startsWith("https://")) {
      return uri;
    }

    const baseDir = `${FileSystem.documentDirectory}${DRAFT_PHOTOS_DIR}/${escopoId}`;
    const dirInfo = await FileSystem.getInfoAsync(baseDir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(baseDir, { intermediates: true });
    }
    const ext = uri.toLowerCase().includes(".png") ? ".png" : ".jpg";
    const safeKey = key.replace(/[^a-zA-Z0-9-_]/g, "_");
    const destUri = `${baseDir}/${safeKey}_${index}${ext}`;
    await FileSystem.copyAsync({ from: uri, to: destUri });
    return destUri;
  } catch (err) {
    console.warn(
      "[draftPhotos] Falha ao copiar foto para armazenamento permanente:",
      err
    );
    return uri; // fallback para URI original
  }
}

/**
 * Verifica se um URI de foto ainda existe (arquivo acessível).
 * Útil ao carregar rascunho local para ignorar fotos de cache já limpas.
 */
export async function photoUriExists(uri: string): Promise<boolean> {
  try {
    if (uri.startsWith("http://") || uri.startsWith("https://")) {
      return true; // URLs remotas assumimos que existem
    }
    const info = await FileSystem.getInfoAsync(uri, { size: false });
    return info.exists;
  } catch {
    return false;
  }
}
