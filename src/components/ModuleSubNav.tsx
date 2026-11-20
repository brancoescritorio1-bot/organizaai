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
}) => {
  const tabs = MODULE_SUBTABS[module] || [];

  if (tabs.length === 0) return null;

  return (
    <nav
      aria-label="Navegação interna do módulo"
      className="sticky top-[53px] sm:top-[57px] z-20 bg-white/85 backdrop-blur-xl border-b border-black/[0.06] transition-all duration-200 print:hidden"
    >
      <div className="max-w-7xl mx-auto flex items-center gap-1 w-full overflow-x-auto scrollbar-hide px-3 md:px-6">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onSelectTab(tab.id)}
              className={cn(
                "relative flex items-center justify-center gap-2 min-h-[44px] py-2.5 px-3 sm:px-3.5 transition-colors duration-150 shrink-0 whitespace-nowrap cursor-pointer select-none group",
                isActive ? "text-[#0071e3] font-semibold" : "text-[#6e6e73] hover:text-[#1d1d1f] font-medium"
              )}
            >
              <Icon
                size={15}
                className={cn(
                  "shrink-0 transition-transform group-hover:scale-105",
                  isActive ? "text-[#0071e3]" : "text-[#86868b] group-hover:text-[#1d1d1f]"
                )}
              />
              <span className="text-xs tracking-tight leading-none whitespace-nowrap">
                {tab.label}
              </span>
              {isActive && (
                <div className="absolute bottom-0 left-2 right-2 h-[2px] bg-[#0071e3] rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

// Backwards compatibility alias
export const ModuleSubNav = ModuleBottomNav;
