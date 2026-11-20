import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  CheckSquare,
  Calendar,
  ChevronRight,
  Clock,
  CheckCircle2,
  ArrowRight,
  LayoutGrid,
  Wallet,
  Trees,
  GraduationCap,
  Briefcase,
  Plus,
  Minus,
  StickyNote,
  Image as ImageIcon,
  Upload,
  RotateCcw,
  X,
  Trash2,
  AlertCircle,
  ArrowUpRight,
  Check,
  Sparkles,
  Flame,
  Sun,
  Moon,
  HeartHandshake,
  BatteryCharging,
  History,
  Tag,
} from 'lucide-react';
import { cn } from '../lib/utils';
import {
  PersonalTask,
  PersonalHabit,
  PersonalHabitLog,
  PersonalDailyCheckin,
  DailyMood,
  FinancialTransaction,
  ChacaraBill,
  DashboardData,
  ClientInstallment,
} from '../types';
import { useTheme } from './ThemeContext';
import {
  getLocalTodayDateStr,
  formatShortPtBrDate,
  isHabitScheduledOnDate,
  calculateHabitStreak,
  getHabitTimesPerDay,
  getHabitLogCount,
  isHabitCompletedOnDate,
  formatHabitFrequencySummary,
  DAILY_MOOD_OPTIONS,
  getMoodMeta,
  sortDailyCheckinsDesc,
  filterAndSortPersonalTasks,
} from '../lib/personalUtils';

import coverMountains from '../assets/images/home_cover_mountains_1795197621990.jpg';
import coverArchitecture from '../assets/images/home_cover_architecture_1795197621709.jpg';
import coverOcean from '../assets/images/home_cover_ocean_1795197620964.jpg';

export interface QuickNoteItem {
  id: string;
  text: string;
  createdAt: string;
}

interface HomePageProps {
  onNavigate: (
    module: 'academic' | 'financial' | 'chacara' | 'work' | 'personal',
    tab?: string,
    filterParams?: any
  ) => void;
  personalTasks?: PersonalTask[];
  onTogglePersonalTask?: (task: PersonalTask) => void;
  onQuickAddTask?: (task: {
    title: string;
    due_date?: string;
    due_time?: string;
    category?: string;
    item_type?: 'task' | 'note';
    priority: 'low' | 'medium' | 'high';
  }) => Promise<void>;
  habits?: PersonalHabit[];
  habitLogs?: PersonalHabitLog[];
  onToggleHabitLog?: (
    habitId: number | string,
    dateStr: string,
    completed?: boolean,
    count?: number
  ) => Promise<void> | void;
  checkins?: PersonalDailyCheckin[];
  onSaveCheckin?: (payload: {
    date: string;
    mood: DailyMood;
    energy: number;
    note?: string;
  }) => Promise<void> | void;
  onDeleteCheckin?: (date: string) => Promise<void> | void;
  quickNotes?: QuickNoteItem[];
  onAddQuickNote?: (text: string) => void;
  onDeleteQuickNote?: (id: string) => void;
  finTransactions?: FinancialTransaction[];
  chacaraBills?: ChacaraBill[];
  academicDashboard?: DashboardData[];
  clientInstallments?: ClientInstallment[];
  escalas?: any[];
  userName?: string;
  coverModalOpen?: boolean;
  setCoverModalOpen?: (open: boolean) => void;
}

const COVER_STORAGE_KEY = 'organizaai_home_cover';

const PRESET_COVERS = [
  { id: 'mountains', label: 'Horizonte Alpino', src: coverMountains },
  { id: 'architecture', label: 'Arquitetura Noturna', src: coverArchitecture },
  { id: 'ocean', label: 'Oceano ao Anoitecer', src: coverOcean },
];

const MOTIVATIONAL_PHRASES = [
  'Clareza no essencial para avançar com tranquilidade hoje.',
  'Pequenos avanços diários constroem resultados duradouros.',
  'Organize suas prioridades e proteja o que realmente importa.',
  'Menos ruído, mais foco no próximo passo.',
  'Constância e calma transformam metas em conquistas.',
  'Cada decisão consciente abre espaço para um dia mais leve.',
  'Simplicidade e direção no controle da sua rotina.',
];

const TASK_CATEGORIES = ['Pessoal', 'Trabalho', 'Casa', 'Saúde', 'Finanças', 'Estudos'];

const formatCurrency = (val: number) =>
  `R$ ${Number(val || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const HomePage: React.FC<HomePageProps> = ({
  onNavigate,
  personalTasks = [],
  onTogglePersonalTask,
  onQuickAddTask,
  habits = [],
  habitLogs = [],
  onToggleHabitLog,
  checkins = [],
  onSaveCheckin,
  onDeleteCheckin,
  quickNotes = [],
  onAddQuickNote,
  onDeleteQuickNote,
  finTransactions = [],
  chacaraBills = [],
  academicDashboard = [],
  clientInstallments = [],
  escalas = [],
  userName = 'Lara',
  coverModalOpen: controlledCoverOpen,
  setCoverModalOpen: setControlledCoverOpen,
}) => {
  const { resolvedTheme, toggleTheme } = useTheme();
  const todayStr = useMemo(() => getLocalTodayDateStr(), []);

  const [filterView, setFilterView] = useState<'today' | 'all' | 'urgent'>('today');
  const [captureMode, setCaptureMode] = useState<'task' | 'note'>('task');
  const [captureText, setCaptureText] = useState('');
  const [captureDueDate, setCaptureDueDate] = useState(() => getLocalTodayDateStr());
  const [captureDueTime, setCaptureDueTime] = useState('');
  const [captureCategory, setCaptureCategory] = useState('Pessoal');
  const [capturePriority, setCapturePriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [isSavingCapture, setIsSavingCapture] = useState(false);

  // Check-in ("Como foi hoje?") optional state — strictly explicit user save
  const todayCheckin = useMemo(
    () => checkins.find((c) => c.date === todayStr) || null,
    [checkins, todayStr]
  );
  const [checkinMood, setCheckinMood] = useState<DailyMood | null>(todayCheckin?.mood || null);
  const [checkinEnergy, setCheckinEnergy] = useState<number>(todayCheckin?.energy || 3);
  const [checkinNote, setCheckinNote] = useState<string>(todayCheckin?.note || '');
  const [isSavingCheckin, setIsSavingCheckin] = useState(false);
  const [checkinFeedback, setCheckinFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isCheckinHistoryOpen, setIsCheckinHistoryOpen] = useState(false);

  useEffect(() => {
    if (todayCheckin) {
      setCheckinMood(todayCheckin.mood);
      setCheckinEnergy(todayCheckin.energy);
      setCheckinNote(todayCheckin.note || '');
    }
  }, [todayCheckin]);

  const [internalCoverOpen, setInternalCoverOpen] = useState(false);
  const isCoverModalOpen = controlledCoverOpen !== undefined ? controlledCoverOpen : internalCoverOpen;
  const setCoverModalOpen = setControlledCoverOpen || setInternalCoverOpen;

  const [coverSrc, setCoverSrc] = useState<string>(() => {
    try {
      return localStorage.getItem(COVER_STORAGE_KEY) || coverMountains;
    } catch {
      return coverMountains;
    }
  });
  const [coverImgError, setCoverImgError] = useState(false);
  const [customCoverUrl, setCustomCoverUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const firstName = useMemo(() => {
    const trimmed = (userName || 'Lara').trim();
    const first = trimmed.split(/\s+/)[0] || 'Lara';
    return first.charAt(0).toUpperCase() + first.slice(1);
  }, [userName]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return `Bom dia, ${firstName}`;
    if (hour >= 12 && hour < 18) return `Boa tarde, ${firstName}`;
    return `Boa noite, ${firstName}`;
  }, [firstName]);

  const phrase = useMemo(() => {
    const day = new Date().getDate();
    return MOTIVATIONAL_PHRASES[day % MOTIVATIONAL_PHRASES.length];
  }, []);

  const formattedDate = useMemo(() => {
    const now = new Date();
    const str = now.toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
    return str.charAt(0).toUpperCase() + str.slice(1);
  }, []);

  const nextWeekStr = useMemo(() => {
    const next = new Date();
    next.setDate(next.getDate() + 7);
    return getLocalTodayDateStr(next);
  }, []);

  const nextTwoWeeksStr = useMemo(() => {
    const next = new Date();
    next.setDate(next.getDate() + 14);
    return getLocalTodayDateStr(next);
  }, []);

  // Tasks breakdowns synced with personalUtils
  const pendingTasks = useMemo(
    () => personalTasks.filter((t) => t.status === 'pending'),
    [personalTasks]
  );

  const completedTasksCount = useMemo(
    () => personalTasks.filter((t) => t.status === 'completed').length,
    [personalTasks]
  );

  const overdueTasks = useMemo(
    () => filterAndSortPersonalTasks(personalTasks, 'overdue', todayStr),
    [personalTasks, todayStr]
  );

  const todayTasks = useMemo(
    () =>
      pendingTasks.filter((t) => {
        const cleanDue = t.due_date ? t.due_date.split('T')[0] : '';
        return cleanDue === todayStr;
      }),
    [pendingTasks, todayStr]
  );

  const urgentTasks = useMemo(
    () =>
      pendingTasks.filter(
        (t) => t.eisenhower_quadrant === 'urgent_important' || t.priority === 'high'
      ),
    [pendingTasks]
  );

  // Habits scheduled for today
  const todayScheduledHabits = useMemo(
    () => habits.filter((h) => isHabitScheduledOnDate(h, todayStr)),
    [habits, todayStr]
  );

  const completedHabitIdsToday = useMemo(() => {
    const set = new Set<string>();
    todayScheduledHabits.forEach((h) => {
      if (isHabitCompletedOnDate(h, habitLogs, todayStr)) {
        set.add(String(h.id));
      }
    });
    return set;
  }, [todayScheduledHabits, habitLogs, todayStr]);

  const habitsCompletedTodayCount = completedHabitIdsToday.size;

  const habitsProgressPct = useMemo(() => {
    if (todayScheduledHabits.length === 0) return 0;
    return Math.round((habitsCompletedTodayCount / todayScheduledHabits.length) * 100);
  }, [todayScheduledHabits.length, habitsCompletedTodayCount]);

  // Financial & Chácara pending obligations
  const pendingExpenses = useMemo(
    () =>
      finTransactions.filter(
        (t) => t.type === 'despesa' && t.status === 'pendente'
      ),
    [finTransactions]
  );

  const pendingExpensesTotal = useMemo(
    () => pendingExpenses.reduce((acc, t) => acc + Number(t.amount || 0), 0),
    [pendingExpenses]
  );

  const overdueFinExpenses = useMemo(
    () =>
      pendingExpenses.filter((t) => {
        const refDate = (t.due_date || t.date || '').split('T')[0];
        return Boolean(refDate && refDate < todayStr);
      }),
    [pendingExpenses, todayStr]
  );

  const openChacaraBills = useMemo(
    () =>
      chacaraBills.filter(
        (b) => b.status === 'pending' || b.status === 'partial'
      ),
    [chacaraBills]
  );

  const openChacaraTotal = useMemo(
    () =>
      openChacaraBills.reduce(
        (acc, b) => acc + Math.max(0, Number(b.total || 0) - Number(b.amount_paid || 0)),
        0
      ),
    [openChacaraBills]
  );

  const overdueChacaraBills = useMemo(
    () =>
      openChacaraBills.filter((b) => {
        const cleanDue = b.due_date ? b.due_date.split('T')[0] : '';
        return Boolean(cleanDue && cleanDue < todayStr);
      }),
    [openChacaraBills, todayStr]
  );

  // Upcoming commitments across modules
  const upcomingCommitments = useMemo(() => {
    const items: Array<{
      id: string;
      title: string;
      subtitle: string;
      date: string;
      module: 'personal' | 'work' | 'academic' | 'financial';
      tab: string;
      tag: string;
    }> = [];

    pendingTasks.forEach((task) => {
      const cleanDue = task.due_date ? task.due_date.split('T')[0] : '';
      if (cleanDue && cleanDue >= todayStr && cleanDue <= nextWeekStr) {
        items.push({
          id: `task-${task.id}`,
          title: task.title,
          subtitle:
            cleanDue === todayStr
              ? task.due_time
                ? `Hoje às ${task.due_time}`
                : 'Vence hoje'
              : task.category || 'Tarefa pessoal',
          date: cleanDue,
          module: 'personal',
          tab: 'personal_tasks',
          tag: 'Tarefa',
        });
      }
    });

    clientInstallments.forEach((inst) => {
      const cleanDue = inst.due_date ? inst.due_date.split('T')[0] : '';
      if (
        inst.status === 'pendente' &&
        cleanDue &&
        cleanDue >= todayStr &&
        cleanDue <= nextTwoWeeksStr
      ) {
        const clientName = inst.client_sales?.clients?.name || 'Cliente';
        items.push({
          id: `inst-${inst.id}`,
          title: `${clientName} · ${formatCurrency(inst.amount)}`,
          subtitle: inst.client_sales?.description || `Parcela ${inst.installment_number}`,
          date: cleanDue,
          module: 'work',
          tab: 'work_clients',
          tag: 'Cobrança',
        });
      }
    });

    academicDashboard.forEach((subj) => {
      const checkDate = (dateStr: string | undefined, label: string) => {
        if (!dateStr) return;
        const clean = dateStr.split('T')[0];
        if (clean >= todayStr && clean <= nextTwoWeeksStr) {
          items.push({
            id: `acad-${subj.id}-${label}`,
            title: `${subj.subject_name}`,
            subtitle: label,
            date: clean,
            module: 'academic',
            tab: 'activities',
            tag: 'Acadêmico',
          });
        }
      };

      if (subj.act1_status !== 'Concluída') checkDate(subj.act1_deadline, 'Prazo Atividade 1');
      if (subj.act2_status !== 'Concluída') checkDate(subj.act2_deadline, 'Prazo Atividade 2');
      checkDate(subj.exam_date, 'Data da Prova');
    });

    return items.sort((a, b) => a.date.localeCompare(b.date));
  }, [pendingTasks, clientInstallments, academicDashboard, todayStr, nextWeekStr, nextTwoWeeksStr]);

  const totalOverdueCount = overdueTasks.length + overdueFinExpenses.length + overdueChacaraBills.length;
  const totalCommitmentsCount = todayTasks.length + upcomingCommitments.length;
  const totalPendingCount = pendingTasks.length + pendingExpenses.length + openChacaraBills.length;

  // Filtered task list for HOJE
  const displayedTasks = useMemo(() => {
    if (filterView === 'today') {
      const todayAndOverdue = filterAndSortPersonalTasks(personalTasks, 'today', todayStr);
      if (todayAndOverdue.length > 0) return todayAndOverdue;
      return filterAndSortPersonalTasks(pendingTasks, 'all', todayStr).slice(0, 8);
    }
    if (filterView === 'urgent') {
      return filterAndSortPersonalTasks(urgentTasks, 'all', todayStr);
    }
    return filterAndSortPersonalTasks(pendingTasks, 'all', todayStr);
  }, [personalTasks, pendingTasks, urgentTasks, filterView, todayStr]);

  const applyCover = (src: string) => {
    setCoverImgError(false);
    setCoverSrc(src);
    try {
      localStorage.setItem(COVER_STORAGE_KEY, src);
    } catch {
      // Ignore storage quota issues gracefully
    }
  };

  const handleCoverFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        applyCover(reader.result);
        setCoverModalOpen(false);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleApplyCustomUrl = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = customCoverUrl.trim();
    if (!trimmed) return;
    applyCover(trimmed);
    setCustomCoverUrl('');
    setCoverModalOpen(false);
  };

  const handleQuickCaptureSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = captureText.trim();
    if (!trimmed || isSavingCapture) return;

    setIsSavingCapture(true);
    try {
      if (captureMode === 'task' && onQuickAddTask) {
        await onQuickAddTask({
          title: trimmed,
          due_date: captureDueDate || undefined,
          due_time: captureDueTime || undefined,
          category: captureCategory || undefined,
          item_type: 'task',
          priority: capturePriority,
        });
        setCaptureDueTime('');
      } else if (captureMode === 'note' && onAddQuickNote) {
        onAddQuickNote(trimmed);
      }
      setCaptureText('');
    } finally {
      setIsSavingCapture(false);
    }
  };

  const handleConvertNoteToTask = async (note: QuickNoteItem) => {
    if (!onQuickAddTask) return;
    await onQuickAddTask({
      title: note.text,
      due_date: todayStr,
      category: 'Pessoal',
      item_type: 'task',
      priority: 'medium',
    });
    if (onDeleteQuickNote) onDeleteQuickNote(note.id);
  };

  const handleSaveTodayCheckin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkinMood || !onSaveCheckin || isSavingCheckin) return;
    setIsSavingCheckin(true);
    setCheckinFeedback(null);
    const wasExisting = Boolean(todayCheckin);
    try {
      await onSaveCheckin({
        date: todayStr,
        mood: checkinMood,
        energy: checkinEnergy,
        note: checkinNote.trim() || undefined,
      });
      setCheckinFeedback({
        type: 'success',
        text: wasExisting ? 'Registro de hoje atualizado.' : 'Registro de hoje salvo.',
      });
      setTimeout(() => setCheckinFeedback(null), 3500);
    } catch (err: any) {
      setCheckinFeedback({
        type: 'error',
        text: err?.message || 'Não foi possível salvar o registro.',
      });
    } finally {
      setIsSavingCheckin(false);
    }
  };

  const handleClearTodayCheckin = async () => {
    if (!todayCheckin || !onDeleteCheckin) return;
    setCheckinFeedback(null);
    try {
      await onDeleteCheckin(todayStr);
      setCheckinMood(null);
      setCheckinEnergy(3);
      setCheckinNote('');
    } catch (err: any) {
      setCheckinFeedback({
        type: 'error',
        text: err?.message || 'Não foi possível remover o registro.',
      });
    }
  };

  const sortedCheckins = useMemo(() => sortDailyCheckinsDesc(checkins), [checkins]);

  return (
    <div className="min-h-screen bg-[#f5f5f7] dark:bg-[#09090b] text-[#1d1d1f] dark:text-zinc-100 pb-32 transition-colors duration-200 selection:bg-blue-500/20">
      {/* 1. HERO COVER SECTION (Large Upper Fold) */}
      <section className="relative w-full min-h-[410px] sm:min-h-[460px] lg:min-h-[500px] flex flex-col justify-between overflow-hidden">
        {!coverImgError ? (
          <img
            src={coverSrc}
            alt="Capa da página inicial"
            referrerPolicy="no-referrer"
            onError={() => setCoverImgError(true)}
            className="absolute inset-0 w-full h-full object-cover object-center scale-[1.01] select-none"
          />
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,#27272a_0%,#111114_55%,#09090b_100%)]" />
        )}

        {/* Readability Scrim blending into active Light or Dark background */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-b from-black/65 via-black/45 to-[#f5f5f7] dark:to-[#09090b]"
        />
        <div
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#f5f5f7] via-[#f5f5f7]/75 dark:from-[#09090b] dark:via-[#09090b]/80 to-transparent"
        />

        {/* Top Utility Row inside Cover */}
        <div className="relative z-10 w-full max-w-7xl mx-auto px-4 md:px-8 pt-5 sm:pt-7 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-xs text-zinc-200 font-medium tracking-tight drop-shadow-xs">
            <span className="font-semibold text-white tracking-tight">OrganizaAI</span>
            <span className="text-zinc-400">·</span>
            <span className="text-zinc-200 truncate">{formattedDate}</span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={toggleTheme}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/45 hover:bg-black/65 backdrop-blur-xl border border-white/[0.15] text-xs font-medium text-zinc-100 transition-colors cursor-pointer whitespace-nowrap"
              title={resolvedTheme === 'dark' ? 'Alternar para tema claro' : 'Alternar para tema escuro'}
            >
              {resolvedTheme === 'dark' ? (
                <>
                  <Sun size={13} className="text-amber-300" />
                  <span className="hidden sm:inline">Claro</span>
                </>
              ) : (
                <>
                  <Moon size={13} className="text-zinc-200" />
                  <span className="hidden sm:inline">Escuro</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setCoverModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/45 hover:bg-black/65 backdrop-blur-xl border border-white/[0.15] text-xs font-medium text-zinc-100 hover:text-white transition-colors cursor-pointer whitespace-nowrap"
            >
              <ImageIcon size={13} className="text-zinc-200" />
              <span>Personalizar capa</span>
            </button>
          </div>
        </div>

        {/* Center Greeting, Discreet Indicators & Quick Capture */}
        <div className="relative z-10 w-full max-w-4xl mx-auto px-4 md:px-8 pt-10 pb-8 sm:pb-10 text-center space-y-6">
          <div className="space-y-2.5">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-white drop-shadow-sm">
              {greeting}
            </h1>
            <p className="text-sm sm:text-base text-zinc-100/90 max-w-xl mx-auto font-normal leading-relaxed drop-shadow-xs">
              {phrase}
            </p>

            {/* Discreet Unboxed Indicators */}
            <div className="pt-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs sm:text-[13px] text-zinc-100/90 tabular-nums drop-shadow-xs">
              <button
                type="button"
                onClick={() => {
                  setFilterView('today');
                  document.getElementById('home-hoje-section')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="hover:text-white transition-colors cursor-pointer"
              >
                <span className={cn('font-semibold', totalOverdueCount > 0 ? 'text-rose-300' : 'text-white')}>
                  {totalOverdueCount}
                </span>{' '}
                {totalOverdueCount === 1 ? 'atrasada' : 'atrasadas'}
              </button>

              <span className="text-white/40" aria-hidden="true">·</span>

              <button
                type="button"
                onClick={() => {
                  document.getElementById('home-commitments-panel')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="hover:text-white transition-colors cursor-pointer"
              >
                <span className="font-semibold text-white">{totalCommitmentsCount}</span>{' '}
                {totalCommitmentsCount === 1 ? 'compromisso' : 'compromissos'}
              </button>

              <span className="text-white/40" aria-hidden="true">·</span>

              <button
                type="button"
                onClick={() => {
                  document.getElementById('home-pending-panel')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="hover:text-white transition-colors cursor-pointer"
              >
                <span className="font-semibold text-white">{totalPendingCount}</span>{' '}
                {totalPendingCount === 1 ? 'pendência' : 'pendências'}
              </button>
            </div>
          </div>

          {/* Central Quick Capture Input */}
          <form
            onSubmit={handleQuickCaptureSubmit}
            className="w-full max-w-2xl mx-auto bg-white/95 dark:bg-[#141416]/90 backdrop-blur-2xl border border-black/[0.08] dark:border-white/[0.14] rounded-2xl p-2 shadow-[0_20px_50px_rgba(0,0,0,0.28)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.55)] text-left"
          >
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              {/* Compact Segmented Type Toggle */}
              <div className="flex items-center p-1 bg-black/[0.05] dark:bg-white/[0.06] rounded-xl shrink-0">
                <button
                  type="button"
                  onClick={() => setCaptureMode('task')}
                  className={cn(
                    'flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap',
                    captureMode === 'task'
                      ? 'bg-[#1d1d1f] dark:bg-white text-white dark:text-zinc-950 font-semibold shadow-xs'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                  )}
                >
                  <CheckSquare size={13} />
                  <span>Tarefa</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCaptureMode('note')}
                  className={cn(
                    'flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap',
                    captureMode === 'note'
                      ? 'bg-[#1d1d1f] dark:bg-white text-white dark:text-zinc-950 font-semibold shadow-xs'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                  )}
                >
                  <StickyNote size={13} />
                  <span>Anotação</span>
                </button>
              </div>

              <input
                type="text"
                value={captureText}
                onChange={(e) => setCaptureText(e.target.value)}
                placeholder={
                  captureMode === 'task'
                    ? 'Adicionar nova tarefa para hoje...'
                    : 'Registrar anotação rápida...'
                }
                className="flex-1 bg-transparent px-3 py-2 text-sm text-[#1d1d1f] dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-400 focus:outline-none min-w-0"
              />

              <button
                type="submit"
                disabled={!captureText.trim() || isSavingCapture}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#0071e3] dark:bg-white text-white dark:text-zinc-950 hover:bg-[#0064cc] dark:hover:bg-zinc-200 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-40 shrink-0 whitespace-nowrap"
              >
                <Plus size={14} strokeWidth={2.4} />
                <span>{isSavingCapture ? 'Salvando...' : 'Adicionar'}</span>
              </button>
            </div>

            {captureMode === 'task' && (
              <div className="flex flex-wrap items-center justify-between gap-2 px-2 pt-2 mt-2 border-t border-black/[0.06] dark:border-white/[0.07] text-[11px] text-zinc-600 dark:text-zinc-400">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                  <label className="inline-flex items-center gap-1.5 cursor-pointer hover:text-zinc-900 dark:hover:text-zinc-200">
                    <Calendar size={12} className="text-zinc-400" />
                    <input
                      type="date"
                      value={captureDueDate}
                      onChange={(e) => setCaptureDueDate(e.target.value)}
                      className="bg-transparent text-zinc-700 dark:text-zinc-300 focus:outline-none cursor-pointer"
                    />
                  </label>
                  <span className="text-zinc-300 dark:text-zinc-600">·</span>
                  <label className="inline-flex items-center gap-1 cursor-pointer hover:text-zinc-900 dark:hover:text-zinc-200">
                    <Clock size={12} className="text-zinc-400" />
                    <input
                      type="time"
                      value={captureDueTime}
                      onChange={(e) => setCaptureDueTime(e.target.value)}
                      className="bg-transparent text-zinc-700 dark:text-zinc-300 focus:outline-none cursor-pointer"
                    />
                  </label>
                  <span className="text-zinc-300 dark:text-zinc-600">·</span>
                  <div className="inline-flex items-center gap-1">
                    <Tag size={11} className="text-zinc-400" />
                    <select
                      value={captureCategory}
                      onChange={(e) => setCaptureCategory(e.target.value)}
                      className="bg-transparent text-zinc-700 dark:text-zinc-300 focus:outline-none cursor-pointer"
                    >
                      {TASK_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat} className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white">
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>
                  <span className="text-zinc-300 dark:text-zinc-600">·</span>
                  <select
                    value={capturePriority}
                    onChange={(e) => setCapturePriority(e.target.value as 'low' | 'medium' | 'high')}
                    className="bg-transparent text-zinc-700 dark:text-zinc-300 focus:outline-none cursor-pointer"
                  >
                    <option value="high" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white">Alta prioridade</option>
                    <option value="medium" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white">Prioridade média</option>
                    <option value="low" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white">Baixa prioridade</option>
                  </select>
                </div>
                <span className="text-zinc-400 dark:text-zinc-500 hidden md:inline">
                  Sincronizado com Pessoal · Tarefas
                </span>
              </div>
            )}
          </form>
        </div>
      </section>

      {/* 2. HOJE WORKSPACE SECTION */}
      <div
        id="home-hoje-section"
        className="max-w-7xl mx-auto px-4 md:px-8 pt-6 sm:pt-8 space-y-6"
      >
        {/* Section Title Row */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-black/[0.08] dark:border-white/[0.08] pb-4">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.18em] uppercase text-zinc-500">
              Visão do Dia
            </p>
            <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-[#1d1d1f] dark:text-white mt-0.5">
              HOJE
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <button
              type="button"
              onClick={() => onNavigate('personal', 'personal_habits')}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-[#141416] hover:bg-zinc-100 dark:hover:bg-[#1c1c20] border border-black/[0.08] dark:border-white/[0.08] text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white transition-colors cursor-pointer whitespace-nowrap shadow-2xs"
            >
              <Flame size={13} className="text-amber-500" />
              <span>Hábitos</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('personal', 'personal_eisenhower')}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-[#141416] hover:bg-zinc-100 dark:hover:bg-[#1c1c20] border border-black/[0.08] dark:border-white/[0.08] text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white transition-colors cursor-pointer whitespace-nowrap shadow-2xs"
            >
              <LayoutGrid size={13} className="text-zinc-500 dark:text-zinc-400" />
              <span>Matriz Eisenhower</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('personal', 'personal_tasks')}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#1d1d1f] dark:bg-white/[0.09] hover:bg-black dark:hover:bg-white/[0.14] text-white dark:text-zinc-100 font-medium transition-colors cursor-pointer whitespace-nowrap"
            >
              <span>Ver todas</span>
              <ArrowRight size={13} />
            </button>
          </div>
        </div>

        {/* Multi-column HOJE Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* LEFT COLUMN (7 cols): Tarefas do Dia, Hábitos de Hoje & Pendências/Atrasos */}
          <div className="lg:col-span-7 space-y-5">
            {/* Panel A: Tarefas do Dia */}
            <div className="bg-white dark:bg-[#141416] border border-black/[0.06] dark:border-white/[0.08] rounded-2xl p-5 sm:p-6 space-y-4 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm sm:text-base font-semibold text-[#1d1d1f] dark:text-white tracking-tight flex items-center gap-2">
                    <CheckSquare size={16} className="text-[#0071e3] dark:text-zinc-300" />
                    Tarefas do Dia
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 tabular-nums">
                    {pendingTasks.length} abertas · {completedTasksCount} concluídas
                  </p>
                </div>

                {/* Segmented Filter */}
                <div className="flex items-center gap-1 p-1 bg-black/[0.04] dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/[0.06] rounded-xl text-xs tabular-nums">
                  <button
                    type="button"
                    onClick={() => setFilterView('today')}
                    className={cn(
                      'px-2.5 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap',
                      filterView === 'today'
                        ? 'bg-[#1d1d1f] dark:bg-white text-white dark:text-zinc-950 font-semibold shadow-2xs'
                        : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-200'
                    )}
                  >
                    Hoje ({todayTasks.length + overdueTasks.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterView('all')}
                    className={cn(
                      'px-2.5 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap',
                      filterView === 'all'
                        ? 'bg-[#1d1d1f] dark:bg-white text-white dark:text-zinc-950 font-semibold shadow-2xs'
                        : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-200'
                    )}
                  >
                    Todas ({pendingTasks.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterView('urgent')}
                    className={cn(
                      'px-2.5 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap',
                      filterView === 'urgent'
                        ? 'bg-[#1d1d1f] dark:bg-white text-white dark:text-zinc-950 font-semibold shadow-2xs'
                        : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-200'
                    )}
                  >
                    Urgentes ({urgentTasks.length})
                  </button>
                </div>
              </div>

              {displayedTasks.length > 0 ? (
                <div className="divide-y divide-black/[0.06] dark:divide-white/[0.06]">
                  {displayedTasks.slice(0, 8).map((task) => {
                    const cleanDue = task.due_date ? task.due_date.split('T')[0] : '';
                    const isOverdue = Boolean(cleanDue && cleanDue < todayStr);
                    const isToday = cleanDue === todayStr;
                    const isUrgent =
                      task.eisenhower_quadrant === 'urgent_important' || task.priority === 'high';

                    return (
                      <div
                        key={task.id}
                        className="group flex items-start gap-3 py-3 first:pt-1 last:pb-1 transition-colors"
                      >
                        <button
                          type="button"
                          onClick={() => onTogglePersonalTask && onTogglePersonalTask(task)}
                          className="mt-0.5 w-5 h-5 rounded-md border border-zinc-300 dark:border-white/25 hover:border-[#0071e3] dark:hover:border-white hover:bg-blue-50 dark:hover:bg-white/10 flex items-center justify-center transition-colors cursor-pointer shrink-0 text-transparent hover:text-[#0071e3] dark:hover:text-white"
                          aria-label={`Concluir ${task.title}`}
                          title="Marcar como concluída"
                        >
                          <Check size={12} strokeWidth={2.5} />
                        </button>

                        <div
                          onClick={() => onNavigate('personal', 'personal_tasks')}
                          className="flex-1 min-w-0 cursor-pointer"
                        >
                          <p className="text-sm font-medium text-[#1d1d1f] dark:text-zinc-100 group-hover:text-black dark:group-hover:text-white truncate">
                            {task.title}
                          </p>
                          <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-zinc-500 dark:text-zinc-400 tabular-nums">
                            {isOverdue && (
                              <span className="font-semibold text-rose-600 dark:text-rose-400">Atrasada</span>
                            )}
                            {isToday && (
                              <span className="font-semibold text-amber-600 dark:text-amber-400">Para hoje</span>
                            )}
                            {isUrgent && (
                              <span className="text-zinc-800 dark:text-zinc-200 font-medium">Alta prioridade</span>
                            )}
                            {task.category && (
                              <span className="text-zinc-500 dark:text-zinc-400">{task.category}</span>
                            )}
                            {cleanDue && (
                              <span className="inline-flex items-center gap-1 text-zinc-500">
                                <Clock size={10} />
                                {formatShortPtBrDate(cleanDue)}
                                {task.due_time ? ` · ${task.due_time}` : ''}
                              </span>
                            )}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => onNavigate('personal', 'personal_tasks')}
                          className="opacity-60 group-hover:opacity-100 text-zinc-400 hover:text-zinc-900 dark:text-zinc-500 dark:hover:text-white p-1 transition-opacity cursor-pointer"
                          aria-label="Abrir tarefa"
                        >
                          <ChevronRight size={15} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-8 text-center space-y-1.5 border border-dashed border-black/[0.08] dark:border-white/[0.08] rounded-xl">
                  <CheckCircle2 size={22} className="mx-auto text-emerald-500 dark:text-emerald-400" />
                  <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Tudo em ordem nesta visão</p>
                  <p className="text-xs text-zinc-500">
                    Use o campo acima para adicionar novas tarefas rapidamente.
                  </p>
                </div>
              )}
            </div>

            {/* Panel A2: Hábitos de Hoje */}
            <div className="bg-white dark:bg-[#141416] border border-black/[0.06] dark:border-white/[0.08] rounded-2xl p-5 sm:p-6 space-y-4 shadow-xs">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm sm:text-base font-semibold text-[#1d1d1f] dark:text-white tracking-tight flex items-center gap-2">
                    <Flame size={16} className="text-amber-500" />
                    Hábitos de Hoje
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 tabular-nums">
                    {todayScheduledHabits.length > 0
                      ? `${habitsCompletedTodayCount} de ${todayScheduledHabits.length} concluídos hoje (${habitsProgressPct}%)`
                      : 'Rotina diária e sequência programada'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => onNavigate('personal', 'personal_habits')}
                  className="text-xs font-medium text-[#0071e3] dark:text-zinc-300 hover:underline inline-flex items-center gap-1 cursor-pointer shrink-0 whitespace-nowrap"
                >
                  <span>Gerenciar</span>
                  <ArrowRight size={12} />
                </button>
              </div>

              {todayScheduledHabits.length > 0 ? (
                <>
                  {/* Daily Progress Bar */}
                  <div className="h-1.5 w-full rounded-full bg-black/[0.06] dark:bg-white/[0.08] overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 transition-all duration-300 rounded-full"
                      style={{ width: `${habitsProgressPct}%` }}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {todayScheduledHabits.map((habit) => {
                      const timesPerDay = getHabitTimesPerDay(habit);
                      const todayCount = getHabitLogCount(habit, habitLogs, todayStr);
                      const doneToday = todayCount >= timesPerDay;
                      const streak = calculateHabitStreak(habit, habitLogs, todayStr);
                      const pct = Math.min(100, Math.round((todayCount / timesPerDay) * 100));
                      const handleIncrement = () => {
                        if (!onToggleHabitLog) return;
                        const nextCount =
                          timesPerDay > 1
                            ? todayCount >= timesPerDay
                              ? 0
                              : todayCount + 1
                            : doneToday
                            ? 0
                            : 1;
                        onToggleHabitLog(
                          habit.id,
                          todayStr,
                          nextCount >= timesPerDay,
                          nextCount
                        );
                      };

                      return (
                        <div
                          key={habit.id}
                          role="button"
                          tabIndex={0}
                          onClick={handleIncrement}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              handleIncrement();
                            }
                          }}
                          className={cn(
                            'flex flex-col gap-2 p-3 rounded-xl border text-left transition-all cursor-pointer select-none',
                            doneToday
                              ? 'bg-emerald-50/70 dark:bg-emerald-500/[0.08] border-emerald-200 dark:border-emerald-500/30'
                              : todayCount > 0 && timesPerDay > 1
                              ? 'bg-sky-50/70 dark:bg-sky-500/[0.07] border-sky-200 dark:border-sky-500/25'
                              : 'bg-zinc-50/70 dark:bg-white/[0.03] hover:bg-zinc-100 dark:hover:bg-white/[0.06] border-black/[0.06] dark:border-white/[0.06]'
                          )}
                        >
                          <div className="flex items-center justify-between gap-2.5">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span
                                className={cn(
                                  'w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors text-[10px] font-bold tabular-nums',
                                  doneToday
                                    ? 'bg-emerald-600 border-emerald-600 text-white'
                                    : todayCount > 0 && timesPerDay > 1
                                    ? 'bg-sky-500/20 border-sky-500/40 text-sky-700 dark:text-sky-300'
                                    : 'border-zinc-300 dark:border-white/25 text-transparent'
                                )}
                              >
                                {doneToday || timesPerDay === 1 ? (
                                  <Check size={12} strokeWidth={2.5} />
                                ) : (
                                  <span>{todayCount}</span>
                                )}
                              </span>
                              <div className="min-w-0">
                                <p
                                  className={cn(
                                    'text-xs sm:text-[13px] font-medium truncate',
                                    doneToday
                                      ? 'text-emerald-900 dark:text-emerald-200 line-through opacity-80'
                                      : 'text-[#1d1d1f] dark:text-zinc-100'
                                  )}
                                >
                                  {habit.name}
                                </p>
                                <p className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate">
                                  {habit.category
                                    ? `${habit.category}${timesPerDay > 1 ? ` · ${todayCount}/${timesPerDay}` : ''}`
                                    : timesPerDay > 1
                                    ? `${todayCount}/${timesPerDay} hoje`
                                    : formatHabitFrequencySummary(habit)}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              {timesPerDay > 1 && todayCount > 0 && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (!onToggleHabitLog) return;
                                    const next = Math.max(0, todayCount - 1);
                                    onToggleHabitLog(
                                      habit.id,
                                      todayStr,
                                      next >= timesPerDay,
                                      next
                                    );
                                  }}
                                  title="Diminuir 1"
                                  className="w-5 h-5 rounded-md bg-white/80 dark:bg-white/[0.08] border border-black/[0.08] dark:border-white/[0.1] flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:bg-white dark:hover:bg-white/[0.15] cursor-pointer"
                                >
                                  <Minus size={10} />
                                </button>
                              )}
                              <span
                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400 tabular-nums shrink-0"
                                title="Sequência em dias programados"
                              >
                                <Flame size={11} />
                                {streak}d
                              </span>
                            </div>
                          </div>

                          {timesPerDay > 1 && (
                            <div className="h-1 w-full rounded-full bg-black/[0.06] dark:bg-white/[0.08] overflow-hidden">
                              <div
                                className={cn(
                                  'h-full rounded-full transition-all duration-300',
                                  doneToday ? 'bg-emerald-500' : 'bg-[#0071e3]'
                                )}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="py-5 px-4 text-center border border-dashed border-black/[0.08] dark:border-white/[0.08] rounded-xl space-y-2">
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Nenhum hábito programado para hoje. Crie hábitos com frequência diária ou personalizada.
                  </p>
                  <button
                    type="button"
                    onClick={() => onNavigate('personal', 'personal_habits')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-white/[0.07] hover:bg-zinc-200 dark:hover:bg-white/[0.12] text-xs font-medium text-zinc-800 dark:text-zinc-100 transition-colors cursor-pointer"
                  >
                    <Plus size={12} />
                    <span>Criar hábito</span>
                  </button>
                </div>
              )}
            </div>

            {/* Panel B: Pendências & Atrasos */}
            <div
              id="home-pending-panel"
              className="bg-white dark:bg-[#141416] border border-black/[0.06] dark:border-white/[0.08] rounded-2xl p-5 sm:p-6 space-y-4 shadow-xs"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm sm:text-base font-semibold text-[#1d1d1f] dark:text-white tracking-tight flex items-center gap-2">
                    <AlertCircle size={16} className="text-zinc-500 dark:text-zinc-300" />
                    Pendências e Atrasos
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    Itens em aberto que pedem atenção nos seus módulos
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 tabular-nums">
                <button
                  type="button"
                  onClick={() => onNavigate('personal', 'personal_tasks')}
                  className="text-left p-4 rounded-xl bg-zinc-50/80 dark:bg-white/[0.03] hover:bg-zinc-100 dark:hover:bg-white/[0.06] border border-black/[0.05] dark:border-white/[0.06] transition-colors cursor-pointer group"
                >
                  <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                    <span>Tarefas atrasadas</span>
                    <ArrowUpRight size={13} className="text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors" />
                  </div>
                  <p
                    className={cn(
                      'text-xl font-semibold mt-2',
                      overdueTasks.length > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-[#1d1d1f] dark:text-white'
                    )}
                  >
                    {overdueTasks.length}
                  </p>
                  <p className="text-[11px] text-zinc-500 mt-1">
                    {pendingTasks.length} pendentes no total
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => onNavigate('financial', 'fin_extract', { status: 'pendente' })}
                  className="text-left p-4 rounded-xl bg-zinc-50/80 dark:bg-white/[0.03] hover:bg-zinc-100 dark:hover:bg-white/[0.06] border border-black/[0.05] dark:border-white/[0.06] transition-colors cursor-pointer group"
                >
                  <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                    <span>Contas financeiras</span>
                    <ArrowUpRight size={13} className="text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors" />
                  </div>
                  <p className="text-xl font-semibold text-[#1d1d1f] dark:text-white mt-2">
                    {pendingExpenses.length}
                  </p>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 truncate">
                    {formatCurrency(pendingExpensesTotal)} em aberto
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => onNavigate('chacara', 'chacara_pending')}
                  className="text-left p-4 rounded-xl bg-zinc-50/80 dark:bg-white/[0.03] hover:bg-zinc-100 dark:hover:bg-white/[0.06] border border-black/[0.05] dark:border-white/[0.06] transition-colors cursor-pointer group"
                >
                  <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                    <span>Chácara pendentes</span>
                    <ArrowUpRight size={13} className="text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors" />
                  </div>
                  <p className="text-xl font-semibold text-[#1d1d1f] dark:text-white mt-2">
                    {openChacaraBills.length}
                  </p>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 truncate">
                    {formatCurrency(openChacaraTotal)} a receber
                  </p>
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN (5 cols): Como foi hoje?, Compromissos, Anotações & Resumo */}
          <div className="lg:col-span-5 space-y-5">
            {/* Panel C0: Como foi hoje? (Optional Daily Check-in) */}
            <form
              onSubmit={handleSaveTodayCheckin}
              className="bg-white dark:bg-[#141416] border border-black/[0.06] dark:border-white/[0.08] rounded-2xl p-5 sm:p-6 space-y-4 shadow-xs"
            >
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm sm:text-base font-semibold text-[#1d1d1f] dark:text-white tracking-tight flex items-center gap-2">
                    <HeartHandshake size={16} className="text-indigo-500 dark:text-indigo-400" />
                    Como foi hoje?
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    Registro rápido e opcional de humor e energia
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsCheckinHistoryOpen(true)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-zinc-100 dark:bg-white/[0.06] hover:bg-zinc-200 dark:hover:bg-white/[0.12] text-[11px] font-medium text-zinc-700 dark:text-zinc-200 transition-colors cursor-pointer shrink-0"
                >
                  <History size={12} />
                  <span>Histórico ({checkins.length})</span>
                </button>
              </div>

              {/* Mood choices */}
              <div className="grid grid-cols-5 gap-1.5">
                {DAILY_MOOD_OPTIONS.map((opt) => {
                  const selected = checkinMood === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setCheckinMood(opt.id)}
                      className={cn(
                        'py-2 px-1.5 rounded-xl border text-center transition-all cursor-pointer',
                        selected
                          ? 'bg-[#1d1d1f] dark:bg-white text-white dark:text-zinc-950 border-transparent font-semibold shadow-xs'
                          : 'bg-zinc-50 dark:bg-white/[0.03] border-black/[0.06] dark:border-white/[0.08] text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/[0.07]'
                      )}
                      title={opt.description}
                    >
                      <span className="text-[11px] block truncate">{opt.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Energy scale 1..5 */}
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-zinc-500 dark:text-zinc-400 inline-flex items-center gap-1.5">
                  <BatteryCharging size={14} className="text-emerald-500" />
                  Energia:
                </span>
                <div className="flex items-center gap-1.5 tabular-nums">
                  {[1, 2, 3, 4, 5].map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setCheckinEnergy(lvl)}
                      className={cn(
                        'w-7 h-7 rounded-lg text-xs font-semibold transition-all cursor-pointer border',
                        checkinEnergy === lvl
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-zinc-50 dark:bg-white/[0.03] text-zinc-600 dark:text-zinc-300 border-black/[0.06] dark:border-white/[0.08] hover:bg-zinc-100 dark:hover:bg-white/[0.08]'
                      )}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>

              {/* Optional note + Save */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={checkinNote}
                  onChange={(e) => setCheckinNote(e.target.value)}
                  placeholder="Observação opcional sobre o dia..."
                  className="flex-1 min-w-0 px-3 py-2 rounded-xl bg-zinc-50 dark:bg-white/[0.04] border border-black/[0.07] dark:border-white/[0.08] text-xs text-[#1d1d1f] dark:text-white placeholder:text-zinc-400 focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="submit"
                  disabled={!checkinMood || isSavingCheckin}
                  className="px-3.5 py-2 rounded-xl bg-[#0071e3] dark:bg-white text-white dark:text-zinc-950 text-xs font-semibold hover:bg-[#0064cc] dark:hover:bg-zinc-200 transition-colors cursor-pointer disabled:opacity-40 shrink-0 whitespace-nowrap"
                >
                  {isSavingCheckin ? 'Salvando...' : todayCheckin ? 'Atualizar' : 'Salvar'}
                </button>
                {todayCheckin && onDeleteCheckin && (
                  <button
                    type="button"
                    onClick={handleClearTodayCheckin}
                    title="Remover registro de hoje"
                    className="p-2 rounded-xl text-zinc-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors cursor-pointer shrink-0"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>

              {checkinFeedback && (
                <p
                  className={cn(
                    'text-[11px] font-medium px-1',
                    checkinFeedback.type === 'success'
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-rose-600 dark:text-rose-400'
                  )}
                >
                  {checkinFeedback.text}
                </p>
              )}
            </form>

            {/* Panel C: Compromissos Próximos */}
            <div
              id="home-commitments-panel"
              className="bg-white dark:bg-[#141416] border border-black/[0.06] dark:border-white/[0.08] rounded-2xl p-5 sm:p-6 space-y-4 shadow-xs"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm sm:text-base font-semibold text-[#1d1d1f] dark:text-white tracking-tight flex items-center gap-2">
                    <Calendar size={16} className="text-zinc-500 dark:text-zinc-300" />
                    Compromissos Próximos
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    Agenda de tarefas, cobranças e prazos acadêmicos
                  </p>
                </div>
                <span className="text-xs text-zinc-500 tabular-nums">
                  {upcomingCommitments.length} itens
                </span>
              </div>

              {upcomingCommitments.length > 0 ? (
                <div className="divide-y divide-black/[0.06] dark:divide-white/[0.06]">
                  {upcomingCommitments.slice(0, 6).map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onNavigate(item.module, item.tab)}
                      className="w-full py-2.5 first:pt-1 last:pb-1 flex items-center justify-between gap-3 text-left group cursor-pointer"
                    >
                      <div className="min-w-0">
                        <p className="text-xs sm:text-[13px] font-medium text-[#1d1d1f] dark:text-zinc-100 group-hover:text-black dark:group-hover:text-white truncate">
                          {item.title}
                        </p>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                          {item.tag} · {item.subtitle}
                        </p>
                      </div>
                      <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 tabular-nums shrink-0">
                        {formatShortPtBrDate(item.date)}
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="py-6 text-center border border-dashed border-black/[0.08] dark:border-white/[0.08] rounded-xl">
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Nenhum prazo próximo nos próximos 7–14 dias.
                  </p>
                </div>
              )}
            </div>

            {/* Panel D: Anotações Rápidas */}
            <div className="bg-white dark:bg-[#141416] border border-black/[0.06] dark:border-white/[0.08] rounded-2xl p-5 sm:p-6 space-y-4 shadow-xs">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm sm:text-base font-semibold text-[#1d1d1f] dark:text-white tracking-tight flex items-center gap-2">
                    <StickyNote size={16} className="text-zinc-500 dark:text-zinc-300" />
                    Anotações Rápidas
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    Capture ideias e converta em tarefas quando quiser
                  </p>
                </div>
                <span className="text-xs text-zinc-500 tabular-nums">
                  {quickNotes.length}
                </span>
              </div>

              {quickNotes.length > 0 ? (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {quickNotes.map((note) => (
                    <div
                      key={note.id}
                      className="p-3 rounded-xl bg-zinc-50/80 dark:bg-white/[0.03] border border-black/[0.05] dark:border-white/[0.06] flex items-start justify-between gap-2.5 group"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-zinc-800 dark:text-zinc-200 leading-relaxed break-words">
                          {note.text}
                        </p>
                        <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1 tabular-nums">
                          {new Date(note.createdAt).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {onQuickAddTask && (
                          <button
                            type="button"
                            onClick={() => handleConvertNoteToTask(note)}
                            title="Converter em tarefa para hoje"
                            className="px-2 py-1 rounded-lg bg-zinc-200/70 dark:bg-white/[0.06] hover:bg-zinc-300/70 dark:hover:bg-white/[0.14] text-[10px] font-medium text-zinc-800 dark:text-zinc-200 transition-colors cursor-pointer whitespace-nowrap"
                          >
                            Virar tarefa
                          </button>
                        )}
                        {onDeleteQuickNote && (
                          <button
                            type="button"
                            onClick={() => onDeleteQuickNote(note.id)}
                            aria-label="Excluir anotação"
                            className="p-1.5 rounded-lg text-zinc-400 dark:text-zinc-500 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-white/[0.05] transition-colors cursor-pointer"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-5 text-center border border-dashed border-black/[0.08] dark:border-white/[0.08] rounded-xl">
                  <p className="text-xs text-zinc-500">
                    Selecione “Anotação” no campo superior para salvar notas rápidas aqui.
                  </p>
                </div>
              )}
            </div>

            {/* Panel E: Resumo de Atividades dos Módulos */}
            <div className="bg-white dark:bg-[#141416] border border-black/[0.06] dark:border-white/[0.08] rounded-2xl p-5 sm:p-6 space-y-3.5 shadow-xs">
              <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
                Resumo dos Módulos
              </h3>

              <div className="grid grid-cols-2 gap-2.5 tabular-nums">
                <button
                  type="button"
                  onClick={() => onNavigate('financial', 'fin_dashboard')}
                  className="p-3.5 rounded-xl bg-zinc-50/80 dark:bg-white/[0.03] hover:bg-zinc-100 dark:hover:bg-white/[0.07] border border-black/[0.05] dark:border-white/[0.06] text-left transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2 text-xs text-zinc-700 dark:text-zinc-300 font-medium">
                    <Wallet size={14} className="text-zinc-500 dark:text-zinc-400" />
                    <span>Financeiro</span>
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-1.5 truncate">
                    {pendingExpenses.length} pendências
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => onNavigate('chacara', 'chacara_dashboard')}
                  className="p-3.5 rounded-xl bg-zinc-50/80 dark:bg-white/[0.03] hover:bg-zinc-100 dark:hover:bg-white/[0.07] border border-black/[0.05] dark:border-white/[0.06] text-left transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2 text-xs text-zinc-700 dark:text-zinc-300 font-medium">
                    <Trees size={14} className="text-zinc-500 dark:text-zinc-400" />
                    <span>Chácara</span>
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-1.5 truncate">
                    {openChacaraBills.length} contas abertas
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => onNavigate('academic', 'dashboard')}
                  className="p-3.5 rounded-xl bg-zinc-50/80 dark:bg-white/[0.03] hover:bg-zinc-100 dark:hover:bg-white/[0.07] border border-black/[0.05] dark:border-white/[0.06] text-left transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2 text-xs text-zinc-700 dark:text-zinc-300 font-medium">
                    <GraduationCap size={14} className="text-zinc-500 dark:text-zinc-400" />
                    <span>Acadêmico</span>
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-1.5 truncate">
                    {academicDashboard.length} matérias
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => onNavigate('work', 'work_escalas')}
                  className="p-3.5 rounded-xl bg-zinc-50/80 dark:bg-white/[0.03] hover:bg-zinc-100 dark:hover:bg-white/[0.07] border border-black/[0.05] dark:border-white/[0.06] text-left transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2 text-xs text-zinc-700 dark:text-zinc-300 font-medium">
                    <Briefcase size={14} className="text-zinc-500 dark:text-zinc-400" />
                    <span>Trabalho</span>
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-1.5 truncate">
                    {escalas.length} escalas · {clientInstallments.filter((i) => i.status === 'pendente').length} parcelas
                  </p>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. CHECK-IN HISTORY MODAL */}
      {isCheckinHistoryOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setIsCheckinHistoryOpen(false)}
        >
          <div
            className="w-full max-w-lg bg-white dark:bg-[#161618] border border-black/[0.08] dark:border-white/[0.12] rounded-3xl p-6 text-[#1d1d1f] dark:text-zinc-100 shadow-2xl space-y-4 max-h-[82vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-black/[0.06] dark:border-white/[0.08] pb-3.5 shrink-0">
              <div>
                <h3 className="text-base font-semibold tracking-tight flex items-center gap-2">
                  <History size={16} className="text-indigo-500" />
                  Histórico — Como foi hoje?
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Apenas dias em que você registrou voluntariamente
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCheckinHistoryOpen(false)}
                className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-white/[0.06] hover:bg-zinc-200 dark:hover:bg-white/[0.12] text-zinc-600 dark:text-zinc-300 flex items-center justify-center cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 space-y-2.5 pr-1">
              {sortedCheckins.length > 0 ? (
                sortedCheckins.map((entry) => {
                  const meta = getMoodMeta(entry.mood);
                  return (
                    <div
                      key={entry.date}
                      className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-white/[0.03] border border-black/[0.05] dark:border-white/[0.06] flex items-start justify-between gap-3"
                    >
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="font-semibold text-[#1d1d1f] dark:text-white tabular-nums">
                            {new Date(entry.date + 'T12:00:00').toLocaleDateString('pt-BR', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>
                          <span className={cn('font-semibold', meta.toneClass)}>{meta.label}</span>
                          <span className="text-zinc-400">·</span>
                          <span className="text-zinc-500 dark:text-zinc-400 tabular-nums">
                            Energia {entry.energy}/5
                          </span>
                        </div>
                        {entry.note && (
                          <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed break-words">
                            {entry.note}
                          </p>
                        )}
                      </div>
                      {onDeleteCheckin && (
                        <button
                          type="button"
                          onClick={() => onDeleteCheckin(entry.date)}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 cursor-pointer shrink-0"
                          title="Excluir registro"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="py-10 text-center text-xs text-zinc-500 dark:text-zinc-400">
                  Nenhum registro salvo até o momento.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 4. COVER CUSTOMIZATION MODAL */}
      {isCoverModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setCoverModalOpen(false)}
        >
          <div
            className="w-full max-w-lg bg-white dark:bg-[#161618] border border-black/[0.08] dark:border-white/[0.12] rounded-3xl p-6 text-[#1d1d1f] dark:text-zinc-100 shadow-2xl space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-black/[0.06] dark:border-white/[0.08] pb-4">
              <div>
                <h3 className="text-base font-semibold tracking-tight flex items-center gap-2">
                  <Sparkles size={15} className="text-zinc-500 dark:text-zinc-300" />
                  Personalizar Imagem de Capa
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Escolha uma paisagem predefinida, envie do dispositivo ou informe um link
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCoverModalOpen(false)}
                className="w-9 h-9 rounded-xl bg-zinc-100 dark:bg-white/[0.06] hover:bg-zinc-200 dark:hover:bg-white/[0.12] text-zinc-600 dark:text-zinc-300 flex items-center justify-center transition-colors cursor-pointer"
                aria-label="Fechar modal"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Capas sugeridas</p>
              <div className="grid grid-cols-3 gap-2.5">
                {PRESET_COVERS.map((preset) => {
                  const selected = coverSrc === preset.src;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => {
                        applyCover(preset.src);
                        setCoverModalOpen(false);
                      }}
                      className={cn(
                        'group relative aspect-video rounded-xl overflow-hidden border transition-all cursor-pointer text-left',
                        selected
                          ? 'border-[#0071e3] dark:border-white ring-2 ring-[#0071e3]/30 dark:ring-white/40'
                          : 'border-black/[0.08] dark:border-white/[0.1] hover:border-black/25 dark:hover:border-white/30'
                      )}
                    >
                      <img
                        src={preset.src}
                        alt={preset.label}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                      <span className="absolute bottom-1.5 left-2 right-2 text-[10px] font-medium text-white truncate">
                        {preset.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleCoverFileChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-3 px-4 rounded-xl bg-zinc-100 dark:bg-white/[0.06] hover:bg-zinc-200 dark:hover:bg-white/[0.11] border border-black/[0.06] dark:border-white/[0.08] text-xs font-medium text-zinc-800 dark:text-zinc-100 flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Upload size={14} />
                <span>Enviar imagem do dispositivo</span>
              </button>
            </div>

            <form onSubmit={handleApplyCustomUrl} className="space-y-2">
              <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">
                Ou cole a URL de uma imagem
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={customCoverUrl}
                  onChange={(e) => setCustomCoverUrl(e.target.value)}
                  placeholder="https://..."
                  className="flex-1 px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-white/[0.05] border border-black/[0.08] dark:border-white/[0.1] text-xs text-[#1d1d1f] dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-[#0071e3] dark:focus:border-white/30"
                />
                <button
                  type="submit"
                  disabled={!customCoverUrl.trim()}
                  className="px-4 py-2.5 rounded-xl bg-[#1d1d1f] dark:bg-white text-white dark:text-zinc-950 font-semibold text-xs hover:bg-black dark:hover:bg-zinc-200 transition-colors cursor-pointer disabled:opacity-40"
                >
                  Aplicar
                </button>
              </div>
            </form>

            <div className="pt-2 border-t border-black/[0.06] dark:border-white/[0.08] flex justify-between items-center">
              <button
                type="button"
                onClick={() => {
                  applyCover(coverMountains);
                  setCoverModalOpen(false);
                }}
                className="inline-flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer"
              >
                <RotateCcw size={13} />
                <span>Restaurar padrão</span>
              </button>
              <button
                type="button"
                onClick={() => setCoverModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-zinc-100 dark:bg-white/[0.08] hover:bg-zinc-200 dark:hover:bg-white/[0.14] text-xs font-medium text-zinc-800 dark:text-white transition-colors cursor-pointer"
              >
                Concluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
