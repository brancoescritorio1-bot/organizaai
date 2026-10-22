import React, { useMemo, useState } from 'react';
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
  Briefcase
} from 'lucide-react';
import { cn } from '../lib/utils';
import { PersonalTask } from '../types';

interface HomePageProps {
  onNavigate: (
    module: 'academic' | 'financial' | 'chacara' | 'work' | 'personal',
    tab?: string,
    filterParams?: any
  ) => void;
  personalTasks?: PersonalTask[];
  onTogglePersonalTask?: (task: PersonalTask) => void;
}

const MOTIVATIONAL_QUOTES = [
  'Pequenos avanços diários constroem grandes conquistas.',
  'Foco, organização e constância transformam objetivos em realidade.',
  'Cada passo consciente é um investimento no seu futuro.',
  'A clareza nas metas traz determinação e leveza na caminhada.',
  'Organize o seu dia para abrir espaço ao que realmente importa.',
  'Planejamento e disciplina são a base para a tranquilidade.',
  'A simplicidade é o mais alto grau de sofisticação.'
];

export const HomePage: React.FC<HomePageProps> = ({
  onNavigate,
  personalTasks = [],
  onTogglePersonalTask
}) => {
  const [filterView, setFilterView] = useState<'all' | 'urgent' | 'today'>('all');

  // Dynamic Greeting
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Bom dia, Lara!';
    if (hour >= 12 && hour < 18) return 'Boa tarde, Lara!';
    return 'Boa noite, Lara!';
  }, []);

  // Daily Quote
  const quote = useMemo(() => {
    const day = new Date().getDate();
    return MOTIVATIONAL_QUOTES[day % MOTIVATIONAL_QUOTES.length];
  }, []);

  // Formatted date string
  const formattedDate = useMemo(() => {
    const now = new Date();
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    };
    const str = now.toLocaleDateString('pt-BR', options);
    return str.charAt(0).toUpperCase() + str.slice(1);
  }, []);

  const todayStr = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, []);

  const pendingTasks = useMemo(() => {
    return personalTasks.filter(t => t.status === 'pending');
  }, [personalTasks]);

  const completedTasks = useMemo(() => {
    return personalTasks.filter(t => t.status === 'completed');
  }, [personalTasks]);

  const overdueTasks = useMemo(() => {
    return pendingTasks.filter(t => t.due_date && t.due_date < todayStr);
  }, [pendingTasks, todayStr]);

  const urgentTasks = useMemo(() => {
    return pendingTasks.filter(t => t.eisenhower_quadrant === 'urgent_important' || t.priority === 'high');
  }, [pendingTasks]);

  const todayTasks = useMemo(() => {
    return pendingTasks.filter(t => t.due_date === todayStr);
  }, [pendingTasks, todayStr]);

  const upcomingTasks = useMemo(() => {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    const nextWeekStr = nextWeek.toISOString().split('T')[0];

    return pendingTasks.filter(t => t.due_date && t.due_date >= todayStr && t.due_date <= nextWeekStr)
      .sort((a, b) => (a.due_date || '').localeCompare(b.due_date || ''));
  }, [pendingTasks, todayStr]);

  const displayedTasks = useMemo(() => {
    let list = [...pendingTasks];

    if (filterView === 'urgent') {
      list = list.filter(t => t.eisenhower_quadrant === 'urgent_important' || t.priority === 'high');
    } else if (filterView === 'today') {
      list = list.filter(t => (t.due_date && t.due_date <= todayStr));
    }

    return list.sort((a, b) => {
      const aOverdue = a.due_date && a.due_date < todayStr ? 1 : 0;
      const bOverdue = b.due_date && b.due_date < todayStr ? 1 : 0;
      if (aOverdue !== bOverdue) return bOverdue - aOverdue;

      const aUrgent = a.eisenhower_quadrant === 'urgent_important' || a.priority === 'high' ? 1 : 0;
      const bUrgent = b.eisenhower_quadrant === 'urgent_important' || b.priority === 'high' ? 1 : 0;
      if (aUrgent !== bUrgent) return bUrgent - aUrgent;

      if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date);
      if (a.due_date) return -1;
      if (b.due_date) return 1;
      return 0;
    });
  }, [pendingTasks, filterView, todayStr]);

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* 1. Header: Apple-style Minimalist Welcome */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-xs">
        <div className="space-y-2 max-w-2xl">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            {formattedDate}
          </span>

          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            {greeting}
          </h1>

          <p className="text-slate-600 text-xs sm:text-sm font-normal leading-relaxed pt-0.5">
            “{quote}”
          </p>
        </div>

        {/* Minimalist Personal Summary Bar */}
        <div className="mt-6 pt-5 border-t border-slate-100 flex flex-wrap items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-slate-900" />
            <span className="font-semibold text-slate-900">{pendingTasks.length}</span>
            <span className="text-slate-500">tarefas a fazer</span>
          </div>

          <div className="text-slate-300">•</div>

          <div className="flex items-center gap-2">
            <span className={cn("w-2 h-2 rounded-full", urgentTasks.length > 0 ? "bg-amber-500" : "bg-slate-300")} />
            <span className="font-semibold text-slate-900">{urgentTasks.length}</span>
            <span className="text-slate-500">alta prioridade</span>
          </div>

          {overdueTasks.length > 0 && (
            <>
              <div className="text-slate-300">•</div>
              <div className="flex items-center gap-2 text-rose-600 font-semibold">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                <span>{overdueTasks.length} atrasada(s)</span>
              </div>
            </>
          )}

          <div className="text-slate-300">•</div>

          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="font-semibold text-slate-900">{completedTasks.length}</span>
            <span className="text-slate-500">concluídas</span>
          </div>
        </div>
      </div>

      {/* 2. Main Section: Suas Prioridades & Tarefas */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-7 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <CheckSquare size={17} className="text-slate-800" />
              Suas Prioridades
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Atividades e compromissos que exigem sua atenção
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100/70 rounded-xl border border-slate-200/60 text-xs">
            <button
              type="button"
              onClick={() => setFilterView('all')}
              className={cn(
                "px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer",
                filterView === 'all'
                  ? "bg-white text-slate-900 shadow-xs font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              Todas ({pendingTasks.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterView('urgent')}
              className={cn(
                "px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer",
                filterView === 'urgent'
                  ? "bg-white text-slate-900 shadow-xs font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              Urgentes ({urgentTasks.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterView('today')}
              className={cn(
                "px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer",
                filterView === 'today'
                  ? "bg-white text-slate-900 shadow-xs font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              Para Hoje ({todayTasks.length + overdueTasks.length})
            </button>
          </div>
        </div>

        {/* Task List with Direct Interactive Completion */}
        {displayedTasks.length > 0 ? (
          <div className="space-y-2">
            {displayedTasks.map((task) => {
              const isOverdue = task.due_date && task.due_date < todayStr;
              const isUrgent = task.eisenhower_quadrant === 'urgent_important' || task.priority === 'high';
              const isToday = task.due_date === todayStr;

              return (
                <div 
                  key={task.id}
                  className="group flex items-start gap-3 p-3 rounded-xl hover:bg-slate-50 border border-slate-100 hover:border-slate-200 transition-all"
                >
                  {/* Interactive Checkbox */}
                  <button
                    type="button"
                    onClick={() => onTogglePersonalTask && onTogglePersonalTask(task)}
                    className="mt-0.5 w-5 h-5 rounded-md border border-slate-300 hover:border-slate-900 flex items-center justify-center transition-colors text-slate-900 cursor-pointer shrink-0"
                    title="Marcar como concluída"
                    aria-label={`Concluir ${task.title}`}
                  >
                    <CheckCircle2 size={13} className="opacity-0 group-hover:opacity-40 hover:opacity-100" />
                  </button>

                  <div 
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() => onNavigate('personal', 'personal_tasks')}
                  >
                    <p className="text-xs font-semibold text-slate-800 group-hover:text-slate-950 truncate leading-snug">
                      {task.title}
                    </p>
                    
                    {task.description && (
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">
                        {task.description}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-2 mt-1.5">
                      {isOverdue && (
                        <span className="text-[10px] font-bold px-1.5 py-0.2 bg-rose-50 text-rose-700 border border-rose-200/70 rounded-md">
                          Atrasada
                        </span>
                      )}
                      {isToday && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.2 bg-amber-50 text-amber-700 border border-amber-200/70 rounded-md">
                          Para Hoje
                        </span>
                      )}
                      {isUrgent && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.2 bg-slate-100 text-slate-700 border border-slate-200 rounded-md">
                          Alta Prioridade
                        </span>
                      )}
                      {task.due_date && (
                        <span className="text-[10px] text-slate-400 flex items-center gap-1">
                          <Clock size={10} />
                          Vence {task.due_date.split('-').reverse().join('/')}
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onNavigate('personal', 'personal_tasks')}
                    className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-slate-700 p-1 rounded-lg transition-all"
                    title="Abrir no módulo Pessoal"
                  >
                    <ChevronRight size={15} />
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-12 text-center text-slate-400 space-y-1.5">
            <CheckCircle2 size={26} className="mx-auto text-emerald-500 mb-1" />
            <p className="text-sm font-semibold text-slate-700">Tudo em dia, Lara!</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Nenhuma tarefa pendente com este filtro no momento.
            </p>
          </div>
        )}

        {/* Footer actions linking to Personal & Eisenhower Matrix */}
        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <button
            type="button"
            onClick={() => onNavigate('personal', 'personal_eisenhower')}
            className="font-semibold text-slate-700 hover:text-slate-900 flex items-center gap-1.5 cursor-pointer"
          >
            <LayoutGrid size={13} className="text-slate-500" />
            Abrir Matriz de Eisenhower
          </button>

          <button
            type="button"
            onClick={() => onNavigate('personal', 'personal_tasks')}
            className="font-semibold text-slate-700 hover:text-slate-900 flex items-center gap-1 cursor-pointer"
          >
            Gerenciar todas as tarefas ({personalTasks.length})
            <ArrowRight size={12} />
          </button>
        </div>
      </div>

      {/* 3. Lean Upcoming Commitments Section */}
      {upcomingTasks.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Calendar size={14} className="text-slate-400" />
              Prazos dos Próximos 7 Dias
            </h3>
            <span className="text-[11px] text-slate-400">
              {upcomingTasks.length} com prazo próximo
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {upcomingTasks.slice(0, 4).map((task) => (
              <div
                key={task.id}
                onClick={() => onNavigate('personal', 'personal_tasks')}
                className="p-3 rounded-xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50 transition-all cursor-pointer group flex items-center justify-between"
              >
                <div className="min-w-0 pr-2">
                  <p className="text-xs font-semibold text-slate-800 truncate group-hover:text-slate-950">
                    {task.title}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {task.due_date ? task.due_date.split('-').reverse().join('/') : ''}
                  </p>
                </div>
                <ChevronRight size={13} className="text-slate-300 group-hover:text-slate-600 shrink-0" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Quick Module Access Grid (Apple Clean Cards) */}
      <div className="pt-2">
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Acesso aos Módulos Principais
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div 
            onClick={() => onNavigate('financial', 'fin_dashboard')}
            className="group cursor-pointer bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all flex items-center justify-between"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 border border-slate-200/60 group-hover:bg-slate-900 group-hover:text-white transition-colors">
                <Wallet size={17} />
              </div>
              <div className="truncate">
                <h3 className="text-xs font-bold text-slate-900 truncate">Financeiro</h3>
                <p className="text-[10px] text-slate-400 truncate">Fluxo, extrato & faturas</p>
              </div>
            </div>
            <ChevronRight size={15} className="text-slate-300 group-hover:text-slate-700 shrink-0 transition-transform group-hover:translate-x-0.5" />
          </div>

          <div 
            onClick={() => onNavigate('chacara', 'chacara_dashboard')}
            className="group cursor-pointer bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all flex items-center justify-between"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 border border-slate-200/60 group-hover:bg-slate-900 group-hover:text-white transition-colors">
                <Trees size={17} />
              </div>
              <div className="truncate">
                <h3 className="text-xs font-bold text-slate-900 truncate">Chácara</h3>
                <p className="text-[10px] text-slate-400 truncate">Hidrômetros & rateios</p>
              </div>
            </div>
            <ChevronRight size={15} className="text-slate-300 group-hover:text-slate-700 shrink-0 transition-transform group-hover:translate-x-0.5" />
          </div>

          <div 
            onClick={() => onNavigate('academic', 'dashboard')}
            className="group cursor-pointer bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all flex items-center justify-between"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 border border-slate-200/60 group-hover:bg-slate-900 group-hover:text-white transition-colors">
                <GraduationCap size={17} />
              </div>
              <div className="truncate">
                <h3 className="text-xs font-bold text-slate-900 truncate">Acadêmico</h3>
                <p className="text-[10px] text-slate-400 truncate">Notas, presença & web</p>
              </div>
            </div>
            <ChevronRight size={15} className="text-slate-300 group-hover:text-slate-700 shrink-0 transition-transform group-hover:translate-x-0.5" />
          </div>

          <div 
            onClick={() => onNavigate('work', 'work_clients')}
            className="group cursor-pointer bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all flex items-center justify-between"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 border border-slate-200/60 group-hover:bg-slate-900 group-hover:text-white transition-colors">
                <Briefcase size={17} />
              </div>
              <div className="truncate">
                <h3 className="text-xs font-bold text-slate-900 truncate">Trabalho & Clientes</h3>
                <p className="text-[10px] text-slate-400 truncate">Vendas, escalas & WhatsApp</p>
              </div>
            </div>
            <ChevronRight size={15} className="text-slate-300 group-hover:text-slate-700 shrink-0 transition-transform group-hover:translate-x-0.5" />
          </div>
        </div>
      </div>
    </div>
  );
};
