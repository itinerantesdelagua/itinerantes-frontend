import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AdminOfferDetailDto, apiErrorInterceptor, provideApi } from 'data-access';
import { AlertService } from 'ui-kit';
import { offerFixture } from '../../testing/offer-fixture';
import { GeneralStep } from './general-step';
import { OfferStep } from './offer-step';
import { PricingStep } from './pricing-step';
import { ScheduleStep } from './schedule-step';

const API = 'https://api.test/api/v1/admin/offers/o1/steps';

async function mount<T extends OfferStep>(component: Type<T>, offer: AdminOfferDetailDto) {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      provideHttpClient(withInterceptors([apiErrorInterceptor])),
      provideHttpClientTesting(),
      provideApi({ baseUrl: 'https://api.test' }),
      { provide: AlertService, useValue: { open: () => Promise.resolve(true) } },
    ],
  });
  const fixture = TestBed.createComponent(component);
  fixture.componentRef.setInput('offer', offer);
  await fixture.whenStable();
  const host = fixture.nativeElement as HTMLElement;
  const type = async (id: string, value: string) => {
    const el = host.querySelector<HTMLInputElement | HTMLSelectElement>('#' + id)!;
    el.value = value;
    el.dispatchEvent(new Event(el instanceof HTMLSelectElement ? 'change' : 'input'));
    await fixture.whenStable();
  };
  /** Guarda y devuelve el cuerpo enviado a la API. */
  const save = async (slug: string) => {
    const saved = fixture.componentInstance.save();
    const req = TestBed.inject(HttpTestingController).expectOne(`${API}/${slug}`);
    expect(req.request.method).toBe('PATCH');
    req.flush(offer);
    await saved;
    return req.request.body as Record<string, unknown>;
  };
  return { fixture, host, type, save, step: fixture.componentInstance };
}

describe('pasos del asistente de ofertas', () => {
  it('Datos: detecta cambios y envía solo lo del paso (vacíos como null)', async () => {
    const { step, type, save } = await mount(GeneralStep, offerFixture());
    expect(step.dirty()).toBe(false);
    await type('g-summary', 'Taller práctico.');
    expect(step.dirty()).toBe(true);

    const body = await save('general');
    expect(body).toMatchObject({
      name: 'Taller de baños secos',
      type: 'WORKSHOP',
      modality: 'ONLINE_LIVE',
      summary: 'Taller práctico.',
      cohortLabel: null,
      coverImageKey: null,
      teacherIds: [],
      venueName: null,
      capacity: null,
    });
  });

  it('Datos: con inscritos no envía tipo ni modalidad y los bloquea', async () => {
    const { host, save } = await mount(GeneralStep, offerFixture({ hasEnrollments: true }));
    expect(host.querySelector<HTMLSelectElement>('#g-type')!.disabled).toBe(true);
    const body = await save('general');
    expect('type' in body).toBe(false);
    expect('modality' in body).toBe(false);
  });

  it('Datos: muestra el problema de la API junto a su campo', async () => {
    const { host } = await mount(
      GeneralStep,
      offerFixture(
        {},
        { general: [{ field: 'summary', code: 'REQUIRED', message: 'Escribe el resumen.' }] },
      ),
    );
    const summary = host.querySelector('#g-summary')!;
    expect(summary.getAttribute('aria-invalid')).toBe('true');
    expect(host.querySelector('#g-summary-issue')?.textContent).toContain('Escribe el resumen.');
  });

  it('Horarios: convierte la hora CDMX a UTC y envía la regla', async () => {
    const { type, save, host, fixture } = await mount(ScheduleStep, offerFixture());
    await type('s-starts', '2026-11-09T10:00');
    host.querySelector<HTMLInputElement>('input[formcontrolname="hasRule"]')!.click();
    await fixture.whenStable();
    host.querySelectorAll<HTMLInputElement>('adm-weekday-picker input')[0].click(); // lunes
    await type('s-start-time', '18:00');
    await type('s-end-time', '20:00');

    const body = await save('schedule');
    expect(body['startsAt']).toBe('2026-11-09T16:00:00.000Z');
    expect(body['scheduleRule']).toEqual({
      slots: [{ weekday: 1, startTime: '18:00', endTime: '20:00' }],
      excludedDates: [],
      excludeMexicanHolidays: true,
    });
  });

  it('Horarios: horario distinto por día (lun 10–12, jue 16–18) partiendo del mismo para todos', async () => {
    const { type, save, host, fixture, step } = await mount(ScheduleStep, offerFixture());
    host.querySelector<HTMLInputElement>('input[formcontrolname="hasRule"]')!.click();
    await fixture.whenStable();
    await type('s-start-time', '10:00');
    await type('s-end-time', '12:00');
    const days = host.querySelectorAll<HTMLInputElement>('adm-weekday-picker input');
    days[0].click(); // lunes
    days[3].click(); // jueves
    await fixture.whenStable();
    expect(step.dirty()).toBe(true);

    // "Mismo horario todos los días" viene marcado: una sola pareja de horas.
    const same = [...host.querySelectorAll<HTMLLabelElement>('label.adm-check')].find((l) =>
      l.textContent?.includes('Mismo horario todos los días'),
    )!;
    expect(same.querySelector('input')!.checked).toBe(true);
    expect(host.querySelector('#s-start-time-4')).toBeNull();

    same.querySelector('input')!.click();
    await fixture.whenStable();
    // Una fila por día, precargada con el horario común.
    expect(host.querySelector<HTMLInputElement>('#s-start-time-1')!.value).toBe('10:00');
    expect(host.querySelector<HTMLInputElement>('#s-start-time-4')!.value).toBe('10:00');
    await type('s-start-time-4', '16:00');
    await type('s-end-time-4', '18:00');

    const body = await save('schedule');
    expect(body['scheduleRule']).toEqual({
      slots: [
        { weekday: 1, startTime: '10:00', endTime: '12:00' },
        { weekday: 4, startTime: '16:00', endTime: '18:00' },
      ],
      excludedDates: [],
      excludeMexicanHolidays: true,
    });
  });

  it('Horarios: carga una regla guardada con horario por día (y una antigua sin slots)', async () => {
    const base = offerFixture();
    const perDay = {
      ...base,
      schedule: {
        ...base.schedule,
        scheduleRule: {
          weekdays: [1, 4],
          startTime: '10:00',
          endTime: '12:00',
          slots: [
            { weekday: 1, startTime: '10:00', endTime: '12:00' },
            { weekday: 4, startTime: '16:00', endTime: '18:00' },
          ],
          excludedDates: [],
          excludeMexicanHolidays: false,
        },
      },
    };
    const { host, step } = await mount(ScheduleStep, perDay);
    expect(step.dirty()).toBe(false);
    expect(host.querySelector<HTMLInputElement>('#s-start-time-4')!.value).toBe('16:00');
    expect(host.querySelector<HTMLInputElement>('#s-end-time-4')!.value).toBe('18:00');
    TestBed.resetTestingModule();

    const legacy = {
      ...base,
      schedule: {
        ...base.schedule,
        // Regla antigua: sin `slots`.
        scheduleRule: { weekdays: [6, 7], startTime: '10:00', endTime: '13:00' },
      },
    } as unknown as AdminOfferDetailDto;
    const old = await mount(ScheduleStep, legacy);
    expect(old.host.querySelector<HTMLInputElement>('#s-start-time')!.value).toBe('10:00');
    expect(old.host.querySelector('#s-start-time-6')).toBeNull();
    const body = await old.save('schedule');
    expect(body['scheduleRule']).toMatchObject({
      slots: [
        { weekday: 6, startTime: '10:00', endTime: '13:00' },
        { weekday: 7, startTime: '10:00', endTime: '13:00' },
      ],
    });
  });

  it('Precio: envía centavos y con Moodle limpia precio, cuotas y beca', async () => {
    const offer = offerFixture({
      originPricing: {
        ...offerFixture().originPricing,
        priceMxnCents: 1500000,
        priceUsdCents: 85000,
      },
    });
    const { host, type, save } = await mount(PricingStep, offer);
    expect(host.querySelector<HTMLInputElement>('#p-mxn')!.value).toBe('15000');
    await type('p-usd', '850.5');
    let body = await save('origin-pricing');
    expect(body).toMatchObject({ origin: 'NAS', priceMxnCents: 1500000, priceUsdCents: 85050 });

    const moodle = host.querySelectorAll<HTMLInputElement>('input[type="radio"]')[1];
    moodle.click();
    body = await save('origin-pricing');
    expect(body).toMatchObject({
      origin: 'MOODLE',
      priceMxnCents: null,
      priceUsdCents: null,
      installmentsEnabled: false,
      scholarshipEnabled: false,
    });
  });
});
