/**
 * Comprime imagens antes do upload para reduzir o payload e evitar erro 413
 * (Request Entity Too Large) ao finalizar checklist ou salvar rascunho.
 */
import * as ImageManipulator from "expo-image-manipulator";

const MAX_SIZE = 1280;
const COMPRESS = 0.7;

/**
 * Comprime uma imagem a partir de URI (file://, content:// ou path).
 * Redimensiona para no máximo 1280px (mantendo proporção) e comprime JPEG.
 * Retorna a URI do arquivo comprimido (novo arquivo temporário).
 */
export async function compressImageForUpload(
  uri: string
): Promise<{ uri: string }> {
  const isLocal =
    uri.startsWith("file://") ||
    uri.startsWith("content://") ||
    uri.startsWith("/");
  if (!isLocal) {
    return { uri };
  }
  try {
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: MAX_SIZE } }],
      { compress: COMPRESS, format: ImageManipulator.SaveFormat.JPEG }
    );
    return { uri: result.uri };
  } catch (e) {
    console.warn("[compressImage] Erro ao comprimir, usando original:", e);
    return { uri };
  }
}

/**
 * Comprime um data URL (ex.: assinatura do gerente) e retorna data URL.
 * manipulateAsync aceita data URI; com base64: true devolve base64 no result.
 */
export async function compressDataUrlToDataUrl(
  dataUrl: string
): Promise<string> {
  if (!dataUrl || !dataUrl.startsWith("data:image")) {
    return dataUrl;
  }
  try {
    const result = await ImageManipulator.manipulateAsync(
      dataUrl,
      [{ resize: { width: MAX_SIZE } }],
      {
        compress: COMPRESS,
        format: ImageManipulator.SaveFormat.JPEG,
        base64: true,
      }
    );
    if (result.base64) {
      return `data:image/jpeg;base64,${result.base64}`;
    }
    return dataUrl;
  } catch (e) {
    console.warn("[compressImage] Erro ao comprimir data URL, usando original:", e);
    return dataUrl;
  }
}
