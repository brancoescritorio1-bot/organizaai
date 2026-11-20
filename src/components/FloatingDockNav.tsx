import React, { useState } from 'react';
import {
  Home,
  CheckSquare,
  Wallet,
  Trees,
  GraduationCap,
  Briefcase,
  Plus,
  MoreHorizontal,
  Settings,
  X,
  StickyNote,
  ArrowRight,
  LogOut,
  Download,
  Image as ImageIcon,
  Sun,
  Moon,
  Monitor,
  Tag,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { AppModule } from './Sidebar';
import { useTheme, ThemeMode } from './ThemeContext';
import { getLocalTodayDateStr } from '../lib/personalUtils';

interface FloatingDockNavProps {
  activeModule: AppModule;
  onSelectModule: (module: AppModule, tab?: string) => void;
  onQuickCreateTask: (task: {
    title: string;
    due_date?: string;
    due_time?: string;
    category?: string;
    priority: 'low' | 'medium' | 'high';
  }) => Promise<void>;
  onQuickAddNote: (text: string) => void;
  onOpenCoverCustomizer?: () => void;
  onExportPDF?: () => void;
  onLogout: () => void;
}

const ALL_MODULES: Array<{
  id: AppModule;
  label: string;
  shortLabel: string;
  description: string;
  icon: React.ElementType;
  defaultTab?: string;
}> = [
  { id: 'home', label: 'Início', shortLabel: 'Início', description: 'Visão geral e hoje', icon: Home },
  { id: 'personal', label: 'Pessoal', shortLabel: 'Pessoal', description: 'Tarefas, hábitos e matriz', icon: CheckSquare },
  { id: 'financial', label: 'Financeiro', shortLabel: 'Finanças', description: 'Fluxo e faturas', icon: Wallet },
  { id: 'chacara', label: 'Chácara', shortLabel: 'Chácara', description: 'Contas e rateios', icon: Trees },
  { id: 'academic', label: 'Acadêmico', shortLabel: 'Estudos', description: 'Notas e presença', icon: GraduationCap },
  { id: 'work', label: 'Trabalho', shortLabel: 'Trabalho', description: 'Clientes e escalas', icon: Briefcase },
];

const SETTINGS_LINKS: Array<{
  module: Exclude<AppModule, 'home'>;
  tab: string;
  label: string;
}> = [
  { module: 'financial', tab: 'fin_settings', label: 'Configurações Financeiro' },
  { module: 'chacara', tab: 'chacara_settings', label: 'Configurações Chácara' },
  { module: 'academic', tab: 'settings', label: 'Configurações Acadêmico' },
];

export const FloatingDockNav: React.FC<FloatingDockNavProps> = ({
  activeModule,
  onSelectModule,
  onQuickCreateTask,
  onQuickAddNote,
  onOpenCoverCustomizer,
  onExportPDF,
  onLogout,
}) => {
  const { themeMode, setThemeMode } = useTheme();
  const [quickOpen, setQuickOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const [quickType, setQuickType] = useState<'task' | 'note'>('task');
  const [quickText, setQuickText] = useState('');
  const [quickDate, setQuickDate] = useState(() => getLocalTodayDateStr());
  const [quickTime, setQuickTime] = useState('');
  const [quickCategory, setQuickCategory] = useState('');
  const [quickPriority, setQuickPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isInternalTab = activeModule !== 'home';
  const activeModuleMeta = ALL_MODULES.find((m) => m.id === activeModule);

  const leftDesktopModules = ALL_MODULES.slice(0, 3); // home, personal, financial
  const rightDesktopModules = ALL_MODULES.slice(3); // chacara, academic, work

  const isMoreActiveMobile = activeModule === 'chacara' || activeModule === 'academic' || activeModule === 'work';
  const activeMobileExtraLabel = isMoreActiveMobile
    ? ALL_MODULES.find((m) => m.id === activeModule)?.shortLabel || 'Mais'
    : 'Módulos';

  const handleQuickSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = quickText.trim();
    if (!trimmed || isSubmitting) return;

    setIsSubmitting(true);
    try {
      if (quickType === 'task') {
        await onQuickCreateTask({
          title: trimmed,
          due_date: quickDate || undefined,
          due_time: quickTime || undefined,
          category: quickCategory.trim() || undefined,
          priority: quickPriority,
        });
      } else {
        onQuickAddNote(trimmed);
      }
      setQuickText('');
      setQuickTime('');
      setQuickCategory('');
      setQuickOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const themeOptions: Array<{ id: ThemeMode; label: string; icon: React.ElementType }> = [
    { id: 'light', label: 'Claro', icon: Sun },
    { id: 'dark', label: 'Escuro', icon: Moon },
    { id: 'system', label: 'Sistema', icon: Monitor },
  ];

  return (
    <>
      {/* Secondary Modules & Settings Sheet / Popover */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/40 dark:bg-black/60 backdrop-blur-xs flex items-end justify-center p-3 sm:p-6 print:hidden"
          onClick={() => setMenuOpen(false)}
        >
          <div
            className="w-full max-w-md mb-16 sm:mb-20 bg-white/95 dark:bg-[#161618]/95 backdrop-blur-2xl border border-black/[0.08] dark:border-white/[0.12] rounded-3xl p-5 text-[#1d1d1f] dark:text-zinc-100 shadow-[0_24px_60px_rgba(0,0,0,0.22)] dark:shadow-[0_24px_60px_rgba(0,0,0,0.65)] space-y-5 max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-black/[0.06] dark:border-white/[0.08] pb-3.5">
              <div>
                <h3 className="text-sm font-semibold text-[#1d1d1f] dark:text-white tracking-tight">
                  Módulos & Preferências
                </h3>
                <p className="text-xs text-[#6e6e73] dark:text-zinc-400 mt-0.5">
                  Navegue, ajuste o tema ou acesse configurações
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className="w-9 h-9 rounded-xl bg-black/[0.05] dark:bg-white/[0.06] hover:bg-black/[0.1] dark:hover:bg-white/[0.12] text-[#515154] dark:text-zinc-300 flex items-center justify-center transition-colors cursor-pointer"
                aria-label="Fechar menu"
              >
                <X size={16} />
              </button>
            </div>

            {/* Theme Segmented Control */}
            <div className="space-y-1.5">
              <p className="text-[11px] font-medium text-[#6e6e73] dark:text-zinc-400 px-1">
                Aparência do aplicativo
              </p>
              <div className="grid grid-cols-3 gap-1 p-1 bg-[#f5f5f7] dark:bg-white/[0.05] rounded-xl border border-black/[0.06] dark:border-white/[0.07]">
                {themeOptions.map((opt) => {
                  const Icon = opt.icon;
                  const active = themeMode === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setThemeMode(opt.id)}
                      className={cn(
                        'py-2 px-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer',
                        active
                          ? 'bg-white dark:bg-white text-[#1d1d1f] dark:text-zinc-950 font-semibold shadow-xs'
                          : 'text-[#6e6e73] dark:text-zinc-400 hover:text-[#1d1d1f] dark:hover:text-white'
                      )}
                    >
                      <Icon size={13} />
                      <span>{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* All Modules Grid */}
            <div className="grid grid-cols-2 gap-2">
              {ALL_MODULES.map((mod) => {
                const Icon = mod.icon;
                const isActive = activeModule === mod.id;
                return (
                  <button
                    key={mod.id}
                    type="button"
                    onClick={() => {
                      onSelectModule(mod.id, mod.defaultTab);
                      setMenuOpen(false);
                    }}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-2xl text-left transition-all cursor-pointer border',
                      isActive
                        ? 'bg-[#1d1d1f] dark:bg-white text-white dark:text-zinc-950 border-[#1d1d1f] dark:border-white font-semibold'
                        : 'bg-[#f5f5f7] dark:bg-white/[0.04] hover:bg-[#ebebef] dark:hover:bg-white/[0.08] text-[#1d1d1f] dark:text-zinc-200 border-black/[0.05] dark:border-white/[0.06]'
                    )}
                  >
                    <div
                      className={cn(
                        'w-9 h-9 rounded-xl flex items-center justify-center shrink-0',
                        isActive
                          ? 'bg-white/15 dark:bg-zinc-900 text-white'
                          : 'bg-white dark:bg-white/[0.07] text-[#1d1d1f] dark:text-zinc-200'
                      )}
                    >
                      <Icon size={16} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold truncate">{mod.label}</p>
                      <p
                        className={cn(
                          'text-[11px] truncate',
                          isActive ? 'text-zinc-300 dark:text-zinc-600' : 'text-[#6e6e73] dark:text-zinc-400'
                        )}
                      >
                        {mod.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Settings & Utilities */}
            <div className="space-y-1.5 pt-1 border-t border-black/[0.06] dark:border-white/[0.08]">
              <p className="text-[11px] font-medium text-[#6e6e73] dark:text-zinc-400 px-1 pb-1">
                Configurações & Ações
              </p>
              {SETTINGS_LINKS.map((item) => (
                <button
                  key={`${item.module}-${item.tab}`}
                  type="button"
                  onClick={() => {
                    onSelectModule(item.module, item.tab);
                    setMenuOpen(false);
                  }}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-[#f5f5f7]/70 dark:bg-white/[0.03] hover:bg-[#ebebef] dark:hover:bg-white/[0.08] text-xs font-medium text-[#1d1d1f] dark:text-zinc-200 transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2.5">
                    <Settings size={14} className="text-[#6e6e73] dark:text-zinc-400" />
                    {item.label}
                  </span>
                  <ArrowRight size={13} className="text-[#86868b] dark:text-zinc-500" />
                </button>
              ))}

              {onOpenCoverCustomizer && (
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onOpenCoverCustomizer();
                  }}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-[#f5f5f7]/70 dark:bg-white/[0.03] hover:bg-[#ebebef] dark:hover:bg-white/[0.08] text-xs font-medium text-[#1d1d1f] dark:text-zinc-200 transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2.5">
                    <ImageIcon size={14} className="text-[#6e6e73] dark:text-zinc-400" />
                    Personalizar imagem de capa
                  </span>
                  <ArrowRight size={13} className="text-[#86868b] dark:text-zinc-500" />
                </button>
              )}

              <div className="grid grid-cols-2 gap-2 pt-2">
                {onExportPDF && activeModule !== 'home' && (
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onExportPDF();
                    }}
                    className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-[#f5f5f7] dark:bg-white/[0.06] hover:bg-[#e5e5ea] dark:hover:bg-white/[0.12] text-xs font-medium text-[#1d1d1f] dark:text-zinc-200 transition-colors cursor-pointer"
                  >
                    <Download size={14} />
                    Exportar PDF
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onLogout();
                  }}
                  className={cn(
                    'flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-rose-500/10 dark:bg-rose-500/15 hover:bg-rose-500/20 dark:hover:bg-rose-500/25 text-xs font-medium text-rose-600 dark:text-rose-300 transition-colors cursor-pointer',
                    (!onExportPDF || activeModule === 'home') && 'col-span-2'
                  )}
                >
                  <LogOut size={14} />
                  Encerrar sessão
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Action (+) Modal */}
      {quickOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/45 dark:bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-3 sm:p-6 print:hidden"
          onClick={() => setQuickOpen(false)}
        >
          <div
            className="w-full max-w-lg mb-16 sm:mb-0 bg-white/95 dark:bg-[#161618]/95 backdrop-blur-2xl border border-black/[0.08] dark:border-white/[0.12] rounded-3xl p-5 sm:p-6 text-[#1d1d1f] dark:text-zinc-100 shadow-[0_24px_64px_rgba(0,0,0,0.22)] dark:shadow-[0_24px_64px_rgba(0,0,0,0.65)] space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-[#1d1d1f] dark:text-white tracking-tight">
                  Acesso Rápido
                </h3>
                <p className="text-xs text-[#6e6e73] dark:text-zinc-400 mt-0.5">
                  Crie uma tarefa, anotação ou inicie um lançamento
                </p>
              </div>
              <button
                type="button"
                onClick={() => setQuickOpen(false)}
                className="w-9 h-9 rounded-xl bg-black/[0.05] dark:bg-white/[0.06] hover:bg-black/[0.1] dark:hover:bg-white/[0.12] text-[#515154] dark:text-zinc-300 flex items-center justify-center transition-colors cursor-pointer"
                aria-label="Fechar criação rápida"
              >
                <X size={16} />
              </button>
            </div>

            {/* Segmented Mode Toggle */}
            <div className="grid grid-cols-2 gap-1 p-1 bg-[#f5f5f7] dark:bg-white/[0.05] rounded-xl border border-black/[0.05] dark:border-white/[0.06]">
              <button
                type="button"
                onClick={() => setQuickType('task')}
                className={cn(
                  'py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer',
                  quickType === 'task'
                    ? 'bg-white text-[#1d1d1f] dark:text-zinc-950 shadow-xs'
                    : 'text-[#6e6e73] dark:text-zinc-400 hover:text-[#1d1d1f] dark:hover:text-white'
                )}
              >
                <CheckSquare size={14} />
                Nova Tarefa
              </button>
              <button
                type="button"
                onClick={() => setQuickType('note')}
                className={cn(
                  'py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer',
                  quickType === 'note'
                    ? 'bg-white text-[#1d1d1f] dark:text-zinc-950 shadow-xs'
                    : 'text-[#6e6e73] dark:text-zinc-400 hover:text-[#1d1d1f] dark:hover:text-white'
                )}
              >
                <StickyNote size={14} />
                Anotação Rápida
              </button>
            </div>

            <form onSubmit={handleQuickSubmit} className="space-y-3">
              <input
                type="text"
                autoFocus
                value={quickText}
                onChange={(e) => setQuickText(e.target.value)}
                placeholder={
                  quickType === 'task'
                    ? 'O que precisa ser feito?'
                    : 'Escreva um lembrete ou anotação rápida...'
                }
                className="w-full px-4 py-3 bg-[#f5f5f7] dark:bg-white/[0.06] border border-black/[0.08] dark:border-white/[0.1] rounded-xl text-sm text-[#1d1d1f] dark:text-white placeholder:text-[#86868b] dark:placeholder:text-zinc-500 focus:outline-none focus:border-[#0071e3] dark:focus:border-white/30"
              />

              {quickType === 'task' && (
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="min-w-0">
                    <input
                      type="date"
                      aria-label="Data da tarefa"
                      value={quickDate}
                      onChange={(e) => setQuickDate(e.target.value)}
                      className="w-full h-10 px-3 bg-[#f5f5f7] dark:bg-white/[0.05] border border-black/[0.07] dark:border-white/[0.08] rounded-xl text-xs text-[#1d1d1f] dark:text-zinc-200 outline-none focus:border-[#0071e3] dark:focus:border-white/30 cursor-pointer"
                    />
                  </div>
                  <div className="min-w-0">
                    <input
                      type="time"
                      aria-label="Horário da tarefa"
                      value={quickTime}
                      onChange={(e) => setQuickTime(e.target.value)}
                      className="w-full h-10 px-3 bg-[#f5f5f7] dark:bg-white/[0.05] border border-black/[0.07] dark:border-white/[0.08] rounded-xl text-xs text-[#1d1d1f] dark:text-zinc-200 outline-none focus:border-[#0071e3] dark:focus:border-white/30 cursor-pointer"
                    />
                  </div>
                  <div className="flex items-center gap-2 h-10 px-3 bg-[#f5f5f7] dark:bg-white/[0.05] border border-black/[0.07] dark:border-white/[0.08] rounded-xl min-w-0 focus-within:border-[#0071e3] dark:focus-within:border-white/30">
                    <Tag size={13} className="text-[#6e6e73] dark:text-zinc-400 shrink-0" />
                    <input
                      type="text"
                      value={quickCategory}
                      onChange={(e) => setQuickCategory(e.target.value)}
                      placeholder="Categoria"
                      className="bg-transparent text-xs text-[#1d1d1f] dark:text-zinc-200 placeholder:text-[#86868b] dark:placeholder:text-zinc-500 outline-none w-full min-w-0"
                    />
                  </div>
                  <select
                    aria-label="Prioridade da tarefa"
                    value={quickPriority}
                    onChange={(e) => setQuickPriority(e.target.value as 'low' | 'medium' | 'high')}
                    className="w-full h-10 px-3 bg-[#f5f5f7] dark:bg-white/[0.05] border border-black/[0.07] dark:border-white/[0.08] rounded-xl text-xs text-[#1d1d1f] dark:text-zinc-200 outline-none focus:border-[#0071e3] dark:focus:border-white/30 cursor-pointer"
                  >
                    <option value="high">Prioridade: Alta</option>
                    <option value="medium">Prioridade: Média</option>
                    <option value="low">Prioridade: Baixa</option>
                  </select>
                </div>
              )}

              <button
                type="submit"
                disabled={!quickText.trim() || isSubmitting}
                className="w-full py-3 rounded-xl bg-[#1d1d1f] dark:bg-white text-white dark:text-zinc-950 font-semibold text-xs hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-40"
              >
                {isSubmitting
                  ? 'Salvando...'
                  : quickType === 'task'
                  ? 'Salvar Tarefa'
                  : 'Salvar Anotação'}
              </button>
            </form>

            {/* Quick module launch shortcuts */}
            <div className="pt-3 border-t border-black/[0.06] dark:border-white/[0.08] space-y-2">
              <p className="text-[11px] font-medium text-[#6e6e73] dark:text-zinc-400">
                Lançar diretamente em um módulo
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setQuickOpen(false);
                    onSelectModule('financial', 'fin_transactions');
                  }}
                  className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-[#f5f5f7] dark:bg-white/[0.04] hover:bg-[#ebebef] dark:hover:bg-white/[0.09] text-xs font-medium text-[#1d1d1f] dark:text-zinc-200 transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Wallet size={14} className="text-[#6e6e73] dark:text-zinc-400" />
                    Finanças
                  </span>
                  <ArrowRight size={12} className="text-[#86868b] dark:text-zinc-500" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setQuickOpen(false);
                    onSelectModule('chacara', 'chacara_main');
                  }}
                  className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-[#f5f5f7] dark:bg-white/[0.04] hover:bg-[#ebebef] dark:hover:bg-white/[0.09] text-xs font-medium text-[#1d1d1f] dark:text-zinc-200 transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Trees size={14} className="text-[#6e6e73] dark:text-zinc-400" />
                    Conta Chácara
                  </span>
                  <ArrowRight size={12} className="text-[#86868b] dark:text-zinc-500" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setQuickOpen(false);
                    onSelectModule('academic', 'activities');
                  }}
                  className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-[#f5f5f7] dark:bg-white/[0.04] hover:bg-[#ebebef] dark:hover:bg-white/[0.09] text-xs font-medium text-[#1d1d1f] dark:text-zinc-200 transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <GraduationCap size={14} className="text-[#6e6e73] dark:text-zinc-400" />
                    Notas / Web
                  </span>
                  <ArrowRight size={12} className="text-[#86868b] dark:text-zinc-500" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setQuickOpen(false);
                    onSelectModule('work', 'work_clients');
                  }}
                  className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-[#f5f5f7] dark:bg-white/[0.04] hover:bg-[#ebebef] dark:hover:bg-white/[0.09] text-xs font-medium text-[#1d1d1f] dark:text-zinc-200 transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Briefcase size={14} className="text-[#6e6e73] dark:text-zinc-400" />
                    Clientes
                  </span>
                  <ArrowRight size={12} className="text-[#86868b] dark:text-zinc-500" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Bottom Dock Navigation */}
      {isInternalTab && internalCollapsed ? (
        /* Ultra-discreet collapsed pill for internal tabs */
        <div className="fixed bottom-2.5 right-3 sm:bottom-3.5 sm:right-5 z-40 print:hidden pb-safe">
          <div className="bg-white/80 dark:bg-[#161618]/80 backdrop-blur-xl border border-black/[0.08] dark:border-white/[0.1] shadow-[0_6px_20px_rgba(0,0,0,0.08)] dark:shadow-[0_8px_24px_rgba(0,0,0,0.4)] rounded-full p-1 flex items-center gap-0.5 opacity-80 hover:opacity-100 transition-all duration-200">
            <button
              type="button"
              onClick={() => onSelectModule('home')}
              title="Ir para Início"
              aria-label="Ir para Início"
              className="w-7 h-7 rounded-full flex items-center justify-center text-[#6e6e73] dark:text-zinc-400 hover:text-[#1d1d1f] dark:hover:text-white hover:bg-black/[0.06] dark:hover:bg-white/[0.08] transition-colors cursor-pointer"
            >
              <Home size={13} />
            </button>
            <button
              type="button"
              onClick={() => setQuickOpen(true)}
              title="Ação rápida"
              aria-label="Ação rápida"
              className="w-7 h-7 rounded-full flex items-center justify-center text-[#6e6e73] dark:text-zinc-400 hover:text-[#1d1d1f] dark:hover:text-white hover:bg-black/[0.06] dark:hover:bg-white/[0.08] transition-colors cursor-pointer"
            >
              <Plus size={14} />
            </button>
            <button
              type="button"
              onClick={() => setInternalCollapsed(false)}
              title="Expandir barra de navegação"
              className="flex items-center gap-1.5 pl-2 pr-2.5 py-1 rounded-full text-[11px] font-medium text-[#1d1d1f] dark:text-zinc-200 hover:bg-black/[0.05] dark:hover:bg-white/[0.08] transition-colors cursor-pointer"
            >
              <span>{activeModuleMeta?.shortLabel || 'Menu'}</span>
              <ChevronUp size={13} className="text-[#86868b] dark:text-zinc-400" />
            </button>
          </div>
        </div>
      ) : (
        <nav
          aria-label="Navegação principal"
          className={cn(
            'fixed left-1/2 -translate-x-1/2 z-40 print:hidden pb-safe transition-all duration-200',
            isInternalTab
              ? 'bottom-2 sm:bottom-3 w-[calc(100vw-24px)] max-w-sm md:w-auto md:max-w-none opacity-75 hover:opacity-100 focus-within:opacity-100'
              : 'bottom-3 sm:bottom-5 w-[calc(100vw-20px)] max-w-md md:w-auto md:max-w-none'
          )}
        >
          <div
            className={cn(
              'backdrop-blur-2xl flex items-center justify-between md:justify-center transition-all duration-200',
              isInternalTab
                ? 'bg-white/80 dark:bg-[#161618]/75 border border-black/[0.08] dark:border-white/[0.08] shadow-[0_6px_22px_rgba(0,0,0,0.08)] dark:shadow-[0_10px_28px_rgba(0,0,0,0.35)] rounded-2xl px-1.5 sm:px-2 py-1 gap-0.5 sm:gap-1'
                : 'bg-[#161618]/90 border border-white/[0.11] shadow-[0_18px_45px_rgba(0,0,0,0.45)] rounded-2xl px-2 sm:px-3 py-1.5 gap-1 sm:gap-1.5'
            )}
          >
            {/* DESKTOP LAYOUT: All 6 modules + central (+) + secondary menu */}
            <div className={cn('hidden md:flex items-center', isInternalTab ? 'gap-0.5' : 'gap-1')}>
              {leftDesktopModules.map((mod) => {
                const Icon = mod.icon;
                const isActive = activeModule === mod.id;
                return (
                  <button
                    key={mod.id}
                    type="button"
                    onClick={() => onSelectModule(mod.id, mod.defaultTab)}
                    className={cn(
                      'flex items-center transition-all duration-150 whitespace-nowrap shrink-0 cursor-pointer',
                      isInternalTab
                        ? 'gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-medium min-h-[32px]'
                        : 'gap-2 px-3.5 py-2.5 rounded-xl text-xs font-medium min-h-[42px]',
                      isActive
                        ? isInternalTab
                          ? 'bg-black/[0.08] dark:bg-white/[0.14] text-[#1d1d1f] dark:text-white font-semibold'
                          : 'bg-white text-zinc-950 font-semibold shadow-xs'
                        : isInternalTab
                        ? 'text-[#6e6e73] dark:text-zinc-400 hover:text-[#1d1d1f] dark:hover:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.06]'
                        : 'text-zinc-400 hover:text-white hover:bg-white/[0.07]'
                    )}
                  >
                    <Icon size={isInternalTab ? 14 : 16} />
                    <span>{mod.label}</span>
                  </button>
                );
              })}

              {/* Central Quick Action Button (+) */}
              <button
                type="button"
                onClick={() => setQuickOpen(true)}
                aria-label="Ação rápida"
                title="Adicionar tarefa, anotação ou lançamento"
                className={cn(
                  'rounded-xl active:scale-95 flex items-center justify-center transition-all shrink-0 cursor-pointer',
                  isInternalTab
                    ? 'mx-1 w-8 h-8 bg-black/[0.06] dark:bg-white/[0.1] text-[#1d1d1f] dark:text-zinc-100 hover:bg-[#1d1d1f] hover:text-white dark:hover:bg-white dark:hover:text-zinc-950'
                    : 'mx-1.5 w-11 h-11 bg-white text-zinc-950 hover:bg-zinc-200 shadow-[0_4px_16px_rgba(255,255,255,0.2)]'
                )}
              >
                <Plus size={isInternalTab ? 16 : 20} strokeWidth={2.3} />
              </button>

              {rightDesktopModules.map((mod) => {
                const Icon = mod.icon;
                const isActive = activeModule === mod.id;
                return (
                  <button
                    key={mod.id}
                    type="button"
                    onClick={() => onSelectModule(mod.id, mod.defaultTab)}
                    className={cn(
                      'flex items-center transition-all duration-150 whitespace-nowrap shrink-0 cursor-pointer',
                      isInternalTab
                        ? 'gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-medium min-h-[32px]'
                        : 'gap-2 px-3.5 py-2.5 rounded-xl text-xs font-medium min-h-[42px]',
                      isActive
                        ? isInternalTab
                          ? 'bg-black/[0.08] dark:bg-white/[0.14] text-[#1d1d1f] dark:text-white font-semibold'
                          : 'bg-white text-zinc-950 font-semibold shadow-xs'
                        : isInternalTab
                        ? 'text-[#6e6e73] dark:text-zinc-400 hover:text-[#1d1d1f] dark:hover:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.06]'
                        : 'text-zinc-400 hover:text-white hover:bg-white/[0.07]'
                    )}
                  >
                    <Icon size={isInternalTab ? 14 : 16} />
                    <span>{mod.label}</span>
                  </button>
                );
              })}

              <div
                className={cn(
                  'w-px mx-1',
                  isInternalTab ? 'h-4 bg-black/[0.08] dark:bg-white/[0.08]' : 'h-6 bg-white/[0.1]'
                )}
                aria-hidden="true"
              />

              <button
                type="button"
                onClick={() => setMenuOpen(true)}
                aria-label="Configurações e mais opções"
                title="Configurações e mais opções"
                className={cn(
                  'rounded-xl flex items-center justify-center transition-colors shrink-0 cursor-pointer',
                  isInternalTab
                    ? 'w-8 h-8 text-[#6e6e73] dark:text-zinc-400 hover:text-[#1d1d1f] dark:hover:text-white hover:bg-black/[0.05] dark:hover:bg-white/[0.07]'
                    : 'w-10 h-10 text-zinc-400 hover:text-white hover:bg-white/[0.07]'
                )}
              >
                <MoreHorizontal size={isInternalTab ? 15 : 18} />
              </button>

              {isInternalTab && (
                <button
                  type="button"
                  onClick={() => setInternalCollapsed(true)}
                  aria-label="Recolher barra"
                  title="Recolher barra para visualizar mais conteúdo"
                  className="w-7 h-8 rounded-xl text-[#86868b] dark:text-zinc-500 hover:text-[#1d1d1f] dark:hover:text-white hover:bg-black/[0.05] dark:hover:bg-white/[0.07] flex items-center justify-center transition-colors shrink-0 cursor-pointer"
                >
                  <ChevronDown size={14} />
                </button>
              )}
            </div>

            {/* MOBILE LAYOUT: 4 primary touch destinations + central (+) */}
            <div className="flex md:hidden items-center justify-between w-full">
              {[
                ALL_MODULES[0], // home
                ALL_MODULES[1], // personal
              ].map((mod) => {
                const Icon = mod.icon;
                const isActive = activeModule === mod.id;
                return (
                  <button
                    key={mod.id}
                    type="button"
                    onClick={() => onSelectModule(mod.id, mod.defaultTab)}
                    className={cn(
                      'flex-1 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer',
                      isInternalTab ? 'min-h-[36px] py-1 px-1' : 'min-h-[44px] py-1.5 px-1',
                      isActive
                        ? isInternalTab
                          ? 'text-[#1d1d1f] dark:text-white bg-black/[0.07] dark:bg-white/[0.12]'
                          : 'text-white bg-white/[0.1]'
                        : isInternalTab
                        ? 'text-[#6e6e73] dark:text-zinc-400 hover:text-[#1d1d1f] dark:hover:text-zinc-200'
                        : 'text-zinc-400 hover:text-zinc-200'
                    )}
                  >
                    <Icon size={isInternalTab ? 15 : 18} />
                    <span className="text-[10px] font-medium tracking-tight leading-none whitespace-nowrap">
                      {mod.shortLabel}
                    </span>
                  </button>
                );
              })}

              {/* Central Quick Action Button (+) */}
              <button
                type="button"
                onClick={() => setQuickOpen(true)}
                aria-label="Ação rápida"
                className={cn(
                  'rounded-xl active:scale-95 flex items-center justify-center transition-transform shrink-0 cursor-pointer',
                  isInternalTab
                    ? 'mx-1 w-9 h-8 bg-black/[0.07] dark:bg-white/[0.12] text-[#1d1d1f] dark:text-white'
                    : 'mx-1.5 w-12 h-11 bg-white text-zinc-950 shadow-[0_4px_14px_rgba(255,255,255,0.22)]'
                )}
              >
                <Plus size={isInternalTab ? 17 : 21} strokeWidth={2.3} />
              </button>

              <button
                type="button"
                onClick={() => onSelectModule('financial', 'fin_dashboard')}
                className={cn(
                  'flex-1 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer',
                  isInternalTab ? 'min-h-[36px] py-1 px-1' : 'min-h-[44px] py-1.5 px-1',
                  activeModule === 'financial'
                    ? isInternalTab
                      ? 'text-[#1d1d1f] dark:text-white bg-black/[0.07] dark:bg-white/[0.12]'
                      : 'text-white bg-white/[0.1]'
                    : isInternalTab
                    ? 'text-[#6e6e73] dark:text-zinc-400 hover:text-[#1d1d1f] dark:hover:text-zinc-200'
                    : 'text-zinc-400 hover:text-zinc-200'
                )}
              >
                <Wallet size={isInternalTab ? 15 : 18} />
                <span className="text-[10px] font-medium tracking-tight leading-none whitespace-nowrap">
                  Finanças
                </span>
              </button>

              <button
                type="button"
                onClick={() => setMenuOpen(true)}
                className={cn(
                  'flex-1 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer',
                  isInternalTab ? 'min-h-[36px] py-1 px-1' : 'min-h-[44px] py-1.5 px-1',
                  isMoreActiveMobile
                    ? isInternalTab
                      ? 'text-[#1d1d1f] dark:text-white bg-black/[0.07] dark:bg-white/[0.12]'
                      : 'text-white bg-white/[0.1]'
                    : isInternalTab
                    ? 'text-[#6e6e73] dark:text-zinc-400 hover:text-[#1d1d1f] dark:hover:text-zinc-200'
                    : 'text-zinc-400 hover:text-zinc-200'
                )}
              >
                <MoreHorizontal size={isInternalTab ? 15 : 18} />
                <span className="text-[10px] font-medium tracking-tight leading-none whitespace-nowrap truncate max-w-[64px]">
                  {activeMobileExtraLabel}
                </span>
              </button>

              {isInternalTab && (
                <button
                  type="button"
                  onClick={() => setInternalCollapsed(true)}
                  aria-label="Recolher barra"
                  className="w-7 h-8 rounded-xl text-[#86868b] dark:text-zinc-500 flex items-center justify-center shrink-0 cursor-pointer"
                >
                  <ChevronDown size={14} />
                </button>
              )}
            </div>
          </div>
        </nav>
      )}
    </>
  );
};
