import { MoneyDto, OfferScheduleDto, SessionSlotDto } from 'data-access';

/** Hora oficial de los horarios (HU-11). */
export const CDMX = 'America/Mexico_City';

/** Zona IANA del navegador (define la moneda sin sesión). */
export function browserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || CDMX;
  } catch {
    return CDMX;
  }
}

const clean = (text: string) => text.replace(/\./g, '');
type Parts = Record<'day' | 'month' | 'year', string>;
const partsOf = (iso: string, timeZone: string): Parts =>
  Object.fromEntries(
    new Intl.DateTimeFormat('es', { timeZone, day: 'numeric', month: 'short', year: 'numeric' })
      .formatToParts(new Date(iso))
      .map((p) => [p.type, clean(p.value)]),
  ) as Parts;

/** "13–17 abr 2027", "7 nov 2026 – 31 mar 2027" o "21 nov 2026" (en la zona). */
export function dateRange(startsAt: string | null, endsAt: string | null, timeZone: string) {
  if (!startsAt) return null;
  const a = partsOf(startsAt, timeZone);
  if (!endsAt) return `${a.day} ${a.month} ${a.year}`;
  const b = partsOf(endsAt, timeZone);
  if (a.year !== b.year) return `${a.day} ${a.month} ${a.year} – ${b.day} ${b.month} ${b.year}`;
  if (a.month !== b.month) return `${a.day} ${a.month} – ${b.day} ${b.month} ${b.year}`;
  return a.day === b.day
    ? `${a.day} ${a.month} ${a.year}`
    : `${a.day}–${b.day} ${a.month} ${a.year}`;
}

/** "1 oct" (con el año si no es el actual). */
export function shortDate(iso: string, timeZone: string, now = new Date()): string {
  const p = partsOf(iso, timeZone);
  const year = partsOf(now.toISOString(), timeZone).year;
  return p.year === year ? `${p.day} ${p.month}` : `${p.day} ${p.month} ${p.year}`;
}

const DAYS = ['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'] as const;

/** Días ISO (1 = lunes) a "Sáb y dom" o "Lun, mié y vie". */
export function weekdaysLabel(weekdays: readonly number[]): string {
  const names = [...weekdays].sort((a, b) => a - b).map((d) => DAYS[(d - 1) % 7]);
  const text =
    names.length > 1 ? `${names.slice(0, -1).join(', ')} y ${names[names.length - 1]}` : names[0];
  return text ? text[0].toUpperCase() + text.slice(1) : '';
}

export const time = (iso: string, timeZone: string) =>
  new Intl.DateTimeFormat('es', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(iso));

/** Ciudad de la zona IANA ("America/Bogota" → "Bogota"). */
export const zoneName = (timeZone: string) =>
  (timeZone.split('/').pop() ?? timeZone).replace(/_/g, ' ');

/** Días con el mismo horario (CDMX) y su primera sesión (UTC) para convertir a otra zona. */
export interface ScheduleGroup {
  /** "Lun y mié". */
  readonly days: string;
  readonly weekdays: readonly number[];
  readonly startTime: string;
  readonly endTime: string;
  readonly firstSession: SessionSlotDto | null;
}

/**
 * Agrupa los días por horario, de lunes a domingo: con el mismo horario todos
 * los días hay un solo grupo; con horario por día, p. ej. "Lun" 10:00–12:00 y
 * "Jue" 16:00–18:00. Si la API no trae `slots` (regla antigua), usa los campos
 * clásicos.
 */
export function scheduleGroups(schedule: OfferScheduleDto): ScheduleGroup[] {
  const slots: OfferScheduleDto['slots'] = schedule.slots?.length
    ? schedule.slots
    : [...schedule.weekdays]
        .sort((a, b) => a - b)
        .map((weekday) => ({
          weekday,
          startTime: schedule.startTime,
          endTime: schedule.endTime,
          firstSession: schedule.firstSession,
        }));
  const groups = new Map<string, { weekdays: number[]; slots: typeof slots }>();
  for (const slot of [...slots].sort((a, b) => a.weekday - b.weekday)) {
    const key = `${slot.startTime}-${slot.endTime}`;
    const group = groups.get(key) ?? { weekdays: [], slots: [] };
    group.weekdays.push(slot.weekday);
    group.slots.push(slot);
    groups.set(key, group);
  }
  return [...groups.values()].map(({ weekdays, slots: [first, ...rest] }) => ({
    days: weekdaysLabel(weekdays),
    weekdays,
    startTime: first.startTime,
    endTime: first.endTime,
    firstSession: [first, ...rest]
      .map((s) => s.firstSession)
      .filter((f): f is SessionSlotDto => !!f)
      .reduce<SessionSlotDto | null>((a, b) => (!a || b.startsAt < a.startsAt ? b : a), null),
  }));
}

/**
 * Horario en CDMX: "Sáb y dom · 10:00–13:00" o, con horario distinto por día,
 * "Lun 10:00–12:00 · Jue 16:00–18:00".
 */
export function scheduleHeading(schedule: OfferScheduleDto): string {
  const groups = scheduleGroups(schedule);
  if (groups.length <= 1) {
    const days = groups[0]?.days ?? weekdaysLabel(schedule.weekdays);
    const start = groups[0]?.startTime ?? schedule.startTime;
    const end = groups[0]?.endTime ?? schedule.endTime;
    return `${days ? `${days} · ` : ''}${start}–${end}`;
  }
  return groups.map((g) => `${g.days} ${g.startTime}–${g.endTime}`).join(' · ');
}

/**
 * El horario convertido a otra zona (de la primera sesión de cada grupo, en
 * UTC): "11:00–14:00" o "Lun 11:00–13:00 · Jue 17:00–19:00". null si falta la
 * primera sesión.
 */
export function scheduleIn(schedule: OfferScheduleDto, timeZone: string): string | null {
  const groups = scheduleGroups(schedule);
  const range = (s: SessionSlotDto) => `${time(s.startsAt, timeZone)}–${time(s.endsAt, timeZone)}`;
  if (groups.length <= 1) {
    const first = groups[0]?.firstSession ?? schedule.firstSession;
    return first ? range(first) : null;
  }
  if (groups.some((g) => !g.firstSession)) return null;
  return groups.map((g) => `${g.days} ${range(g.firstSession!)}`).join(' · ');
}

/**
 * Horario: "Sáb y dom · 10:00–13:00" (CDMX) y, si la persona está en otra
 * zona, "11:00–14:00" con su ciudad (de la primera sesión, en UTC). Con
 * horario distinto por día, cada grupo de días con su horario.
 */
export function scheduleLines(schedule: OfferScheduleDto, timeZone: string) {
  const cdmx = scheduleHeading(schedule);
  const converted = timeZone !== CDMX ? scheduleIn(schedule, timeZone) : null;
  const local = converted ? { time: converted, zone: zoneName(timeZone) } : null;
  return { cdmx, local };
}

/** "$1,500 MXN" o "$292.50 USD" (centavos de la API). */
export function formatMoney(money: MoneyDto): string {
  const amount = new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: money.currency,
    currencyDisplay: 'narrowSymbol',
    minimumFractionDigits: money.amountCents % 100 ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(money.amountCents / 100);
  return `${amount} ${money.currency}`;
}

/** "10%–80%" o "50%". */
export const percentRange = (min: number, max: number) =>
  min === max ? `${min}%` : `${min}%–${max}%`;

/** Diferencia con UTC (minutos) de una zona en una fecha: para comparar zonas. */
export function utcOffset(iso: string, timeZone: string): number {
  const date = new Date(iso);
  const local = new Date(date.toLocaleString('en-US', { timeZone }));
  const utc = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
  return Math.round((local.getTime() - utc.getTime()) / 60_000);
}
