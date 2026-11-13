import React from 'react';
const { useState, useMemo, useRef, useEffect } = React;
import { Wallet, TrendingUp, Droplets, Zap, Building2, Briefcase, Users, Download, Plus, Trash2, FileText, X, Eye } from 'lucide-react';
import { ChacaraBill } from '../types';
import { PdfService } from '../lib/PdfService';
import { useDialog } from './DialogContext';
import { computeBillBreakdown, toCents, fromCents } from '../lib/chacaraFinance';

interface ChacaraFinanceDashboardProps {
  bills: ChacaraBill[];
  expenses?: any[];
  users?: any[];
  onUpdate?: () => void;
  fetchWithAuth: (url: string, options?: RequestInit) => Promise<Response>;
  filterMonth: string;
  setFilterMonth: (month: string) => void;
}

export const ChacaraFinanceDashboard: React.FC<ChacaraFinanceDashboardProps> = ({ 
  bills, 
  expenses = [], 
  users = [],
  onUpdate, 
  fetchWithAuth, 
  filterMonth, 
  setFilterMonth 
}) => {
  const { confirm: dialogConfirm, alert: dialogAlert, askOptions, preview } = useDialog();
  const dashboardRef = useRef<HTMLDivElement>(null);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    description: '',
    category: 'geral',
    amount: '' as string | number,
    date: new Date().toISOString().slice(0, 10),
    receipt_url: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const data = useMemo(() => {
    const expectedCents = { fundoReserva: 0, rateio: 0, prestador: 0, agua: 0, energia: 0, geral: 0 };
    const receivedCents = { fundoReserva: 0, rateio: 0, prestador: 0, agua: 0, energia: 0, geral: 0 };
    const prevReceivedCents = { fundoReserva: 0, rateio: 0, prestador: 0, agua: 0, energia: 0, geral: 0 };
    const currentExpensesCents = { fundoReserva: 0, rateio: 0, prestador: 0, agua: 0, energia: 0, geral: 0 };
    const prevExpensesCents = { fundoReserva: 0, rateio: 0, prestador: 0, agua: 0, energia: 0, geral: 0 };

    const counts = {
      fundoReserva: { total: 0, paid: 0, pending: 0 },
      rateio: { total: 0, paid: 0, pending: 0 },
      prestador: { total: 0, paid: 0, pending: 0 },
      agua: { total: 0, paid: 0, pending: 0 },
      energia: { total: 0, paid: 0, pending: 0 },
      geral: { total: 0, paid: 0, pending: 0 }
    };

    bills.filter(b => b.month_reference === filterMonth).forEach(bill => {
      const bd = computeBillBreakdown(bill);

      const addCat = (
        catKey: 'fundo_reserva' | 'rateio' | 'prestador' | 'agua' | 'energia',
        targetKey: 'fundoReserva' | 'rateio' | 'prestador' | 'agua' | 'energia'
      ) => {
        const c = bd.categories[catKey];
        if (c.previstoCents > 0) {
          counts[targetKey].total++;
          if (c.aReceberCents === 0) counts[targetKey].paid++;
          else counts[targetKey].pending++;
          expectedCents[targetKey] += c.previstoCents;
          receivedCents[targetKey] += c.recebidoCents;
        }
      };

      addCat('fundo_reserva', 'fundoReserva');
      addCat('rateio', 'rateio');
      addCat('prestador', 'prestador');
      addCat('agua', 'agua');
      addCat('energia', 'energia');

      counts.geral.total++;
      if (bd.isPaid) counts.geral.paid++;
      else counts.geral.pending++;
      expectedCents.geral += bd.billTotalCents;
      receivedCents.geral += bd.paidCents;
    });

    bills.filter(b => b.month_reference < filterMonth).forEach(bill => {
      const bd = computeBillBreakdown(bill);
      prevReceivedCents.geral += bd.paidCents;
    });

    expenses.forEach(exp => {
      const cat = exp.category || 'geral';
      const amountCents = toCents(exp.amount);
      if (exp.month_reference === filterMonth) {
        if (cat in currentExpensesCents) (currentExpensesCents as any)[cat] += amountCents;
        currentExpensesCents.geral += amountCents;
      } else if (exp.month_reference < filterMonth) {
        if (cat in prevExpensesCents) (prevExpensesCents as any)[cat] += amountCents;
        prevExpensesCents.geral += amountCents;
      }
    });

    const convert = (obj: typeof expectedCents) => ({
      fundoReserva: fromCents(obj.fundoReserva),
      rateio: fromCents(obj.rateio),
      prestador: fromCents(obj.prestador),
      agua: fromCents(obj.agua),
      energia: fromCents(obj.energia),
      geral: fromCents(obj.geral),
    });

    return {
      expected: convert(expectedCents),
      received: convert(receivedCents),
      prevReceived: convert(prevReceivedCents),
      currentExpenses: convert(currentExpensesCents),
      prevExpenses: convert(prevExpensesCents),
      counts
    };
  }, [bills, expenses, filterMonth]);

  const handleExport = async () => {
    if (!dashboardRef.current) return;
    const confirmed = await preview(dashboardRef.current, 'Dashboard Financeiro da Chácara');
    if (!confirmed) return;
    try {
      await PdfService.exportToPDF(dashboardRef.current, `Dashboard_Chacara_${filterMonth}`, 'p', 'save', 'Segue o dashboard financeiro em PDF.');
    } catch (error: any) {
      console.error('Erro ao exportar:', error);
      dialogAlert(`Erro ao exportar: ${error.message || error}`);
    }
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetchWithAuth('/api/chacara/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...expenseForm,
          month_reference: filterMonth
        })
      });

      if (res.ok) {
        setIsExpenseModalOpen(false);
        setExpenseForm({ description: '', category: 'geral', amount: '', date: new Date().toISOString().slice(0, 10), receipt_url: '' });
        if (onUpdate) onUpdate();
      } else {
        const err = await res.json().catch(() => ({ message: res.statusText }));
        dialogAlert(`Erro ao adicionar despesa: ${err.message || err.error || JSON.stringify(err)}`);
      }
    } catch (error) {
      console.error('Error adding expense:', error);
      dialogAlert('Erro de conexão ao adicionar despesa.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteExpense = async (id: number) => {
    if (!(await dialogConfirm('Deseja realmente excluir esta despesa?'))) return;
    try {
      const res = await fetchWithAuth(`/api/chacara/expenses/${id}`, { method: 'DELETE' });
      if (res.ok) {
        if (onUpdate) onUpdate();
      } else {
        const err = await res.json().catch(() => ({ message: res.statusText }));
        dialogAlert(`Erro ao excluir despesa: ${err.message || 'Erro desconhecido'}`);
      }
    } catch (error) {
      console.error('Error deleting expense:', error);
      dialogAlert('Erro de conexão ao excluir despesa.');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      dialogAlert('O arquivo deve ter no máximo 5MB.');
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setExpenseForm(prev => ({ ...prev, receipt_url: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const categories = [
    { key: 'fundoReserva', title: 'Fundo de Reserva', icon: Building2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { key: 'rateio', title: 'Rateio', icon: Users, color: 'text-purple-600', bg: 'bg-purple-50' },
    { key: 'prestador', title: 'Prestador de Serviço', icon: Briefcase, color: 'text-blue-600', bg: 'bg-blue-50' },
    { key: 'agua', title: 'Conta de Água', icon: Droplets, color: 'text-cyan-600', bg: 'bg-cyan-50' },
    { key: 'energia', title: 'Conta de Energia', icon: Zap, color: 'text-amber-600', bg: 'bg-amber-50' },
  ];

  const currentMonthExpenses = expenses.filter(e => e.month_reference === filterMonth);
  const totalReceived = data.received.geral;
  const totalExpenses = data.currentExpenses.geral;
  const inadimplencia = data.expected.geral - totalReceived;

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Dashboard Financeiro da Chácara</h2>
          <p className="text-xs text-slate-500 mt-0.5">Visão consolidada de receitas, despesas e recebimentos por categoria</p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <input
            type="month"
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
            className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none cursor-pointer"
          />
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-semibold hover:bg-slate-800 transition-all shadow-xs"
          >
            <Download size={15} />
            <span>Exportar PDF</span>
          </button>
        </div>
      </div>

      <div ref={dashboardRef} className="space-y-6">
        {/* Top Summary KPI Cards (No 'Saldo em Caixa') */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Receitas Recebidas</span>
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                <TrendingUp size={16} />
              </div>
            </div>
            <p className="text-2xl font-bold text-emerald-700 tracking-tight">
              R$ {totalReceived.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">Total arrecadado no mês</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Despesas Pagas</span>
              <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
                <Wallet size={16} />
              </div>
            </div>
            <p className="text-2xl font-bold text-rose-700 tracking-tight">
              R$ {totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">Gastos quitados no mês</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Inadimplência</span>
              <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                <Users size={16} />
              </div>
            </div>
            <p className="text-2xl font-bold text-amber-600 tracking-tight">
              R$ {Math.max(0, inadimplencia).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">Valores pendentes de recebimento</p>
          </div>
        </div>

        {/* Detailed Category Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((cat) => {
            const expected = (data.expected as any)[cat.key] || 0;
            const received = (data.received as any)[cat.key] || 0;
            const pending = Math.max(0, expected - received);
            const cnt = (data.counts as any)[cat.key] || { total: 0, paid: 0, pending: 0 };
            const pct = expected > 0 ? Math.min(100, Math.round((received / expected) * 100)) : 0;

            return (
              <div key={cat.key} className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className={`p-2 rounded-xl ${cat.bg} ${cat.color}`}>
                        <cat.icon size={18} />
                      </div>
                      <h3 className="font-bold text-slate-900 text-sm tracking-tight">{cat.title}</h3>
                    </div>
                    <span className="text-xs font-bold text-slate-700 font-mono bg-slate-100 px-2 py-0.5 rounded-lg">
                      {pct}%
                    </span>
                  </div>

                  {/* Progress bar (Green = received, Orange = pending) */}
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden flex mb-4">
                    <div 
                      className="bg-emerald-500 h-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                      title={`Recebido: ${pct}%`}
                    />
                    <div 
                      className="bg-amber-400 h-full transition-all duration-500"
                      style={{ width: `${100 - pct}%` }}
                      title={`Pendente: ${100 - pct}%`}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs py-2 border-y border-slate-100">
                    <div>
                      <span className="text-slate-400 text-[10px] uppercase font-semibold block">Previsto</span>
                      <span className="font-bold text-slate-800">R$ {expected.toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] uppercase font-semibold block">Recebido</span>
                      <span className="font-bold text-emerald-600">R$ {received.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-1 text-xs text-slate-500">
                  <div className="flex justify-between">
                    <span>Adesões / Moradores:</span>
                    <strong className="text-slate-800">{cnt.total}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-emerald-600 flex items-center gap-1">✓ Já pagaram:</span>
                    <strong className="text-emerald-700">{cnt.paid}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-amber-600 flex items-center gap-1">⏳ Pendentes:</span>
                    <strong className="text-amber-700">{cnt.pending}</strong>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Expenses Section */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-900 text-sm tracking-tight flex items-center gap-2">
                <Wallet size={17} className="text-rose-600" />
                Despesas do Mês ({filterMonth})
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Lançamentos de gastos da chácara por competência</p>
            </div>
            <button
              onClick={() => setIsExpenseModalOpen(true)}
              className="flex items-center gap-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 px-4 py-2 rounded-xl text-xs font-semibold transition-all"
            >
              <Plus size={15} />
              <span>Nova Despesa</span>
            </button>
          </div>

          {currentMonthExpenses.length > 0 ? (
            <div className="overflow-x-auto pt-4">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 font-bold text-slate-500 uppercase tracking-wider">
                    <th className="px-4 py-3">Data Pagamento</th>
                    <th className="px-4 py-3">Descrição</th>
                    <th className="px-4 py-3">Categoria</th>
                    <th className="px-4 py-3">Valor</th>
                    <th className="px-4 py-3">Comprovante</th>
                    <th className="px-4 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {currentMonthExpenses.map((exp) => (
                    <tr key={exp.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3 font-mono">
                        {exp.date ? exp.date.split('-').reverse().join('/') : '-'}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-900">{exp.description}</td>
                      <td className="px-4 py-3 uppercase text-[10px] font-bold text-slate-500">
                        {exp.category}
                      </td>
                      <td className="px-4 py-3 font-bold text-rose-600 font-mono">
                        R$ {Number(exp.amount).toFixed(2)}
                      </td>
                      <td className="px-4 py-3">
                        {exp.receipt_url ? (
                          <button
                            onClick={() => setPreviewUrl(exp.receipt_url)}
                            className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-2.5 py-1 rounded-lg text-xs font-semibold"
                          >
                            <Eye size={13} />
                            Ver
                          </button>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleDeleteExpense(exp.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Excluir despesa"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-12 text-center text-slate-400">
              <p className="text-xs">Nenhuma despesa registrada para este mês de competência.</p>
            </div>
          )}
        </div>
      </div>

      {/* Add Expense Modal */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
              <h3 className="font-bold text-slate-900 text-sm">Lançar Nova Despesa</h3>
              <button 
                onClick={() => setIsExpenseModalOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-200/60 flex items-center justify-center text-slate-600 hover:bg-slate-200 transition-colors"
              >
                <X size={15} />
              </button>
            </div>
            <form onSubmit={handleAddExpense} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-500 uppercase mb-1">Descrição</label>
                <input
                  type="text"
                  required
                  value={expenseForm.description}
                  onChange={e => setExpenseForm({...expenseForm, description: e.target.value})}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:bg-white focus:border-indigo-500 outline-none text-xs"
                  placeholder="Ex: Manutenção da bomba d'água"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-500 uppercase mb-1">Data Pagamento</label>
                  <input
                    type="date"
                    required
                    value={expenseForm.date}
                    onChange={e => setExpenseForm({...expenseForm, date: e.target.value})}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:bg-white focus:border-indigo-500 outline-none text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-500 uppercase mb-1">Valor (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={expenseForm.amount}
                    onChange={e => setExpenseForm({...expenseForm, amount: e.target.value})}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:bg-white focus:border-indigo-500 outline-none text-xs"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-500 uppercase mb-1">Categoria</label>
                <select
                  value={expenseForm.category}
                  onChange={e => setExpenseForm({...expenseForm, category: e.target.value})}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:bg-white focus:border-indigo-500 outline-none text-xs"
                >
                  <option value="geral">Resumo Geral</option>
                  <option value="fundoReserva">Fundo de Reserva</option>
                  <option value="rateio">Rateio</option>
                  <option value="prestador">Prestador de Serviço</option>
                  <option value="agua">Conta de Água</option>
                  <option value="energia">Conta de Energia</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-500 uppercase mb-1">Comprovante (Imagem / PDF)</label>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={handleFileChange}
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
                />
                {expenseForm.receipt_url && (
                  <p className="text-[11px] text-emerald-600 mt-1 font-semibold">✓ Comprovante anexado</p>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsExpenseModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-all shadow-xs disabled:opacity-50"
                >
                  {isSubmitting ? 'Salvando...' : 'Salvar Despesa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewUrl && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-3xl rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm">Visualizar Comprovante</h3>
              <button onClick={() => setPreviewUrl(null)} className="p-1.5 rounded-full hover:bg-slate-100 text-slate-500">
                <X size={18} />
              </button>
            </div>
            <div className="p-4 bg-slate-50 flex-1 overflow-auto flex items-center justify-center">
              {previewUrl.startsWith('data:image') ? (
                <img src={previewUrl} alt="Comprovante" className="max-w-full h-auto rounded-xl shadow-md" />
              ) : (
                <iframe src={previewUrl} className="w-full h-[60vh] rounded-xl border border-slate-200" title="PDF Preview" />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
