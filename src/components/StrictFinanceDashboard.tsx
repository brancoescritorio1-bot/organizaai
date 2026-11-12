import React, { useMemo, useState } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Building2, 
  Droplets, 
  Zap, 
  Briefcase, 
  Users, 
  AlertCircle, 
  Download, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  X 
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PdfService } from '../lib/PdfService';
import { useDialog } from './DialogContext';
import { cn } from '../lib/utils';

export interface Lancamento {
  id: string;
  data: string;
  mes_referencia: string;
  categoria: 'fundo_reserva' | 'agua' | 'energia' | 'prestador' | 'rateio' | 'despesa_geral';
  tipo: 'receita' | 'despesa';
  valor: number;
  status: 'pago' | 'pendente' | 'parcial';
  valor_pago: number;
  descricao: string;
  is_divergent?: boolean;
}

interface StrictFinanceDashboardProps {
  lancamentos: Lancamento[];
  filterMonth: string;
  setFilterMonth: (month: string) => void;
  onRefresh?: () => void;
}

export const StrictFinanceDashboard: React.FC<StrictFinanceDashboardProps> = ({ 
  lancamentos, 
  filterMonth, 
  setFilterMonth, 
  onRefresh 
}) => {
  const { askOptions } = useDialog();
  const [selectedCategory, setSelectedCategory] = useState<{ id: string; title: string } | null>(null);

  const getValorRecebido = (l: Lancamento) => {
    return l.valor_pago || (l.status === 'pago' ? l.valor : 0);
  };

  const getValorPendente = (l: Lancamento) => {
    if (l.status === 'pendente') return l.valor;
    if (l.status === 'parcial') return Math.max(0, l.valor - (l.valor_pago || 0));
    return 0;
  };

  const dashboardData = useMemo(() => {
    const filtered = lancamentos.filter(l => l.mes_referencia === filterMonth);
    
    let totalPrevisto = 0;
    let totalRecebido = 0;
    let totalPendente = 0;
    let totalDespesas = 0;

    const categorias = {
      fundo_reserva: { valor: 0, recebido: 0, pendente: 0, totalUsuarios: 0, pagosUsuarios: 0, pendentesUsuarios: 0 },
      agua: { valor: 0, recebido: 0, pendente: 0, totalUsuarios: 0, pagosUsuarios: 0, pendentesUsuarios: 0 },
      energia: { valor: 0, recebido: 0, pendente: 0, totalUsuarios: 0, pagosUsuarios: 0, pendentesUsuarios: 0 },
      prestador: { valor: 0, recebido: 0, pendente: 0, totalUsuarios: 0, pagosUsuarios: 0, pendentesUsuarios: 0 },
      rateio: { valor: 0, recebido: 0, pendente: 0, totalUsuarios: 0, pagosUsuarios: 0, pendentesUsuarios: 0 },
    };

    filtered.forEach(l => {
      const recebido = getValorRecebido(l);
      const pendente = getValorPendente(l);

      if (l.tipo === 'receita') {
        totalPrevisto += l.valor;
        totalRecebido += recebido;
        totalPendente += pendente;

        if (l.categoria in categorias) {
          const cat = categorias[l.categoria as keyof typeof categorias];
          cat.valor += l.valor;
          cat.recebido += recebido;
          cat.pendente += pendente;
          cat.totalUsuarios += 1;
          if (l.status === 'pago') {
            cat.pagosUsuarios += 1;
          } else {
            cat.pendentesUsuarios += 1;
          }
        }
      } else if (l.tipo === 'despesa') {
        totalDespesas += l.valor;
      }
    });

    return {
      totalPrevisto,
      totalRecebido,
      totalPendente,
      totalDespesas,
      categorias
    };
  }, [lancamentos, filterMonth]);

  const categoryConfigs = [
    { id: 'fundo_reserva', title: 'Fundo de Reserva', icon: Building2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { id: 'agua', title: 'Água', icon: Droplets, color: 'text-sky-600', bg: 'bg-sky-50' },
    { id: 'energia', title: 'Energia', icon: Zap, color: 'text-amber-600', bg: 'bg-amber-50' },
    { id: 'prestador', title: 'Prestador de Serviço', icon: Briefcase, color: 'text-blue-600', bg: 'bg-blue-50' },
    { id: 'rateio', title: 'Rateio', icon: Users, color: 'text-purple-600', bg: 'bg-purple-50' },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header com Filtro de Mês */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Dashboard da Chácara</h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">Visão financeira e acompanhamento de pagamentos por categoria</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-200">
            <Calendar size={15} className="text-slate-500" />
            <input
              type="month"
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-800 outline-none cursor-pointer"
            />
          </div>
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
            >
              Atualizar
            </button>
          )}
        </div>
      </div>

      {/* 1. Indicadores Superiores (3 Indicadores - Sem Saldo em Caixa) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Receitas Recebidas */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Receitas Recebidas</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp size={17} />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-emerald-700 tracking-tight">
            R$ {dashboardData.totalRecebido.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            de R$ {dashboardData.totalPrevisto.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} previsto
          </p>
        </div>

        {/* Despesas Pagas */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Despesas Pagas</span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <TrendingDown size={17} />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-rose-700 tracking-tight">
            R$ {dashboardData.totalDespesas.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            Total de saídas pagas da competência
          </p>
        </div>

        {/* Inadimplência */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Inadimplência</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertCircle size={17} />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-amber-600 tracking-tight">
            R$ {dashboardData.totalPendente.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            Valores ainda aguardando recebimento
          </p>
        </div>
      </div>

      {/* 2. Detalhamento por Categoria (Completamente Redesenhado) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 sm:p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-bold text-slate-900 text-base tracking-tight">Detalhamento por Categoria</h3>
            <p className="text-xs text-slate-500 mt-0.5">Valores previstos, recebidos, pendentes e contagem de moradores</p>
          </div>
          <span className="text-xs font-semibold text-slate-400 font-mono">
            Competência: {filterMonth}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {categoryConfigs.map(cat => {
            const data = dashboardData.categorias[cat.id as keyof typeof dashboardData.categorias];
            const Icon = cat.icon;
            const percentRecebido = data.valor > 0 ? Math.min(100, Math.round((data.recebido / data.valor) * 100)) : 0;
            const percentPendente = 100 - percentRecebido;

            return (
              <div 
                key={cat.id}
                onClick={() => setSelectedCategory({ id: cat.id, title: cat.title })}
                className="group p-4 rounded-xl border border-slate-200/70 hover:border-slate-300 bg-slate-50/40 hover:bg-white transition-all cursor-pointer flex flex-col justify-between shadow-xs space-y-3"
              >
                {/* Header do Card */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center", cat.bg, cat.color)}>
                      <Icon size={15} />
                    </div>
                    <h4 className="font-bold text-slate-900 text-xs truncate">{cat.title}</h4>
                  </div>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700">
                    {percentRecebido}%
                  </span>
                </div>

                {/* Total Previsto */}
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Previsto</span>
                  <span className="text-lg font-bold text-slate-900">
                    R$ {data.valor.toFixed(2)}
                  </span>
                </div>

                {/* Barra de Progresso Dupla (Verde = Recebido, Laranja = Pendente) */}
                <div className="space-y-1">
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden flex">
                    <div 
                      className="bg-emerald-500 h-full transition-all duration-300"
                      style={{ width: `${percentRecebido}%` }}
                      title={`Recebido: ${percentRecebido}%`}
                    />
                    <div 
                      className="bg-amber-500 h-full transition-all duration-300"
                      style={{ width: `${percentPendente}%` }}
                      title={`Pendente: ${percentPendente}%`}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] font-semibold pt-0.5">
                    <span className="text-emerald-700">
                      R$ {data.recebido.toFixed(2)}
                    </span>
                    <span className="text-amber-600">
                      R$ {data.pendente.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Quantidade de Moradores */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-1 text-emerald-700" title="Moradores que já pagaram">
                    <CheckCircle2 size={12} />
                    <span className="font-semibold">{data.pagosUsuarios} pagaram</span>
                  </div>
                  <div className="flex items-center gap-1 text-amber-600" title="Moradores pendentes">
                    <Clock size={12} />
                    <span className="font-semibold">{data.pendentesUsuarios} pendentes</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal de Detalhamento por Categoria */}
      {selectedCategory && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4" onClick={() => setSelectedCategory(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col border border-slate-200" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/80">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Detalhamento — {selectedCategory.title}
                </h3>
                <p className="text-xs text-slate-500">Moradores e status da competência {filterMonth}</p>
              </div>
              <button onClick={() => setSelectedCategory(null)} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg">
                <X size={18} />
              </button>
            </div>
            <div className="p-5 overflow-y-auto space-y-2">
              {lancamentos
                .filter(l => l.mes_referencia === filterMonth && l.categoria === selectedCategory.id && l.tipo === 'receita')
                .sort((a, b) => a.descricao.localeCompare(b.descricao))
                .map(l => (
                  <div key={l.id} className="flex justify-between items-center p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                    <div>
                      <p className="font-semibold text-slate-800">{l.descricao}</p>
                      <p className="text-[10px] text-slate-400">{l.data ? new Date(l.data).toLocaleDateString('pt-BR') : ''}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-slate-900">R$ {l.valor.toFixed(2)}</p>
                      <span className={cn(
                        "text-[10px] font-bold px-1.5 py-0.5 rounded",
                        l.status === 'pago' ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                      )}>
                        {l.status === 'pago' ? 'PAGO' : 'PENDENTE'}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
