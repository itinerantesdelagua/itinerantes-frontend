import { UiImage, UiLink } from 'ui-kit';
import { ContactPreset } from '../closing-cta/contact-launcher';

export interface HeroContent {
  readonly title: string;
  readonly subtitle: string;
  /** Palabras clave mostradas en una línea separadas por "·". */
  readonly keywords: readonly string[];
  /** Lleva al formulario de contacto (sección de cierre) y lo abre con `contactPreset`. */
  readonly cta: UiLink & { readonly contactPreset: ContactPreset };
  /** Indicador de scroll ("Desliza para explorar"). */
  readonly scrollHint: UiLink;
  /** Onda decorativa bajo el título. */
  readonly divider: UiImage;
  /** Ilustraciones decorativas a cada lado (`alt` vacío). */
  readonly illustrations: { readonly left: UiImage; readonly right: UiImage };
}
