import { HeroContent } from '../sections/hero/hero-content';
import { SECTION_IDS } from './section-ids';

// Copy tomado del Figma aprobado (Landing Desktop).
export const HERO_CONTENT: HeroContent = {
  title: 'Itinerantes del Agua',
  subtitle: 'Tecnologías regenerativas para las aguas vivas.',
  keywords: ['Saberes indígenas', 'Tecnologías regenerativas', 'Bioingeniería'],
  cta: {
    label: 'Quiero implementar',
    // Mismo formulario que "Contacto", con el asunto y el servicio preseleccionados.
    href: `#${SECTION_IDS.contact}`,
    contactPreset: { subject: 'DESIGN_CONSULTING', service: 'TECHNOLOGY_IMPLEMENTATION_ADVICE' },
  },
  scrollHint: {
    label: 'Desliza para explorar',
    href: `#${SECTION_IDS.objectives}`,
  },
  divider: { src: 'assets/images/blueLine.svg', alt: '' },
  illustrations: {
    left: { src: 'assets/images/heroLeft.webp', alt: '' },
    right: { src: 'assets/images/heroRight.webp', alt: '' },
  },
};
