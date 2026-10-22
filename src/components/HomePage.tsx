import React, { useMemo } from 'react';
import { 
  Wallet, 
  Trees, 
  GraduationCap, 
  CheckSquare, 
  Briefcase, 
  Calendar, 
  ChevronRight,
  AlertCircle,
  Clock,
  CheckCircle2,
  TrendingDown,
  ArrowRight,
  TrendingUp,
  Sparkles
} from 'lucide-react';
import { cn } from '../lib/utils';
import { PersonalTask, FinancialTransaction, ClientInstallment } from '../types';

interface HomePageProps {
  onNavigate: (
    module: 'academic' | 'financial' | 'chacara' | 'work' | 'personal',
    tab?: string,
    filterParams?: any
  ) => void;
  dashboardData?: any;
  personalTasks?: PersonalTask[];
  finTransactions?: FinancialTransaction[];
  chacaraBills?: any[];
  clientInstallments?: ClientInstallment[];
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
  dashboardData,
  personalTasks = [],
  finTransactions = [],
  chacaraBills = [],
  clientInstallments = [],
  onTogglePersonalTask
}) => {
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

  // Formatted date string (e.g., "Quarta-feira, 21 de outubro de 2026")
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

  // --- Real Personal Tasks Calculations ---
  const pendingTasks = useMemo(() => {
    return personalTasks.filter(t => t.status === 'pending');
  }, [personalTasks]);

  const overdueTasks = useMemo(() => {
    return pendingTasks.filter(t => t.due_date && t.due_date < todayStr);
  }, [pendingTasks, todayStr]);

  const urgentTasks = useMemo(() => {
    return pendingTasks.filter(t => t.eisenhower_quadrant === 'urgent_important' || t.priority === 'high');
  }, [pendingTasks]);

  // Priority tasks sorted: overdue first, then urgent, then by due date
  const priorityTasksList = useMemo(() => {
    return [...pendingTasks].sort((a, b) => {
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
    }).slice(0, 5);
  }, [pendingTasks, todayStr]);

  // --- Real Financial Bills Calculations ---
  const pendingExpenses = useMemo(() => {
    return finTransactions.filter(t => t.type === 'despesa' && t.status === 'pendente');
  }, [finTransactions]);

  const overdueBills = useMemo(() => {
    return pendingExpenses.filter(t => {
      const d = t.due_date || t.date;
      return d && d < todayStr;
    });
  }, [pendingExpenses, todayStr]);

  const overdueBillsAmount = useMemo(() => {
    return overdueBills.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
  }, [overdueBills]);

  const totalPendingBillsAmount = useMemo(() => {
    return pendingExpenses.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
  }, [pendingExpenses]);

  // Sorted upcoming bills
  const upcomingBillsList = useMemo(() => {
    return [...pendingExpenses].sort((a, b) => {
      const dateA = a.due_date || a.date;
      const dateB = b.due_date || b.date;
      if (dateA && dateB) return dateA.localeCompare(dateB);
      return 0;
    }).slice(0, 5);
  }, [pendingExpenses]);

  // --- Real Chácara Calculations ---
  const pendingChacaraBills = useMemo(() => {
    return chacaraBills.filter(b => b.status === 'pendente');
  }, [chacaraBills]);

  // --- Real Client Receivables Calculations ---
  const pendingClientInstallments = useMemo(() => {
    return clientInstallments.filter(i => i.status === 'pendente');
  }, [clientInstallments]);

  const clientReceivablesAmount = useMemo(() => {
    return pendingClientInstallments.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
  }, [pendingClientInstallments]);

  // Total cash balance from dashboard
  const totalBalance = dashboardData?.cash_balance ?? dashboardData?.total_balance ?? 0;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-8">
      {/* 1. Header: Apple-style Minimalist Welcome */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-7 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-1.5 max-w-2xl">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              {formattedDate}
            </span>

            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              {greeting}
            </h1>

            <p className="text-slate-600 text-xs sm:text-sm font-normal leading-relaxed pt-0.5">
              “{quote}”
            </p>
          </div>

          {/* Quick Balance Preview */}
          <div className="shrink-0 bg-slate-50 border border-slate-200/60 rounded-xl p-3.5 sm:min-w-[160px]">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 block">
              Saldo em Caixa
            </span>
            <p className="text-xl font-bold text-slate-900 mt-0.5 tracking-tight">
              R$ {Number(totalBalance).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      </div>

      {/* 2. Interactive Priority Indicators (Functional Shortcuts) */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <Sparkles size={13} className="text-slate-400" />
            O que merece sua atenção hoje
          </h2>
          <span className="text-[11px] text-slate-400">Dados reais consolidados</span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Indicator 1: Contas Vencidas */}
          <button
            type="button"
            onClick={() => onNavigate('financial', 'fin_extract', { type: 'despesa', status: 'pendente', showAllMonths: true })}
            className={cn(
              "text-left p-4 rounded-2xl border transition-all cursor-pointer group flex flex-col justify-between",
              overdueBills.length > 0
                ? "bg-rose-50/50 border-rose-200 hover:border-rose-300 shadow-xs"
                : "bg-white border-slate-200/80 hover:border-slate-300 shadow-xs"
            )}
            title="Ver despesas vencidas no Extrato"
          >
            <div className="flex items-center justify-between w-full mb-2">
              <span className={cn(
                "text-[10px] font-bold uppercase tracking-wider",
                overdueBills.length > 0 ? "text-rose-700" : "text-slate-500"
              )}>
                Contas Vencidas
              </span>
              <AlertCircle size={15} className={overdueBills.length > 0 ? "text-rose-500" : "text-slate-300"} />
            </div>
            <div>
              <p className={cn(
                "text-2xl font-bold tracking-tight",
                overdueBills.length > 0 ? "text-rose-900" : "text-slate-900"
              )}>
                {overdueBills.length}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                {overdueBills.length > 0 
                  ? `R$ ${overdueBillsAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} em atraso` 
                  : 'Nenhuma conta atrasada ✓'}
              </p>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-200/50 flex items-center justify-between text-[11px] font-semibold text-slate-600 group-hover:text-slate-900">
              <span>Abrir extrato</span>
              <ChevronRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
            </div>
          </button>

          {/* Indicator 2: Contas a Pagar (Total Pendente) */}
          <button
            type="button"
            onClick={() => onNavigate('financial', 'fin_extract', { type: 'despesa', status: 'pendente', showAllMonths: false })}
            className="text-left p-4 rounded-2xl bg-white border border-slate-200/80 hover:border-slate-300 shadow-xs transition-all cursor-pointer group flex flex-col justify-between"
            title="Ver contas a pagar no Extrato"
          >
            <div className="flex items-center justify-between w-full mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Contas a Pagar
              </span>
              <Clock size={15} className="text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold tracking-tight text-slate-900">
                {pendingExpenses.length}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                {pendingExpenses.length > 0 
                  ? `R$ ${totalPendingBillsAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} pendente`
                  : 'Tudo em dia ✓'}
              </p>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-200/50 flex items-center justify-between text-[11px] font-semibold text-slate-600 group-hover:text-slate-900">
              <span>Ver pendentes</span>
              <ChevronRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
            </div>
          </button>

          {/* Indicator 3: Tarefas Pendentes */}
          <button
            type="button"
            onClick={() => onNavigate('personal', 'personal_tasks')}
            className="text-left p-4 rounded-2xl bg-white border border-slate-200/80 hover:border-slate-300 shadow-xs transition-all cursor-pointer group flex flex-col justify-between"
            title="Abrir lista de Tarefas Pessoais"
          >
            <div className="flex items-center justify-between w-full mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Tarefas a Fazer
              </span>
              <CheckSquare size={15} className="text-indigo-500" />
            </div>
            <div>
              <p className="text-2xl font-bold tracking-tight text-slate-900">
                {pendingTasks.length}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                {urgentTasks.length > 0 
                  ? `${urgentTasks.length} com prioridade alta` 
                  : (overdueTasks.length > 0 ? `${overdueTasks.length} atrasada(s)` : 'Sem urgências ✓')}
              </p>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-200/50 flex items-center justify-between text-[11px] font-semibold text-slate-600 group-hover:text-slate-900">
              <span>Abrir tarefas</span>
              <ChevronRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
            </div>
          </button>

          {/* Indicator 4: Clientes a Receber / Chácara */}
          <button
            type="button"
            onClick={() => onNavigate('work', 'work_clients')}
            className="text-left p-4 rounded-2xl bg-white border border-slate-200/80 hover:border-slate-300 shadow-xs transition-all cursor-pointer group flex flex-col justify-between"
            title="Abrir Clientes e Parcelas"
          >
            <div className="flex items-center justify-between w-full mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                A Receber (Clientes)
              </span>
              <TrendingUp size={15} className="text-emerald-500" />
            </div>
            <div>
              <p className="text-2xl font-bold tracking-tight text-emerald-700">
                {pendingClientInstallments.length}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                {clientReceivablesAmount > 0 
                  ? `R$ ${clientReceivablesAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} a entrar` 
                  : 'Nenhuma parcela pendente'}
              </p>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-200/50 flex items-center justify-between text-[11px] font-semibold text-slate-600 group-hover:text-slate-900">
              <span>Ver clientes</span>
              <ChevronRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
            </div>
          </button>
        </div>
      </div>

      {/* 3. Two-Column Priorities Detail Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Left Column: Suas Tarefas Prioritárias */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <CheckSquare size={16} className="text-slate-700" />
                <h3 className="font-bold text-sm text-slate-900 tracking-tight">
                  Tarefas Prioritárias
                </h3>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('personal', 'personal_tasks')}
                className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1 cursor-pointer"
              >
                Ver todas ({pendingTasks.length})
                <ArrowRight size={12} />
              </button>
            </div>

            {priorityTasksList.length > 0 ? (
              <div className="space-y-2">
                {priorityTasksList.map((task) => {
                  const isOverdue = task.due_date && task.due_date < todayStr;
                  const isUrgent = task.eisenhower_quadrant === 'urgent_important' || task.priority === 'high';

                  return (
                    <div 
                      key={task.id}
                      className="group flex items-start gap-3 p-2.5 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200/60 transition-all"
                    >
                      {/* Interactive completion button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onTogglePersonalTask) onTogglePersonalTask(task);
                        }}
                        className="mt-0.5 w-5 h-5 rounded-md border border-slate-300 hover:border-emerald-500 hover:bg-emerald-50 flex items-center justify-center transition-colors text-emerald-600 cursor-pointer shrink-0"
                        title="Concluir tarefa diretamente"
                        aria-label={`Concluir ${task.title}`}
                      >
                        <CheckCircle2 size={13} className="opacity-0 group-hover:opacity-40 hover:opacity-100" />
                      </button>

                      <div 
                        className="flex-1 min-w-0 cursor-pointer"
                        onClick={() => onNavigate('personal', 'personal_tasks')}
                      >
                        <p className="text-xs font-semibold text-slate-800 leading-snug group-hover:text-slate-950 truncate">
                          {task.title}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          {isOverdue && (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 bg-rose-100 text-rose-700 rounded-md">
                              Atrasada
                            </span>
                          )}
                          {isUrgent && (
                            <span className="text-[10px] font-semibold px-1.5 py-0.2 bg-amber-100 text-amber-800 rounded-md">
                              Prioridade Alta
                            </span>
                          )}
                          {task.due_date && (
                            <span className="text-[10px] text-slate-400">
                              Vence {task.due_date.split('-').reverse().join('/')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-8 text-center text-slate-400 space-y-1">
                <CheckCircle2 size={24} className="mx-auto text-emerald-500 mb-1" />
                <p className="text-xs font-semibold text-slate-600">Tudo em dia!</p>
                <p className="text-[11px]">Nenhuma tarefa pendente registrada no momento.</p>
              </div>
            )}
          </div>

          <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between">
            <button
              type="button"
              onClick={() => onNavigate('personal', 'personal_eisenhower')}
              className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
            >
              Ver na Matriz de Eisenhower
            </button>
            <span className="text-[11px] text-slate-400">
              {personalTasks.filter(t => t.status === 'completed').length} concluídas
            </span>
          </div>
        </div>

        {/* Right Column: Contas Próximas do Vencimento */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Wallet size={16} className="text-slate-700" />
                <h3 className="font-bold text-sm text-slate-900 tracking-tight">
                  Contas & Próximos Vencimentos
                </h3>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('financial', 'fin_extract', { type: 'despesa', status: 'pendente', showAllMonths: true })}
                className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1 cursor-pointer"
              >
                Ver extrato ({pendingExpenses.length})
                <ArrowRight size={12} />
              </button>
            </div>

            {upcomingBillsList.length > 0 ? (
              <div className="space-y-2">
                {upcomingBillsList.map((tx) => {
                  const dueDate = tx.due_date || tx.date;
                  const isOverdue = dueDate && dueDate < todayStr;

                  return (
                    <div 
                      key={tx.id}
                      onClick={() => onNavigate('financial', 'fin_extract', { type: 'despesa', status: 'pendente', showAllMonths: true })}
                      className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200/60 transition-all cursor-pointer group"
                    >
                      <div className="min-w-0 pr-3">
                        <p className="text-xs font-semibold text-slate-800 leading-snug truncate group-hover:text-slate-950">
                          {tx.description}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {isOverdue ? (
                            <span className="text-[10px] font-bold text-rose-600 flex items-center gap-1">
                              <AlertCircle size={10} />
                              Venceu {dueDate.split('-').reverse().join('/')}
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400">
                              Vencimento: {dueDate ? dueDate.split('-').reverse().join('/') : 'Não definido'}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-xs font-bold text-slate-900 block">
                          R$ {Number(tx.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                        <span className="text-[9px] uppercase font-bold text-amber-600">
                          Pendente
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-8 text-center text-slate-400 space-y-1">
                <CheckCircle2 size={24} className="mx-auto text-emerald-500 mb-1" />
                <p className="text-xs font-semibold text-slate-600">Finanças em dia!</p>
                <p className="text-[11px]">Nenhuma conta pendente para este período.</p>
              </div>
            )}
          </div>

          <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between">
            <button
              type="button"
              onClick={() => onNavigate('financial', 'fin_transactions')}
              className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
            >
              + Novo Lançamento
            </button>
            <span className="text-[11px] text-slate-500 font-medium">
              Total: R$ {totalPendingBillsAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      {/* 4. Modules Access Grid (Clean, Understated Apple Aesthetic) */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Acesso aos Módulos Principais
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {/* Card 1: Financeiro */}
          <div 
            onClick={() => onNavigate('financial', 'fin_dashboard')}
            className="group cursor-pointer bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:border-slate-300 hover:shadow-sm transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center border border-slate-200/60 group-hover:bg-slate-900 group-hover:text-white transition-colors">
                  <Wallet size={18} />
                </div>
                <span className="text-[11px] font-medium text-slate-400">
                  6 abas
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                Financeiro
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Fluxo de caixa, extrato analítico, faturas de cartão de crédito e contas fixas.
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-700 group-hover:text-slate-900">
              <span>Abrir Módulo</span>
              <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>

          {/* Card 2: Chácara */}
          <div 
            onClick={() => onNavigate('chacara', 'chacara_dashboard')}
            className="group cursor-pointer bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:border-slate-300 hover:shadow-sm transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center border border-slate-200/60 group-hover:bg-slate-900 group-hover:text-white transition-colors">
                  <Trees size={18} />
                </div>
                <span className="text-[11px] font-medium text-slate-400">
                  {pendingChacaraBills.length > 0 ? `${pendingChacaraBills.length} pendentes` : '8 abas'}
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                Chácara
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Medições de hidrômetro e energia, geração de contas, rateios e prestação de contas.
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-700 group-hover:text-slate-900">
              <span>Abrir Módulo</span>
              <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>

          {/* Card 3: Acadêmico */}
          <div 
            onClick={() => onNavigate('academic', 'dashboard')}
            className="group cursor-pointer bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:border-slate-300 hover:shadow-sm transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center border border-slate-200/60 group-hover:bg-slate-900 group-hover:text-white transition-colors">
                  <GraduationCap size={18} />
                </div>
                <span className="text-[11px] font-medium text-slate-400">
                  7 abas
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                Acadêmico
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Controle de períodos letivos, matérias, frequências e notas de atividades.
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-700 group-hover:text-slate-900">
              <span>Abrir Módulo</span>
              <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>

          {/* Card 4: Pessoal */}
          <div 
            onClick={() => onNavigate('personal', 'personal_tasks')}
            className="group cursor-pointer bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:border-slate-300 hover:shadow-sm transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center border border-slate-200/60 group-hover:bg-slate-900 group-hover:text-white transition-colors">
                  <CheckSquare size={18} />
                </div>
                <span className="text-[11px] font-medium text-slate-400">
                  {pendingTasks.length} a fazer
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                Pessoal & Produtividade
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Gestão de tarefas pessoais diárias e organização por quadrantes de Eisenhower.
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-700 group-hover:text-slate-900">
              <span>Abrir Módulo</span>
              <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>

          {/* Card 5: Trabalho */}
          <div 
            onClick={() => onNavigate('work', 'work_clients')}
            className="group cursor-pointer bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:border-slate-300 hover:shadow-sm transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center border border-slate-200/60 group-hover:bg-slate-900 group-hover:text-white transition-colors">
                  <Briefcase size={18} />
                </div>
                <span className="text-[11px] font-medium text-slate-400">
                  5 abas
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                Trabalho & Clientes
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Controle de clientes, vendas parceladas, escalas de serviço e avisos via WhatsApp.
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-700 group-hover:text-slate-900">
              <span>Abrir Módulo</span>
              <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
