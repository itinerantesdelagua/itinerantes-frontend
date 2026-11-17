import {
  afterNextRender,
  Component,
  effect,
  ElementRef,
  Injector,
  inject,
  input,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { Button } from 'ui-kit';
import { SECTION_IDS } from '../../content/section-ids';
import { ClosingCtaContent } from './closing-cta-content';
import { ContactForm } from './contact-form/contact-form';
import { ContactLauncher, ContactPreset } from './contact-launcher';

/**
 * Sección de cierre "Territorios que cuidan y aprenden" sobre el fondo verde
 * ondulado; destino del ancla "Contacto". Al pulsar "Hablemos" el bloque se
 * sustituye por el formulario de contacto, con un botón para volver. Otros
 * CTA de la página abren este mismo formulario con `ContactLauncher`.
 */
@Component({
  selector: 'pub-closing-cta',
  imports: [Button, ContactForm],
  templateUrl: './closing-cta.html',
  styleUrl: './closing-cta.scss',
})
export class ClosingCta {
  readonly content = input.required<ClosingCtaContent>();

  protected readonly sectionId = SECTION_IDS.contact;
  protected readonly showForm = signal(false);
  /** Valores iniciales del formulario cuando lo abre otro CTA. */
  protected readonly preset = signal<ContactPreset | null>(null);

  private readonly injector = inject(Injector);
  private readonly launcher = inject(ContactLauncher);
  private readonly ctaButton = viewChild('cta', { read: ElementRef<HTMLButtonElement> });

  constructor() {
    effect(() => {
      const preset = this.launcher.request();
      if (!preset) return;
      untracked(() => {
        this.launcher.clear();
        this.preset.set(preset);
        this.showForm.set(true);
      });
    });
  }

  /** El formulario lleva el foco a su primer campo al aparecer. */
  protected openForm(): void {
    this.showForm.set(true);
  }

  protected closeForm(): void {
    this.showForm.set(false);
    this.preset.set(null);
    afterNextRender(() => this.ctaButton()?.nativeElement.focus(), { injector: this.injector });
  }
}
