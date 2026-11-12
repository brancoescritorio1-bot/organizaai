import React from 'react';
import { 
  Home, 
  Wallet, 
  Trees, 
  GraduationCap, 
  CheckSquare, 
  Briefcase, 
  LogOut, 
  ChevronLeft, 
  ChevronRight,
  X,
  ChevronDown
} from 'lucide-react';
import { cn } from '../lib/utils';
import { MODULE_SUBTABS } from './ModuleSubNav';

export type AppModule = 'home' | 'academic' | 'financial' | 'chacara' | 'work' | 'personal';

interface SidebarProps {
  activeModule: AppModule;
  activeTab?: string;
  onSelectModule: (module: AppModule) => void;
  onSelectTab?: (tab: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  onLogout: () => void;
  userEmail?: string;
}

interface NavItem {
  id: AppModule;
  label: string;
  icon: React.ElementType;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'home', label: 'Início', icon: Home },
  { id: 'financial', label: 'Financeiro', icon: Wallet },
  { id: 'chacara', label: 'Chácara', icon: Trees },
  { id: 'academic', label: 'Acadêmico', icon: GraduationCap },
  { id: 'personal', label: 'Pessoal', icon: CheckSquare },
  { id: 'work', label: 'Trabalho', icon: Briefcase },
];

export const Sidebar: React.FC<SidebarProps> = ({
  activeModule,
  activeTab,
  onSelectModule,
  onSelectTab,
  isCollapsed,
  onToggleCollapse,
  isOpenMobile,
  onCloseMobile,
  onLogout,
  userEmail = 'Lara'
}) => {
  const content = (
    <div className="flex flex-col h-full bg-[#fbfbfd]/95 backdrop-blur-2xl border-r border-black/[0.08] select-none text-[#1d1d1f]">
      {/* macOS Window & Brand Header */}
      <div className={cn(
        "h-16 flex items-center justify-between border-b border-black/[0.05] transition-all",
        isCollapsed ? "px-3" : "px-4"
      )}>
        <button
          type="button"
          onClick={() => {
            onSelectModule('home');
            onCloseMobile();
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className={cn(
            "flex items-center text-left rounded-xl group cursor-pointer transition-all focus:outline-none",
            isCollapsed ? "p-1 hover:opacity-80" : "gap-3 min-w-0 p-1 -m-1 hover:bg-black/[0.03]"
          )}
          title="Ir para a Página Inicial"
          aria-label="Ir para a Página Inicial"
        >
          <div className="w-8 h-8 rounded-xl bg-[#1d1d1f] text-white flex items-center justify-center shadow-xs shrink-0 font-bold text-xs tracking-tight group-hover:scale-105 transition-transform">
            O
          </div>
          {!isCollapsed && (
            <div className="truncate">
              <h1 className="text-sm font-semibold text-[#1d1d1f] leading-none tracking-tight">
                OrganizaAI
              </h1>
              <p className="text-[11px] text-[#86868b] font-normal mt-1 truncate">
                Central de Gestão
              </p>
            </div>
          )}
        </button>

        {/* Mobile close button */}
        <button 
          onClick={onCloseMobile}
          className="md:hidden p-1.5 text-[#86868b] hover:text-[#1d1d1f] rounded-lg transition-colors cursor-pointer"
          title="Fechar Menu"
          aria-label="Fechar Menu"
        >
          <X size={17} />
        </button>

        {/* Desktop collapse toggle button */}
        <button
          onClick={onToggleCollapse}
          className="hidden md:flex p-1.5 text-[#86868b] hover:text-[#1d1d1f] hover:bg-black/[0.04] rounded-lg transition-colors cursor-pointer"
          title={isCollapsed ? "Expandir Barra Lateral" : "Recolher Barra Lateral"}
          aria-label={isCollapsed ? "Expandir Barra Lateral" : "Recolher Barra Lateral"}
        >
          {isCollapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
        </button>
      </div>

      {/* Navigation List */}
      <div className="flex-1 py-3 px-2 space-y-1 overflow-y-auto">
        {!isCollapsed && (
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#86868b] px-3 mb-2">
            Módulos
          </p>
        )}

        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeModule === item.id;
          const subtabs = item.id !== 'home' ? (MODULE_SUBTABS as any)[item.id] || [] : [];

          return (
            <div key={item.id} className="space-y-0.5">
              <button
                onClick={() => {
                  onSelectModule(item.id);
                  if (item.id === 'home') onCloseMobile();
                }}
                title={isCollapsed ? item.label : undefined}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs transition-all duration-150 relative group cursor-pointer",
                  isActive 
                    ? "bg-black/[0.07] text-[#1d1d1f] font-semibold" 
                    : "text-[#515154] hover:bg-black/[0.035] hover:text-[#1d1d1f] font-medium",
                  isCollapsed && "justify-center px-0 py-2.5"
                )}
              >
                <Icon size={16} className={isActive ? "text-[#1d1d1f]" : "text-[#86868b] group-hover:text-[#1d1d1f]"} />

                {!isCollapsed && (
                  <>
                    <span className="truncate text-left flex-1 tracking-tight">
                      {item.label}
                    </span>
                    {subtabs.length > 0 && (
                      <ChevronDown 
                        size={12} 
                        className={cn("text-[#86868b] transition-transform", isActive ? "rotate-0 text-[#1d1d1f]" : "-rotate-90 opacity-40")} 
                      />
                    )}
                  </>
                )}

                {/* Collapsed active dot indicator */}
                {isCollapsed && isActive && (
                  <div className="absolute right-1 w-1.5 h-1.5 rounded-full bg-[#1d1d1f]" />
                )}
              </button>

              {/* Subtabs list when module is active (macOS sidebar hierarchical items) */}
              {!isCollapsed && isActive && subtabs.length > 0 && (
                <div className="pl-3 pr-1 py-1 space-y-0.5 border-l border-black/[0.08] ml-5 my-0.5">
                  {subtabs.map((sub: any) => {
                    const SubIcon = sub.icon;
                    const isSubActive = activeTab === sub.id;

                    return (
                      <button
                        key={sub.id}
                        onClick={() => {
                          if (onSelectTab) onSelectTab(sub.id);
                          onCloseMobile();
                        }}
                        className={cn(
                          "w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] transition-all cursor-pointer",
                          isSubActive
                            ? "bg-black/[0.08] text-[#1d1d1f] font-semibold"
                            : "text-[#6e6e73] hover:text-[#1d1d1f] hover:bg-black/[0.03] font-medium"
                        )}
                      >
                        <SubIcon size={12} className={isSubActive ? "text-[#1d1d1f]" : "text-[#86868b]"} />
                        <span className="truncate">{sub.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer Profile & Logout */}
      <div className="p-3 border-t border-black/[0.06] bg-black/[0.015]">
        {!isCollapsed ? (
          <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-white border border-black/[0.06] shadow-xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-[#f5f5f7] text-[#1d1d1f] font-semibold flex items-center justify-center text-xs shrink-0 border border-black/[0.06]">
                L
              </div>
              <div className="truncate">
                <p className="text-xs font-semibold text-[#1d1d1f] truncate leading-tight">Lara</p>
                <p className="text-[10px] text-[#86868b] truncate">Sessão Ativa</p>
              </div>
            </div>

            <button
              onClick={onLogout}
              className="p-1.5 text-[#86868b] hover:text-[#ff3b30] hover:bg-rose-50 rounded-lg transition-colors shrink-0 cursor-pointer"
              title="Encerrar Sessão (Sair)"
            >
              <LogOut size={14} />
            </button>
          </div>
        ) : (
          <button
            onClick={onLogout}
            className="w-full py-2 flex justify-center text-[#86868b] hover:text-[#ff3b30] hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
            title="Encerrar Sessão (Sair)"
          >
            <LogOut size={15} />
          </button>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside 
        className={cn(
          "hidden md:block fixed left-0 top-0 bottom-0 z-30 transition-all duration-200 ease-in-out",
          isCollapsed ? "w-20" : "w-64"
        )}
      >
        {content}
      </aside>

      {/* Mobile Drawer with Backdrop */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div 
            className="fixed inset-0 bg-black/20 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          />
          <div className="fixed inset-y-0 left-0 w-72 max-w-[85vw] shadow-2xl animate-in slide-in-from-left duration-200">
            {content}
          </div>
        </div>
      )}
    </>
  );
};

