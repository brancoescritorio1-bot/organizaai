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
    <div className="flex flex-col h-full bg-slate-50/95 border-r border-slate-200/80 select-none shadow-xs text-slate-800">
      {/* Brand Header */}
      <div className={cn(
        "h-16 flex items-center justify-between border-b border-slate-200/60 transition-all",
        isCollapsed ? "px-2.5" : "px-4"
      )}>
        <button
          type="button"
          onClick={() => {
            onSelectModule('home');
            onCloseMobile();
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className={cn(
            "flex items-center text-left rounded-xl group cursor-pointer transition-all focus:outline-none focus:ring-2 focus:ring-slate-300",
            isCollapsed ? "p-1 hover:opacity-80" : "gap-2.5 min-w-0 p-1 -m-1 hover:bg-slate-200/50"
          )}
          title="Ir para a Página Inicial (Início)"
          aria-label="Ir para a Página Inicial"
        >
          <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs shrink-0 font-bold text-sm tracking-tight group-hover:scale-105 transition-transform">
            O
          </div>
          {!isCollapsed && (
            <div className="truncate">
              <h1 className="text-sm font-bold text-slate-900 leading-tight tracking-tight flex items-center gap-1.5">
                OrganizaAI
                <span className="text-[10px] font-semibold px-1.5 py-0.2 bg-slate-200/70 text-slate-600 rounded-md">
                  Pro
                </span>
              </h1>
              <p className="text-[11px] text-slate-400 font-medium truncate group-hover:text-slate-600 transition-colors">
                Página Inicial
              </p>
            </div>
          )}
        </button>

        {/* Mobile close button */}
        <button 
          onClick={onCloseMobile}
          className="md:hidden p-1.5 text-slate-400 hover:text-slate-700 rounded-lg transition-colors cursor-pointer"
          title="Fechar Menu"
          aria-label="Fechar Menu"
        >
          <X size={18} />
        </button>

        {/* Desktop collapse toggle button */}
        <button
          onClick={onToggleCollapse}
          className="hidden md:flex p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
          title={isCollapsed ? "Expandir Barra Lateral" : "Recolher Barra Lateral"}
          aria-label={isCollapsed ? "Expandir Barra Lateral" : "Recolher Barra Lateral"}
        >
          {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Navigation List */}
      <div className="flex-1 py-3 px-2 space-y-1 overflow-y-auto">
        {!isCollapsed && (
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 px-3 mb-2">
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
                  "w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-150 relative group",
                  isActive 
                    ? "bg-white text-slate-900 shadow-xs border border-slate-200/80 font-bold" 
                    : "text-slate-600 hover:bg-slate-200/50 hover:text-slate-900",
                  isCollapsed && "justify-center px-0 py-2.5"
                )}
              >
                <Icon size={17} className={isActive ? "text-slate-900" : "text-slate-400 group-hover:text-slate-600"} />

                {!isCollapsed && (
                  <>
                    <span className="truncate text-left flex-1 tracking-tight">
                      {item.label}
                    </span>
                    {subtabs.length > 0 && (
                      <ChevronDown 
                        size={13} 
                        className={cn("text-slate-400 transition-transform", isActive ? "rotate-0 text-slate-600" : "-rotate-90 opacity-40")} 
                      />
                    )}
                  </>
                )}

                {/* Collapsed dot indicator */}
                {isCollapsed && isActive && (
                  <div className="absolute right-1 w-1.5 h-1.5 rounded-full bg-slate-900" />
                )}
              </button>

              {/* Subtabs list when module is active (Apple style nested navigation) */}
              {!isCollapsed && isActive && subtabs.length > 0 && (
                <div className="pl-4 pr-1 py-1 space-y-0.5 border-l-2 border-slate-200 ml-5 my-0.5">
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
                          "w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] transition-all",
                          isSubActive
                            ? "bg-slate-200/80 text-slate-900 font-bold"
                            : "text-slate-500 hover:text-slate-900 hover:bg-slate-200/40 font-medium"
                        )}
                      >
                        <SubIcon size={13} className={isSubActive ? "text-slate-900" : "text-slate-400"} />
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
      <div className="p-3 border-t border-slate-200/60 bg-slate-100/40">
        {!isCollapsed ? (
          <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-white border border-slate-200/80 shadow-xs">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-xs shrink-0 border border-slate-200">
                L
              </div>
              <div className="truncate">
                <p className="text-xs font-bold text-slate-800 truncate">Lara</p>
                <p className="text-[10px] text-slate-400 truncate">Sessão Conectada</p>
              </div>
            </div>

            <button
              onClick={onLogout}
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors shrink-0"
              title="Encerrar Sessão (Sair)"
            >
              <LogOut size={15} />
            </button>
          </div>
        ) : (
          <button
            onClick={onLogout}
            className="w-full py-2 flex justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
            title="Encerrar Sessão (Sair)"
          >
            <LogOut size={16} />
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
            className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs transition-opacity"
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
