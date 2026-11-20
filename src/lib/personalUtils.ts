import { DailyMood, PersonalDailyCheckin, PersonalHabit, PersonalHabitLog, PersonalTask } from '../types';

export function getLocalTodayDateStr(now: Date = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export function addDaysToDateStr(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('T')[0].split('-').map(Number);
  const dt = new Date(y, m - 1, d + days, 12, 0, 0);
  return getLocalTodayDateStr(dt);
}

export function getWeekdayFromDateStr(dateStr: string): number {
  const [y, m, d] = dateStr.split('T')[0].split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0).getDay();
}

export function formatShortPtBrDate(dateStr?: string): string {
  if (!dateStr) return '';
  const clean = dateStr.split('T')[0];
  const parts = clean.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}`;
}

export function formatLongPtBrDate(dateStr?: string): string {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('T')[0].split('-').map(Number);
  if (!y || !m || !d) return dateStr;
  const dt = new Date(y, m - 1, d, 12, 0, 0);
  return dt.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
}

export type TaskViewFilter = 'today' | 'upcoming' | 'overdue' | 'completed' | 'all';

export function isTaskOverdue(task: PersonalTask, todayStr: string = getLocalTodayDateStr()): boolean {
  if (task.status === 'completed') return false;
  if (!task.due_date) return false;
  return task.due_date.split('T')[0] < todayStr;
}

export function isTaskDueToday(task: PersonalTask, todayStr: string = getLocalTodayDateStr()): boolean {
  if (task.status === 'completed') return false;
  if (!task.due_date) return false;
  return task.due_date.split('T')[0] === todayStr;
}

export function isTaskUpcoming(task: PersonalTask, todayStr: string = getLocalTodayDateStr()): boolean {
  if (task.status === 'completed') return false;
  if (!task.due_date) return false;
  return task.due_date.split('T')[0] > todayStr;
}

export function filterAndSortPersonalTasks(
  tasks: PersonalTask[],
  filter: TaskViewFilter,
  todayStr: string = getLocalTodayDateStr()
): PersonalTask[] {
  const filtered = tasks.filter((t) => {
    const cleanDue = t.due_date ? t.due_date.split('T')[0] : '';
    if (filter === 'completed') return t.status === 'completed';
    if (filter === 'overdue') return t.status === 'pending' && Boolean(cleanDue && cleanDue < todayStr);
    if (filter === 'today') return t.status === 'pending' && Boolean(cleanDue && cleanDue <= todayStr);
    if (filter === 'upcoming') return t.status === 'pending' && Boolean(cleanDue && cleanDue > todayStr);
    return true;
  });

  const priorityRank: Record<string, number> = { high: 0, medium: 1, low: 2 };

  return [...filtered].sort((a, b) => {
    if (a.status !== b.status) return a.status === 'pending' ? -1 : 1;

    const aOver = isTaskOverdue(a, todayStr) ? 0 : 1;
    const bOver = isTaskOverdue(b, todayStr) ? 0 : 1;
    if (aOver !== bOver) return aOver - bOver;

    const aDue = a.due_date ? a.due_date.split('T')[0] : '9999-12-31';
    const bDue = b.due_date ? b.due_date.split('T')[0] : '9999-12-31';
    if (aDue !== bDue) return aDue.localeCompare(bDue);

    const aTime = a.due_time || '99:99';
    const bTime = b.due_time || '99:99';
    if (aTime !== bTime) return aTime.localeCompare(bTime);

    return (priorityRank[a.priority] ?? 1) - (priorityRank[b.priority] ?? 1);
  });
}

export const WEEKDAY_LABELS = [
  { day: 0, short: 'D', label: 'Dom' },
  { day: 1, short: 'S', label: 'Seg' },
  { day: 2, short: 'T', label: 'Ter' },
  { day: 3, short: 'Q', label: 'Qua' },
  { day: 4, short: 'Q', label: 'Qui' },
  { day: 5, short: 'S', label: 'Sex' },
  { day: 6, short: 'S', label: 'Sáb' },
];

export function getHabitTimesPerDay(habit: PersonalHabit): number {
  const n = Number(habit.times_per_day || 1);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
}

export function getHabitDateRange(habit: PersonalHabit): {
  startDate: string | null;
  endDate: string | null;
} {
  const start = habit.start_date
    ? habit.start_date.split('T')[0]
    : habit.created_at
    ? habit.created_at.split('T')[0]
    : null;

  const duration = Number(habit.duration_days || 0);
  if (duration > 0 && start) {
    return {
      startDate: start,
      endDate: addDaysToDateStr(start, duration - 1),
    };
  }
  return {
    startDate: habit.start_date ? habit.start_date.split('T')[0] : null,
    endDate: null,
  };
}

export function getHabitScheduledDays(habit: PersonalHabit): number[] {
  if (habit.frequency === 'daily') return [0, 1, 2, 3, 4, 5, 6];
  if (habit.frequency === 'weekdays') return [1, 2, 3, 4, 5];
  if (habit.frequency === 'custom') {
    return Array.isArray(habit.days_of_week) && habit.days_of_week.length > 0
      ? habit.days_of_week
      : [0, 1, 2, 3, 4, 5, 6];
  }
  return [];
}

function isDateMatchingHabitSchedule(habit: PersonalHabit, dateStr: string): boolean {
  const cleanDate = dateStr.split('T')[0];

  if (habit.frequency === 'specific_dates') {
    const dates = Array.isArray(habit.specific_dates)
      ? habit.specific_dates.map((d) => d.split('T')[0])
      : [];
    return dates.includes(cleanDate);
  }

  const { startDate, endDate } = getHabitDateRange(habit);
  if (startDate && cleanDate < startDate) return false;
  if (endDate && cleanDate > endDate) return false;

  if (habit.frequency === 'monthly_days') {
    const dayOfMonth = Number(cleanDate.split('-')[2]);
    const monthDays = Array.isArray(habit.month_days) ? habit.month_days : [];
    return monthDays.includes(dayOfMonth);
  }

  const weekday = getWeekdayFromDateStr(cleanDate);
  return getHabitScheduledDays(habit).includes(weekday);
}

export function isHabitScheduledOnDate(habit: PersonalHabit, dateStr: string): boolean {
  if (!habit.is_active) return false;
  return isDateMatchingHabitSchedule(habit, dateStr);
}

export function getHabitLogCount(
  habit: PersonalHabit,
  logs: PersonalHabitLog[],
  dateStr: string
): number {
  const cleanDate = dateStr.split('T')[0];
  const log = logs.find(
    (l) => String(l.habit_id) === String(habit.id) && l.date.split('T')[0] === cleanDate
  );
  if (!log) return 0;
  const target = getHabitTimesPerDay(habit);
  if (typeof log.count === 'number' && Number.isFinite(log.count)) {
    return Math.max(0, Math.floor(log.count));
  }
  return log.completed ? target : 0;
}

export function isHabitCompletedOnDate(
  habit: PersonalHabit,
  logs: PersonalHabitLog[],
  dateStr: string
): boolean {
  return getHabitLogCount(habit, logs, dateStr) >= getHabitTimesPerDay(habit);
}

export function formatHabitFrequencySummary(habit: PersonalHabit): string {
  const parts: string[] = [];
  if (habit.frequency === 'daily') {
    parts.push('Todos os dias');
  } else if (habit.frequency === 'weekdays') {
    parts.push('Seg a Sex');
  } else if (habit.frequency === 'custom') {
    const days = getHabitScheduledDays(habit);
    parts.push(days.map((d) => WEEKDAY_LABELS[d]?.label).filter(Boolean).join(', '));
  } else if (habit.frequency === 'monthly_days') {
    const md = Array.isArray(habit.month_days) ? [...habit.month_days].sort((a, b) => a - b) : [];
    parts.push(md.length > 0 ? `Dias ${md.join(', ')} do mês` : 'Dias do mês');
  } else if (habit.frequency === 'specific_dates') {
    const sd = Array.isArray(habit.specific_dates) ? [...habit.specific_dates].sort() : [];
    if (sd.length === 0) parts.push('Datas específicas');
    else if (sd.length <= 3) parts.push(sd.map((d) => formatShortPtBrDate(d)).join(', '));
    else parts.push(`${sd.length} datas específicas`);
  }

  const times = getHabitTimesPerDay(habit);
  if (times > 1) {
    parts.push(`${times}x/dia`);
  }

  const dur = Number(habit.duration_days || 0);
  if (dur > 0 && habit.frequency !== 'specific_dates') {
    const { endDate } = getHabitDateRange(habit);
    parts.push(endDate ? `${dur} dias (até ${formatShortPtBrDate(endDate)})` : `${dur} dias`);
  }

  return parts.join(' · ');
}

/**
 * Calculates consecutive scheduled-day streak up to `todayStr`.
 * Unscheduled days do NOT break the streak and do NOT artificially increment it.
 * If today is scheduled and not yet completed, the streak counts consecutive completed scheduled days leading up to today.
 */
export function calculateHabitStreak(
  habit: PersonalHabit,
  logs: PersonalHabitLog[],
  todayStr: string = getLocalTodayDateStr()
): number {
  const targetCount = getHabitTimesPerDay(habit);
  const completedDates = new Set(
    logs
      .filter((l) => {
        if (String(l.habit_id) !== String(habit.id)) return false;
        const c =
          typeof l.count === 'number' && Number.isFinite(l.count)
            ? l.count
            : l.completed
            ? targetCount
            : 0;
        return c >= targetCount;
      })
      .map((l) => l.date.split('T')[0])
  );

  let streak = 0;
  let cursor = todayStr;
  const { startDate } = getHabitDateRange(habit);
  const createdStr = startDate || (habit.created_at ? habit.created_at.split('T')[0] : null);

  for (let i = 0; i < 365; i++) {
    if (createdStr && cursor < createdStr && !completedDates.has(cursor)) {
      break;
    }

    if (isDateMatchingHabitSchedule(habit, cursor)) {
      if (completedDates.has(cursor)) {
        streak += 1;
      } else {
        if (i === 0) {
          cursor = addDaysToDateStr(cursor, -1);
          continue;
        }
        break;
      }
    }
    cursor = addDaysToDateStr(cursor, -1);
  }

  return streak;
}

export const DAILY_MOOD_OPTIONS: Array<{
  id: DailyMood;
  label: string;
  description: string;
  toneClass: string;
}> = [
  { id: 'otimo', label: 'Ótimo', description: 'Leve e produtivo', toneClass: 'text-emerald-600 dark:text-emerald-400' },
  { id: 'bom', label: 'Bom', description: 'Ritmo estável', toneClass: 'text-sky-600 dark:text-sky-400' },
  { id: 'neutro', label: 'Neutro', description: 'Dia comum', toneClass: 'text-zinc-600 dark:text-zinc-300' },
  { id: 'cansado', label: 'Cansado', description: 'Energia reduzida', toneClass: 'text-amber-600 dark:text-amber-400' },
  { id: 'dificil', label: 'Difícil', description: 'Dia exigente', toneClass: 'text-rose-600 dark:text-rose-400' },
];

export function getMoodMeta(mood?: DailyMood) {
  return DAILY_MOOD_OPTIONS.find((m) => m.id === mood) || DAILY_MOOD_OPTIONS[2];
}

export function sortDailyCheckinsDesc(checkins: PersonalDailyCheckin[]): PersonalDailyCheckin[] {
  return [...checkins].sort((a, b) => b.date.localeCompare(a.date));
}
