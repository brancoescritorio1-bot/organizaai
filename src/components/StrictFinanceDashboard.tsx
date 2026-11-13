import React, { useEffect, useMemo, useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Building2,
  Droplets,
  Zap,
  Briefcase,
  Users,
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  X,
  BarChart3,
  RefreshCw,
  ShieldCheck,
  AlertTriangle,
  Wallet,
  FileSpreadsheet,
  ArrowUpRight,
  ArrowDownRight,
  ChevronDown,
  ChevronUp,
  Filter,
  Percent,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { ChacaraBill, ChacaraExpense, ChacaraUser } from '../types';
import { cn } from '../lib/utils';
import { PdfService } from '../lib/PdfService';
import {
  ChacaraCategoryId,
  ChacaraDashboardFilter,
  Lancamento,
  computeChacaraDashboardData,
  formatBRL,
  formatMonthLabelPtBr,
  fromCents,
  getLocalTodayStr,
} from '../lib/chacaraFinance';

export type { Lancamento };

interface StrictFinanceDashboardProps {
  lancamentos?: Lancamento[];
  filterMonth: string;
  setFilterMonth: (month: string) => void;
  onRefresh?: () => Promise<void> | void;
  bills?: ChacaraBill[];
  users?: ChacaraUser[];
  expenses?: ChacaraExpense[];
}

const MONTH_OPTIONS = [
  { value: 'all', label: 'Todos os meses' },
  { value: '01', label: 'Janeiro' },
  { value: '02', label: 'Fevereiro' },
  { value: '03', label: 'Março' },
  { value: '04', label: 'Abril' },
  { value: '05', label: 'Maio' },
  { value: '06', label: 'Junho' },
  { value: '07', label: 'Julho' },
  { value: '08', label: 'Agosto' },
  { value: '09', label: 'Setembro' },
  { value: '10', label: 'Outubro' },
  { value: '11', label: 'Novembro' },
  { value: '12', label: 'Dezembro' },
];

const CATEGORY_VISUALS: Record<
  ChacaraCategoryId,
  { icon: React.ComponentType<{ size?: number }>; color: string; bg: string }
> = {
  fundo_reserva: { icon: Building2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  agua: { icon: Droplets, color: 'text-sky-600', bg: 'bg-sky-50' },
  energia: { icon: Zap, color: 'text-amber-600', bg: 'bg-amber-50' },
  prestador: { icon: Briefcase, color: 'text-blue-600', bg: 'bg-blue-50' },
  rateio: { icon: Users, color: 'text-purple-600', bg: 'bg-purple-50' },
};

const brlTooltipFormatter = (value: unknown) => {
  const num = Number(value);
  return [`R$ ${(Number.isFinite(num) ? num : 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, undefined] as [string, undefined];
};

const pctTooltipFormatter = (value: unknown) => {
  const num = Number(value);
  return [`${(Number.isFinite(num) ? num : 0).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`, undefined] as [string, undefined];
};

export const StrictFinanceDashboard: React.FC<StrictFinanceDashboardProps> = ({
  filterMonth,
  setFilterMonth,
  onRefresh,
  bills = [],
  users = [],
  expenses = [],
}) => {
  const todayStr = getLocalTodayStr();
  const initialParts = (filterMonth || todayStr.slice(0, 7)).split('-');

  const [filterMode, setFilterMode] = useState<'competence' | 'custom'>('competence');
  const [selectedYear, setSelectedYear] = useState<string>(initialParts[0] || todayStr.slice(0, 4));
  const [selectedMonth, setSelectedMonth] = useState<string>(initialParts[1] || todayStr.slice(5, 7));
  const [startDate, setStartDate] = useState<string>(`${todayStr.slice(0, 7)}-01`);
  const [endDate, setEndDate] = useState<string>(todayStr);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<'all' | ChacaraCategoryId>('all');

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedCategoryModal, setSelectedCategoryModal] = useState<ChacaraCategoryId | null>(null);
  const [modalStatusFilter, setModalStatusFilter] = useState<'all' | 'pago' | 'pendente' | 'inadimplente' | 'parcial'>('all');
  const [showAuditDetails, setShowAuditDetails] = useState(false);

  // Sync local year/month selectors when parent filterMonth changes externally
  useEffect(() => {
    if (filterMonth && /^\d{4}-\d{2}$/.test(filterMonth)) {
      const [y, m] = filterMonth.split('-');
      setSelectedYear(y);
      setSelectedMonth(m);
    }
  }, [filterMonth]);

  const handleCompetenceYearChange = (newYear: string) => {
    setSelectedYear(newYear);
    if (newYear !== 'all' && selectedMonth !== 'all') {
      setFilterMonth(`${newYear}-${selectedMonth}`);
    }
  };

  const handleCompetenceMonthChange = (newMonth: string) => {
    setSelectedMonth(newMonth);
    if (selectedYear !== 'all' && newMonth !== 'all') {
      setFilterMonth(`${selectedYear}-${newMonth}`);
    }
  };

  const handleCompetenceInputSync = (val: string) => {
    if (/^\d{4}-\d{2}$/.test(val)) {
      const [y, m] = val.split('-');
      setSelectedYear(y);
      setSelectedMonth(m);
      setFilterMonth(val);
    }
  };

  const handleRefreshClick = async () => {
    if (!onRefresh || isRefreshing) return;
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  };

  const activeFilter: ChacaraDashboardFilter = useMemo(
    () => ({
      mode: filterMode,
      year: selectedYear,
      month: selectedMonth,
      startDate,
      endDate,
      category: selectedCategoryFilter,
    }),
    [filterMode, selectedYear, selectedMonth, startDate, endDate, selectedCategoryFilter]
  );

  const dashboard = useMemo(
    () => computeChacaraDashboardData(bills, users, expenses, activeFilter, todayStr),
    [bills, users, expenses, activeFilter, todayStr]
  );

  // Global export listener
  useEffect(() => {
    const handleExport = async () => {
      const bodyRows = dashboard.categorias.map((c) => [
        c.title,
        formatBRL(c.previstoCents),
        formatBRL(c.recebidoCents),
        formatBRL(c.pendenteCents),
        formatBRL(c.inadimplenteCents),
        `${c.percentRecebido.toFixed(1)}%`,
        `${c.moradoresPagantes}`,
        `${c.moradoresPendentes}`,
      ]);
      await PdfService.exportTableToPDF(
        'Dashboard Financeiro - Chácara',
        `Período: ${dashboard.activePeriodLabel}`,
        ['Categoria', 'Previsto', 'Recebido', 'Pendente', 'Inadimplente', '% Rec.', 'Pagantes', 'Pendentes'],
        bodyRows,
        `Previsto: ${formatBRL(dashboard.lancamentosGerais.totalPrevistoCents)} | Recebido (Comp.): ${formatBRL(dashboard.lancamentosGerais.totalRecebidoCents)} | Saldo Caixa: ${formatBRL(dashboard.fluxoRealizado.saldoRealizadoCents)}`,
        'l',
        `dashboard-chacara-${dashboard.activePeriodLabel.replace(/[^a-zA-Z0-9_-]/g, '_')}`
      );
    };
    window.addEventListener('export-chacara-dashboard', handleExport);
    return () => window.removeEventListener('export-chacara-dashboard', handleExport);
  }, [dashboard]);

  // Chart datasets
  const categoryBarChartData = useMemo(
    () =>
      dashboard.categorias.map((c) => ({
        name: c.shortTitle,
        Recebido: fromCents(c.recebidoCents),
        'Pendente (A vencer)': fromCents(c.pendenteCents),
        'Inadimplente (Vencido)': fromCents(c.inadimplenteCents),
      })),
    [dashboard.categorias]
  );

  const categoryPerformanceChartData = useMemo(
    () =>
      dashboard.categorias.map((c) => ({
        name: c.shortTitle,
        '% Recebido': c.percentRecebido,
        '% Pendente': c.percentPendente,
        '% Inadimplente': c.percentInadimplente,
      })),
    [dashboard.categorias]
  );

  const monthlyHistoryChartData = useMemo(
    () =>
      dashboard.analiseAnual.ultimosMeses.map((m) => ({
        label: m.label,
        'Receitas Realizadas': fromCents(m.recebidoRealizadoCents),
        'Despesas Pagas': fromCents(m.despesasPagasCents),
        'Inadimplência': fromCents(m.inadimplenteCents),
        'Pendente A Vencer': fromCents(m.pendenteCents),
        '% Recebimento': m.percentRecebido,
        '% Inadimplência': m.percentInadimplente,
        'Saldo Mensal': fromCents(m.saldoRealizadoCents),
        'Saldo Acumulado': fromCents(m.saldoAcumuladoRealizadoCents),
      })),
    [dashboard.analiseAnual.ultimosMeses]
  );

  const aguaCat = dashboard.categorias.find((c) => c.id === 'agua');
  const energiaCat = dashboard.categorias.find((c) => c.id === 'energia');
  const modalCategoryData = selectedCategoryModal
    ? dashboard.categorias.find((c) => c.id === selectedCategoryModal) || null
    : null;

  const formatDeltaPct = (pct: number | null) => {
    if (pct === null) return 'sem base anterior';
    const sign = pct > 0 ? '+' : '';
    return `${sign}${pct.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}% vs mês ant.`;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header & Filtros Completos */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Dashboard da Chácara
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100 tabular-nums">
                {dashboard.activePeriodLabel}
              </span>
              <span
                onClick={() => setShowAuditDetails(true)}
                className={cn(
                  'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold cursor-pointer transition-colors',
                  dashboard.auditoria.allPassed
                    ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                    : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                )}
                title="Clique para ver a conferência matemática completa"
              >
                {dashboard.auditoria.allPassed ? (
                  <>
                    <ShieldCheck size={12} /> Auditoria OK (R$ 0,00)
                  </>
                ) : (
                  <>
                    <AlertTriangle size={12} /> Divergência Detectada
                  </>
                )}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Painel financeiro auditado com separação de Caixa Realizado, Competência, Pendentes vs Inadimplentes e Análise Anual
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="inline-flex bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setFilterMode('competence')}
                className={cn(
                  'px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer',
                  filterMode === 'competence'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                )}
              >
                Mês / Ano
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('custom')}
                className={cn(
                  'px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer',
                  filterMode === 'custom'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                )}
              >
                Período Personalizado
              </button>
            </div>

            {onRefresh && (
              <button
                type="button"
                onClick={handleRefreshClick}
                disabled={isRefreshing}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-semibold rounded-xl transition-colors cursor-pointer disabled:opacity-60"
              >
                <RefreshCw size={14} className={cn(isRefreshing && 'animate-spin')} />
                {isRefreshing ? 'Atualizando...' : 'Atualizar'}
              </button>
            )}
          </div>
        </div>

        {/* Barra de Filtros */}
        <div className="pt-3.5 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {filterMode === 'competence' ? (
            <>
              <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200/80">
                <Calendar size={14} className="text-slate-400 shrink-0" />
                <span className="text-[11px] font-bold text-slate-500 uppercase">Mês:</span>
                <select
                  value={selectedMonth}
                  onChange={(e) => handleCompetenceMonthChange(e.target.value)}
                  className="bg-transparent text-xs font-semibold text-slate-800 outline-none flex-1 cursor-pointer"
                >
                  {MONTH_OPTIONS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200/80">
                <Calendar size={14} className="text-slate-400 shrink-0" />
                <span className="text-[11px] font-bold text-slate-500 uppercase">Ano:</span>
                <select
                  value={selectedYear}
                  onChange={(e) => handleCompetenceYearChange(e.target.value)}
                  className="bg-transparent text-xs font-semibold text-slate-800 outline-none flex-1 cursor-pointer"
                >
                  <option value="all">Todos os anos</option>
                  {dashboard.availableYears.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200/80">
                <span className="text-[11px] font-bold text-slate-500 uppercase shrink-0">Competência:</span>
                <input
                  type="month"
                  value={selectedYear !== 'all' && selectedMonth !== 'all' ? `${selectedYear}-${selectedMonth}` : filterMonth}
                  onChange={(e) => handleCompetenceInputSync(e.target.value)}
                  className="bg-transparent text-xs font-semibold text-slate-800 outline-none flex-1 cursor-pointer"
                />
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200/80">
                <Calendar size={14} className="text-slate-400 shrink-0" />
                <span className="text-[11px] font-bold text-slate-500 uppercase">De:</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-transparent text-xs font-semibold text-slate-800 outline-none flex-1 cursor-pointer"
                />
              </div>
              <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200/80">
                <Calendar size={14} className="text-slate-400 shrink-0" />
                <span className="text-[11px] font-bold text-slate-500 uppercase">Até:</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-transparent text-xs font-semibold text-slate-800 outline-none flex-1 cursor-pointer"
                />
              </div>
              <div className="hidden lg:flex items-center px-3 py-2 text-[11px] text-slate-400 font-medium">
                Filtro por data efetiva de pagamento (Caixa) e vencimento (Lançamentos)
              </div>
            </>
          )}

          <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200/80">
            <Filter size={14} className="text-slate-400 shrink-0" />
            <span className="text-[11px] font-bold text-slate-500 uppercase">Categoria:</span>
            <select
              value={selectedCategoryFilter}
              onChange={(e) => setSelectedCategoryFilter(e.target.value as 'all' | ChacaraCategoryId)}
              className="bg-transparent text-xs font-semibold text-slate-800 outline-none flex-1 cursor-pointer"
            >
              <option value="all">Todas as categorias</option>
              <option value="fundo_reserva">Fundo de Reserva</option>
              <option value="agua">Água</option>
              <option value="energia">Energia</option>
              <option value="prestador">Prestador de Serviço</option>
              <option value="rateio">Rateio</option>
            </select>
          </div>
        </div>
      </div>

      {/* 1. Indicadores Financeiros Superiores (3 Cartões Principais) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Receitas Recebidas (Realizado)
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <TrendingUp size={17} />
            </div>
          </div>
          <div>
            <p className="text-2xl sm:text-3xl font-bold text-emerald-700 tracking-tight tabular-nums">
              {formatBRL(dashboard.fluxoRealizado.receitasRecebidasCents)}
            </p>
            <p className="text-xs text-slate-400 mt-1.5 tabular-nums">
              {dashboard.fluxoRealizado.paidBillsCount} baixa(s) na data de pagamento • Comp.:{' '}
              {formatBRL(dashboard.lancamentosGerais.totalRecebidoCents)} de{' '}
              {formatBRL(dashboard.lancamentosGerais.totalPrevistoCents)}
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Despesas Pagas (Realizado)
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
              <TrendingDown size={17} />
            </div>
          </div>
          <div>
            <p className="text-2xl sm:text-3xl font-bold text-rose-700 tracking-tight tabular-nums">
              {formatBRL(dashboard.fluxoRealizado.despesasPagasCents)}
            </p>
            <p className="text-xs text-slate-400 mt-1.5 tabular-nums">
              {dashboard.fluxoRealizado.paidExpensesCount} despesa(s) efetivada(s) • Lançadas na comp.:{' '}
              {formatBRL(dashboard.lancamentosGerais.despesasLancadasCents)}
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Inadimplência (Vencidos)
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
              <AlertCircle size={17} />
            </div>
          </div>
          <div>
            <p className="text-2xl sm:text-3xl font-bold text-rose-700 tracking-tight tabular-nums">
              {formatBRL(dashboard.lancamentosGerais.totalInadimplenteCents)}
            </p>
            <p className="text-xs text-slate-400 mt-1.5 tabular-nums">
              {dashboard.utilidadesECadastros.overdueBillsCount} conta(s) vencida(s) ({dashboard.lancamentosGerais.percentInadimplente}%) • A vencer:{' '}
              <span className="font-semibold text-amber-600">
                {formatBRL(dashboard.lancamentosGerais.totalPendenteCents)}
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* 1B. Separação Explícita das Duas Visões: Fluxo Realizado vs Lançamentos Gerais */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Visão A: Fluxo Realizado */}
        <div className="lg:col-span-5 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-4">
          <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3.5">
            <div>
              <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest">
                VISÃO A • DATA DE PAGAMENTO
              </span>
              <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2 mt-0.5">
                <Wallet size={16} className="text-emerald-600" />
                Fluxo Financeiro Realizado (Caixa)
              </h3>
            </div>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
              Regime de Caixa
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-2.5">
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50/70">
              <span className="text-xs font-semibold text-slate-600">Entradas Recebidas</span>
              <span className="text-sm sm:text-base font-bold text-emerald-700 tabular-nums">
                {formatBRL(dashboard.fluxoRealizado.receitasRecebidasCents)}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50/70">
              <span className="text-xs font-semibold text-slate-600">Saídas Pagas</span>
              <span className="text-sm sm:text-base font-bold text-rose-700 tabular-nums">
                {formatBRL(dashboard.fluxoRealizado.despesasPagasCents)}
              </span>
            </div>
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200/70">
              <div>
                <span className="text-xs font-bold text-slate-800 block">Saldo Financeiro Realizado</span>
                <span className="text-[10px] text-slate-400">Entradas efetivas − Saídas pagas</span>
              </div>
              <span
                className={cn(
                  'text-base sm:text-lg font-bold tabular-nums',
                  dashboard.fluxoRealizado.saldoRealizadoCents >= 0
                    ? 'text-emerald-700'
                    : 'text-rose-700'
                )}
              >
                {formatBRL(dashboard.fluxoRealizado.saldoRealizadoCents)}
              </span>
            </div>
          </div>

          {dashboard.fluxoRealizado.missingPaymentDateCount > 0 && (
            <div className="flex items-center gap-2 text-[11px] text-amber-700 bg-amber-50 px-3 py-2 rounded-xl border border-amber-100">
              <AlertTriangle size={14} className="shrink-0" />
              <span>
                {dashboard.fluxoRealizado.missingPaymentDateCount} recebimento(s) sem{' '}
                <code className="font-mono">payment_date</code> registrado (usando competência como referência).
              </span>
            </div>
          )}
        </div>

        {/* Visão B: Lançamentos Gerais */}
        <div className="lg:col-span-7 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-4">
          <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3.5">
            <div>
              <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">
                VISÃO B • COMPETÊNCIA / VENCIMENTO
              </span>
              <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2 mt-0.5">
                <FileSpreadsheet size={16} className="text-indigo-600" />
                Lançamentos Gerais do Período
              </h3>
            </div>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 tabular-nums">
              {dashboard.lancamentosGerais.billsCount} conta(s) • {dashboard.lancamentosGerais.expensesCount} desp.
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3 rounded-xl bg-slate-50/70">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Previsto</p>
              <p className="text-sm sm:text-base font-bold text-slate-900 tabular-nums mt-1">
                {formatBRL(dashboard.lancamentosGerais.totalPrevistoCents)}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50/70">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Total Recebido ({dashboard.lancamentosGerais.percentRecebido}%)
              </p>
              <p className="text-sm sm:text-base font-bold text-emerald-700 tabular-nums mt-1">
                {formatBRL(dashboard.lancamentosGerais.totalRecebidoCents)}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50/70">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Pendente A Vencer ({dashboard.lancamentosGerais.percentPendente}%)
              </p>
              <p className="text-sm sm:text-base font-bold text-amber-600 tabular-nums mt-1">
                {formatBRL(dashboard.lancamentosGerais.totalPendenteCents)}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50/70">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Inadimplente ({dashboard.lancamentosGerais.percentInadimplente}%)
              </p>
              <p className="text-sm sm:text-base font-bold text-rose-700 tabular-nums mt-1">
                {formatBRL(dashboard.lancamentosGerais.totalInadimplenteCents)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            <div className="p-3 rounded-xl bg-slate-50/70">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Contas a Receber</p>
              <p className="text-sm font-bold text-slate-800 tabular-nums mt-0.5">
                {formatBRL(dashboard.lancamentosGerais.contasAReceberCents)}
              </p>
              <p className="text-[10px] text-slate-400">Pendente + Vencido</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50/70">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Contas a Pagar</p>
              <p className="text-sm font-bold text-slate-800 tabular-nums mt-0.5">
                {formatBRL(dashboard.lancamentosGerais.contasAPagarCents)}
              </p>
              <p className="text-[10px] text-slate-400">
                Despesas lançadas: {formatBRL(dashboard.lancamentosGerais.despesasLancadasCents)}
              </p>
            </div>
            <div className="col-span-2 sm:col-span-1 p-3 rounded-xl bg-slate-50 border border-slate-200/70">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Saldo Previsto</p>
              <p
                className={cn(
                  'text-sm font-bold tabular-nums mt-0.5',
                  dashboard.lancamentosGerais.saldoPrevistoCents >= 0
                    ? 'text-indigo-700'
                    : 'text-rose-700'
                )}
              >
                {formatBRL(dashboard.lancamentosGerais.saldoPrevistoCents)}
              </p>
              <p className="text-[10px] text-slate-400">Receitas lanç. − Desp. lanç.</p>
            </div>
          </div>

          {/* Barra Global de Composição (100% Auditada) */}
          <div className="space-y-1.5">
            <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden flex">
              <div
                className="bg-emerald-500 h-full transition-all duration-300"
                style={{ width: `${dashboard.lancamentosGerais.percentRecebido}%` }}
                title={`Recebido: ${dashboard.lancamentosGerais.percentRecebido}%`}
              />
              <div
                className="bg-amber-500 h-full transition-all duration-300"
                style={{ width: `${dashboard.lancamentosGerais.percentPendente}%` }}
                title={`Pendente (a vencer): ${dashboard.lancamentosGerais.percentPendente}%`}
              />
              <div
                className="bg-rose-500 h-full transition-all duration-300"
                style={{ width: `${dashboard.lancamentosGerais.percentInadimplente}%` }}
                title={`Inadimplente (vencido): ${dashboard.lancamentosGerais.percentInadimplente}%`}
              />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-semibold text-slate-500 tabular-nums">
              <span className="text-emerald-700">
                Recebido: {dashboard.lancamentosGerais.percentRecebido}%
              </span>
              <span className="text-amber-600">
                Pendente a vencer: {dashboard.lancamentosGerais.percentPendente}%
              </span>
              <span className="text-rose-700">
                Inadimplente vencido: {dashboard.lancamentosGerais.percentInadimplente}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Indicadores de Água, Energia e Cadastros */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[11px] font-bold text-indigo-600 uppercase tracking-widest">
                {dashboard.activePeriodLabel} • HIDRÔMETROS
              </p>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight mt-0.5 flex items-center gap-2">
                <Droplets size={17} className="text-sky-600 shrink-0" />
                Água & Saneamento
              </h3>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-sky-50 text-sky-700 shrink-0 tabular-nums">
              {aguaCat?.percentRecebido ?? 0}% pago
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="text-center p-3 bg-slate-50/70 rounded-xl">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Consumo</p>
              <p className="text-base sm:text-lg font-bold text-slate-900 tabular-nums">
                {dashboard.utilidadesECadastros.totalWaterM3.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}{' '}
                <span className="text-xs font-semibold text-slate-400">m³</span>
              </p>
            </div>
            <div className="text-center p-3 bg-slate-50/70 rounded-xl">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Medidores</p>
              <p className="text-base sm:text-lg font-bold text-slate-900 tabular-nums">
                {dashboard.utilidadesECadastros.waterMetersCount}
              </p>
            </div>
            <div className="text-center p-3 bg-slate-50/70 rounded-xl">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Faturado</p>
              <p className="text-sm sm:text-base font-bold text-slate-800 tabular-nums">
                {formatBRL(aguaCat?.previstoCents ?? 0)}
              </p>
            </div>
            <div className="text-center p-3 bg-slate-50/70 rounded-xl">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Recebido</p>
              <p className="text-sm sm:text-base font-bold text-emerald-700 tabular-nums">
                {formatBRL(aguaCat?.recebidoCents ?? 0)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[11px] font-bold text-indigo-600 uppercase tracking-widest">
                {dashboard.activePeriodLabel} • MEDIÇÃO ELÉTRICA
              </p>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight mt-0.5 flex items-center gap-2">
                <Zap size={17} className="text-amber-600 shrink-0" />
                Energia Elétrica
              </h3>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 shrink-0 tabular-nums">
              {energiaCat?.percentRecebido ?? 0}% pago
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="text-center p-3 bg-slate-50/70 rounded-xl">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Consumo</p>
              <p className="text-base sm:text-lg font-bold text-slate-900 tabular-nums">
                {dashboard.utilidadesECadastros.totalEnergyKwh.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}{' '}
                <span className="text-xs font-semibold text-slate-400">kWh</span>
              </p>
            </div>
            <div className="text-center p-3 bg-slate-50/70 rounded-xl">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Padrões</p>
              <p className="text-base sm:text-lg font-bold text-slate-900 tabular-nums">
                {dashboard.utilidadesECadastros.energyMetersCount}
              </p>
            </div>
            <div className="text-center p-3 bg-slate-50/70 rounded-xl">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Faturado</p>
              <p className="text-sm sm:text-base font-bold text-slate-800 tabular-nums">
                {formatBRL(energiaCat?.previstoCents ?? 0)}
              </p>
            </div>
            <div className="text-center p-3 bg-slate-50/70 rounded-xl">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Recebido</p>
              <p className="text-sm sm:text-base font-bold text-emerald-700 tabular-nums">
                {formatBRL(energiaCat?.recebidoCents ?? 0)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[11px] font-bold text-indigo-600 uppercase tracking-widest">
                {dashboard.activePeriodLabel} • MORADORES & CONTAS
              </p>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight mt-0.5 flex items-center gap-2">
                <Users size={17} className="text-indigo-600 shrink-0" />
                Cadastros e Faturas
              </h3>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 shrink-0 tabular-nums">
              {dashboard.utilidadesECadastros.paidBillsPct}% quitadas
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="text-center p-3 bg-slate-50/70 rounded-xl">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Moradores Ativos</p>
              <p className="text-base sm:text-lg font-bold text-slate-900 tabular-nums">
                {dashboard.utilidadesECadastros.activeUsers}{' '}
                <span className="text-[11px] font-semibold text-slate-400">
                  / {dashboard.utilidadesECadastros.totalUsers}
                </span>
              </p>
            </div>
            <div className="text-center p-3 bg-slate-50/70 rounded-xl">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Contas Lançadas</p>
              <p className="text-base sm:text-lg font-bold text-slate-900 tabular-nums">
                {dashboard.utilidadesECadastros.billsCount}
              </p>
            </div>
            <div className="text-center p-3 bg-slate-50/70 rounded-xl">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Quitadas / Parc.</p>
              <p className="text-base sm:text-lg font-bold text-emerald-700 tabular-nums">
                {dashboard.utilidadesECadastros.paidBillsCount}{' '}
                <span className="text-xs font-semibold text-indigo-600">
                  (+{dashboard.utilidadesECadastros.partialBillsCount})
                </span>
              </p>
            </div>
            <div className="text-center p-3 bg-slate-50/70 rounded-xl">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Vencidas</p>
              <p className="text-base sm:text-lg font-bold text-rose-700 tabular-nums">
                {dashboard.utilidadesECadastros.overdueBillsCount}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Detalhamento por Categoria */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 sm:p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3.5">
          <div>
            <h3 className="font-bold text-slate-900 text-base sm:text-lg tracking-tight">
              Detalhamento por Categoria
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Previsto, recebido, pendente (a vencer), inadimplente (vencido) e contagem real de moradores — clique para auditar lançamentos
            </p>
          </div>
          <span className="text-xs font-semibold text-slate-500 font-mono tabular-nums">
            Período: {dashboard.activePeriodLabel}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {dashboard.categorias.map((cat) => {
            const vis = CATEGORY_VISUALS[cat.id];
            const Icon = vis.icon;

            return (
              <div
                key={cat.id}
                onClick={() => {
                  setModalStatusFilter('all');
                  setSelectedCategoryModal(cat.id);
                }}
                className="group p-4 rounded-xl border border-slate-200/70 hover:border-slate-300 bg-slate-50/40 hover:bg-white transition-all cursor-pointer flex flex-col justify-between shadow-xs space-y-3"
              >
                {/* Header */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center shrink-0', vis.bg, vis.color)}>
                      <Icon size={15} />
                    </div>
                    <h4 className="font-bold text-slate-900 text-xs truncate">{cat.title}</h4>
                  </div>
                  <span className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 tabular-nums shrink-0">
                    {cat.percentRecebido}%
                  </span>
                </div>

                {/* Total Previsto */}
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Total Previsto
                  </span>
                  <span className="text-lg font-bold text-slate-900 tabular-nums">
                    {formatBRL(cat.previstoCents)}
                  </span>
                </div>

                {/* Barra de Progresso Segmentada */}
                <div className="space-y-2">
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden flex">
                    <div
                      className="bg-emerald-500 h-full transition-all duration-300"
                      style={{ width: `${cat.percentRecebido}%` }}
                      title={`Recebido: ${cat.percentRecebido}%`}
                    />
                    <div
                      className="bg-amber-500 h-full transition-all duration-300"
                      style={{ width: `${cat.percentPendente}%` }}
                      title={`Pendente (a vencer): ${cat.percentPendente}%`}
                    />
                    <div
                      className="bg-rose-500 h-full transition-all duration-300"
                      style={{ width: `${cat.percentInadimplente}%` }}
                      title={`Inadimplente (vencido): ${cat.percentInadimplente}%`}
                    />
                  </div>

                  <div className="space-y-1 text-[11px] tabular-nums">
                    <div className="flex items-center justify-between font-semibold">
                      <span className="text-slate-500">Recebido</span>
                      <span className="text-emerald-700">{formatBRL(cat.recebidoCents)}</span>
                    </div>
                    <div className="flex items-center justify-between font-semibold">
                      <span className="text-slate-500">Pendente (a vencer)</span>
                      <span className="text-amber-600">{formatBRL(cat.pendenteCents)}</span>
                    </div>
                    <div className="flex items-center justify-between font-semibold">
                      <span className="text-slate-500">Inadimplente</span>
                      <span className="text-rose-700">{formatBRL(cat.inadimplenteCents)}</span>
                    </div>
                  </div>
                </div>

                {/* Moradores */}
                <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] tabular-nums">
                  <div className="flex items-center gap-1 text-emerald-700" title="Moradores que quitaram a categoria">
                    <CheckCircle2 size={12} />
                    <span className="font-semibold">{cat.moradoresPagantes} pagaram</span>
                  </div>
                  <div className="flex items-center gap-1 text-amber-600" title="Moradores com saldo pendente ou vencido">
                    <Clock size={12} />
                    <span className="font-semibold">{cat.moradoresPendentes} pendentes</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Análise Mensal & Comparativo com Mês Anterior + Análise Anual e Geral */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Análise Mensal */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 sm:p-6 space-y-4">
          <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3.5">
            <div>
              <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">
                FECHAMENTO MENSAL
              </span>
              <h3 className="font-bold text-slate-900 text-base tracking-tight mt-0.5">
                Análise Mensal ({formatMonthLabelPtBr(dashboard.analiseMensal.targetMonthRef)})
              </h3>
            </div>
            <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full tabular-nums">
              {dashboard.analiseMensal.atual.percentRecebido}% recebido
            </span>
          </div>

          <div className="space-y-2.5">
            <div className="p-3 rounded-xl bg-slate-50/70 flex items-center justify-between gap-2">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Receitas Realizadas no Mês</p>
                <p className="text-base font-bold text-emerald-700 tabular-nums">
                  {formatBRL(dashboard.analiseMensal.atual.recebidoRealizadoCents)}
                </p>
              </div>
              <div className="text-right tabular-nums">
                <span
                  className={cn(
                    'inline-flex items-center gap-0.5 text-[11px] font-bold',
                    dashboard.analiseMensal.deltas.recebidoDiffCents >= 0 ? 'text-emerald-700' : 'text-rose-700'
                  )}
                >
                  {dashboard.analiseMensal.deltas.recebidoDiffCents >= 0 ? (
                    <ArrowUpRight size={13} />
                  ) : (
                    <ArrowDownRight size={13} />
                  )}
                  {formatBRL(Math.abs(dashboard.analiseMensal.deltas.recebidoDiffCents))}
                </span>
                <p className="text-[10px] text-slate-400">
                  {formatDeltaPct(dashboard.analiseMensal.deltas.recebidoDiffPct)}
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50/70 flex items-center justify-between gap-2">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Despesas Pagas no Mês</p>
                <p className="text-base font-bold text-rose-700 tabular-nums">
                  {formatBRL(dashboard.analiseMensal.atual.despesasPagasCents)}
                </p>
              </div>
              <div className="text-right tabular-nums">
                <span className="text-[11px] font-bold text-slate-700">
                  {dashboard.analiseMensal.deltas.despesasDiffCents >= 0 ? '+' : '−'}
                  {formatBRL(Math.abs(dashboard.analiseMensal.deltas.despesasDiffCents))}
                </span>
                <p className="text-[10px] text-slate-400">
                  {formatDeltaPct(dashboard.analiseMensal.deltas.despesasDiffPct)}
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50/70 flex items-center justify-between gap-2">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Inadimplência da Competência</p>
                <p className="text-base font-bold text-rose-700 tabular-nums">
                  {formatBRL(dashboard.analiseMensal.atual.inadimplenteCents)}
                </p>
              </div>
              <div className="text-right tabular-nums">
                <span
                  className={cn(
                    'text-[11px] font-bold',
                    dashboard.analiseMensal.deltas.inadimplenteDiffCents <= 0 ? 'text-emerald-700' : 'text-rose-700'
                  )}
                >
                  {dashboard.analiseMensal.deltas.inadimplenteDiffCents >= 0 ? '+' : '−'}
                  {formatBRL(Math.abs(dashboard.analiseMensal.deltas.inadimplenteDiffCents))}
                </span>
                <p className="text-[10px] text-slate-400">
                  {formatDeltaPct(dashboard.analiseMensal.deltas.inadimplenteDiffPct)}
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center justify-between gap-2">
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase">Saldo Realizado do Mês</p>
                <p
                  className={cn(
                    'text-base font-bold tabular-nums',
                    dashboard.analiseMensal.atual.saldoRealizadoCents >= 0 ? 'text-emerald-700' : 'text-rose-700'
                  )}
                >
                  {formatBRL(dashboard.analiseMensal.atual.saldoRealizadoCents)}
                </p>
              </div>
              <div className="text-right tabular-nums">
                <span className="text-[11px] font-semibold text-slate-600">
                  Mês ant. ({formatMonthLabelPtBr(dashboard.analiseMensal.previousMonthRef)}):{' '}
                  {dashboard.analiseMensal.anterior
                    ? formatBRL(dashboard.analiseMensal.anterior.saldoRealizadoCents)
                    : 'R$ 0,00'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Análise Anual & Geral */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 sm:p-6 space-y-4">
          <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3.5">
            <div>
              <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">
                ACUMULADO SEM DUPLICIDADE
              </span>
              <h3 className="font-bold text-slate-900 text-base tracking-tight mt-0.5">
                Análise Anual e Geral ({dashboard.analiseAnual.targetYear})
              </h3>
            </div>
            <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full tabular-nums">
              {dashboard.analiseAnual.mesesComLancamento} mês(es) ativo(s) •{' '}
              {dashboard.analiseAnual.percentRecebidoAnual}% recebido
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3 rounded-xl bg-slate-50/70">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Previsto Anual</p>
              <p className="text-sm font-bold text-slate-900 tabular-nums mt-0.5">
                {formatBRL(dashboard.analiseAnual.totalPrevistoAnualCents)}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50/70">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Recebido (Caixa)</p>
              <p className="text-sm font-bold text-emerald-700 tabular-nums mt-0.5">
                {formatBRL(dashboard.analiseAnual.totalRecebidoRealizadoAnualCents)}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50/70">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Despesas Pagas</p>
              <p className="text-sm font-bold text-rose-700 tabular-nums mt-0.5">
                {formatBRL(dashboard.analiseAnual.totalDespesasPagasAnualCents)}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
              <p className="text-[10px] font-bold text-slate-500 uppercase">Resultado Anual</p>
              <p
                className={cn(
                  'text-sm font-bold tabular-nums mt-0.5',
                  dashboard.analiseAnual.resultadoAnualRealizadoCents >= 0
                    ? 'text-emerald-700'
                    : 'text-rose-700'
                )}
              >
                {formatBRL(dashboard.analiseAnual.resultadoAnualRealizadoCents)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3 rounded-xl bg-slate-50/70">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Pendente (A vencer)</p>
              <p className="text-sm font-bold text-amber-600 tabular-nums mt-0.5">
                {formatBRL(dashboard.analiseAnual.totalPendenteAnualCents)}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50/70">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Inadimplência Anual</p>
              <p className="text-sm font-bold text-rose-700 tabular-nums mt-0.5">
                {formatBRL(dashboard.analiseAnual.totalInadimplenteAnualCents)}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50/70">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Média Mensal Entradas</p>
              <p className="text-sm font-bold text-slate-800 tabular-nums mt-0.5">
                {formatBRL(dashboard.analiseAnual.mediaMensalReceitasCents)}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50/70">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Média Mensal Desp.</p>
              <p className="text-sm font-bold text-slate-800 tabular-nums mt-0.5">
                {formatBRL(dashboard.analiseAnual.mediaMensalDespesasCents)}
              </p>
            </div>
          </div>

          {/* Ranking de Inadimplência & Comparativo Anos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            <div className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-100 space-y-2">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Categorias com Maior Inadimplência ({dashboard.activePeriodLabel})
              </p>
              <div className="space-y-1.5">
                {dashboard.analiseAnual.categoriasMaiorInadimplencia.slice(0, 3).map((item) => (
                  <div key={item.id} className="flex items-center justify-between text-xs tabular-nums">
                    <span className="font-medium text-slate-700 truncate">{item.title}</span>
                    <span className="font-bold text-rose-700">
                      {formatBRL(item.inadimplenteCents)}{' '}
                      <span className="text-[10px] font-normal text-slate-400">
                        ({item.percentInadimplenteCategoria}%)
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-100 space-y-2">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Comparativo entre Anos
              </p>
              {dashboard.analiseAnual.comparativoAnos.length > 0 ? (
                <div className="space-y-1.5">
                  {dashboard.analiseAnual.comparativoAnos.map((yp) => (
                    <div key={yp.year} className="flex items-center justify-between text-xs tabular-nums">
                      <span className="font-bold text-slate-800">{yp.year}</span>
                      <span className="text-slate-600">
                        Rec: <strong className="text-emerald-700">{formatBRL(yp.recebidoRealizadoCents)}</strong> • Desp:{' '}
                        <strong className="text-rose-700">{formatBRL(yp.despesasPagasCents)}</strong>
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400">Sem registros anuais disponíveis.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 5. Gráficos Completos (6 Análises Visuais com Cores Preservadas) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Gráfico 1: Recebimentos vs Pendentes vs Inadimplentes por Categoria */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 sm:p-6">
          <div className="border-b border-slate-100 pb-3.5 mb-5">
            <h3 className="font-bold text-slate-900 text-base tracking-tight flex items-center gap-2">
              <BarChart3 size={17} className="text-indigo-600" />
              Recebimentos vs Pendentes vs Inadimplentes
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Composição financeira por categoria ({dashboard.activePeriodLabel})
            </p>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryBarChartData} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `R$${v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}`}
                />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                  formatter={brlTooltipFormatter}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Bar dataKey="Recebido" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={28} />
                <Bar dataKey="Pendente (A vencer)" fill="#f59e0b" radius={[6, 6, 0, 0]} maxBarSize={28} />
                <Bar dataKey="Inadimplente (Vencido)" fill="#f43f5e" radius={[6, 6, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico 2: Comparativo Mensal de Receitas e Despesas */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 sm:p-6">
          <div className="border-b border-slate-100 pb-3.5 mb-5">
            <h3 className="font-bold text-slate-900 text-base tracking-tight flex items-center gap-2">
              <TrendingUp size={17} className="text-emerald-600" />
              Comparativo Mensal: Receitas vs Despesas
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Fluxo realizado mensal e saldos inadimplentes (últimos 12 meses)
            </p>
          </div>
          {monthlyHistoryChartData.length > 0 ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyHistoryChartData} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `R$${v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}`}
                  />
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                    formatter={brlTooltipFormatter}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  <Bar dataKey="Receitas Realizadas" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={24} />
                  <Bar dataKey="Despesas Pagas" fill="#f43f5e" radius={[6, 6, 0, 0]} maxBarSize={24} />
                  <Bar dataKey="Pendente A Vencer" fill="#f59e0b" radius={[6, 6, 0, 0]} maxBarSize={24} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-xs text-slate-400">
              Sem histórico mensal suficiente para exibição.
            </div>
          )}
        </div>

        {/* Gráfico 3: Evolução da Inadimplência */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 sm:p-6">
          <div className="border-b border-slate-100 pb-3.5 mb-5">
            <h3 className="font-bold text-slate-900 text-base tracking-tight flex items-center gap-2">
              <AlertCircle size={17} className="text-rose-600" />
              Evolução da Inadimplência
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Valores vencidos em aberto por competência mensal (R$)</p>
          </div>
          {monthlyHistoryChartData.length > 0 ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyHistoryChartData} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `R$${v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}`}
                  />
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                    formatter={brlTooltipFormatter}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  <Line type="monotone" dataKey="Inadimplência" stroke="#f43f5e" strokeWidth={2.5} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="Pendente A Vencer" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-xs text-slate-400">
              Sem dados históricos para exibição.
            </div>
          )}
        </div>

        {/* Gráfico 4: Desempenho por Categoria (% Recebido vs Inadimplente) */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 sm:p-6">
          <div className="border-b border-slate-100 pb-3.5 mb-5">
            <h3 className="font-bold text-slate-900 text-base tracking-tight flex items-center gap-2">
              <Percent size={17} className="text-indigo-600" />
              Desempenho por Categoria (%)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Taxa de adimplência e pendência sobre o faturado</p>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryPerformanceChartData} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                  formatter={pctTooltipFormatter}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Bar dataKey="% Recebido" stackId="pct" fill="#10b981" maxBarSize={36} />
                <Bar dataKey="% Pendente" stackId="pct" fill="#f59e0b" maxBarSize={36} />
                <Bar dataKey="% Inadimplente" stackId="pct" fill="#f43f5e" radius={[6, 6, 0, 0]} maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico 5: Percentual de Recebimento por Mês */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 sm:p-6">
          <div className="border-b border-slate-100 pb-3.5 mb-5">
            <h3 className="font-bold text-slate-900 text-base tracking-tight flex items-center gap-2">
              <CheckCircle2 size={17} className="text-emerald-600" />
              Percentual de Recebimento por Mês
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Evolução da eficiência de arrecadação (%)</p>
          </div>
          {monthlyHistoryChartData.length > 0 ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyHistoryChartData} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                    formatter={pctTooltipFormatter}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  <Line type="monotone" dataKey="% Recebimento" stroke="#10b981" strokeWidth={2.5} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="% Inadimplência" stroke="#f43f5e" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-xs text-slate-400">
              Sem dados históricos para exibição.
            </div>
          )}
        </div>

        {/* Gráfico 6: Evolução do Saldo Financeiro */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 sm:p-6">
          <div className="border-b border-slate-100 pb-3.5 mb-5">
            <h3 className="font-bold text-slate-900 text-base tracking-tight flex items-center gap-2">
              <Wallet size={17} className="text-indigo-600" />
              Evolução do Saldo Financeiro
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Resultado mensal realizado e saldo acumulado de caixa (sem duplicidades)
            </p>
          </div>
          {monthlyHistoryChartData.length > 0 ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={monthlyHistoryChartData} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `R$${v >= 1000 || v <= -1000 ? `${(v / 1000).toFixed(1)}k` : v}`}
                  />
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                    formatter={brlTooltipFormatter}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  <Bar dataKey="Saldo Mensal" fill="#6366f1" radius={[6, 6, 0, 0]} maxBarSize={28} />
                  <Line type="monotone" dataKey="Saldo Acumulado" stroke="#10b981" strokeWidth={2.5} dot={{ r: 4 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-xs text-slate-400">
              Sem dados históricos para exibição.
            </div>
          )}
        </div>
      </div>

      {/* 6. Conferência Matemática e Auditoria de Dados */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 sm:p-6 space-y-4">
        <div
          onClick={() => setShowAuditDetails((prev) => !prev)}
          className="flex items-center justify-between gap-3 cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'w-9 h-9 rounded-xl flex items-center justify-center shrink-0',
                dashboard.auditoria.allPassed ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
              )}
            >
              {dashboard.auditoria.allPassed ? <ShieldCheck size={19} /> : <AlertTriangle size={19} />}
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base tracking-tight">
                Conferência Matemática e Auditoria de Integridade
              </h3>
              <p className="text-xs text-slate-500">
                {dashboard.auditoria.allPassed
                  ? 'Todas as 5 equações de reconciliação fecharam com divergência de R$ 0,00.'
                  : 'Atenção: foram detectadas divergências entre registros de origem e totais.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200 transition-colors shrink-0"
          >
            {showAuditDetails ? 'Ocultar detalhes' : 'Ver conferência'}
            {showAuditDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>

        {showAuditDetails && (
          <div className="pt-4 border-t border-slate-100 space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200/70">
                    <th className="px-3.5 py-2.5 font-bold text-slate-500 uppercase">Regra de Conferência</th>
                    <th className="px-3.5 py-2.5 font-bold text-slate-500 uppercase text-right">Lado A</th>
                    <th className="px-3.5 py-2.5 font-bold text-slate-500 uppercase text-right">Lado B</th>
                    <th className="px-3.5 py-2.5 font-bold text-slate-500 uppercase text-right">Divergência</th>
                    <th className="px-3.5 py-2.5 font-bold text-slate-500 uppercase text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 tabular-nums">
                  {dashboard.auditoria.checks.map((chk) => (
                    <tr key={chk.id}>
                      <td className="px-3.5 py-2.5">
                        <p className="font-semibold text-slate-800">{chk.label}</p>
                        <p className="text-[11px] text-slate-400">{chk.description}</p>
                      </td>
                      <td className="px-3.5 py-2.5 text-right font-semibold text-slate-700">
                        {chk.isCount ? chk.leftValueCents : formatBRL(chk.leftValueCents)}
                      </td>
                      <td className="px-3.5 py-2.5 text-right font-semibold text-slate-700">
                        {chk.isCount ? chk.rightValueCents : formatBRL(chk.rightValueCents)}
                      </td>
                      <td className="px-3.5 py-2.5 text-right font-bold">
                        <span className={chk.diffCents === 0 ? 'text-emerald-700' : 'text-rose-700'}>
                          {chk.isCount ? chk.diffCents : formatBRL(chk.diffCents)}
                        </span>
                      </td>
                      <td className="px-3.5 py-2.5 text-center">
                        <span
                          className={cn(
                            'px-2 py-0.5 rounded-full text-[10px] font-bold uppercase',
                            chk.passed ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                          )}
                        >
                          {chk.passed ? 'Conciliado' : 'Divergente'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {dashboard.auditoria.subCentAdjustedBills.length > 0 && (
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 space-y-1.5 text-xs">
                <p className="font-bold text-slate-700">
                  Reconciliações de centavo residual em contas legadas ({dashboard.auditoria.subCentAdjustedBills.length}):
                </p>
                <div className="max-h-36 overflow-y-auto space-y-1 text-[11px] text-slate-600 tabular-nums">
                  {dashboard.auditoria.subCentAdjustedBills.map((adj) => (
                    <div key={adj.billId} className="flex justify-between">
                      <span>
                        Conta #{adj.billId} ({adj.residentName} • {adj.monthReference}) → categoria{' '}
                        <strong>{adj.adjustedCategory}</strong>
                      </span>
                      <span className="font-semibold">
                        {adj.diffCents > 0 ? '+' : ''}
                        {formatBRL(adj.diffCents)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {dashboard.auditoria.criticalMismatches.length > 0 && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 space-y-1.5 text-xs text-rose-800">
                <p className="font-bold">
                  Divergências críticas entre total salvo e soma dos itens ({dashboard.auditoria.criticalMismatches.length}):
                </p>
                <div className="max-h-36 overflow-y-auto space-y-1 text-[11px] tabular-nums">
                  {dashboard.auditoria.criticalMismatches.map((m) => (
                    <div key={m.billId} className="flex justify-between">
                      <span>
                        Conta #{m.billId} ({m.residentName} • {m.monthReference}) — Salvo:{' '}
                        {formatBRL(m.storedTotalCents)} vs Soma Itens: {formatBRL(m.categoriesSumCents)}
                      </span>
                      <span className="font-bold">{formatBRL(m.diffCents)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal de Rastreabilidade por Categoria */}
      {modalCategoryData && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedCategoryModal(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[85vh] flex flex-col border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/80">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Rastreabilidade — {modalCategoryData.title}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
                  Período: {dashboard.activePeriodLabel} • Previsto: {formatBRL(modalCategoryData.previstoCents)} • Recebido:{' '}
                  {formatBRL(modalCategoryData.recebidoCents)} • A receber:{' '}
                  {formatBRL(modalCategoryData.aReceberCents)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCategoryModal(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <div className="px-5 py-3 border-b border-slate-100 flex flex-wrap gap-1.5 bg-white">
              {(['all', 'pago', 'parcial', 'pendente', 'inadimplente'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setModalStatusFilter(st)}
                  className={cn(
                    'px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer',
                    modalStatusFilter === st
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  )}
                >
                  {st === 'all'
                    ? `Todos (${modalCategoryData.items.length})`
                    : st === 'pago'
                    ? 'Pagos'
                    : st === 'parcial'
                    ? 'Parciais'
                    : st === 'pendente'
                    ? 'Pendentes (A vencer)'
                    : 'Inadimplentes (Vencidos)'}
                </button>
              ))}
            </div>

            <div className="p-5 overflow-y-auto space-y-2">
              {modalCategoryData.items
                .filter((item) => modalStatusFilter === 'all' || item.status === modalStatusFilter)
                .map((item) => (
                  <div
                    key={`${item.billId}-${modalCategoryData.id}`}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs"
                  >
                    <div>
                      <p className="font-semibold text-slate-800">
                        {item.residentName}{' '}
                        <span className="text-[10px] font-mono text-slate-400">#{item.billId}</span>
                      </p>
                      <p className="text-[11px] text-slate-400 tabular-nums">
                        Comp.: {formatMonthLabelPtBr(item.monthReference)} • Venc.:{' '}
                        {item.dueDate ? new Date(item.dueDate + 'T12:00:00').toLocaleDateString('pt-BR') : '-'}
                        {item.paymentDate
                          ? ` • Pgto: ${new Date(item.paymentDate + 'T12:00:00').toLocaleDateString('pt-BR')}`
                          : ''}
                      </p>
                    </div>
                    <div className="text-left sm:text-right tabular-nums flex sm:flex-col items-center sm:items-end justify-between gap-1">
                      <div>
                        <span className="font-bold text-slate-900">{formatBRL(item.previstoCents)}</span>
                        {item.recebidoCents > 0 && item.aReceberCents > 0 && (
                          <span className="text-[10px] text-slate-500 ml-2">
                            (Pago: {formatBRL(item.recebidoCents)} | Resta: {formatBRL(item.aReceberCents)})
                          </span>
                        )}
                      </div>
                      <span
                        className={cn(
                          'text-[10px] font-bold px-2 py-0.5 rounded uppercase',
                          item.status === 'pago'
                            ? 'bg-emerald-50 text-emerald-700'
                            : item.status === 'parcial'
                            ? 'bg-indigo-50 text-indigo-700'
                            : item.status === 'inadimplente'
                            ? 'bg-rose-50 text-rose-700'
                            : 'bg-amber-50 text-amber-700'
                        )}
                      >
                        {item.status === 'pago'
                          ? 'Pago'
                          : item.status === 'parcial'
                          ? 'Parcial'
                          : item.status === 'inadimplente'
                          ? 'Inadimplente'
                          : 'Pendente'}
                      </span>
                    </div>
                  </div>
                ))}
              {modalCategoryData.items.filter(
                (item) => modalStatusFilter === 'all' || item.status === modalStatusFilter
              ).length === 0 && (
                <div className="py-10 text-center text-xs text-slate-400">
                  Nenhum registro encontrado para este filtro.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
