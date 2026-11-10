/** Imágenes guardadas como data URL (foto con los datos de pago y comprobantes de transferencia). */
export const IMAGE_MAX_CHARS = 1_500_000; // ~1.1 MB de imagen
const DATA_URL = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/;

export const isImageDataUrl = (value: unknown): value is string =>
  typeof value === "string" && value.length <= IMAGE_MAX_CHARS && DATA_URL.test(value);

/** Convierte un data URL en bytes y tipo para responder la imagen o adjuntarla a un correo. */
export function decodeImage(dataUrl: string) {
  const [, type, base64] = /^data:(image\/[a-z]+);base64,(.*)$/.exec(dataUrl) || [];
  return type ? { type, bytes: Buffer.from(base64, "base64"), ext: type.split("/")[1].replace("jpeg", "jpg") } : null;
}
