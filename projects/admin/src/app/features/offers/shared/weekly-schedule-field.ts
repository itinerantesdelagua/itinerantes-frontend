import { Component, computed, input, linkedSignal, model } from '@angular/core';
import { ScheduleRuleDto, ScheduleSlotDto } from 'data-access';
import { WEEKDAYS } from '../offer-labels';
import { WeekdayPicker } from './weekday-picker';

/** Horario de un día de clase (día ISO 1 = lunes … 7 = domingo; horas "HH:mm" CDMX). */
export type WeeklySlot = ScheduleSlotDto;

type TimeField = 'startTime' | 'endTime';

const DAY_LABELS = new Map(WEEKDAYS.map((d) => [d.value, d.label.toLowerCase()]));

/** Todos los días tienen el mismo horario (o hay uno o ninguno). */
export function hasSameTimes(slots: readonly WeeklySlot[]): boolean {
  const [first, ...rest] = slots;
  return rest.every((s) => s.startTime === first.startTime && s.endTime === first.endTime);
}

/**
 * Horario por día de una regla guardada. Usa `slots`; si la API no los trae (regla antigua),
 * los deriva de `weekdays` + `startTime`/`endTime`.
 */
export function ruleSlots(rule: ScheduleRuleDto | null | undefined): WeeklySlot[] {
  if (!rule) return [];
  const slots: readonly WeeklySlot[] | undefined = rule.slots;
  if (slots?.length) return slots.map((s) => ({ ...s }));
  return [...rule.weekdays]
    .sort((a, b) => a - b)
    .map((weekday) => ({ weekday, startTime: rule.startTime, endTime: rule.endTime }));
}

/** Problemas del horario por día, para mostrar antes de enviar (vacío si no hay). */
export function weeklyScheduleErrors(slots: readonly WeeklySlot[]): {
  days?: string;
  time?: string;
} {
  const errors: { days?: string; time?: string } = {};
  if (!slots.length) errors.days = 'Elige al menos un día.';
  if (slots.some((s) => !s.startTime || !s.endTime || s.endTime <= s.startTime)) {
    errors.time = hasSameTimes(slots)
      ? 'Elige la hora de inicio y una de fin posterior.'
      : 'Cada día necesita hora de inicio y una de fin posterior.';
  }
  return errors;
}

/**
 * Días de clase y su horario (HU-27 paso 3 / HU-29). Por defecto el mismo horario para todos los
 * días; al desmarcar "Mismo horario todos los días" cada día tiene su propia fila (precargada con
 * el horario común) para poner, p. ej., lunes 10:00–12:00 y jueves 16:00–18:00.
 */
@Component({
  selector: 'adm-weekly-schedule-field',
  imports: [WeekdayPicker],
  template: `
    <adm-weekday-picker
      [value]="days()"
      (valueChange)="setDays($event)"
      [disabled]="disabled()"
      [error]="daysError()"
    />

    @if (value().length > 1) {
      <label class="adm-check same">
        <input
          type="checkbox"
          [checked]="sameTime()"
          [disabled]="disabled()"
          (change)="setSameTime($any($event.target).checked)"
        />
        Mismo horario todos los días
      </label>
    }

    @if (sameTime() || value().length <= 1) {
      <div class="times">
        <div class="adm-field">
          <label class="adm-field__label" [for]="idPrefix() + '-start-time'">Hora de inicio</label>
          <input
            class="adm-field__input"
            type="time"
            [id]="idPrefix() + '-start-time'"
            [value]="common().startTime"
            [disabled]="disabled()"
            (input)="setCommon('startTime', $any($event.target).value)"
          />
        </div>
        <div class="adm-field">
          <label class="adm-field__label" [for]="idPrefix() + '-end-time'">Hora de fin</label>
          <input
            class="adm-field__input"
            type="time"
            [id]="idPrefix() + '-end-time'"
            [value]="common().endTime"
            [disabled]="disabled()"
            (input)="setCommon('endTime', $any($event.target).value)"
          />
        </div>
      </div>
    } @else {
      <ul class="per-day" aria-label="Horario de cada día">
        @for (slot of value(); track slot.weekday) {
          <li class="per-day__row">
            <span class="per-day__day">{{ dayLabel(slot.weekday) }}</span>
            <div class="adm-field">
              <label class="adm-field__label" [for]="idPrefix() + '-start-time-' + slot.weekday">
                Inicio <span class="visually-hidden">del {{ dayLabel(slot.weekday) }}</span>
              </label>
              <input
                class="adm-field__input"
                type="time"
                [id]="idPrefix() + '-start-time-' + slot.weekday"
                [value]="slot.startTime"
                [disabled]="disabled()"
                (input)="setSlot(slot.weekday, 'startTime', $any($event.target).value)"
              />
            </div>
            <div class="adm-field">
              <label class="adm-field__label" [for]="idPrefix() + '-end-time-' + slot.weekday">
                Fin <span class="visually-hidden">del {{ dayLabel(slot.weekday) }}</span>
              </label>
              <input
                class="adm-field__input"
                type="time"
                [id]="idPrefix() + '-end-time-' + slot.weekday"
                [value]="slot.endTime"
                [disabled]="disabled()"
                (input)="setSlot(slot.weekday, 'endTime', $any($event.target).value)"
              />
            </div>
          </li>
        }
      </ul>
    }
    @if (error()) {
      <p class="adm-field__error">{{ error() }}</p>
    }
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: var(--space-3);
    }
    .times {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(min(100%, 9rem), 1fr));
      gap: var(--space-3);
    }
    .per-day {
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .per-day__row {
      display: grid;
      grid-template-columns: minmax(6rem, auto) repeat(2, minmax(0, 1fr));
      align-items: end;
      gap: var(--space-3);
    }
    .per-day__day {
      padding-bottom: var(--space-2);
      color: var(--color-primary);
      font-weight: 700;
      &::first-letter {
        text-transform: uppercase;
      }
    }
  `,
})
export class WeeklyScheduleField {
  /** Un horario por día elegido, ordenados de lunes a domingo. */
  readonly value = model.required<readonly WeeklySlot[]>();
  /** Prefijo de los `id` de los campos de hora (p. ej. `s` → `s-start-time`). */
  readonly idPrefix = input('schedule');
  readonly disabled = input(false);
  /** Error de los días (debajo de los días). */
  readonly daysError = input<string | null>(null);
  /** Error de las horas. */
  readonly error = input<string | null>(null);

  /** Último valor emitido por este campo (para distinguirlo de un cambio desde fuera). */
  private emitted: readonly WeeklySlot[] | null = null;

  protected readonly days = computed(() => this.value().map((s) => s.weekday));

  /**
   * "Mismo horario todos los días": al cargar, marcado si todos los días coinciden; después lo
   * decide quien edita (se desmarca solo si los horarios dejan de coincidir).
   */
  protected readonly sameTime = linkedSignal<readonly WeeklySlot[], boolean>({
    source: this.value,
    computation: (slots, previous) => {
      const same = hasSameTimes(slots);
      if (!previous || slots !== this.emitted) return same;
      return same && previous.value;
    },
  });

  /** Horario común (el del primer día; se conserva aunque aún no haya días elegidos). */
  protected readonly common = linkedSignal<readonly WeeklySlot[], Omit<WeeklySlot, 'weekday'>>({
    source: this.value,
    computation: (slots, previous) =>
      slots[0]
        ? { startTime: slots[0].startTime, endTime: slots[0].endTime }
        : (previous?.value ?? { startTime: '', endTime: '' }),
  });

  protected dayLabel(weekday: number): string {
    return DAY_LABELS.get(weekday) ?? String(weekday);
  }

  protected setDays(days: readonly number[]): void {
    const current = new Map(this.value().map((s) => [s.weekday, s]));
    const { startTime, endTime } = this.common();
    this.emit(
      [...days]
        .sort((a, b) => a - b)
        .map((weekday) => current.get(weekday) ?? { weekday, startTime, endTime }),
    );
  }

  protected setSameTime(same: boolean): void {
    this.sameTime.set(same);
    if (!same) return;
    const { startTime, endTime } = this.common();
    this.emit(this.value().map((s) => ({ ...s, startTime, endTime })));
  }

  protected setCommon(field: TimeField, time: string): void {
    this.common.update((c) => ({ ...c, [field]: time }));
    this.emit(this.value().map((s) => ({ ...s, [field]: time })));
  }

  protected setSlot(weekday: number, field: TimeField, time: string): void {
    this.emit(this.value().map((s) => (s.weekday === weekday ? { ...s, [field]: time } : s)));
  }

  private emit(slots: readonly WeeklySlot[]): void {
    this.emitted = slots;
    this.value.set(slots);
  }
}
