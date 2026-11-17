import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { AREAS_CONTENT } from '../../content/areas.content';
import { Areas } from './areas';

describe('Areas', () => {
  it('"Conoce la Escuela" lleva al catálogo de oferta del Portal', async () => {
    const fixture = TestBed.createComponent(Areas);
    fixture.componentRef.setInput('content', AREAS_CONTENT);
    await fixture.whenStable();
    const cta = (fixture.nativeElement as HTMLElement).querySelector<HTMLAnchorElement>(
      '.areas__cta',
    )!;
    expect(cta.textContent?.trim()).toBe('Conoce la Escuela');
    expect(cta.getAttribute('href')).toBe(new URL('/catalogo', environment.portalUrl!).href);
    expect(cta.hasAttribute('routerLink')).toBe(false);
  });
});
