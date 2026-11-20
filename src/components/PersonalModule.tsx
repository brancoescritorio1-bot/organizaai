import React, { useMemo, useState } from 'react';
import {
  Check,
  Plus,
  Minus,
  Calendar,
  Clock,
  Tag,
  Edit2,
  Trash2,
  Flame,
  ListTodo,
  StickyNote,
  AlertCircle,
  CheckCircle2,
  CalendarClock,
  LayoutGrid,
  Users,
  X,
  Power,
  HeartHandshake,
  ChevronRight,
  Search,
} from 'lucide-react';
import { cn } from '../lib/utils';
import {
  PersonalTask,
  PersonalHabit,
  PersonalHabitLog,
  PersonalDailyCheckin,
} from '../types';
import {
  TaskViewFilter,
  filterAndSortPersonalTasks,
  getLocalTodayDateStr,
  addDaysToDateStr,
  formatShortPtBrDate,
  formatLongPtBrDate,
  isTaskOverdue,
  isTaskDueToday,
  WEEKDAY_LABELS,
  getHabitTimesPerDay,
  getHabitDateRange,
  getHabitLogCount,
  isHabitCompletedOnDate,
  formatHabitFrequencySummary,
  isHabitScheduledOnDate,
  calculateHabitStreak,
  sortDailyCheckinsDesc,
  getMoodMeta,
} from '../lib/personalUtils';

interface PersonalModuleProps {
  activeTab: string;
  tasks: PersonalTask[];
  onCreateOrUpdateTask: (task: Partial<PersonalTask>) => Promise<void>;
  onToggleTask: (task: PersonalTask) => Promise<void>;
  onDeleteTask: (id: number) => Promise<void>;
  onRescheduleTask: (task: PersonalTask, newDate: string) => Promise<void>;
  habits: PersonalHabit[];
  habitLogs: PersonalHabitLog[];
  onSaveHabit: (habit: Partial<PersonalHabit>) => Promise<void>;
  onDeleteHabit: (id: string) => Promise<void>;
  onToggleHabitLog: (habitId: string, date: string, completed?: boolean, count?: number) => Promise<void>;
  checkins: PersonalDailyCheckin[];
  onDeleteCheckin?: (date: string) => Promise<void>;
}

const DEFAULT_TASK_FORM: Partial<PersonalTask> = {
  title: '',
  description: '',
  due_date: '',
  due_time: '',
  category: '',
  tags: [],
  item_type: 'task',
  priority: 'medium',
  status: 'pending',
  eisenhower_quadrant: 'not_urgent_important',
};

const DEFAULT_HABIT_FORM: Partial<PersonalHabit> = {
  name: '',
  frequency: 'daily',
  days_of_week: [0, 1, 2, 3, 4, 5, 6],
  month_days: [],
  specific_dates: [],
  times_per_day: 1,
  duration_days: null,
  start_date: '',
  target: '',
  category: '',
  is_active: true,
};

export const PersonalModule: React.FC<PersonalModuleProps> = ({
  activeTab,
  tasks,
  onCreateOrUpdateTask,
  onToggleTask,
  onDeleteTask,
  onRescheduleTask,
  habits,
  habitLogs,
  onSaveHabit,
  onDeleteHabit,
  onToggleHabitLog,
  checkins,
  onDeleteCheckin,
}) => {
  const todayStr = useMemo(() => getLocalTodayDateStr(), []);
  const tomorrowStr = useMemo(() => addDaysToDateStr(todayStr, 1), [todayStr]);

  // Task State
  const [taskView, setTaskView] = useState<TaskViewFilter>('today');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [quickTitle, setQuickTitle] = useState('');
  const [quickType, setQuickType] = useState<'task' | 'note'>('task');
  const [quickDueDate, setQuickDueDate] = useState(todayStr);
  const [quickDueTime, setQuickDueTime] = useState('');
  const [quickCategory, setQuickCategory] = useState('');
  const [quickPriority, setQuickPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [isSavingQuick, setIsSavingQuick] = useState(false);

  const [editingTaskModal, setEditingTaskModal] = useState<Partial<PersonalTask> | null>(null);
  const [tagsInput, setTagsInput] = useState('');

  // Habit State
  const [habitForm, setHabitForm] = useState<Partial<PersonalHabit>>(DEFAULT_HABIT_FORM);
  const [specificDateInput, setSpecificDateInput] = useState(todayStr);
  const [showInactiveHabits, setShowInactiveHabits] = useState(false);
  const [isSavingHabit, setIsSavingHabit] = useState(false);

  // Check-ins modal
  const [checkinsModalOpen, setCheckinsModalOpen] = useState(false);

  const taskCategories = useMemo(() => {
    const set = new Set<string>();
    tasks.forEach((t) => {
      if (t.category && t.category.trim()) set.add(t.category.trim());
    });
    return Array.from(set).sort();
  }, [tasks]);

  const taskCounts = useMemo(() => {
    const pending = tasks.filter((t) => t.status === 'pending');
    return {
      today: pending.filter((t) => t.due_date && t.due_date.split('T')[0] <= todayStr).length,
      upcoming: pending.filter((t) => t.due_date && t.due_date.split('T')[0] > todayStr).length,
      overdue: pending.filter((t) => t.due_date && t.due_date.split('T')[0] < todayStr).length,
      completed: tasks.filter((t) => t.status === 'completed').length,
      all: tasks.length,
    };
  }, [tasks, todayStr]);

  const visibleTasks = useMemo(() => {
    let list = filterAndSortPersonalTasks(tasks, taskView, todayStr);
    if (categoryFilter !== 'all') {
      list = list.filter((t) => (t.category || '') === categoryFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          (t.description || '').toLowerCase().includes(q) ||
          (t.category || '').toLowerCase().includes(q) ||
          (t.tags || []).some((tg) => tg.toLowerCase().includes(q))
      );
    }
    return list;
  }, [tasks, taskView, todayStr, categoryFilter, searchQuery]);

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = quickTitle.trim();
    if (!trimmed || isSavingQuick) return;
    setIsSavingQuick(true);
    try {
      await onCreateOrUpdateTask({
        title: trimmed,
        description: '',
        due_date: quickType === 'task' ? (quickDueDate || todayStr) : undefined,
        due_time: quickType === 'task' ? (quickDueTime || undefined) : undefined,
        category: quickCategory.trim() || undefined,
        item_type: quickType,
        priority: quickPriority,
        status: 'pending',
        eisenhower_quadrant:
          quickPriority === 'high' ? 'urgent_important' : 'not_urgent_important',
      });
      setQuickTitle('');
      setQuickDueTime('');
    } finally {
      setIsSavingQuick(false);
    }
  };

  const openTaskEditor = (task?: PersonalTask) => {
    if (task) {
      setEditingTaskModal({ ...task });
      setTagsInput((task.tags || []).join(', '));
    } else {
      setEditingTaskModal({ ...DEFAULT_TASK_FORM, due_date: todayStr });
      setTagsInput('');
    }
  };

  const handleSaveTaskModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTaskModal?.title?.trim()) return;
    const parsedTags = tagsInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    await onCreateOrUpdateTask({
      ...editingTaskModal,
      title: editingTaskModal.title.trim(),
      tags: parsedTags,
    });
    setEditingTaskModal(null);
  };

  // Habits computations
  const activeHabits = useMemo(() => habits.filter((h) => h.is_active), [habits]);
  const scheduledTodayHabits = useMemo(
    () => activeHabits.filter((h) => isHabitScheduledOnDate(h, todayStr)),
    [activeHabits, todayStr]
  );

  const todayHabitsCompletedCount = useMemo(
    () => scheduledTodayHabits.filter((h) => isHabitCompletedOnDate(h, habitLogs, todayStr)).length,
    [scheduledTodayHabits, habitLogs, todayStr]
  );

  const todayHabitsProgress =
    scheduledTodayHabits.length > 0
      ? Math.round((todayHabitsCompletedCount / scheduledTodayHabits.length) * 100)
      : 0;

  const last7Days = useMemo(() => {
    const arr: string[] = [];
    for (let i = 6; i >= 0; i--) {
      arr.push(addDaysToDateStr(todayStr, -i));
    }
    return arr;
  }, [todayStr]);

  const sortedCheckins = useMemo(() => sortDailyCheckinsDesc(checkins), [checkins]);

  const handleHabitSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!habitForm.name?.trim() || isSavingHabit) return;
    setIsSavingHabit(true);
    try {
      const freq = habitForm.frequency || 'daily';
      const days =
        freq === 'daily'
          ? [0, 1, 2, 3, 4, 5, 6]
          : freq === 'weekdays'
          ? [1, 2, 3, 4, 5]
          : freq === 'custom'
          ? habitForm.days_of_week && habitForm.days_of_week.length > 0
            ? habitForm.days_of_week
            : [1, 3, 5]
          : [];

      const monthDays: number[] =
        freq === 'monthly_days'
          ? Array.from(
              new Set<number>(
                (habitForm.month_days && habitForm.month_days.length > 0
                  ? habitForm.month_days
                  : [Number(todayStr.split('-')[2])]
                )
                  .map((d) => Number(d))
                  .filter((d) => Number.isInteger(d) && d >= 1 && d <= 31)
              )
            ).sort((a, b) => a - b)
          : [];

      const specificDates: string[] =
        freq === 'specific_dates'
          ? Array.from(
              new Set<string>(
                (habitForm.specific_dates && habitForm.specific_dates.length > 0
                  ? habitForm.specific_dates
                  : [specificDateInput || todayStr]
                )
                  .map((d) => String(d).split('T')[0])
                  .filter(Boolean)
              )
            ).sort()
          : [];

      const timesPerDay = Math.max(
        1,
        Math.min(99, Math.floor(Number(habitForm.times_per_day || 1) || 1))
      );

      const rawDuration = Number(habitForm.duration_days || 0);
      const durationDays =
        freq !== 'specific_dates' && Number.isFinite(rawDuration) && rawDuration > 0
          ? Math.floor(rawDuration)
          : null;

      const startDate =
        freq !== 'specific_dates' && durationDays
          ? (habitForm.start_date || todayStr).split('T')[0]
          : habitForm.start_date
          ? habitForm.start_date.split('T')[0]
          : null;

      await onSaveHabit({
        ...habitForm,
        name: habitForm.name.trim(),
        frequency: freq,
        days_of_week: days,
        month_days: monthDays,
        specific_dates: specificDates,
        times_per_day: timesPerDay,
        duration_days: durationDays,
        start_date: startDate,
        is_active: habitForm.is_active !== undefined ? habitForm.is_active : true,
      });
      setHabitForm(DEFAULT_HABIT_FORM);
      setSpecificDateInput(todayStr);
    } finally {
      setIsSavingHabit(false);
    }
  };

  const toggleCustomDay = (dayNum: number) => {
    const cur = habitForm.days_of_week || [];
    const exists = cur.includes(dayNum);
    const next = exists ? cur.filter((d) => d !== dayNum) : [...cur, dayNum].sort((a, b) => a - b);
    setHabitForm({ ...habitForm, frequency: 'custom', days_of_week: next });
  };

  const toggleMonthDay = (dayOfMonth: number) => {
    const cur = habitForm.month_days || [];
    const exists = cur.includes(dayOfMonth);
    const next = exists
      ? cur.filter((d) => d !== dayOfMonth)
      : [...cur, dayOfMonth].sort((a, b) => a - b);
    setHabitForm({ ...habitForm, frequency: 'monthly_days', month_days: next });
  };

  const addSpecificDate = () => {
    if (!specificDateInput) return;
    const clean = specificDateInput.split('T')[0];
    const cur = habitForm.specific_dates || [];
    if (cur.includes(clean)) return;
    setHabitForm({
      ...habitForm,
      frequency: 'specific_dates',
      specific_dates: [...cur, clean].sort(),
    });
  };

  const removeSpecificDate = (dateStr: string) => {
    const cur = habitForm.specific_dates || [];
    setHabitForm({
      ...habitForm,
      specific_dates: cur.filter((d) => d !== dateStr),
    });
  };

  return (
    <div className="space-y-6">
      {/* 1. TAREFAS TAB */}
      {activeTab === 'personal_tasks' && (
        <div className="space-y-5">
          {/* Quick Capture Bar */}
          <form
            onSubmit={handleQuickAdd}
            className="bg-white dark:bg-[#141416] border border-black/[0.06] dark:border-white/[0.08] rounded-2xl p-4 sm:p-5 shadow-xs space-y-3"
          >
            <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
              {/* Tarefa vs Nota toggle */}
              <div className="flex items-center p-1 bg-[#f5f5f7] dark:bg-white/[0.05] border border-black/[0.05] dark:border-white/[0.06] rounded-xl shrink-0">
                <button
                  type="button"
                  onClick={() => setQuickType('task')}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer',
                    quickType === 'task'
                      ? 'bg-white dark:bg-white text-[#1d1d1f] dark:text-zinc-950 font-semibold shadow-xs'
                      : 'text-[#6e6e73] dark:text-zinc-400 hover:text-[#1d1d1f] dark:hover:text-white'
                  )}
                >
                  <ListTodo size={13} />
                  Tarefa
                </button>
                <button
                  type="button"
                  onClick={() => setQuickType('note')}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer',
                    quickType === 'note'
                      ? 'bg-white dark:bg-white text-[#1d1d1f] dark:text-zinc-950 font-semibold shadow-xs'
                      : 'text-[#6e6e73] dark:text-zinc-400 hover:text-[#1d1d1f] dark:hover:text-white'
                  )}
                >
                  <StickyNote size={13} />
                  Nota
                </button>
              </div>

              <input
                type="text"
                value={quickTitle}
                onChange={(e) => setQuickTitle(e.target.value)}
                placeholder={
                  quickType === 'task'
                    ? 'Adicionar nova tarefa rapidamente...'
                    : 'Registrar uma nota ou lembrete...'
                }
                className="flex-1 px-3.5 py-2.5 bg-[#f5f5f7] dark:bg-white/[0.05] border border-black/[0.06] dark:border-white/[0.08] rounded-xl text-sm text-[#1d1d1f] dark:text-white placeholder:text-[#86868b] dark:placeholder:text-zinc-500 focus:outline-none focus:border-[#0071e3]"
              />

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="submit"
                  disabled={!quickTitle.trim() || isSavingQuick}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#0071e3] hover:bg-[#0077ed] text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-40 whitespace-nowrap"
                >
                  <Plus size={14} strokeWidth={2.5} />
                  <span>{isSavingQuick ? 'Salvando...' : 'Adicionar'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => openTaskEditor()}
                  className="px-3 py-2.5 rounded-xl bg-[#f5f5f7] dark:bg-white/[0.06] hover:bg-[#e8e8ed] dark:hover:bg-white/[0.12] text-xs font-medium text-[#1d1d1f] dark:text-zinc-200 transition-colors cursor-pointer whitespace-nowrap"
                >
                  Detalhada
                </button>
              </div>
            </div>

            {/* Metadata strip */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-black/[0.05] dark:border-white/[0.06] text-xs">
              {quickType === 'task' && (
                <>
                  <label className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#f5f5f7] dark:bg-white/[0.05] border border-black/[0.05] dark:border-white/[0.07] text-[#1d1d1f] dark:text-zinc-200">
                    <Calendar size={13} className="text-[#6e6e73] dark:text-zinc-400" />
                    <input
                      type="date"
                      value={quickDueDate}
                      onChange={(e) => setQuickDueDate(e.target.value)}
                      className="bg-transparent text-xs outline-none cursor-pointer"
                    />
                  </label>
                  <label className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#f5f5f7] dark:bg-white/[0.05] border border-black/[0.05] dark:border-white/[0.07] text-[#1d1d1f] dark:text-zinc-200">
                    <Clock size={13} className="text-[#6e6e73] dark:text-zinc-400" />
                    <input
                      type="time"
                      value={quickDueTime}
                      onChange={(e) => setQuickDueTime(e.target.value)}
                      className="bg-transparent text-xs outline-none cursor-pointer"
                    />
                  </label>
                </>
              )}
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#f5f5f7] dark:bg-white/[0.05] border border-black/[0.05] dark:border-white/[0.07] text-[#1d1d1f] dark:text-zinc-200">
                <Tag size={13} className="text-[#6e6e73] dark:text-zinc-400" />
                <input
                  type="text"
                  value={quickCategory}
                  onChange={(e) => setQuickCategory(e.target.value)}
                  placeholder="Projeto ou categoria"
                  className="bg-transparent text-xs outline-none w-32 sm:w-40 placeholder:text-[#86868b] dark:placeholder:text-zinc-500"
                />
              </div>
              <select
                value={quickPriority}
                onChange={(e) => setQuickPriority(e.target.value as 'low' | 'medium' | 'high')}
                className="px-2.5 py-1.5 rounded-lg bg-[#f5f5f7] dark:bg-white/[0.05] border border-black/[0.05] dark:border-white/[0.07] text-xs font-medium text-[#1d1d1f] dark:text-zinc-200 outline-none cursor-pointer"
              >
                <option value="high">Alta prioridade</option>
                <option value="medium">Prioridade média</option>
                <option value="low">Baixa prioridade</option>
              </select>

              {sortedCheckins.length > 0 && (
                <button
                  type="button"
                  onClick={() => setCheckinsModalOpen(true)}
                  className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#f5f5f7] dark:bg-white/[0.06] hover:bg-[#e8e8ed] dark:hover:bg-white/[0.12] text-xs font-medium text-[#1d1d1f] dark:text-zinc-200 transition-colors cursor-pointer"
                >
                  <HeartHandshake size={13} className="text-[#0071e3] dark:text-[#3898ff]" />
                  <span>Check-ins ({sortedCheckins.length})</span>
                </button>
              )}
            </div>
          </form>

          {/* Filter Views + Search */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex items-center gap-1 p-1 bg-white dark:bg-[#141416] border border-black/[0.06] dark:border-white/[0.08] rounded-xl overflow-x-auto scrollbar-hide tabular-nums">
              {(
                [
                  { id: 'today', label: `Hoje (${taskCounts.today})` },
                  { id: 'upcoming', label: `Próximas (${taskCounts.upcoming})` },
                  { id: 'overdue', label: `Atrasadas (${taskCounts.overdue})` },
                  { id: 'completed', label: `Concluídas (${taskCounts.completed})` },
                  { id: 'all', label: `Todas (${taskCounts.all})` },
                ] as Array<{ id: TaskViewFilter; label: string }>
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setTaskView(tab.id)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap',
                    taskView === tab.id
                      ? 'bg-[#1d1d1f] dark:bg-white text-white dark:text-zinc-950 font-semibold shadow-xs'
                      : 'text-[#6e6e73] dark:text-zinc-400 hover:text-[#1d1d1f] dark:hover:text-white'
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              {taskCategories.length > 0 && (
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="px-3 py-2 bg-white dark:bg-[#141416] border border-black/[0.06] dark:border-white/[0.08] rounded-xl text-xs font-medium text-[#1d1d1f] dark:text-zinc-200 outline-none cursor-pointer"
                >
                  <option value="all">Todas categorias</option>
                  {taskCategories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              )}
              <div className="relative flex-1 sm:w-56">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#86868b] dark:text-zinc-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar tarefa..."
                  className="w-full pl-8 pr-3 py-2 bg-white dark:bg-[#141416] border border-black/[0.06] dark:border-white/[0.08] rounded-xl text-xs text-[#1d1d1f] dark:text-zinc-100 placeholder:text-[#86868b] dark:placeholder:text-zinc-500 focus:outline-none focus:border-[#0071e3]"
                />
              </div>
            </div>
          </div>

          {/* Task List */}
          <div className="bg-white dark:bg-[#141416] border border-black/[0.06] dark:border-white/[0.08] rounded-2xl shadow-xs divide-y divide-black/[0.05] dark:divide-white/[0.06]">
            {visibleTasks.length > 0 ? (
              visibleTasks.map((task) => {
                const overdue = isTaskOverdue(task, todayStr);
                const dueToday = isTaskDueToday(task, todayStr);
                const isCompleted = task.status === 'completed';

                return (
                  <div
                    key={task.id}
                    className={cn(
                      'group flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 transition-colors',
                      isCompleted && 'opacity-65'
                    )}
                  >
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={() => onToggleTask(task)}
                        aria-label={isCompleted ? `Reabrir ${task.title}` : `Concluir ${task.title}`}
                        className={cn(
                          'mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center transition-all cursor-pointer shrink-0',
                          isCompleted
                            ? 'bg-[#0071e3] border-[#0071e3] text-white'
                            : 'border-black/25 dark:border-white/25 hover:border-[#0071e3] text-transparent hover:text-[#0071e3]'
                        )}
                      >
                        <Check size={12} strokeWidth={2.8} />
                      </button>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={cn(
                              'text-sm font-medium text-[#1d1d1f] dark:text-zinc-100 break-words',
                              isCompleted && 'line-through text-[#86868b] dark:text-zinc-500'
                            )}
                          >
                            {task.title}
                          </span>
                          {task.item_type === 'note' && (
                            <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400">
                              Nota
                            </span>
                          )}
                          {task.priority === 'high' && !isCompleted && (
                            <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                              Alta
                            </span>
                          )}
                        </div>

                        {task.description && (
                          <p className="text-xs text-[#6e6e73] dark:text-zinc-400 mt-0.5 line-clamp-2">
                            {task.description}
                          </p>
                        )}

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-[11px] text-[#6e6e73] dark:text-zinc-400 tabular-nums">
                          {task.due_date && (
                            <span
                              className={cn(
                                'inline-flex items-center gap-1 font-medium',
                                overdue
                                  ? 'text-rose-600 dark:text-rose-400'
                                  : dueToday
                                  ? 'text-[#0071e3] dark:text-[#3898ff]'
                                  : 'text-[#6e6e73] dark:text-zinc-400'
                              )}
                            >
                              <Calendar size={11} />
                              {overdue
                                ? `Atrasada (${formatShortPtBrDate(task.due_date)})`
                                : dueToday
                                ? 'Hoje'
                                : formatShortPtBrDate(task.due_date)}
                            </span>
                          )}
                          {task.due_time && (
                            <span className="inline-flex items-center gap-1">
                              <Clock size={11} />
                              {task.due_time}
                            </span>
                          )}
                          {task.category && (
                            <span className="inline-flex items-center gap-1 text-[#515154] dark:text-zinc-300">
                              <Tag size={11} />
                              {task.category}
                            </span>
                          )}
                          {Array.isArray(task.tags) &&
                            task.tags.map((tg, i) => (
                              <span key={i} className="text-[#86868b] dark:text-zinc-500">
                                #{tg}
                              </span>
                            ))}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                      {!isCompleted && overdue && (
                        <button
                          type="button"
                          onClick={() => onRescheduleTask(task, todayStr)}
                          title="Mover para hoje"
                          className="px-2.5 py-1.5 rounded-lg bg-[#f5f5f7] dark:bg-white/[0.06] hover:bg-[#e8e8ed] dark:hover:bg-white/[0.12] text-[11px] font-medium text-[#1d1d1f] dark:text-zinc-200 transition-colors cursor-pointer"
                        >
                          Hoje
                        </button>
                      )}
                      {!isCompleted && (
                        <button
                          type="button"
                          onClick={() => onRescheduleTask(task, tomorrowStr)}
                          title="Adiar para amanhã"
                          className="px-2.5 py-1.5 rounded-lg bg-[#f5f5f7] dark:bg-white/[0.06] hover:bg-[#e8e8ed] dark:hover:bg-white/[0.12] text-[11px] font-medium text-[#6e6e73] dark:text-zinc-300 transition-colors cursor-pointer inline-flex items-center gap-1"
                        >
                          <CalendarClock size={12} />
                          <span className="hidden md:inline">Amanhã</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => openTaskEditor(task)}
                        title="Editar"
                        className="p-2 rounded-lg text-[#6e6e73] dark:text-zinc-400 hover:text-[#1d1d1f] dark:hover:text-white hover:bg-[#f5f5f7] dark:hover:bg-white/[0.08] transition-colors cursor-pointer"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteTask(task.id)}
                        title="Excluir"
                        className="p-2 rounded-lg text-[#6e6e73] dark:text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors cursor-pointer"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-12 px-4 text-center space-y-2">
                <CheckCircle2 size={28} className="mx-auto text-emerald-500 opacity-80" />
                <p className="text-sm font-semibold text-[#1d1d1f] dark:text-zinc-100">
                  Nenhuma tarefa encontrada nesta visão
                </p>
                <p className="text-xs text-[#6e6e73] dark:text-zinc-400">
                  Use o campo rápido acima para adicionar uma tarefa ou altere os filtros.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. HÁBITOS TAB */}
      {activeTab === 'personal_habits' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Form + Progress Summary */}
          <div className="lg:col-span-4 space-y-5">
            <div className="bg-white dark:bg-[#141416] border border-black/[0.06] dark:border-white/[0.08] rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[#86868b] dark:text-zinc-400">
                    Progresso de Hoje
                  </p>
                  <h3 className="text-2xl font-bold text-[#1d1d1f] dark:text-white mt-0.5 tabular-nums">
                    {todayHabitsCompletedCount}/{scheduledTodayHabits.length}
                  </h3>
                </div>
                <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <Flame size={20} />
                </div>
              </div>
              <div className="w-full h-2 bg-[#f5f5f7] dark:bg-white/[0.06] rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                  style={{ width: `${todayHabitsProgress}%` }}
                />
              </div>
              <p className="text-xs text-[#6e6e73] dark:text-zinc-400 tabular-nums">
                {scheduledTodayHabits.length > 0
                  ? `${todayHabitsProgress}% dos hábitos previstos para hoje concluídos`
                  : 'Nenhum hábito ativo programado para hoje'}
              </p>
            </div>

            <form
              onSubmit={handleHabitSubmit}
              className="bg-white dark:bg-[#141416] border border-black/[0.06] dark:border-white/[0.08] rounded-2xl p-5 shadow-xs space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[#1d1d1f] dark:text-white">
                  {habitForm.id ? 'Editar Hábito' : 'Novo Hábito'}
                </h3>
                {habitForm.id && (
                  <button
                    type="button"
                    onClick={() => {
                      setHabitForm(DEFAULT_HABIT_FORM);
                      setSpecificDateInput(todayStr);
                    }}
                    className="text-xs text-[#0071e3] dark:text-[#3898ff] font-medium cursor-pointer"
                  >
                    Cancelar
                  </button>
                )}
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-[#6e6e73] dark:text-zinc-400 mb-1">
                    Nome do hábito *
                  </label>
                  <input
                    type="text"
                    required
                    value={habitForm.name || ''}
                    onChange={(e) => setHabitForm({ ...habitForm, name: e.target.value })}
                    placeholder="Ex: Beber água, Ler 20 páginas, Meditar..."
                    className="w-full px-3.5 py-2.5 bg-[#f5f5f7] dark:bg-white/[0.05] border border-black/[0.08] dark:border-white/[0.08] rounded-xl text-xs sm:text-sm text-[#1d1d1f] dark:text-white placeholder:text-[#86868b] dark:placeholder:text-zinc-500 focus:outline-none focus:border-[#0071e3]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#6e6e73] dark:text-zinc-400 mb-1">
                    Frequência
                  </label>
                  <select
                    value={habitForm.frequency || 'daily'}
                    onChange={(e) => {
                      const freq = e.target.value as PersonalHabit['frequency'];
                      const currentDayOfMonth = Number(todayStr.split('-')[2]);
                      setHabitForm({
                        ...habitForm,
                        frequency: freq,
                        days_of_week:
                          freq === 'daily'
                            ? [0, 1, 2, 3, 4, 5, 6]
                            : freq === 'weekdays'
                            ? [1, 2, 3, 4, 5]
                            : habitForm.days_of_week && habitForm.days_of_week.length > 0
                            ? habitForm.days_of_week
                            : [1, 3, 5],
                        month_days:
                          freq === 'monthly_days'
                            ? habitForm.month_days && habitForm.month_days.length > 0
                              ? habitForm.month_days
                              : [currentDayOfMonth]
                            : habitForm.month_days || [],
                        specific_dates:
                          freq === 'specific_dates'
                            ? habitForm.specific_dates && habitForm.specific_dates.length > 0
                              ? habitForm.specific_dates
                              : [todayStr]
                            : habitForm.specific_dates || [],
                      });
                    }}
                    className="w-full px-3.5 py-2.5 bg-[#f5f5f7] dark:bg-white/[0.05] border border-black/[0.08] dark:border-white/[0.08] rounded-xl text-xs sm:text-sm text-[#1d1d1f] dark:text-white focus:outline-none focus:border-[#0071e3]"
                  >
                    <option value="daily">Todos os dias</option>
                    <option value="weekdays">Segunda a Sexta</option>
                    <option value="custom">Dias específicos da semana</option>
                    <option value="monthly_days">Dias específicos do mês</option>
                    <option value="specific_dates">Datas específicas (calendário)</option>
                  </select>
                </div>

                {habitForm.frequency === 'custom' && (
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-[#6e6e73] dark:text-zinc-400">
                      Dias ativos da semana
                    </label>
                    <div className="grid grid-cols-7 gap-1">
                      {WEEKDAY_LABELS.map((wd) => {
                        const selected = (habitForm.days_of_week || []).includes(wd.day);
                        return (
                          <button
                            key={wd.day}
                            type="button"
                            onClick={() => toggleCustomDay(wd.day)}
                            title={wd.label}
                            className={cn(
                              'py-2 rounded-lg text-[11px] font-semibold transition-all cursor-pointer border',
                              selected
                                ? 'bg-[#0071e3] text-white border-[#0071e3]'
                                : 'bg-[#f5f5f7] dark:bg-white/[0.05] text-[#6e6e73] dark:text-zinc-400 border-black/[0.06] dark:border-white/[0.08]'
                            )}
                          >
                            {wd.short}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {habitForm.frequency === 'monthly_days' && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-medium text-[#6e6e73] dark:text-zinc-400">
                        Dias do mês (1 a 31)
                      </label>
                      <span className="text-[11px] text-[#0071e3] dark:text-[#3898ff] font-medium tabular-nums">
                        {(habitForm.month_days || []).length} selecionado(s)
                      </span>
                    </div>
                    <div className="grid grid-cols-7 gap-1">
                      {Array.from({ length: 31 }, (_, i) => i + 1).map((dayNum) => {
                        const selected = (habitForm.month_days || []).includes(dayNum);
                        return (
                          <button
                            key={dayNum}
                            type="button"
                            onClick={() => toggleMonthDay(dayNum)}
                            className={cn(
                              'py-1.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer border tabular-nums',
                              selected
                                ? 'bg-[#0071e3] text-white border-[#0071e3]'
                                : 'bg-[#f5f5f7] dark:bg-white/[0.05] text-[#6e6e73] dark:text-zinc-400 border-black/[0.06] dark:border-white/[0.08] hover:border-black/20 dark:hover:border-white/20'
                            )}
                          >
                            {dayNum}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {habitForm.frequency === 'specific_dates' && (
                  <div className="space-y-2">
                    <label className="block text-xs font-medium text-[#6e6e73] dark:text-zinc-400">
                      Datas programadas
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="date"
                        value={specificDateInput}
                        onChange={(e) => setSpecificDateInput(e.target.value)}
                        className="flex-1 px-3 py-2 bg-[#f5f5f7] dark:bg-white/[0.05] border border-black/[0.08] dark:border-white/[0.08] rounded-xl text-xs text-[#1d1d1f] dark:text-white focus:outline-none focus:border-[#0071e3]"
                      />
                      <button
                        type="button"
                        onClick={addSpecificDate}
                        className="px-3 py-2 rounded-xl bg-[#f5f5f7] dark:bg-white/[0.08] hover:bg-[#e8e8ed] dark:hover:bg-white/[0.14] text-xs font-semibold text-[#1d1d1f] dark:text-white transition-colors cursor-pointer shrink-0"
                      >
                        + Data
                      </button>
                    </div>
                    {(habitForm.specific_dates || []).length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {(habitForm.specific_dates || []).map((dStr) => (
                          <span
                            key={dStr}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#0071e3]/10 text-[#0071e3] dark:text-[#3898ff] border border-[#0071e3]/25 text-[11px] font-medium tabular-nums"
                          >
                            {formatShortPtBrDate(dStr)}
                            <button
                              type="button"
                              onClick={() => removeSpecificDate(dStr)}
                              className="hover:text-rose-500 cursor-pointer"
                              title="Remover data"
                            >
                              <X size={11} />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-medium text-[#6e6e73] dark:text-zinc-400 mb-1">
                      Vezes por dia
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={99}
                      value={habitForm.times_per_day ?? 1}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        setHabitForm({
                          ...habitForm,
                          times_per_day: Number.isFinite(val) && val >= 1 ? Math.min(99, val) : 1,
                        });
                      }}
                      className="w-full px-3 py-2 bg-[#f5f5f7] dark:bg-white/[0.05] border border-black/[0.08] dark:border-white/[0.08] rounded-xl text-xs text-[#1d1d1f] dark:text-white focus:outline-none focus:border-[#0071e3] tabular-nums"
                    />
                  </div>
                  {habitForm.frequency !== 'specific_dates' ? (
                    <div>
                      <label className="block text-xs font-medium text-[#6e6e73] dark:text-zinc-400 mb-1">
                        Por quantos dias
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={3650}
                        value={habitForm.duration_days ?? ''}
                        onChange={(e) => {
                          const raw = e.target.value;
                          const val = parseInt(raw, 10);
                          setHabitForm({
                            ...habitForm,
                            duration_days: raw && Number.isFinite(val) && val > 0 ? val : null,
                            start_date:
                              raw && Number.isFinite(val) && val > 0
                                ? habitForm.start_date || todayStr
                                : habitForm.start_date || '',
                          });
                        }}
                        placeholder="Contínuo"
                        className="w-full px-3 py-2 bg-[#f5f5f7] dark:bg-white/[0.05] border border-black/[0.08] dark:border-white/[0.08] rounded-xl text-xs text-[#1d1d1f] dark:text-white placeholder:text-[#86868b] dark:placeholder:text-zinc-500 focus:outline-none focus:border-[#0071e3] tabular-nums"
                      />
                    </div>
                  ) : (
                    <div className="flex flex-col justify-end">
                      <span className="px-3 py-2 rounded-xl bg-[#f5f5f7] dark:bg-white/[0.03] border border-black/[0.05] dark:border-white/[0.06] text-[11px] text-[#6e6e73] dark:text-zinc-400">
                        Definido pelas datas
                      </span>
                    </div>
                  )}
                </div>

                {habitForm.frequency !== 'specific_dates' && Number(habitForm.duration_days || 0) > 0 && (
                  <div>
                    <label className="block text-xs font-medium text-[#6e6e73] dark:text-zinc-400 mb-1">
                      Data de início da contagem ({habitForm.duration_days} dias)
                    </label>
                    <input
                      type="date"
                      value={(habitForm.start_date || todayStr).split('T')[0]}
                      onChange={(e) =>
                        setHabitForm({ ...habitForm, start_date: e.target.value || todayStr })
                      }
                      className="w-full px-3 py-2 bg-[#f5f5f7] dark:bg-white/[0.05] border border-black/[0.08] dark:border-white/[0.08] rounded-xl text-xs text-[#1d1d1f] dark:text-white focus:outline-none focus:border-[#0071e3]"
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-medium text-[#6e6e73] dark:text-zinc-400 mb-1">
                      Meta (opcional)
                    </label>
                    <input
                      type="text"
                      value={habitForm.target || ''}
                      onChange={(e) => setHabitForm({ ...habitForm, target: e.target.value })}
                      placeholder="Ex: 200ml, 30 min"
                      className="w-full px-3 py-2 bg-[#f5f5f7] dark:bg-white/[0.05] border border-black/[0.08] dark:border-white/[0.08] rounded-xl text-xs text-[#1d1d1f] dark:text-white focus:outline-none focus:border-[#0071e3]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#6e6e73] dark:text-zinc-400 mb-1">
                      Categoria
                    </label>
                    <input
                      type="text"
                      value={habitForm.category || ''}
                      onChange={(e) => setHabitForm({ ...habitForm, category: e.target.value })}
                      placeholder="Saúde, Estudo..."
                      className="w-full px-3 py-2 bg-[#f5f5f7] dark:bg-white/[0.05] border border-black/[0.08] dark:border-white/[0.08] rounded-xl text-xs text-[#1d1d1f] dark:text-white focus:outline-none focus:border-[#0071e3]"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={!habitForm.name?.trim() || isSavingHabit}
                className="w-full py-2.5 rounded-xl bg-[#0071e3] hover:bg-[#0077ed] text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-40"
              >
                {isSavingHabit ? 'Salvando...' : habitForm.id ? 'Atualizar Hábito' : 'Criar Hábito'}
              </button>
            </form>
          </div>

          {/* Right Column: Habit Cards + 7-day History */}
          <div className="lg:col-span-8 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-[#1d1d1f] dark:text-white">
                  Meus Hábitos & Consistência
                </h3>
                <p className="text-xs text-[#6e6e73] dark:text-zinc-400">
                  Sequência calculada apenas nos dias programados — folgas não quebram seu streak
                </p>
              </div>
              {habits.some((h) => !h.is_active) && (
                <button
                  type="button"
                  onClick={() => setShowInactiveHabits((v) => !v)}
                  className="text-xs font-medium text-[#0071e3] dark:text-[#3898ff] cursor-pointer"
                >
                  {showInactiveHabits ? 'Ocultar pausados' : 'Mostrar pausados'}
                </button>
              )}
            </div>

            <div className="space-y-3">
              {habits
                .filter((h) => showInactiveHabits || h.is_active)
                .map((habit) => {
                  const streak = calculateHabitStreak(habit, habitLogs, todayStr);
                  const scheduledToday = isHabitScheduledOnDate(habit, todayStr);
                  const timesPerDay = getHabitTimesPerDay(habit);
                  const todayCount = getHabitLogCount(habit, habitLogs, todayStr);
                  const completedToday = todayCount >= timesPerDay;
                  const freqLabel = formatHabitFrequencySummary(habit);
                  const { startDate, endDate } = getHabitDateRange(habit);
                  const durationStatus =
                    endDate && habit.frequency !== 'specific_dates' && todayStr > endDate
                      ? 'Período concluído'
                      : startDate && endDate && habit.frequency !== 'specific_dates' && todayStr < startDate
                      ? `Inicia em ${formatShortPtBrDate(startDate)}`
                      : null;
                  const dailyPct = Math.min(100, Math.round((todayCount / timesPerDay) * 100));

                  return (
                    <div
                      key={habit.id}
                      className={cn(
                        'bg-white dark:bg-[#141416] border border-black/[0.06] dark:border-white/[0.08] rounded-2xl p-4 sm:p-5 shadow-xs space-y-3 transition-opacity',
                        !habit.is_active && 'opacity-60'
                      )}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <button
                            type="button"
                            disabled={!habit.is_active}
                            onClick={() => {
                              const nextCount =
                                timesPerDay > 1
                                  ? todayCount >= timesPerDay
                                    ? 0
                                    : todayCount + 1
                                  : completedToday
                                  ? 0
                                  : 1;
                              onToggleHabitLog(
                                habit.id,
                                todayStr,
                                nextCount >= timesPerDay,
                                nextCount
                              );
                            }}
                            className={cn(
                              'w-9 h-9 rounded-xl border flex items-center justify-center transition-all shrink-0 cursor-pointer disabled:opacity-40 text-xs font-bold tabular-nums',
                              completedToday
                                ? 'bg-emerald-500 border-emerald-500 text-white'
                                : todayCount > 0 && timesPerDay > 1
                                ? 'bg-sky-500/15 border-sky-500/40 text-sky-600 dark:text-sky-300'
                                : scheduledToday
                                ? 'bg-[#f5f5f7] dark:bg-white/[0.05] border-black/15 dark:border-white/20 text-transparent hover:border-emerald-500 hover:text-emerald-500'
                                : 'bg-[#f5f5f7] dark:bg-white/[0.03] border-dashed border-black/15 dark:border-white/15 text-zinc-400'
                            )}
                            title={
                              timesPerDay > 1
                                ? completedToday
                                  ? 'Meta diária concluída (clique para zerar)'
                                  : `Registrar +1 (${todayCount}/${timesPerDay})`
                                : completedToday
                                ? 'Desmarcar hoje'
                                : 'Marcar como feito hoje'
                            }
                          >
                            {completedToday || timesPerDay === 1 ? (
                              <Check size={16} strokeWidth={2.8} />
                            ) : todayCount > 0 ? (
                              <span>{todayCount}</span>
                            ) : (
                              <Plus size={15} className="text-[#86868b] dark:text-zinc-400" />
                            )}
                          </button>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-sm font-semibold text-[#1d1d1f] dark:text-white truncate">
                                {habit.name}
                              </h4>
                              {habit.target && (
                                <span className="text-[11px] font-medium text-[#0071e3] dark:text-[#3898ff]">
                                  {habit.target}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-[#6e6e73] dark:text-zinc-400 mt-0.5">
                              {freqLabel}
                              {habit.category ? ` · ${habit.category}` : ''}
                              {!habit.is_active
                                ? ' · Pausado'
                                : durationStatus
                                ? ` · ${durationStatus}`
                                : !scheduledToday
                                ? ' · Folga hoje'
                                : ''}
                            </p>
                            {timesPerDay > 1 && (
                              <div className="mt-1.5 flex items-center gap-2 max-w-[220px]">
                                <div className="flex-1 h-1.5 rounded-full bg-black/[0.06] dark:bg-white/[0.08] overflow-hidden">
                                  <div
                                    className={cn(
                                      'h-full rounded-full transition-all duration-300',
                                      completedToday ? 'bg-emerald-500' : 'bg-[#0071e3]'
                                    )}
                                    style={{ width: `${dailyPct}%` }}
                                  />
                                </div>
                                <span className="text-[10px] font-semibold text-[#6e6e73] dark:text-zinc-300 tabular-nums">
                                  {todayCount}/{timesPerDay}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-2.5 shrink-0">
                          {timesPerDay > 1 && habit.is_active && (
                            <div className="inline-flex items-center gap-1 p-0.5 rounded-lg bg-[#f5f5f7] dark:bg-white/[0.06] border border-black/[0.06] dark:border-white/[0.08] tabular-nums">
                              <button
                                type="button"
                                disabled={todayCount <= 0}
                                onClick={() => {
                                  const next = Math.max(0, todayCount - 1);
                                  onToggleHabitLog(habit.id, todayStr, next >= timesPerDay, next);
                                }}
                                title="Diminuir 1"
                                className="w-6 h-6 rounded-md flex items-center justify-center text-[#6e6e73] dark:text-zinc-300 hover:bg-white dark:hover:bg-white/[0.1] disabled:opacity-35 cursor-pointer"
                              >
                                <Minus size={12} />
                              </button>
                              <span className="px-1.5 text-[11px] font-semibold text-[#1d1d1f] dark:text-white">
                                {todayCount}/{timesPerDay}
                              </span>
                              <button
                                type="button"
                                disabled={todayCount >= timesPerDay}
                                onClick={() => {
                                  const next = Math.min(timesPerDay, todayCount + 1);
                                  onToggleHabitLog(habit.id, todayStr, next >= timesPerDay, next);
                                }}
                                title="Adicionar +1"
                                className="w-6 h-6 rounded-md flex items-center justify-center text-[#0071e3] dark:text-[#3898ff] hover:bg-white dark:hover:bg-white/[0.1] disabled:opacity-35 cursor-pointer"
                              >
                                <Plus size={12} />
                              </button>
                            </div>
                          )}

                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-semibold tabular-nums">
                            <Flame size={13} />
                            <span>{streak}d</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() =>
                                onSaveHabit({ ...habit, is_active: !habit.is_active })
                              }
                              title={habit.is_active ? 'Pausar hábito' : 'Reativar hábito'}
                              className="p-2 rounded-lg text-[#6e6e73] dark:text-zinc-400 hover:text-[#1d1d1f] dark:hover:text-white hover:bg-[#f5f5f7] dark:hover:bg-white/[0.08] cursor-pointer"
                            >
                              <Power size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setHabitForm({
                                  ...habit,
                                  month_days: habit.month_days || [],
                                  specific_dates: habit.specific_dates || [],
                                  times_per_day: getHabitTimesPerDay(habit),
                                  duration_days: habit.duration_days ?? null,
                                  start_date: habit.start_date || '',
                                });
                              }}
                              title="Editar hábito"
                              className="p-2 rounded-lg text-[#6e6e73] dark:text-zinc-400 hover:text-[#1d1d1f] dark:hover:text-white hover:bg-[#f5f5f7] dark:hover:bg-white/[0.08] cursor-pointer"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeleteHabit(habit.id)}
                              title="Excluir hábito"
                              className="p-2 rounded-lg text-[#6e6e73] dark:text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 cursor-pointer"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Last 7 days toggleable strip */}
                      <div className="grid grid-cols-7 gap-1.5 pt-2 border-t border-black/[0.05] dark:border-white/[0.06]">
                        {last7Days.map((dStr) => {
                          const dayCount = getHabitLogCount(habit, habitLogs, dStr);
                          const done = dayCount >= timesPerDay;
                          const partial = !done && dayCount > 0;
                          const scheduled = isHabitScheduledOnDate(
                            { ...habit, is_active: true },
                            dStr
                          );
                          const dayLabel = WEEKDAY_LABELS[new Date(`${dStr}T12:00:00`).getDay()]?.short;
                          return (
                            <button
                              key={dStr}
                              type="button"
                              onClick={() => {
                                const nextCount =
                                  timesPerDay > 1
                                    ? dayCount >= timesPerDay
                                      ? 0
                                      : dayCount + 1
                                    : done
                                    ? 0
                                    : 1;
                                onToggleHabitLog(
                                  habit.id,
                                  dStr,
                                  nextCount >= timesPerDay,
                                  nextCount
                                );
                              }}
                              className={cn(
                                'py-1.5 rounded-lg text-[10px] font-medium flex flex-col items-center justify-center gap-0.5 border transition-colors cursor-pointer tabular-nums',
                                done
                                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-700 dark:text-emerald-300 font-semibold'
                                  : partial
                                  ? 'bg-sky-500/15 border-sky-500/40 text-sky-700 dark:text-sky-300 font-semibold'
                                  : scheduled
                                  ? 'bg-[#f5f5f7] dark:bg-white/[0.04] border-black/[0.05] dark:border-white/[0.06] text-[#6e6e73] dark:text-zinc-400 hover:border-black/20 dark:hover:border-white/20'
                                  : 'bg-transparent border-dashed border-black/[0.06] dark:border-white/[0.06] text-[#86868b] dark:text-zinc-500'
                              )}
                              title={`${formatShortPtBrDate(dStr)} (${scheduled ? 'Programado' : 'Dia livre'})${timesPerDay > 1 ? ` · ${dayCount}/${timesPerDay}` : ''}`}
                            >
                              <span>{dayLabel}</span>
                              <span>
                                {timesPerDay > 1 && dayCount > 0
                                  ? `${dayCount}/${timesPerDay}`
                                  : dStr.slice(8, 10)}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

              {habits.length === 0 && (
                <div className="bg-white dark:bg-[#141416] border border-black/[0.06] dark:border-white/[0.08] rounded-2xl p-10 text-center space-y-2">
                  <Flame size={28} className="mx-auto text-[#86868b] dark:text-zinc-500 opacity-70" />
                  <p className="text-sm font-semibold text-[#1d1d1f] dark:text-white">
                    Nenhum hábito cadastrado ainda
                  </p>
                  <p className="text-xs text-[#6e6e73] dark:text-zinc-400">
                    Crie hábitos diários ou com dias específicos ao lado para acompanhar na Home e aqui.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3. MATRIZ DE EISENHOWER TAB */}
      {activeTab === 'personal_eisenhower' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {[
            {
              key: 'urgent_important',
              title: 'Fazer Agora (Urgente e Importante)',
              icon: AlertCircle,
              hdrClass: 'bg-rose-50/90 dark:bg-rose-500/10 border-rose-200/70 dark:border-rose-500/20 text-rose-900 dark:text-rose-200',
              iconClass: 'text-rose-600 dark:text-rose-400',
              empty: 'Nada para fazer agora.',
            },
            {
              key: 'not_urgent_important',
              title: 'Agendar (Importante, não Urgente)',
              icon: Calendar,
              hdrClass: 'bg-sky-50/90 dark:bg-sky-500/10 border-sky-200/70 dark:border-sky-500/20 text-sky-900 dark:text-sky-200',
              iconClass: 'text-sky-600 dark:text-sky-400',
              empty: 'Nada agendado neste quadrante.',
            },
            {
              key: 'urgent_not_important',
              title: 'Delegar (Urgente, não Importante)',
              icon: Users,
              hdrClass: 'bg-amber-50/90 dark:bg-amber-500/10 border-amber-200/70 dark:border-amber-500/20 text-amber-900 dark:text-amber-200',
              iconClass: 'text-amber-600 dark:text-amber-400',
              empty: 'Nada para delegar.',
            },
            {
              key: 'not_urgent_not_important',
              title: 'Eliminar (Não Urgente e não Importante)',
              icon: LayoutGrid,
              hdrClass: 'bg-slate-100/90 dark:bg-white/[0.04] border-black/[0.06] dark:border-white/[0.08] text-[#1d1d1f] dark:text-zinc-200',
              iconClass: 'text-[#6e6e73] dark:text-zinc-400',
              empty: 'Quadrante limpo.',
            },
          ].map((quad) => {
            const Icon = quad.icon;
            const qTasks = tasks.filter(
              (t) => t.eisenhower_quadrant === quad.key && t.status === 'pending'
            );
            return (
              <div
                key={quad.key}
                className="bg-white dark:bg-[#141416] rounded-2xl border border-black/[0.06] dark:border-white/[0.08] shadow-xs overflow-hidden"
              >
                <div className={cn('px-4 py-3.5 border-b flex items-center justify-between', quad.hdrClass)}>
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    <Icon size={16} className={quad.iconClass} />
                    {quad.title}
                  </h3>
                  <span className="text-xs font-bold tabular-nums opacity-80">{qTasks.length}</span>
                </div>
                <div className="p-4 space-y-2.5 max-h-[380px] overflow-y-auto">
                  {qTasks.length > 0 ? (
                    qTasks.map((task) => (
                      <div
                        key={task.id}
                        className="p-3 rounded-xl bg-[#f5f5f7]/70 dark:bg-white/[0.03] border border-black/[0.05] dark:border-white/[0.07] flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-[#1d1d1f] dark:text-zinc-100 truncate">
                            {task.title}
                          </p>
                          {(task.due_date || task.category) && (
                            <p className="text-[11px] text-[#6e6e73] dark:text-zinc-400 mt-0.5 tabular-nums">
                              {task.due_date ? formatShortPtBrDate(task.due_date) : ''}
                              {task.due_date && task.category ? ' · ' : ''}
                              {task.category || ''}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => onToggleTask(task)}
                            title="Concluir"
                            className="p-1.5 rounded-lg border border-black/[0.08] dark:border-white/[0.1] bg-white dark:bg-white/[0.05] text-[#6e6e73] dark:text-zinc-300 hover:text-emerald-600 cursor-pointer"
                          >
                            <Check size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => openTaskEditor(task)}
                            title="Editar"
                            className="p-1.5 rounded-lg border border-black/[0.08] dark:border-white/[0.1] bg-white dark:bg-white/[0.05] text-[#6e6e73] dark:text-zinc-300 hover:text-[#0071e3] cursor-pointer"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteTask(task.id)}
                            title="Excluir"
                            className="p-1.5 rounded-lg border border-black/[0.08] dark:border-white/[0.1] bg-white dark:bg-white/[0.05] text-[#6e6e73] dark:text-zinc-300 hover:text-rose-600 cursor-pointer"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-center py-6 text-xs text-[#86868b] dark:text-zinc-500">
                      {quad.empty}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detailed Task Editor Modal */}
      {editingTaskModal && (
        <div
          className="fixed inset-0 z-50 bg-black/45 dark:bg-black/65 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setEditingTaskModal(null)}
        >
          <form
            onSubmit={handleSaveTaskModal}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg bg-white dark:bg-[#161618] border border-black/[0.08] dark:border-white/[0.12] rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 text-[#1d1d1f] dark:text-zinc-100 max-h-[88vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-black/[0.06] dark:border-white/[0.08] pb-3">
              <h3 className="text-base font-semibold">
                {editingTaskModal.id ? 'Editar Tarefa' : 'Nova Tarefa Detalhada'}
              </h3>
              <button
                type="button"
                onClick={() => setEditingTaskModal(null)}
                className="w-8 h-8 rounded-xl bg-[#f5f5f7] dark:bg-white/[0.06] flex items-center justify-center text-[#6e6e73] dark:text-zinc-300 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-[#6e6e73] dark:text-zinc-400 mb-1">
                  Título *
                </label>
                <input
                  type="text"
                  required
                  value={editingTaskModal.title || ''}
                  onChange={(e) => setEditingTaskModal({ ...editingTaskModal, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[#f5f5f7] dark:bg-white/[0.05] border border-black/[0.08] dark:border-white/[0.08] rounded-xl text-sm outline-none focus:border-[#0071e3]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#6e6e73] dark:text-zinc-400 mb-1">
                  Descrição / Observação
                </label>
                <textarea
                  rows={3}
                  value={editingTaskModal.description || ''}
                  onChange={(e) =>
                    setEditingTaskModal({ ...editingTaskModal, description: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 bg-[#f5f5f7] dark:bg-white/[0.05] border border-black/[0.08] dark:border-white/[0.08] rounded-xl text-xs sm:text-sm outline-none focus:border-[#0071e3]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#6e6e73] dark:text-zinc-400 mb-1">
                    Data prevista
                  </label>
                  <input
                    type="date"
                    value={editingTaskModal.due_date || ''}
                    onChange={(e) =>
                      setEditingTaskModal({ ...editingTaskModal, due_date: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-[#f5f5f7] dark:bg-white/[0.05] border border-black/[0.08] dark:border-white/[0.08] rounded-xl text-xs outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#6e6e73] dark:text-zinc-400 mb-1">
                    Horário (opcional)
                  </label>
                  <input
                    type="time"
                    value={editingTaskModal.due_time || ''}
                    onChange={(e) =>
                      setEditingTaskModal({ ...editingTaskModal, due_time: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-[#f5f5f7] dark:bg-white/[0.05] border border-black/[0.08] dark:border-white/[0.08] rounded-xl text-xs outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#6e6e73] dark:text-zinc-400 mb-1">
                    Categoria / Projeto
                  </label>
                  <input
                    type="text"
                    value={editingTaskModal.category || ''}
                    onChange={(e) =>
                      setEditingTaskModal({ ...editingTaskModal, category: e.target.value })
                    }
                    placeholder="Ex: Casa, Estudos..."
                    className="w-full px-3 py-2 bg-[#f5f5f7] dark:bg-white/[0.05] border border-black/[0.08] dark:border-white/[0.08] rounded-xl text-xs outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#6e6e73] dark:text-zinc-400 mb-1">
                    Tags (separadas por vírgula)
                  </label>
                  <input
                    type="text"
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    placeholder="foco, rápido"
                    className="w-full px-3 py-2 bg-[#f5f5f7] dark:bg-white/[0.05] border border-black/[0.08] dark:border-white/[0.08] rounded-xl text-xs outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#6e6e73] dark:text-zinc-400 mb-1">
                    Prioridade
                  </label>
                  <select
                    value={editingTaskModal.priority || 'medium'}
                    onChange={(e) =>
                      setEditingTaskModal({
                        ...editingTaskModal,
                        priority: e.target.value as 'low' | 'medium' | 'high',
                      })
                    }
                    className="w-full px-3 py-2 bg-[#f5f5f7] dark:bg-white/[0.05] border border-black/[0.08] dark:border-white/[0.08] rounded-xl text-xs outline-none"
                  >
                    <option value="high">Alta</option>
                    <option value="medium">Média</option>
                    <option value="low">Baixa</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#6e6e73] dark:text-zinc-400 mb-1">
                    Quadrante Eisenhower
                  </label>
                  <select
                    value={editingTaskModal.eisenhower_quadrant || 'not_urgent_important'}
                    onChange={(e) =>
                      setEditingTaskModal({
                        ...editingTaskModal,
                        eisenhower_quadrant: e.target.value as PersonalTask['eisenhower_quadrant'],
                      })
                    }
                    className="w-full px-3 py-2 bg-[#f5f5f7] dark:bg-white/[0.05] border border-black/[0.08] dark:border-white/[0.08] rounded-xl text-xs outline-none"
                  >
                    <option value="urgent_important">Fazer Agora</option>
                    <option value="not_urgent_important">Agendar</option>
                    <option value="urgent_not_important">Delegar</option>
                    <option value="not_urgent_not_important">Eliminar</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-black/[0.06] dark:border-white/[0.08]">
              <button
                type="button"
                onClick={() => setEditingTaskModal(null)}
                className="px-4 py-2 rounded-xl bg-[#f5f5f7] dark:bg-white/[0.06] text-xs font-medium cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-[#0071e3] text-white text-xs font-semibold hover:bg-[#0077ed] cursor-pointer"
              >
                Salvar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Check-in History Modal */}
      {checkinsModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/45 dark:bg-black/65 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setCheckinsModalOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg bg-white dark:bg-[#161618] border border-black/[0.08] dark:border-white/[0.12] rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 text-[#1d1d1f] dark:text-zinc-100 max-h-[82vh] flex flex-col"
          >
            <div className="flex items-center justify-between border-b border-black/[0.06] dark:border-white/[0.08] pb-3">
              <div>
                <h3 className="text-base font-semibold">Histórico — Como foi hoje?</h3>
                <p className="text-xs text-[#6e6e73] dark:text-zinc-400">
                  Apenas dias em que você escolheu registrar
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCheckinsModalOpen(false)}
                className="w-8 h-8 rounded-xl bg-[#f5f5f7] dark:bg-white/[0.06] flex items-center justify-center cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="overflow-y-auto space-y-2.5 pr-1">
              {sortedCheckins.map((c) => {
                const moodMeta = getMoodMeta(c.mood);
                return (
                  <div
                    key={c.date}
                    className="p-3.5 rounded-2xl bg-[#f5f5f7]/70 dark:bg-white/[0.04] border border-black/[0.05] dark:border-white/[0.07] space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-semibold">{formatLongPtBrDate(c.date)}</span>
                        <span className={cn('font-semibold', moodMeta.toneClass)}>
                          · {moodMeta.label}
                        </span>
                        <span className="text-[#6e6e73] dark:text-zinc-400 tabular-nums">
                          · Energia {c.energy}/5
                        </span>
                      </div>
                      {onDeleteCheckin && (
                        <button
                          type="button"
                          onClick={() => onDeleteCheckin(c.date)}
                          className="p-1 text-[#86868b] hover:text-rose-600 cursor-pointer"
                          title="Remover registro"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                    {c.note && (
                      <p className="text-xs text-[#515154] dark:text-zinc-300 leading-relaxed">
                        {c.note}
                      </p>
                    )}
                  </div>
                );
              })}
              {sortedCheckins.length === 0 && (
                <p className="text-center py-8 text-xs text-[#86868b] dark:text-zinc-500">
                  Nenhum registro salvo ainda.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
