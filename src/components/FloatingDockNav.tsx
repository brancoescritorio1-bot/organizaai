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
  Calendar,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { AppModule } from './Sidebar';

interface FloatingDockNavProps {
  activeModule: AppModule;
  onSelectModule: (module: AppModule, tab?: string) => void;
  onQuickCreateTask: (task: {
    title: string;
    due_date?: string;
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
  { id: 'personal', label: 'Pessoal', shortLabel: 'Pessoal', description: 'Tarefas e matriz', icon: CheckSquare, defaultTab: 'personal_tasks' },
  { id: 'financial', label: 'Financeiro', shortLabel: 'Finanças', description: 'Fluxo e faturas', icon: Wallet, defaultTab: 'fin_dashboard' },
  { id: 'chacara', label: 'Chácara', shortLabel: 'Chácara', description: 'Contas e rateios', icon: Trees, defaultTab: 'chacara_dashboard' },
  { id: 'academic', label: 'Acadêmico', shortLabel: 'Estudos', description: 'Notas e presença', icon: GraduationCap, defaultTab: 'dashboard' },
  { id: 'work', label: 'Trabalho', shortLabel: 'Trabalho', description: 'Clientes e escalas', icon: Briefcase, defaultTab: 'work_clients' },
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
  const [quickOpen, setQuickOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [quickType, setQuickType] = useState<'task' | 'note'>('task');
  const [quickText, setQuickText] = useState('');
  const [quickDate, setQuickDate] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  });
  const [quickPriority, setQuickPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [isSubmitting, setIsSubmitting] = useState(false);

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
          priority: quickPriority,
        });
      } else {
        onQuickAddNote(trimmed);
      }
      setQuickText('');
      setQuickOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Secondary Modules & Settings Sheet / Popover */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-end md:items-end justify-center p-3 sm:p-6 print:hidden"
          onClick={() => setMenuOpen(false)}
        >
          <div
            className="w-full max-w-md mb-16 sm:mb-20 bg-[#161618]/95 backdrop-blur-2xl border border-white/[0.12] rounded-3xl p-5 text-zinc-100 shadow-[0_24px_60px_rgba(0,0,0,0.65)] space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3.5">
              <div>
                <h3 className="text-sm font-semibold text-white tracking-tight">
                  Módulos & Configurações
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Acesse qualquer área ou ajuste do OrganizaAI
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className="w-9 h-9 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-zinc-300 flex items-center justify-center transition-colors cursor-pointer"
                aria-label="Fechar menu"
              >
                <X size={16} />
              </button>
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
                        ? 'bg-white text-zinc-950 border-white font-semibold'
                        : 'bg-white/[0.04] hover:bg-white/[0.08] text-zinc-200 border-white/[0.06]'
                    )}
                  >
                    <div
                      className={cn(
                        'w-9 h-9 rounded-xl flex items-center justify-center shrink-0',
                        isActive ? 'bg-zinc-900 text-white' : 'bg-white/[0.07] text-zinc-200'
                      )}
                    >
                      <Icon size={16} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold truncate">{mod.label}</p>
                      <p
                        className={cn(
                          'text-[11px] truncate',
                          isActive ? 'text-zinc-600' : 'text-zinc-400'
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
            <div className="space-y-1.5 pt-1 border-t border-white/[0.08]">
              <p className="text-[11px] font-medium text-zinc-400 px-1 pb-1">
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
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] text-xs font-medium text-zinc-200 transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2.5">
                    <Settings size={14} className="text-zinc-400" />
                    {item.label}
                  </span>
                  <ArrowRight size={13} className="text-zinc-500" />
                </button>
              ))}

              {onOpenCoverCustomizer && (
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onOpenCoverCustomizer();
                  }}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] text-xs font-medium text-zinc-200 transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2.5">
                    <ImageIcon size={14} className="text-zinc-400" />
                    Personalizar imagem de capa
                  </span>
                  <ArrowRight size={13} className="text-zinc-500" />
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
                    className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-xs font-medium text-zinc-200 transition-colors cursor-pointer"
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
                    'flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-xs font-medium text-rose-300 transition-colors cursor-pointer',
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
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-3 sm:p-6 print:hidden"
          onClick={() => setQuickOpen(false)}
        >
          <div
            className="w-full max-w-lg mb-16 sm:mb-0 bg-[#161618]/95 backdrop-blur-2xl border border-white/[0.12] rounded-3xl p-5 sm:p-6 text-zinc-100 shadow-[0_24px_64px_rgba(0,0,0,0.65)] space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-white tracking-tight">
                  Acesso Rápido
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Crie uma tarefa, anotação ou inicie um lançamento
                </p>
              </div>
              <button
                type="button"
                onClick={() => setQuickOpen(false)}
                className="w-9 h-9 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-zinc-300 flex items-center justify-center transition-colors cursor-pointer"
                aria-label="Fechar criação rápida"
              >
                <X size={16} />
              </button>
            </div>

            {/* Segmented Mode Toggle */}
            <div className="grid grid-cols-2 gap-1 p-1 bg-white/[0.05] rounded-xl border border-white/[0.06]">
              <button
                type="button"
                onClick={() => setQuickType('task')}
                className={cn(
                  'py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer',
                  quickType === 'task' ? 'bg-white text-zinc-950 shadow-xs' : 'text-zinc-400 hover:text-white'
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
                  quickType === 'note' ? 'bg-white text-zinc-950 shadow-xs' : 'text-zinc-400 hover:text-white'
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
                className="w-full px-4 py-3 bg-white/[0.06] border border-white/[0.1] rounded-xl text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-white/30"
              />

              {quickType === 'task' && (
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="flex items-center gap-2 px-3 py-2 bg-white/[0.05] border border-white/[0.08] rounded-xl">
                    <Calendar size={14} className="text-zinc-400 shrink-0" />
                    <input
                      type="date"
                      value={quickDate}
                      onChange={(e) => setQuickDate(e.target.value)}
                      className="bg-transparent text-xs text-zinc-200 outline-none w-full"
                    />
                  </div>
                  <select
                    value={quickPriority}
                    onChange={(e) => setQuickPriority(e.target.value as 'low' | 'medium' | 'high')}
                    className="px-3 py-2 bg-white/[0.05] border border-white/[0.08] rounded-xl text-xs text-zinc-200 outline-none cursor-pointer"
                  >
                    <option value="high" className="bg-zinc-900">Alta prioridade</option>
                    <option value="medium" className="bg-zinc-900">Prioridade média</option>
                    <option value="low" className="bg-zinc-900">Baixa prioridade</option>
                  </select>
                </div>
              )}

              <button
                type="submit"
                disabled={!quickText.trim() || isSubmitting}
                className="w-full py-3 rounded-xl bg-white text-zinc-950 font-semibold text-xs hover:bg-zinc-200 transition-colors cursor-pointer disabled:opacity-40"
              >
                {isSubmitting
                  ? 'Salvando...'
                  : quickType === 'task'
                  ? 'Salvar Tarefa'
                  : 'Salvar Anotação'}
              </button>
            </form>

            {/* Quick module launch shortcuts */}
            <div className="pt-3 border-t border-white/[0.08] space-y-2">
              <p className="text-[11px] font-medium text-zinc-400">
                Lançar diretamente em um módulo
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setQuickOpen(false);
                    onSelectModule('financial', 'fin_transactions');
                  }}
                  className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.09] text-xs font-medium text-zinc-200 transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Wallet size={14} className="text-zinc-400" />
                    Finanças
                  </span>
                  <ArrowRight size={12} className="text-zinc-500" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setQuickOpen(false);
                    onSelectModule('chacara', 'chacara_main');
                  }}
                  className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.09] text-xs font-medium text-zinc-200 transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Trees size={14} className="text-zinc-400" />
                    Conta Chácara
                  </span>
                  <ArrowRight size={12} className="text-zinc-500" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setQuickOpen(false);
                    onSelectModule('academic', 'activities');
                  }}
                  className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.09] text-xs font-medium text-zinc-200 transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <GraduationCap size={14} className="text-zinc-400" />
                    Notas / Web
                  </span>
                  <ArrowRight size={12} className="text-zinc-500" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setQuickOpen(false);
                    onSelectModule('work', 'work_clients');
                  }}
                  className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.09] text-xs font-medium text-zinc-200 transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Briefcase size={14} className="text-zinc-400" />
                    Clientes
                  </span>
                  <ArrowRight size={12} className="text-zinc-500" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Bottom Dock Navigation */}
      <nav
        aria-label="Navegação principal"
        className="fixed bottom-3 sm:bottom-5 left-1/2 -translate-x-1/2 z-40 w-[calc(100vw-20px)] max-w-md md:w-auto md:max-w-none print:hidden pb-safe"
      >
        <div className="bg-[#161618]/90 backdrop-blur-2xl border border-white/[0.11] shadow-[0_18px_45px_rgba(0,0,0,0.45)] rounded-2xl px-2 sm:px-3 py-1.5 flex items-center justify-between md:justify-center gap-1 sm:gap-1.5">
          {/* DESKTOP LAYOUT: All 6 modules + central (+) + secondary menu */}
          <div className="hidden md:flex items-center gap-1">
            {leftDesktopModules.map((mod) => {
              const Icon = mod.icon;
              const isActive = activeModule === mod.id;
              return (
                <button
                  key={mod.id}
                  type="button"
                  onClick={() => onSelectModule(mod.id, mod.defaultTab)}
                  className={cn(
                    'flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all duration-150 whitespace-nowrap shrink-0 cursor-pointer min-h-[42px]',
                    isActive
                      ? 'bg-white text-zinc-950 font-semibold shadow-xs'
                      : 'text-zinc-400 hover:text-white hover:bg-white/[0.07]'
                  )}
                >
                  <Icon size={16} />
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
              className="mx-1.5 w-11 h-11 rounded-xl bg-white text-zinc-950 hover:bg-zinc-200 active:scale-95 flex items-center justify-center shadow-[0_4px_16px_rgba(255,255,255,0.2)] transition-all shrink-0 cursor-pointer"
            >
              <Plus size={20} strokeWidth={2.4} />
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
                    'flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all duration-150 whitespace-nowrap shrink-0 cursor-pointer min-h-[42px]',
                    isActive
                      ? 'bg-white text-zinc-950 font-semibold shadow-xs'
                      : 'text-zinc-400 hover:text-white hover:bg-white/[0.07]'
                  )}
                >
                  <Icon size={16} />
                  <span>{mod.label}</span>
                </button>
              );
            })}

            <div className="w-px h-6 bg-white/[0.1] mx-1" aria-hidden="true" />

            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label="Configurações e mais opções"
              title="Configurações e mais opções"
              className="w-10 h-10 rounded-xl text-zinc-400 hover:text-white hover:bg-white/[0.07] flex items-center justify-center transition-colors shrink-0 cursor-pointer"
            >
              <MoreHorizontal size={18} />
            </button>
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
                    'flex-1 min-h-[44px] py-1.5 px-1 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer',
                    isActive ? 'text-white bg-white/[0.1]' : 'text-zinc-400 hover:text-zinc-200'
                  )}
                >
                  <Icon size={18} />
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
              className="mx-1.5 w-12 h-11 rounded-xl bg-white text-zinc-950 active:scale-95 flex items-center justify-center shadow-[0_4px_14px_rgba(255,255,255,0.22)] transition-transform shrink-0 cursor-pointer"
            >
              <Plus size={21} strokeWidth={2.4} />
            </button>

            <button
              type="button"
              onClick={() => onSelectModule('financial', 'fin_dashboard')}
              className={cn(
                'flex-1 min-h-[44px] py-1.5 px-1 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer',
                activeModule === 'financial'
                  ? 'text-white bg-white/[0.1]'
                  : 'text-zinc-400 hover:text-zinc-200'
              )}
            >
              <Wallet size={18} />
              <span className="text-[10px] font-medium tracking-tight leading-none whitespace-nowrap">
                Finanças
              </span>
            </button>

            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              className={cn(
                'flex-1 min-h-[44px] py-1.5 px-1 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer',
                isMoreActiveMobile
                  ? 'text-white bg-white/[0.1]'
                  : 'text-zinc-400 hover:text-zinc-200'
              )}
            >
              <MoreHorizontal size={18} />
              <span className="text-[10px] font-medium tracking-tight leading-none whitespace-nowrap truncate max-w-[64px]">
                {activeMobileExtraLabel}
              </span>
            </button>
          </div>
        </div>
      </nav>
    </>
  );
};
