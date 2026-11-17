import { Injectable, signal } from '@angular/core';
import { ContactService, ContactSubject } from 'data-access';

/** Valores con los que se abre el formulario de contacto (el usuario puede cambiarlos). */
export interface ContactPreset {
  readonly subject?: ContactSubject;
  readonly service?: ContactService;
}

/**
 * Pide abrir el formulario de contacto de la sección de cierre desde otra
 * parte de la página (p. ej. el CTA "Quiero implementar" del hero), para que
 * todas las solicitudes entren por el mismo formulario.
 */
@Injectable({ providedIn: 'root' })
export class ContactLauncher {
  private readonly pending = signal<ContactPreset | null>(null);

  /** Petición pendiente; la sección de cierre la atiende y la descarta. */
  readonly request = this.pending.asReadonly();

  open(preset: ContactPreset = {}): void {
    // Objeto nuevo en cada llamada: repetir la misma petición vuelve a notificar.
    this.pending.set({ ...preset });
  }

  clear(): void {
    this.pending.set(null);
  }
}
