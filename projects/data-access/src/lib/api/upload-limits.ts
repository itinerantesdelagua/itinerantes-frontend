const MB = 1024 * 1024;

/**
 * Tamaño máximo general de los archivos que se suben (comprobantes, evidencias,
 * imágenes de difusión): 15 MB. Es el mismo valor que
 * `BUSINESS_RULES.FILE_LIMITS.UPLOAD_MAX_BYTES` de la API, que lo valida
 * también. Los archivos que admiten más (proyecto final, materiales del módulo,
 * videos) tienen su propio límite.
 */
export const UPLOAD_MAX_BYTES = 15 * MB;

/** Comprobante de transferencia (HU-23): PDF, JPG o PNG. */
export const TRANSFER_PROOF_MAX_BYTES = UPLOAD_MAX_BYTES;

/** Tamaño legible para mensajes de límite: 15_728_640 → "15 MB". */
export function formatMegabytes(bytes: number): string {
  return `${Math.round(bytes / MB)} MB`;
}
