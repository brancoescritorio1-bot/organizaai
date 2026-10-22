import React from 'react';
import { 
  LayoutDashboard, 
  Search, 
  CreditCard, 
  ArrowRightLeft, 
  History, 
  Settings,
  AlertCircle,
  Banknote,
  PlusCircle,
  MessageSquare,
  Users,
  Shield,
  FileText,
  MonitorPlay,
  BookOpen,
  ListTodo,
  LayoutGrid,
  Megaphone,
  Calendar,
  AlertTriangle
} from 'lucide-react';
import { cn } from '../lib/utils';
import { AppModule } from './Sidebar';

export interface SubTabItem {
  id: string;
  label: string;
  icon: React.ElementType;
}

export const MODULE_SUBTABS: Record<Exclude<AppModule, 'home'>, SubTabItem[]> = {
  financial: [
    { id: 'fin_dashboard', label: 'Dash', icon: LayoutDashboard },
    { id: 'fin_extract', label: 'Extrato', icon: Search },
    { id: 'fin_credit', label: 'Crédito', icon: CreditCard },
    { id: 'fin_transactions', label: 'Lançar', icon: ArrowRightLeft },
    { id: 'fin_fixed_bills', label: 'Fixas', icon: History },
    { id: 'fin_settings', label: 'Config', icon: Settings },
  ],
  chacara: [
    { id: 'chacara_dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'chacara_pending', label: 'Pendências', icon: AlertCircle },
    { id: 'chacara_expenses', label: 'Despesas', icon: Banknote },
    { id: 'chacara_main', label: 'Lançar', icon: PlusCircle },
    { id: 'chacara_history', label: 'Histórico', icon: History },
    { id: 'chacara_messages', label: 'Mensagens', icon: MessageSquare },
    { id: 'chacara_users', label: 'Usuários', icon: Users },
    { id: 'chacara_settings', label: 'Config', icon: Settings },
  ],
  academic: [
    { id: 'dashboard', label: 'Dash', icon: LayoutDashboard },
    { id: 'attendance', label: 'Presença', icon: Users },
    { id: 'activities', label: 'Notas', icon: FileText },
    { id: 'subjects', label: 'Matérias', icon: BookOpen },
    { id: 'web', label: 'Web', icon: MonitorPlay },
    { id: 'settings', label: 'Config', icon: Settings },
    { id: 'users', label: 'Usuários', icon: Shield },
  ],
  personal: [
    { id: 'personal_tasks', label: 'Tarefas', icon: ListTodo },
    { id: 'personal_eisenhower', label: 'Matriz', icon: LayoutGrid },
  ],
  work: [
    { id: 'work_clients', label: 'Clientes', icon: Users },
    { id: 'work_marketing', label: 'Marketing', icon: Megaphone },
    { id: 'work_escalas', label: 'Escalas', icon: Calendar },
    { id: 'work_messages', label: 'Mensagens', icon: MessageSquare },
    { id: 'work_safety', label: 'Segurança', icon: AlertTriangle },
  ],
};

export interface ModuleBottomNavProps {
  module: Exclude<AppModule, 'home'>;
  activeTab: string;
  onSelectTab: (tab: string) => void;
  sidebarCollapsed?: boolean;
}

export const ModuleBottomNav: React.FC<ModuleBottomNavProps> = ({
  module,
  activeTab,
  onSelectTab,
  sidebarCollapsed = false,
}) => {
  const tabs = MODULE_SUBTABS[module] || [];

  if (tabs.length === 0) return null;

  return (
    <nav
      aria-label="Navegação interna do módulo"
      className={cn(
        "fixed bottom-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/80 shadow-lg transition-all duration-200 print:hidden",
        sidebarCollapsed ? "left-0 md:left-20" : "left-0 md:left-64"
      )}
    >
      <div className="max-w-6xl mx-auto flex items-center justify-between w-full overflow-x-auto scrollbar-none">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              onClick={() => onSelectTab(tab.id)}
              className={cn(
                "relative flex flex-col items-center justify-center py-2.5 px-2 transition-all duration-200 flex-1 min-w-[70px] sm:min-w-[90px] cursor-pointer select-none group",
                isActive ? "text-indigo-600 bg-indigo-50/40" : "text-slate-400 hover:text-slate-700 hover:bg-slate-50/60"
              )}
            >
              {isActive && (
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-indigo-600 shadow-xs" />
              )}
              <div className="relative z-10 flex flex-col items-center w-full">
                <Icon size={18} className={cn("mb-1 transition-transform group-hover:scale-110", isActive ? "text-indigo-600" : "text-slate-400")} />
                <span className={cn(
                  "text-[9px] sm:text-[11px] font-bold uppercase tracking-tight truncate w-full text-center",
                  isActive ? "text-indigo-600 font-extrabold" : "text-slate-500 font-medium"
                )}>
                  {tab.label}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

// Backwards compatibility alias
export const ModuleSubNav = ModuleBottomNav;
