import { inject, Injectable } from '@angular/core';
import {
  AdminImageDto,
  AdminUploadsApi,
  formatMegabytes,
  IMAGE_UPLOAD_RULES,
  ImageContentType,
  ImageUploadPurpose,
} from 'data-access';
import { firstValueFrom } from 'rxjs';
import { ErrorPresenter } from '../../core/error-presenter';

/** "JPG, PNG o WebP de hasta 15 MB": ayuda de los campos de imagen. */
export const IMAGE_UPLOAD_HINT = `JPG, PNG o WebP de hasta ${formatMegabytes(IMAGE_UPLOAD_RULES.maxBytes)}`;

/** Valida y sube una imagen; devuelve su `key` y una URL local para la vista previa. */
@Injectable({ providedIn: 'root' })
export class ImageUpload {
  private readonly uploads = inject(AdminUploadsApi);
  private readonly errors = inject(ErrorPresenter);

  /** Mensaje si el archivo no es válido (tipo o tamaño), o `null`. */
  validate(file: File): string | null {
    if (!IMAGE_UPLOAD_RULES.contentTypes.includes(file.type as ImageContentType)) {
      return 'Usa una imagen JPG, PNG o WebP.';
    }
    if (file.size > IMAGE_UPLOAD_RULES.maxBytes) {
      return `La imagen pesa más de ${formatMegabytes(IMAGE_UPLOAD_RULES.maxBytes)}.`;
    }
    return null;
  }

  async upload(
    file: File,
    purpose: ImageUploadPurpose,
    offerId?: string,
  ): Promise<AdminImageDto | null> {
    try {
      const key = await firstValueFrom(this.uploads.uploadImage(file, purpose, offerId));
      return { key, url: URL.createObjectURL(file) };
    } catch (error) {
      void this.errors.present(error, { title: 'No se pudo subir la imagen' });
      return null;
    }
  }
}
