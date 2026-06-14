import {
  differenceInCalendarDays,
  format,
  isValid,
  parseISO,
  startOfISOWeek,
  startOfMonth,
  subDays,
} from 'date-fns'

type DateInput = Date | string | number

function toDate(d: DateInput): Date {
  if (d instanceof Date) return d
  if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)) return parseISO(d)
  return new Date(d)
}

export function ymd(d: DateInput): string {
  return format(toDate(d), 'yyyy-MM-dd')
}

export function ymdHms(d: DateInput | null | undefined): string {
  if (d == null || d === '') return ''
  const t = toDate(d)
  if (!isValid(t)) return ''
  return format(t, 'yyyy-MM-dd HH:mm:ss')
}

export function weekRange(now: DateInput = new Date()): { since: string; until: string } {
  const today = toDate(now)
  return { since: ymd(startOfISOWeek(today)), until: ymd(today) }
}

export function monthRange(now: DateInput = new Date()): { since: string; until: string } {
  const today = toDate(now)
  return { since: ymd(startOfMonth(today)), until: ymd(today) }
}

export function previousPeriod(since: string, until: string): { since: string; until: string } {
  const s = parseISO(since)
  const u = parseISO(until)
  const lengthDays = differenceInCalendarDays(u, s)
  const prevUntil = subDays(s, 1)
  const prevSince = subDays(prevUntil, lengthDays)
  return { since: ymd(prevSince), until: ymd(prevUntil) }
}

export function deltaPct(current: number, prev: number): number | null {
  if (prev === 0) return current === 0 ? 0 : null
  return ((current - prev) / prev) * 100
}
