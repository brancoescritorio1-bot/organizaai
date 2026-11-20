import React, { useMemo, useRef, useState } from 'react';
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
} from 'lucide-react';
import { cn } from '../lib/utils';
import {
  PersonalTask,
  FinancialTransaction,
  ChacaraBill,
  DashboardData,
  ClientInstallment,
} from '../types';

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
    priority: 'low' | 'medium' | 'high';
  }) => Promise<void>;
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

const formatCurrency = (val: number) =>
  `R$ ${Number(val || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatShortDate = (dateStr?: string) => {
  if (!dateStr) return '';
  const clean = dateStr.split('T')[0];
  const parts = clean.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}`;
};

export const HomePage: React.FC<HomePageProps> = ({
  onNavigate,
  personalTasks = [],
  onTogglePersonalTask,
  onQuickAddTask,
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
  const [filterView, setFilterView] = useState<'today' | 'all' | 'urgent'>('today');
  const [captureMode, setCaptureMode] = useState<'task' | 'note'>('task');
  const [captureText, setCaptureText] = useState('');
  const [captureDueDate, setCaptureDueDate] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  });
  const [capturePriority, setCapturePriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [isSavingCapture, setIsSavingCapture] = useState(false);

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

  const todayStr = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }, []);

  const nextWeekStr = useMemo(() => {
    const next = new Date();
    next.setDate(next.getDate() + 7);
    return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(next.getDate()).padStart(2, '0')}`;
  }, []);

  const nextTwoWeeksStr = useMemo(() => {
    const next = new Date();
    next.setDate(next.getDate() + 14);
    return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(next.getDate()).padStart(2, '0')}`;
  }, []);

  // Tasks breakdowns
  const pendingTasks = useMemo(
    () => personalTasks.filter((t) => t.status === 'pending'),
    [personalTasks]
  );

  const completedTasksCount = useMemo(
    () => personalTasks.filter((t) => t.status === 'completed').length,
    [personalTasks]
  );

  const overdueTasks = useMemo(
    () => pendingTasks.filter((t) => t.due_date && t.due_date < todayStr),
    [pendingTasks, todayStr]
  );

  const todayTasks = useMemo(
    () => pendingTasks.filter((t) => t.due_date === todayStr),
    [pendingTasks, todayStr]
  );

  const urgentTasks = useMemo(
    () =>
      pendingTasks.filter(
        (t) => t.eisenhower_quadrant === 'urgent_important' || t.priority === 'high'
      ),
    [pendingTasks]
  );

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
        const refDate = t.due_date || t.date;
        return refDate && refDate < todayStr;
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
    () => openChacaraBills.filter((b) => b.due_date && b.due_date < todayStr),
    [openChacaraBills, todayStr]
  );

  // Upcoming commitments across modules (tasks, installments, academic exams/deadlines)
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

    // 1. Personal tasks due in next 7 days
    pendingTasks.forEach((task) => {
      if (task.due_date && task.due_date >= todayStr && task.due_date <= nextWeekStr) {
        items.push({
          id: `task-${task.id}`,
          title: task.title,
          subtitle: task.due_date === todayStr ? 'Vence hoje' : 'Tarefa pessoal',
          date: task.due_date,
          module: 'personal',
          tab: 'personal_tasks',
          tag: 'Tarefa',
        });
      }
    });

    // 2. Client installments due in next 14 days
    clientInstallments.forEach((inst) => {
      if (
        inst.status === 'pendente' &&
        inst.due_date &&
        inst.due_date >= todayStr &&
        inst.due_date <= nextTwoWeeksStr
      ) {
        const clientName = inst.client_sales?.clients?.name || 'Cliente';
        items.push({
          id: `inst-${inst.id}`,
          title: `${clientName} · ${formatCurrency(inst.amount)}`,
          subtitle: inst.client_sales?.description || `Parcela ${inst.installment_number}`,
          date: inst.due_date,
          module: 'work',
          tab: 'work_clients',
          tag: 'Cobrança',
        });
      }
    });

    // 3. Academic activities & exams due in next 14 days
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

  // Consolidated top hero metrics
  const totalOverdueCount = overdueTasks.length + overdueFinExpenses.length + overdueChacaraBills.length;
  const totalCommitmentsCount = todayTasks.length + upcomingCommitments.length;
  const totalPendingCount = pendingTasks.length + pendingExpenses.length + openChacaraBills.length;

  // Filtered task list for HOJE
  const displayedTasks = useMemo(() => {
    let list = [...pendingTasks];

    if (filterView === 'today') {
      const todayAndOverdue = list.filter((t) => t.due_date && t.due_date <= todayStr);
      list = todayAndOverdue.length > 0 ? todayAndOverdue : list.slice(0, 8);
    } else if (filterView === 'urgent') {
      list = list.filter(
        (t) => t.eisenhower_quadrant === 'urgent_important' || t.priority === 'high'
      );
    }

    return list.sort((a, b) => {
      const aOver = a.due_date && a.due_date < todayStr ? 1 : 0;
      const bOver = b.due_date && b.due_date < todayStr ? 1 : 0;
      if (aOver !== bOver) return bOver - aOver;

      const aUrg = a.eisenhower_quadrant === 'urgent_important' || a.priority === 'high' ? 1 : 0;
      const bUrg = b.eisenhower_quadrant === 'urgent_important' || b.priority === 'high' ? 1 : 0;
      if (aUrg !== bUrg) return bUrg - aUrg;

      if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date);
      if (a.due_date) return -1;
      if (b.due_date) return 1;
      return 0;
    });
  }, [pendingTasks, filterView, todayStr]);

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
          priority: capturePriority,
        });
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
      priority: 'medium',
    });
    if (onDeleteQuickNote) onDeleteQuickNote(note.id);
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 pb-32 selection:bg-white/20 selection:text-white">
      {/* 1. HERO COVER SECTION (Large Upper Fold) */}
      <section className="relative w-full min-h-[400px] sm:min-h-[450px] lg:min-h-[490px] flex flex-col justify-between overflow-hidden">
        {/* Background Cover Image or Dark Atmospheric Gradient Fallback */}
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

        {/* Dark Readability Scrim */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-b from-black/65 via-black/45 to-[#09090b]"
        />
        <div
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#09090b] via-[#09090b]/80 to-transparent"
        />

        {/* Top Utility Row inside Cover */}
        <div className="relative z-10 w-full max-w-7xl mx-auto px-4 md:px-8 pt-5 sm:pt-7 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-xs text-zinc-300/90 font-medium tracking-tight">
            <span className="font-semibold text-white tracking-tight">OrganizaAI</span>
            <span className="text-zinc-500">·</span>
            <span className="text-zinc-300 truncate">{formattedDate}</span>
          </div>

          <button
            type="button"
            onClick={() => setCoverModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/40 hover:bg-black/60 backdrop-blur-xl border border-white/[0.12] text-xs font-medium text-zinc-200 hover:text-white transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <ImageIcon size={13} className="text-zinc-300" />
            <span>Personalizar capa</span>
          </button>
        </div>

        {/* Center Greeting, Discreet Indicators & Quick Capture */}
        <div className="relative z-10 w-full max-w-4xl mx-auto px-4 md:px-8 pt-10 pb-8 sm:pb-10 text-center space-y-6">
          <div className="space-y-2.5">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-white">
              {greeting}
            </h1>
            <p className="text-sm sm:text-base text-zinc-300/90 max-w-xl mx-auto font-normal leading-relaxed">
              {phrase}
            </p>

            {/* Discreet Unboxed Indicators */}
            <div className="pt-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs sm:text-[13px] text-zinc-300 tabular-nums">
              <button
                type="button"
                onClick={() => {
                  setFilterView('today');
                  document.getElementById('home-hoje-section')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="hover:text-white transition-colors cursor-pointer"
              >
                <span className={cn('font-semibold', totalOverdueCount > 0 ? 'text-rose-400' : 'text-white')}>
                  {totalOverdueCount}
                </span>{' '}
                {totalOverdueCount === 1 ? 'atrasada' : 'atrasadas'}
              </button>

              <span className="text-zinc-600" aria-hidden="true">·</span>

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

              <span className="text-zinc-600" aria-hidden="true">·</span>

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
            className="w-full max-w-2xl mx-auto bg-[#141416]/80 backdrop-blur-2xl border border-white/[0.14] rounded-2xl p-2 shadow-[0_20px_50px_rgba(0,0,0,0.55)]"
          >
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              {/* Compact Segmented Type Toggle */}
              <div className="flex items-center p-1 bg-white/[0.06] rounded-xl shrink-0">
                <button
                  type="button"
                  onClick={() => setCaptureMode('task')}
                  className={cn(
                    'flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap',
                    captureMode === 'task'
                      ? 'bg-white text-zinc-950 font-semibold shadow-xs'
                      : 'text-zinc-400 hover:text-zinc-200'
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
                      ? 'bg-white text-zinc-950 font-semibold shadow-xs'
                      : 'text-zinc-400 hover:text-zinc-200'
                  )}
                >
                  <StickyNote size={13} />
                  <span>Anotação</span>
                </button>
              </div>

              {/* Input */}
              <input
                type="text"
                value={captureText}
                onChange={(e) => setCaptureText(e.target.value)}
                placeholder={
                  captureMode === 'task'
                    ? 'Adicionar nova tarefa para hoje...'
                    : 'Registrar anotação rápida...'
                }
                className="flex-1 bg-transparent px-3 py-2 text-sm text-white placeholder:text-zinc-400 focus:outline-none min-w-0"
              />

              <button
                type="submit"
                disabled={!captureText.trim() || isSavingCapture}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-white text-zinc-950 hover:bg-zinc-200 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-40 shrink-0 whitespace-nowrap"
              >
                <Plus size={14} strokeWidth={2.4} />
                <span>{isSavingCapture ? 'Salvando...' : 'Adicionar'}</span>
              </button>
            </div>

            {/* Extra compact metadata row when creating a task */}
            {captureMode === 'task' && (
              <div className="flex flex-wrap items-center justify-between gap-2 px-2 pt-2 mt-2 border-t border-white/[0.07] text-[11px] text-zinc-400">
                <div className="flex items-center gap-3">
                  <label className="inline-flex items-center gap-1.5 cursor-pointer hover:text-zinc-200">
                    <Calendar size={12} className="text-zinc-400" />
                    <input
                      type="date"
                      value={captureDueDate}
                      onChange={(e) => setCaptureDueDate(e.target.value)}
                      className="bg-transparent text-zinc-300 focus:outline-none cursor-pointer"
                    />
                  </label>
                  <span className="text-zinc-600">·</span>
                  <select
                    value={capturePriority}
                    onChange={(e) => setCapturePriority(e.target.value as 'low' | 'medium' | 'high')}
                    className="bg-transparent text-zinc-300 focus:outline-none cursor-pointer"
                  >
                    <option value="high" className="bg-zinc-900 text-white">Alta prioridade</option>
                    <option value="medium" className="bg-zinc-900 text-white">Prioridade média</option>
                    <option value="low" className="bg-zinc-900 text-white">Baixa prioridade</option>
                  </select>
                </div>
                <span className="text-zinc-500 hidden sm:inline">
                  Salvo diretamente em Pessoal · Tarefas
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
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-white/[0.08] pb-4">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.18em] uppercase text-zinc-500">
              Visão do Dia
            </p>
            <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-white mt-0.5">
              HOJE
            </h2>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <button
              type="button"
              onClick={() => onNavigate('personal', 'personal_eisenhower')}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#141416] hover:bg-[#1c1c20] border border-white/[0.08] text-zinc-300 hover:text-white transition-colors cursor-pointer whitespace-nowrap"
            >
              <LayoutGrid size={13} className="text-zinc-400" />
              <span>Matriz Eisenhower</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('personal', 'personal_tasks')}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.07] hover:bg-white/[0.12] text-zinc-100 font-medium transition-colors cursor-pointer whitespace-nowrap"
            >
              <span>Ver todas</span>
              <ArrowRight size={13} />
            </button>
          </div>
        </div>

        {/* Multi-column HOJE Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* LEFT COLUMN (7 cols): Tarefas do Dia & Pendências/Atrasos */}
          <div className="lg:col-span-7 space-y-5">
            {/* Panel A: Tarefas do Dia */}
            <div className="bg-[#141416] border border-white/[0.08] rounded-2xl p-5 sm:p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm sm:text-base font-semibold text-white tracking-tight flex items-center gap-2">
                    <CheckSquare size={16} className="text-zinc-300" />
                    Tarefas do Dia
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5 tabular-nums">
                    {pendingTasks.length} abertas · {completedTasksCount} concluídas
                  </p>
                </div>

                {/* Dark Segmented Filter */}
                <div className="flex items-center gap-1 p-1 bg-white/[0.04] border border-white/[0.06] rounded-xl text-xs tabular-nums">
                  <button
                    type="button"
                    onClick={() => setFilterView('today')}
                    className={cn(
                      'px-2.5 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap',
                      filterView === 'today'
                        ? 'bg-white text-zinc-950 font-semibold'
                        : 'text-zinc-400 hover:text-zinc-200'
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
                        ? 'bg-white text-zinc-950 font-semibold'
                        : 'text-zinc-400 hover:text-zinc-200'
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
                        ? 'bg-white text-zinc-950 font-semibold'
                        : 'text-zinc-400 hover:text-zinc-200'
                    )}
                  >
                    Urgentes ({urgentTasks.length})
                  </button>
                </div>
              </div>

              {displayedTasks.length > 0 ? (
                <div className="divide-y divide-white/[0.06]">
                  {displayedTasks.slice(0, 8).map((task) => {
                    const isOverdue = Boolean(task.due_date && task.due_date < todayStr);
                    const isToday = task.due_date === todayStr;
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
                          className="mt-0.5 w-5 h-5 rounded-md border border-white/25 hover:border-white hover:bg-white/10 flex items-center justify-center transition-colors cursor-pointer shrink-0 text-transparent hover:text-white"
                          aria-label={`Concluir ${task.title}`}
                          title="Marcar como concluída"
                        >
                          <Check size={12} strokeWidth={2.5} />
                        </button>

                        <div
                          onClick={() => onNavigate('personal', 'personal_tasks')}
                          className="flex-1 min-w-0 cursor-pointer"
                        >
                          <p className="text-sm font-medium text-zinc-100 group-hover:text-white truncate">
                            {task.title}
                          </p>
                          <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-zinc-400 tabular-nums">
                            {isOverdue && (
                              <span className="font-semibold text-rose-400">Atrasada</span>
                            )}
                            {isToday && (
                              <span className="font-semibold text-amber-400">Para hoje</span>
                            )}
                            {isUrgent && (
                              <span className="text-zinc-200 font-medium">Alta prioridade</span>
                            )}
                            {task.due_date && (
                              <span className="inline-flex items-center gap-1 text-zinc-500">
                                <Clock size={10} />
                                {formatShortDate(task.due_date)}
                              </span>
                            )}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => onNavigate('personal', 'personal_tasks')}
                          className="opacity-60 group-hover:opacity-100 text-zinc-500 hover:text-white p-1 transition-opacity cursor-pointer"
                          aria-label="Abrir tarefa"
                        >
                          <ChevronRight size={15} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-8 text-center space-y-1.5 border border-dashed border-white/[0.08] rounded-xl">
                  <CheckCircle2 size={22} className="mx-auto text-emerald-400" />
                  <p className="text-sm font-medium text-zinc-200">Tudo em ordem nesta visão</p>
                  <p className="text-xs text-zinc-500">
                    Use o campo acima para adicionar novas tarefas rapidamente.
                  </p>
                </div>
              )}
            </div>

            {/* Panel B: Pendências & Atrasadas (Financeiro, Chácara & Tarefas) */}
            <div
              id="home-pending-panel"
              className="bg-[#141416] border border-white/[0.08] rounded-2xl p-5 sm:p-6 space-y-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm sm:text-base font-semibold text-white tracking-tight flex items-center gap-2">
                    <AlertCircle size={16} className="text-zinc-300" />
                    Pendências e Atrasos
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Itens em aberto que pedem atenção nos seus módulos
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 tabular-nums">
                {/* Tarefas Atrasadas */}
                <button
                  type="button"
                  onClick={() => onNavigate('personal', 'personal_tasks')}
                  className="text-left p-4 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] transition-colors cursor-pointer group"
                >
                  <div className="flex items-center justify-between text-xs text-zinc-400">
                    <span>Tarefas atrasadas</span>
                    <ArrowUpRight size={13} className="text-zinc-500 group-hover:text-white transition-colors" />
                  </div>
                  <p
                    className={cn(
                      'text-xl font-semibold mt-2',
                      overdueTasks.length > 0 ? 'text-rose-400' : 'text-white'
                    )}
                  >
                    {overdueTasks.length}
                  </p>
                  <p className="text-[11px] text-zinc-500 mt-1">
                    {pendingTasks.length} pendentes no total
                  </p>
                </button>

                {/* Despesas Pendentes */}
                <button
                  type="button"
                  onClick={() => onNavigate('financial', 'fin_extract', { status: 'pendente' })}
                  className="text-left p-4 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] transition-colors cursor-pointer group"
                >
                  <div className="flex items-center justify-between text-xs text-zinc-400">
                    <span>Contas financeiras</span>
                    <ArrowUpRight size={13} className="text-zinc-500 group-hover:text-white transition-colors" />
                  </div>
                  <p className="text-xl font-semibold text-white mt-2">
                    {pendingExpenses.length}
                  </p>
                  <p className="text-[11px] text-zinc-400 mt-1 truncate">
                    {formatCurrency(pendingExpensesTotal)} em aberto
                  </p>
                </button>

                {/* Chácara em Aberto */}
                <button
                  type="button"
                  onClick={() => onNavigate('chacara', 'chacara_pending')}
                  className="text-left p-4 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] transition-colors cursor-pointer group"
                >
                  <div className="flex items-center justify-between text-xs text-zinc-400">
                    <span>Chácara pendentes</span>
                    <ArrowUpRight size={13} className="text-zinc-500 group-hover:text-white transition-colors" />
                  </div>
                  <p className="text-xl font-semibold text-white mt-2">
                    {openChacaraBills.length}
                  </p>
                  <p className="text-[11px] text-zinc-400 mt-1 truncate">
                    {formatCurrency(openChacaraTotal)} a receber
                  </p>
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN (5 cols): Compromissos Próximos, Anotações Rápidas & Resumo */}
          <div className="lg:col-span-5 space-y-5">
            {/* Panel C: Compromissos Próximos */}
            <div
              id="home-commitments-panel"
              className="bg-[#141416] border border-white/[0.08] rounded-2xl p-5 sm:p-6 space-y-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm sm:text-base font-semibold text-white tracking-tight flex items-center gap-2">
                    <Calendar size={16} className="text-zinc-300" />
                    Compromissos Próximos
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Agenda de tarefas, cobranças e prazos acadêmicos
                  </p>
                </div>
                <span className="text-xs text-zinc-500 tabular-nums">
                  {upcomingCommitments.length} itens
                </span>
              </div>

              {upcomingCommitments.length > 0 ? (
                <div className="divide-y divide-white/[0.06]">
                  {upcomingCommitments.slice(0, 6).map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onNavigate(item.module, item.tab)}
                      className="w-full py-2.5 first:pt-1 last:pb-1 flex items-center justify-between gap-3 text-left group cursor-pointer"
                    >
                      <div className="min-w-0">
                        <p className="text-xs sm:text-[13px] font-medium text-zinc-100 group-hover:text-white truncate">
                          {item.title}
                        </p>
                        <p className="text-[11px] text-zinc-400 truncate mt-0.5">
                          {item.tag} · {item.subtitle}
                        </p>
                      </div>
                      <span className="text-[11px] font-medium text-zinc-400 tabular-nums shrink-0">
                        {formatShortDate(item.date)}
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="py-6 text-center border border-dashed border-white/[0.08] rounded-xl">
                  <p className="text-xs text-zinc-400">
                    Nenhum prazo próximo nos próximos 7–14 dias.
                  </p>
                </div>
              )}
            </div>

            {/* Panel D: Anotações Rápidas */}
            <div className="bg-[#141416] border border-white/[0.08] rounded-2xl p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm sm:text-base font-semibold text-white tracking-tight flex items-center gap-2">
                    <StickyNote size={16} className="text-zinc-300" />
                    Anotações Rápidas
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
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
                      className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-start justify-between gap-2.5 group"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-zinc-200 leading-relaxed break-words">
                          {note.text}
                        </p>
                        <p className="text-[10px] text-zinc-500 mt-1 tabular-nums">
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
                            className="px-2 py-1 rounded-lg bg-white/[0.06] hover:bg-white/[0.14] text-[10px] font-medium text-zinc-200 transition-colors cursor-pointer whitespace-nowrap"
                          >
                            Virar tarefa
                          </button>
                        )}
                        {onDeleteQuickNote && (
                          <button
                            type="button"
                            onClick={() => onDeleteQuickNote(note.id)}
                            aria-label="Excluir anotação"
                            className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-white/[0.05] transition-colors cursor-pointer"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-5 text-center border border-dashed border-white/[0.08] rounded-xl">
                  <p className="text-xs text-zinc-500">
                    Selecione “Anotação” no campo superior para salvar notas rápidas aqui.
                  </p>
                </div>
              )}
            </div>

            {/* Panel E: Resumo de Atividades dos Módulos */}
            <div className="bg-[#141416] border border-white/[0.08] rounded-2xl p-5 sm:p-6 space-y-3.5">
              <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-400">
                Resumo dos Módulos
              </h3>

              <div className="grid grid-cols-2 gap-2.5 tabular-nums">
                <button
                  type="button"
                  onClick={() => onNavigate('financial', 'fin_dashboard')}
                  className="p-3.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.06] text-left transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2 text-xs text-zinc-300 font-medium">
                    <Wallet size={14} className="text-zinc-400" />
                    <span>Financeiro</span>
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-1.5 truncate">
                    {pendingExpenses.length} pendências
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => onNavigate('chacara', 'chacara_dashboard')}
                  className="p-3.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.06] text-left transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2 text-xs text-zinc-300 font-medium">
                    <Trees size={14} className="text-zinc-400" />
                    <span>Chácara</span>
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-1.5 truncate">
                    {openChacaraBills.length} contas abertas
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => onNavigate('academic', 'dashboard')}
                  className="p-3.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.06] text-left transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2 text-xs text-zinc-300 font-medium">
                    <GraduationCap size={14} className="text-zinc-400" />
                    <span>Acadêmico</span>
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-1.5 truncate">
                    {academicDashboard.length} matérias
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => onNavigate('work', 'work_escalas')}
                  className="p-3.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.06] text-left transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2 text-xs text-zinc-300 font-medium">
                    <Briefcase size={14} className="text-zinc-400" />
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

      {/* 3. COVER CUSTOMIZATION MODAL */}
      {isCoverModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setCoverModalOpen(false)}
        >
          <div
            className="w-full max-w-lg bg-[#161618] border border-white/[0.12] rounded-3xl p-6 text-zinc-100 shadow-2xl space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
              <div>
                <h3 className="text-base font-semibold text-white tracking-tight flex items-center gap-2">
                  <Sparkles size={15} className="text-zinc-300" />
                  Personalizar Imagem de Capa
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Escolha uma paisagem predefinida, envie do dispositivo ou informe um link
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCoverModalOpen(false)}
                className="w-9 h-9 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-zinc-300 flex items-center justify-center transition-colors cursor-pointer"
                aria-label="Fechar modal"
              >
                <X size={16} />
              </button>
            </div>

            {/* Presets */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-zinc-400">Capas sugeridas</p>
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
                          ? 'border-white ring-2 ring-white/40'
                          : 'border-white/[0.1] hover:border-white/30'
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

            {/* Upload from device */}
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
                className="w-full py-3 px-4 rounded-xl bg-white/[0.06] hover:bg-white/[0.11] border border-white/[0.08] text-xs font-medium text-zinc-100 flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Upload size={14} />
                <span>Enviar imagem do dispositivo</span>
              </button>
            </div>

            {/* Custom URL */}
            <form onSubmit={handleApplyCustomUrl} className="space-y-2">
              <label className="block text-xs font-medium text-zinc-400">
                Ou cole a URL de uma imagem
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={customCoverUrl}
                  onChange={(e) => setCustomCoverUrl(e.target.value)}
                  placeholder="https://..."
                  className="flex-1 px-3.5 py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.1] text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-white/30"
                />
                <button
                  type="submit"
                  disabled={!customCoverUrl.trim()}
                  className="px-4 py-2.5 rounded-xl bg-white text-zinc-950 font-semibold text-xs hover:bg-zinc-200 transition-colors cursor-pointer disabled:opacity-40"
                >
                  Aplicar
                </button>
              </div>
            </form>

            {/* Reset */}
            <div className="pt-2 border-t border-white/[0.08] flex justify-between items-center">
              <button
                type="button"
                onClick={() => {
                  applyCover(coverMountains);
                  setCoverModalOpen(false);
                }}
                className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                <RotateCcw size={13} />
                <span>Restaurar padrão</span>
              </button>
              <button
                type="button"
                onClick={() => setCoverModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-xs font-medium text-white transition-colors cursor-pointer"
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
