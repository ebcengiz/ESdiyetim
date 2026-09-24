// Görsel yardımcıları
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

// Kalori tahmini için 1024 px yeterli (Gemini görseli zaten ~768 px karolara böler).
// Tam çözünürlüklü fotoğraf base64'te birkaç MB → yavaş yükleme + Edge Function gövde sınırı.
const AI_IMAGE_MAX_SIDE = 1024;
const AI_IMAGE_COMPRESS = 0.7;

/**
 * ImagePicker asset'ini AI'a gönderilecek boyuta indirir → { base64, mimeType }.
 * Küçültme başarısız olursa picker'ın kendi base64'üne düşer (akış bozulmasın).
 */
export async function prepareImageForAI(asset) {
  try {
    const { uri, width = 0, height = 0 } = asset;
    const context = ImageManipulator.manipulate(uri);
    const longest = Math.max(width, height);
    if (longest > AI_IMAGE_MAX_SIDE) {
      context.resize(width >= height ? { width: AI_IMAGE_MAX_SIDE } : { height: AI_IMAGE_MAX_SIDE });
    }
    const ref = await context.renderAsync();
    const result = await ref.saveAsync({ compress: AI_IMAGE_COMPRESS, format: SaveFormat.JPEG, base64: true });
    if (result?.base64) return { base64: result.base64, mimeType: 'image/jpeg' };
  } catch (e) {
    console.warn('⚠️ prepareImageForAI: küçültülemedi, orijinal kullanılıyor', e?.message);
  }
  return { base64: asset.base64 || null, mimeType: asset.mimeType || 'image/jpeg' };
}
