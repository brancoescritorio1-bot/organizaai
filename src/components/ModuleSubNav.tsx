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
    { id: 'fin_dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'fin_extract', label: 'Extrato', icon: Search },
    { id: 'fin_credit', label: 'Crédito', icon: CreditCard },
    { id: 'fin_transactions', label: 'Lançamentos', icon: ArrowRightLeft },
    { id: 'fin_fixed_bills', label: 'Contas Fixas', icon: History },
    { id: 'fin_settings', label: 'Configurações', icon: Settings },
  ],
  chacara: [
    { id: 'chacara_dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'chacara_pending', label: 'Pendências', icon: AlertCircle },
    { id: 'chacara_expenses', label: 'Despesas', icon: Banknote },
    { id: 'chacara_main', label: 'Lançar Conta', icon: PlusCircle },
    { id: 'chacara_history', label: 'Histórico', icon: History },
    { id: 'chacara_messages', label: 'Mensagens', icon: MessageSquare },
    { id: 'chacara_users', label: 'Usuários', icon: Users },
    { id: 'chacara_settings', label: 'Configurações', icon: Settings },
  ],
  academic: [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'attendance', label: 'Presença', icon: Users },
    { id: 'activities', label: 'Notas', icon: FileText },
    { id: 'subjects', label: 'Matérias', icon: BookOpen },
    { id: 'web', label: 'Web', icon: MonitorPlay },
    { id: 'settings', label: 'Configurações', icon: Settings },
    { id: 'users', label: 'Usuários', icon: Shield },
  ],
  personal: [
    { id: 'personal_tasks', label: 'Tarefas', icon: ListTodo },
    { id: 'personal_eisenhower', label: 'Matriz Eisenhower', icon: LayoutGrid },
  ],
  work: [
    { id: 'work_clients', label: 'Clientes & Vendas', icon: Users },
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
        "fixed bottom-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/80 shadow-xs transition-all duration-200 print:hidden",
        sidebarCollapsed ? "left-0 md:left-20" : "left-0 md:left-64"
      )}
    >
      <div className="max-w-6xl mx-auto px-2 sm:px-4 py-2 sm:py-2.5">
        <div 
          role="tablist"
          className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto scrollbar-none py-0.5 px-1 max-w-full touch-pan-x"
        >
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
                  "h-10 px-3.5 sm:px-4 rounded-xl flex items-center gap-2 text-xs font-semibold shrink-0 transition-all duration-150 select-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-slate-400/40",
                  isActive
                    ? "bg-slate-900 text-white shadow-xs font-bold"
                    : "bg-slate-100/70 hover:bg-slate-200/80 text-slate-700 hover:text-slate-900 font-medium"
                )}
              >
                <Icon size={15} className={isActive ? "text-white" : "text-slate-500"} />
                <span className="whitespace-nowrap">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

// Backwards compatibility alias
export const ModuleSubNav = ModuleBottomNav;
