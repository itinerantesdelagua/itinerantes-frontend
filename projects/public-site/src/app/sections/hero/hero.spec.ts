import { TestBed } from '@angular/core/testing';
import { HERO_CONTENT } from '../../content/hero.content';
import { ContactLauncher } from '../closing-cta/contact-launcher';
import { Hero } from './hero';

describe('Hero', () => {
  async function setup() {
    const fixture = TestBed.createComponent(Hero);
    fixture.componentRef.setInput('content', HERO_CONTENT);
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;
    return { host, cta: host.querySelector<HTMLAnchorElement>('.hero__cta')! };
  }

  it('"Quiero implementar" lleva al formulario de contacto con el asunto preseleccionado', async () => {
    const { cta } = await setup();
    expect(cta.textContent?.trim()).toBe('Quiero implementar');
    expect(cta.getAttribute('href')).toBe('#contacto');

    const launcher = TestBed.inject(ContactLauncher);
    cta.click();
    expect(launcher.request()).toEqual({
      subject: 'DESIGN_CONSULTING',
      service: 'TECHNOLOGY_IMPLEMENTATION_ADVICE',
    });
  });
});
