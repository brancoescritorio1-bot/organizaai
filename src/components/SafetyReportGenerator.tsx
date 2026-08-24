import React, { useState, useEffect } from 'react';
import { Plus, Trash2, FileText, Download, Copy, CheckCircle2, Image as ImageIcon, X, History, Edit2, Check, Clock, AlertTriangle, Shield, Calendar, Settings, Sparkles, CheckCircle, AlertOctagon, Eye, Mail, Send, Palette, ExternalLink, RotateCcw, Bell, Timer, Hourglass, CheckSquare, Square, Layers } from 'lucide-react';
import { WhatsAppIcon, getGreeting } from '../MainApp';
import jsPDF from 'jspdf';
import { cn } from '../lib/utils';
import { useDialog } from './DialogContext';
import { DEFAULT_LOGOS, LOGO_CLICK_SEGURANCA_BASE64, LOGO_COPASA_BASE64 } from '../constants/safetyLogos';

interface NonConformity {
  id?: string;
  description: string;
  suggestion: string;
  normativeItems: string;
  classification: 'LEVE' | 'MÉDIA' | 'GRAVE' | 'GRAVÍSSIMA';
  dueDate: string;
  images: string[];
}

interface SafetyReport {
  id?: string;
  report_number: string;
  location: string;
  supervisor?: string;
  status: 'pending' | 'completed';
  completed_at?: string;
  created_at?: string;
  logo_1?: string;
  logo_2?: string;
  nonConformities: NonConformity[];
}

interface MessageFormatConfig {
  boldLabels: boolean; // *Número da Inconformidade:* / <b>Rótulo:</b>
  boldValues: boolean; // *5481*, *GRAVÍSSIMA*
  boldHeaders: boolean; // *Prezados!*
  useColorEmojis: boolean; // 🔴 🟠 🟡 🔵
  highlightOverdue: boolean; // ⚠️ *[VENCIDO]*
  includeSuggestion: boolean;
  introText: string;
  emailSubjectTemplate: string;
  colorGravissima: string;
  colorGrave: string;
  colorMedia: string;
  colorLeve: string;
  colorOverdue: string;
  colorHeader: string;
}

const DEFAULT_MSG_CONFIG: MessageFormatConfig = {
  boldLabels: true,
  boldValues: true,
  boldHeaders: true,
  useColorEmojis: true,
  highlightOverdue: true,
  includeSuggestion: true,
  introText: 'Informo sobre o click segurança com inconformidades de:',
  emailSubjectTemplate: 'Relatório de Inconformidade - {local} - Nº {numero}',
  colorGravissima: '#dc2626',
  colorGrave: '#ea580c',
  colorMedia: '#d97706',
  colorLeve: '#0284c7',
  colorOverdue: '#b91c1c',
  colorHeader: '#0f172a'
};

interface SafetyReportGeneratorProps {
  fetchWithAuth?: (url: string, options?: RequestInit) => Promise<Response>;
}

export interface DueDateCountdownInfo {
  diffDays: number;
  formattedDate: string;
  isCompleted?: boolean;
  isOverdue?: boolean;
  isToday?: boolean;
  isTomorrow?: boolean;
  isSoon?: boolean;
  isNormal?: boolean;
  statusText: string;
  badgeLabel: string;
  tagText: string;
  colorClass: string;
  bgClass: string;
  borderClass: string;
  textClass: string;
}

// Utility to verify if a date is expired/overdue
export const isDateOverdue = (dateStr: string, status?: string) => {
  if (!dateStr || status === 'completed') return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d) return false;
  const due = new Date(y, m - 1, d);
  return due < today;
};

// Calculates exact days remaining or days overdue with comprehensive countdown info
export const getDueDateInfo = (dateStr: string, status?: string): DueDateCountdownInfo | null => {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d) return null;
  
  const formattedDate = `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;

  if (status === 'completed') {
    return {
      diffDays: 0,
      formattedDate,
      isCompleted: true,
      statusText: 'Concluído',
      badgeLabel: 'CONCLUÍDO',
      tagText: `Concluído`,
      colorClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      bgClass: 'bg-emerald-50',
      borderClass: 'border-emerald-200',
      textClass: 'text-emerald-700'
    };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(y, m - 1, d);
  due.setHours(0, 0, 0, 0);

  const diffTime = due.getTime() - today.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    const overdueDays = Math.abs(diffDays);
    const dayWord = overdueDays === 1 ? 'dia' : 'dias';
    return {
      diffDays,
      formattedDate,
      isOverdue: true,
      statusText: `Vencido há ${overdueDays} ${dayWord}`,
      badgeLabel: `VENCIDO HÁ ${overdueDays} ${dayWord.toUpperCase()}`,
      tagText: `Vencido há ${overdueDays} ${dayWord} (${formattedDate})`,
      colorClass: 'bg-red-100 text-red-700 border-red-300',
      bgClass: 'bg-red-50/70',
      borderClass: 'border-red-300',
      textClass: 'text-red-700'
    };
  } else if (diffDays === 0) {
    return {
      diffDays,
      formattedDate,
      isToday: true,
      statusText: 'Vence Hoje',
      badgeLabel: 'VENCE HOJE',
      tagText: `Vence hoje (${formattedDate})`,
      colorClass: 'bg-red-50 text-red-700 border-red-300',
      bgClass: 'bg-red-50',
      borderClass: 'border-red-300',
      textClass: 'text-red-700'
    };
  } else if (diffDays === 1) {
    return {
      diffDays,
      formattedDate,
      isTomorrow: true,
      statusText: 'Vence Amanhã (1 dia)',
      badgeLabel: 'FALTA 1 DIA',
      tagText: `Vence amanhã (Falta 1 dia • ${formattedDate})`,
      colorClass: 'bg-amber-100 text-amber-900 border-amber-300',
      bgClass: 'bg-amber-50',
      borderClass: 'border-amber-300',
      textClass: 'text-amber-800'
    };
  } else if (diffDays <= 5) {
    return {
      diffDays,
      formattedDate,
      isSoon: true,
      statusText: `Faltam ${diffDays} dias`,
      badgeLabel: `FALTAM ${diffDays} DIAS`,
      tagText: `Faltam ${diffDays} dias para vencer (${formattedDate})`,
      colorClass: 'bg-amber-50 text-amber-800 border-amber-200',
      bgClass: 'bg-amber-50/50',
      borderClass: 'border-amber-200',
      textClass: 'text-amber-700'
    };
  } else {
    return {
      diffDays,
      formattedDate,
      isNormal: true,
      statusText: `Faltam ${diffDays} dias`,
      badgeLabel: `FALTAM ${diffDays} DIAS`,
      tagText: `Faltam ${diffDays} dias (${formattedDate})`,
      colorClass: 'bg-blue-50 text-blue-700 border-blue-200',
      bgClass: 'bg-blue-50/40',
      borderClass: 'border-blue-200',
      textClass: 'text-blue-700'
    };
  }
};

export const getReportCountdown = (r: SafetyReport) => {
  const dates = (r.nonConformities || [])
    .map(nc => nc.dueDate)
    .filter(Boolean)
    .map(d => getDueDateInfo(d, r.status))
    .filter((info): info is DueDateCountdownInfo => info !== null);

  if (dates.length === 0) return null;
  // Sort by smallest diffDays (most urgent / most overdue first)
  const sorted = [...dates].sort((a, b) => a.diffDays - b.diffDays);
  return {
    mostCritical: sorted[0],
    all: dates
  };
};

export function SafetyReportGenerator({ fetchWithAuth }: SafetyReportGeneratorProps) {
  const { confirm, alert: dialogAlert, askOptions } = useDialog();
  const [reports, setReports] = useState<SafetyReport[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'soon' | 'overdue' | 'completed'>('all');
  const [view, setView] = useState<'list' | 'editor'>('list');
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  // Formatting config with local storage persistence
  const [msgConfig, setMsgConfig] = useState<MessageFormatConfig>(() => {
    try {
      const saved = localStorage.getItem('safety_msg_config');
      if (saved) return { ...DEFAULT_MSG_CONFIG, ...JSON.parse(saved) };
    } catch (e) {}
    return DEFAULT_MSG_CONFIG;
  });

  const [currentReport, setCurrentReport] = useState<SafetyReport>({
    report_number: '',
    location: '',
    supervisor: '',
    status: 'pending',
    logo_1: DEFAULT_LOGOS.logo1,
    logo_2: DEFAULT_LOGOS.logo2,
    nonConformities: []
  });
  const [selectedReportIds, setSelectedReportIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedType, setCopiedType] = useState<'email' | 'whatsapp' | null>(null);
  const [previewTab, setPreviewTab] = useState<'email' | 'whatsapp'>('email');
  const [configTab, setConfigTab] = useState<'bold' | 'colors' | 'text'>('bold');

  useEffect(() => {
    try {
      localStorage.setItem('safety_msg_config', JSON.stringify(msgConfig));
    } catch (e) {}
  }, [msgConfig]);

  useEffect(() => {
    if (fetchWithAuth) {
      loadReports();
    }
  }, [fetchWithAuth]);

  const loadReports = async () => {
    if (!fetchWithAuth) return;
    setLoading(true);
    try {
      const res = await fetchWithAuth('/api/safety/reports');
      if (res.ok) {
        const data = await res.json();
        setReports(data || []);
      } else {
        const err = await res.json().catch(() => ({}));
        console.error("Error loading reports from server:", err);
      }
    } catch (error) {
      console.error("Error loading reports:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadReportDetails = async (report: SafetyReport) => {
    if (!fetchWithAuth || !report.id) return;
    setLoading(true);
    try {
      const res = await fetchWithAuth(`/api/safety/reports/${report.id}/non-conformities`);
      if (res.ok) {
        const ncs = await res.json();
        setCurrentReport({
          ...report,
          logo_1: report.logo_1 || DEFAULT_LOGOS.logo1,
          logo_2: report.logo_2 || DEFAULT_LOGOS.logo2,
          nonConformities: ncs.map((nc: any) => ({
            id: nc.id,
            description: nc.description || '',
            suggestion: nc.suggestion || '',
            normativeItems: nc.normative_items || nc.normativeItems || '',
            classification: nc.classification || 'GRAVE',
            dueDate: nc.due_date || nc.dueDate || '',
            images: Array.isArray(nc.images) && nc.images.length > 0 
              ? nc.images 
              : (nc.image_data ? [nc.image_data] : [])
          }))
        });
        setView('editor');
      } else {
        const err = await res.json().catch(() => ({}));
        dialogAlert('Erro ao carregar detalhes do relatório: ' + (err.error || 'Erro desconhecido'));
      }
    } catch (error) {
      console.error("Error loading report details:", error);
      dialogAlert('Falha de conexão ao carregar detalhes do relatório.');
    } finally {
      setLoading(false);
    }
  };

  const saveReport = async () => {
    if (!fetchWithAuth) return;

    if (!currentReport.report_number.trim()) {
      dialogAlert('Por favor, preencha o Número da Inconformidade antes de salvar.');
      return;
    }

    if (!currentReport.location.trim()) {
      dialogAlert('Por favor, preencha o Local antes de salvar.');
      return;
    }

    setLoading(true);
    try {
      const method = currentReport.id ? 'PUT' : 'POST';
      const url = currentReport.id ? `/api/safety/reports/${currentReport.id}` : '/api/safety/reports';
      
      const payload = {
        report_number: currentReport.report_number.trim(),
        location: currentReport.location.trim(),
        supervisor: '', // Supervisor removed per user request
        status: currentReport.status || 'pending',
        completed_at: currentReport.completed_at || null,
        logo_1: currentReport.logo_1 || null,
        logo_2: currentReport.logo_2 || null,
        non_conformities: currentReport.nonConformities.map(nc => ({
          description: nc.description,
          suggestion: nc.suggestion,
          normative_items: nc.normativeItems,
          classification: nc.classification,
          due_date: nc.dueDate || null,
          images: nc.images || []
        }))
      };

      const res = await fetchWithAuth(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        await loadReports();
        dialogAlert('Relatório de segurança salvo com sucesso no banco de dados!');
        setView('list');
      } else {
        const errData = await res.json().catch(() => ({}));
        dialogAlert('Erro ao salvar relatório no banco de dados: ' + (errData.error || errData.message || 'Erro desconhecido'));
      }
    } catch (error: any) {
      console.error("Error saving report:", error);
      dialogAlert('Erro de rede ao salvar relatório: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteReport = async (id: string) => {
    if (!fetchWithAuth || !(await confirm('Tem certeza que deseja excluir este relatório de segurança permanentemente?', { type: 'danger' }))) return;
    setLoading(true);
    try {
      const res = await fetchWithAuth(`/api/safety/reports/${id}`, { method: 'DELETE' });
      if (res.ok) {
        await loadReports();
        dialogAlert('Relatório excluído com sucesso.');
      } else {
        const errData = await res.json().catch(() => ({}));
        dialogAlert('Erro ao excluir relatório: ' + (errData.error || 'Erro desconhecido'));
      }
    } catch (error: any) {
      console.error("Error deleting report:", error);
      dialogAlert('Erro de conexão ao excluir relatório.');
    } finally {
      setLoading(false);
    }
  };

  const markAsCompleted = async (report: SafetyReport) => {
    if (!fetchWithAuth || !report.id) return;
    setLoading(true);
    try {
      const res = await fetchWithAuth(`/api/safety/reports/${report.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...report,
          supervisor: '',
          status: 'completed',
          completed_at: new Date().toISOString()
        })
      });
      if (res.ok) {
        await loadReports();
        dialogAlert('Relatório marcado como CONCLUÍDO!');
        if (view === 'editor') setView('list');
      } else {
        const errData = await res.json().catch(() => ({}));
        dialogAlert('Erro ao atualizar status do relatório: ' + (errData.error || 'Erro desconhecido'));
      }
    } catch (error: any) {
      console.error("Error completing report:", error);
      dialogAlert('Erro de rede ao concluir relatório.');
    } finally {
      setLoading(false);
    }
  };

  const addNonConformity = () => {
    const newNC: NonConformity = {
      description: '',
      suggestion: '',
      normativeItems: '',
      classification: 'GRAVE',
      dueDate: '',
      images: []
    };
    setCurrentReport(prev => ({
      ...prev,
      nonConformities: [...prev.nonConformities, newNC]
    }));
  };

  const removeNonConformity = (index: number) => {
    setCurrentReport(prev => ({
      ...prev,
      nonConformities: prev.nonConformities.filter((_, i) => i !== index)
    }));
  };

  const updateNonConformity = (index: number, field: keyof NonConformity, value: any) => {
    setCurrentReport(prev => ({
      ...prev,
      nonConformities: prev.nonConformities.map((nc, i) => 
        i === index ? { ...nc, [field]: value } : nc
      )
    }));
  };

  const handleLogoUpload = (logoNum: 1 | 2, file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      setCurrentReport(prev => ({
        ...prev,
        [`logo_${logoNum}`]: reader.result as string
      }));
    };
    if (file) {
      reader.readAsDataURL(file);
    }
  };

  const handleImageUpload = (index: number, file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const currentImages = currentReport.nonConformities[index].images || [];
      updateNonConformity(index, 'images', [...currentImages, reader.result as string]);
    };
    if (file) {
      reader.readAsDataURL(file);
    }
  };

  const removeImage = (ncIndex: number, imgIndex: number) => {
    const currentImages = currentReport.nonConformities[ncIndex].images || [];
    updateNonConformity(ncIndex, 'images', currentImages.filter((_, i) => i !== imgIndex));
  };

  // Helper for emoji classification colors
  const getClassificationEmoji = (classification: string) => {
    if (!msgConfig.useColorEmojis) return '';
    switch (classification) {
      case 'LEVE': return '🔵 ';
      case 'MÉDIA': return '🟡 ';
      case 'GRAVE': return '🟠 ';
      case 'GRAVÍSSIMA': return '🔴 ';
      default: return '⚪ ';
    }
  };

  // Helper for email subject
  const generateEmailSubject = () => {
    let subj = msgConfig.emailSubjectTemplate || 'Relatório de Inconformidade - {local} - Nº {numero}';
    subj = subj.replace('{local}', currentReport.location || 'Local não informado');
    subj = subj.replace('{numero}', currentReport.report_number || 'S/N');
    return subj;
  };

  // Helper for Rich HTML formatted email body
  const generateEmailHTML = () => {
    const greeting = getGreeting();
    const isHeaderBold = msgConfig.boldHeaders;
    const isLabelBold = msgConfig.boldLabels;
    const isValBold = msgConfig.boldValues;
    const salutation = `Prezados, ${greeting.toLowerCase()}!`;

    let itemsHtml = '';
    currentReport.nonConformities.forEach((nc, index) => {
      const isOver = isDateOverdue(nc.dueDate, currentReport.status);
      
      let classBg = '#f1f5f9';
      let classColor = '#334155';
      let classBorder = '#cbd5e1';

      if (nc.classification === 'GRAVÍSSIMA') {
        classColor = msgConfig.colorGravissima || '#dc2626';
        classBg = '#fef2f2';
        classBorder = '#fecaca';
      } else if (nc.classification === 'GRAVE') {
        classColor = msgConfig.colorGrave || '#ea580c';
        classBg = '#fff7ed';
        classBorder = '#ffedd5';
      } else if (nc.classification === 'MÉDIA') {
        classColor = msgConfig.colorMedia || '#d97706';
        classBg = '#fffbeb';
        classBorder = '#fef3c7';
      } else if (nc.classification === 'LEVE') {
        classColor = msgConfig.colorLeve || '#0284c7';
        classBg = '#f0f9ff';
        classBorder = '#e0f2fe';
      }

      let formattedDate = 'Não informado';
      if (nc.dueDate) {
        const [y, m, d] = nc.dueDate.split('-');
        formattedDate = `${d}/${m}/${y}`;
      }

      itemsHtml += `
        <div style="margin-bottom: 16px; padding: 14px 16px; background-color: #ffffff; border: 1px solid #e2e8f0; border-left: 4px solid ${classColor}; border-radius: 8px;">
          <div style="margin-bottom: 8px; font-size: 14px; font-weight: ${isHeaderBold ? 'bold' : '600'}; color: #0f172a;">
            Inconformidade ${index + 1}:
          </div>
          
          <table style="width: 100%; border-collapse: collapse; font-size: 13px; line-height: 1.5;">
            <tr>
              <td style="padding: 3px 0; vertical-align: top; width: 170px; font-weight: ${isLabelBold ? 'bold' : 'normal'}; color: #475569;">Descrição:</td>
              <td style="padding: 3px 0; vertical-align: top; font-weight: ${isValBold ? 'bold' : 'normal'}; color: #1e293b;">
                ${nc.description || 'Não especificada'}
              </td>
            </tr>
            ${msgConfig.includeSuggestion && nc.suggestion ? `
            <tr>
              <td style="padding: 3px 0; vertical-align: top; font-weight: ${isLabelBold ? 'bold' : 'normal'}; color: #475569;">Sugestão de Adequação:</td>
              <td style="padding: 3px 0; vertical-align: top; color: #1e293b;">
                ${nc.suggestion}
              </td>
            </tr>
            ` : ''}
            <tr>
              <td style="padding: 3px 0; vertical-align: top; font-weight: ${isLabelBold ? 'bold' : 'normal'}; color: #475569;">Itens Normativos:</td>
              <td style="padding: 3px 0; vertical-align: top; color: #334155; white-space: pre-line;">
                ${nc.normativeItems || 'NR padrão'}
              </td>
            </tr>
            <tr>
              <td style="padding: 3px 0; vertical-align: top; font-weight: ${isLabelBold ? 'bold' : 'normal'}; color: #475569;">Classificação:</td>
              <td style="padding: 3px 0; vertical-align: top;">
                <span style="display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: ${isValBold ? 'bold' : '600'}; background-color: ${classBg}; color: ${classColor}; border: 1px solid ${classBorder};">
                  ${msgConfig.useColorEmojis ? getClassificationEmoji(nc.classification) : ''}${nc.classification}
                </span>
              </td>
            </tr>
            ${nc.dueDate ? `
            <tr>
              <td style="padding: 3px 0; vertical-align: top; font-weight: ${isLabelBold ? 'bold' : 'normal'}; color: #475569;">Data de Vencimento:</td>
              <td style="padding: 3px 0; vertical-align: top;">
                <span style="font-weight: ${isValBold ? 'bold' : 'normal'}; color: #1e293b;">${formattedDate}</span>
                ${isOver && msgConfig.highlightOverdue ? `
                  <span style="display: inline-block; margin-left: 6px; padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: bold; background-color: #fee2e2; color: ${msgConfig.colorOverdue || '#b91c1c'}; border: 1px solid #fca5a5;">
                    [PRAZO VENCIDO]
                  </span>
                ` : ''}
              </td>
            </tr>
            ` : ''}
          </table>
        </div>
      `;
    });

    return `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #1e293b; max-width: 650px;">
  <p style="margin: 0 0 12px 0; font-size: 15px; font-weight: ${isHeaderBold ? 'bold' : 'normal'}; color: ${msgConfig.colorHeader || '#0f172a'};">
    ${salutation}
  </p>
  <p style="margin: 0 0 16px 0; color: #334155; font-size: 14px;">
    ${msgConfig.introText}
  </p>

  <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 16px; margin-bottom: 16px;">
    <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
      <tr>
        <td style="padding: 3px 0; width: 190px; font-weight: ${isLabelBold ? 'bold' : 'normal'}; color: #475569;">Número da Inconformidade:</td>
        <td style="padding: 3px 0; font-weight: ${isValBold ? 'bold' : 'normal'}; color: #0f172a;">${currentReport.report_number || 'S/N'}</td>
      </tr>
      <tr>
        <td style="padding: 3px 0; font-weight: ${isLabelBold ? 'bold' : 'normal'}; color: #475569;">Local:</td>
        <td style="padding: 3px 0; font-weight: ${isValBold ? 'bold' : 'normal'}; color: #0f172a;">${currentReport.location || 'Não informado'}</td>
      </tr>
    </table>
  </div>

  <div>
    ${itemsHtml}
  </div>
</div>`;
  };

  // Message Generator with exact configurable bold tags and structure requested
  const generateMessage = () => {
    const greeting = getGreeting();
    const salutation = `Prezados, ${greeting.toLowerCase()}!`;
    
    // Header formatting
    const greetingText = msgConfig.boldHeaders ? salutation : salutation;
    const intro = msgConfig.introText.trim();
    
    let msg = `${greetingText}\n\n${intro}\n\n`;

    // Report info
    const numLabel = msgConfig.boldLabels ? `*Número da Inconformidade:*` : `Número da Inconformidade:`;
    const numValue = msgConfig.boldValues ? `*${currentReport.report_number || 'S/N'}*` : (currentReport.report_number || 'S/N');
    msg += `${numLabel} ${numValue}\n`;

    const locLabel = msgConfig.boldLabels ? `*Local:*` : `Local:`;
    const locValue = msgConfig.boldValues ? `*${currentReport.location || 'Não informado'}*` : (currentReport.location || 'Não informado');
    msg += `${locLabel} ${locValue}\n`;

    // Non-conformities loop
    currentReport.nonConformities.forEach((nc, index) => {
      const ncHeader = msgConfig.boldHeaders 
        ? `*Inconformidade ${index + 1}:*`
        : `Inconformidade ${index + 1}:`;
      msg += `${ncHeader}\n`;

      const descLabel = msgConfig.boldLabels ? `*Descrição:*` : `Descrição:`;
      msg += `${descLabel} ${nc.description || 'Não especificada'}\n`;

      if (msgConfig.includeSuggestion && nc.suggestion) {
        const sugLabel = msgConfig.boldLabels ? `*Sugestão de Adequação:*` : `Sugestão de Adequação:`;
        msg += `${sugLabel} ${nc.suggestion}\n`;
      }

      const normLabel = msgConfig.boldLabels ? `*Itens Normativos:*` : `Itens Normativos:`;
      msg += `${normLabel}\n${nc.normativeItems || 'NR padrão'}\n`;

      const getClassificationPrefix = (classification: string) => '';
      const classLabel = msgConfig.boldLabels ? `*Classificação:*` : `Classificação:`;
      const classValue = msgConfig.boldValues 
        ? `*${nc.classification}*` 
        : `${nc.classification}`;
      msg += `${classLabel} ${classValue}\n`;

      if (nc.dueDate) {
        const [year, month, day] = nc.dueDate.split('-');
        const formattedDate = `${day}/${month}/${year}`;
        const isOver = isDateOverdue(nc.dueDate, currentReport.status);

        const dueLabel = msgConfig.boldLabels ? `*Data de Vencimento:*` : `Data de Vencimento:`;
        let dueValue = msgConfig.boldValues ? `*${formattedDate}*` : formattedDate;

        if (isOver && msgConfig.highlightOverdue) {
          dueValue += ` *[VENCIDO]*`;
        }

        msg += `${dueLabel} ${dueValue}\n`;
      }

      // Add clean line break if multiple
      if (index < currentReport.nonConformities.length - 1) {
        msg += `\n`;
      }
    });

    return msg;
  };

  // Copy with rich HTML + Plain Text for E-mail client pasting
  const copyForEmail = async () => {
    const html = generateEmailHTML();
    const plain = generateMessage();
    try {
      if (navigator.clipboard && window.ClipboardItem) {
        const item = new ClipboardItem({
          'text/html': new Blob([html], { type: 'text/html' }),
          'text/plain': new Blob([plain], { type: 'text/plain' })
        });
        await navigator.clipboard.write([item]);
      } else {
        navigator.clipboard.writeText(plain);
      }
      setCopiedType('email');
      setCopied(true);
      setTimeout(() => {
        setCopiedType(null);
        setCopied(false);
      }, 2500);
    } catch (e) {
      console.warn("Clipboard write failed, fallback to plain text:", e);
      navigator.clipboard.writeText(plain);
      setCopiedType('email');
      setCopied(true);
      setTimeout(() => {
        setCopiedType(null);
        setCopied(false);
      }, 2500);
    }
  };

  const generateReminderMessage = (reportData?: SafetyReport, specificDueDate?: string) => {
    const rep = reportData || currentReport;
    const reportNum = rep.report_number || 'S/N';
    
    let dueFormatted = '';
    if (specificDueDate) {
      const [y, m, d] = specificDueDate.split('-');
      dueFormatted = `${d}/${m}/${y}`;
    } else if (rep.nonConformities && rep.nonConformities.length > 0) {
      const dates = rep.nonConformities.map(nc => nc.dueDate).filter(Boolean);
      if (dates.length > 0) {
        const sorted = [...dates].sort();
        const uniqueFormatted = Array.from(new Set(sorted.map(dt => {
          const [yy, mm, dd] = dt.split('-');
          return `${dd}/${mm}/${yy}`;
        })));
        dueFormatted = uniqueFormatted.join(', ');
      }
    }

    if (!dueFormatted) {
      dueFormatted = new Date().toLocaleDateString('pt-BR');
    }

    const greeting = getGreeting();
    return `Prezados, ${greeting.toLowerCase()}!\nPassando para lembrar que o Click nº ${reportNum} vence em ${dueFormatted}. Solicitamos o envio das evidências para a baixa do click até a data de vencimento.`;
  };

  const generateReminderHTML = (reportData?: SafetyReport, specificDueDate?: string) => {
    const rep = reportData || currentReport;
    const reportNum = rep.report_number || 'S/N';
    let dueFormatted = '';
    if (specificDueDate) {
      const [y, m, d] = specificDueDate.split('-');
      dueFormatted = `${d}/${m}/${y}`;
    } else if (rep.nonConformities && rep.nonConformities.length > 0) {
      const dates = rep.nonConformities.map(nc => nc.dueDate).filter(Boolean);
      if (dates.length > 0) {
        const sorted = [...dates].sort();
        const uniqueFormatted = Array.from(new Set(sorted.map(dt => {
          const [yy, mm, dd] = dt.split('-');
          return `${dd}/${mm}/${yy}`;
        })));
        dueFormatted = uniqueFormatted.join(', ');
      }
    }
    if (!dueFormatted) {
      dueFormatted = new Date().toLocaleDateString('pt-BR');
    }
    const greeting = getGreeting();

    return `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #1e293b;">
  <p style="margin: 0 0 10px 0;">Prezados, ${greeting.toLowerCase()}!</p>
  <p style="margin: 0;">Passando para lembrar que o <strong>Click nº ${reportNum}</strong> vence em <strong>${dueFormatted}</strong>. Solicitamos o envio das evidências para a baixa do click até a data de vencimento.</p>
</div>`;
  };

  const copyReminder = async (reportData?: SafetyReport, specificDueDate?: string) => {
    const targetReport = reportData || currentReport;
    const plain = generateReminderMessage(targetReport, specificDueDate);
    const html = generateReminderHTML(targetReport, specificDueDate);
    const copyKey = targetReport.id ? `reminder-${targetReport.id}` : 'reminder';

    try {
      if (navigator.clipboard && window.ClipboardItem) {
        const item = new ClipboardItem({
          'text/html': new Blob([html], { type: 'text/html' }),
          'text/plain': new Blob([plain], { type: 'text/plain' })
        });
        await navigator.clipboard.write([item]);
      } else {
        navigator.clipboard.writeText(plain);
      }
      setCopiedType(copyKey as any);
      setCopied(true);
      setTimeout(() => {
        setCopiedType(null);
        setCopied(false);
      }, 2500);
    } catch (e) {
      console.warn("Clipboard write failed, fallback to plain text:", e);
      navigator.clipboard.writeText(plain);
      setCopiedType(copyKey as any);
      setCopied(true);
      setTimeout(() => {
        setCopiedType(null);
        setCopied(false);
      }, 2500);
    }
  };

  const copyForWhatsApp = () => {
    const msg = generateMessage();
    navigator.clipboard.writeText(msg);
    setCopiedType('whatsapp');
    setCopied(true);
    setTimeout(() => {
      setCopiedType(null);
      setCopied(false);
    }, 2500);
  };

  const openEmailClient = () => {
    const subject = encodeURIComponent(generateEmailSubject());
    const body = encodeURIComponent(generateMessage());
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
  };

  const copyToClipboard = () => {
    copyForEmail();
  };

  const getClassificationColor = (classification: string) => {
    switch (classification) {
      case 'LEVE': return 'text-sky-500 bg-sky-50 border-sky-200';
      case 'MÉDIA': return 'text-amber-500 bg-amber-50 border-amber-200';
      case 'GRAVE': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'GRAVÍSSIMA': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const toggleSelectReport = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedReportIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = (visibleReports: SafetyReport[]) => {
    const visibleIds = visibleReports.map(r => r.id!).filter(Boolean);
    const allSelected = visibleIds.length > 0 && visibleIds.every(id => selectedReportIds.includes(id));
    if (allSelected) {
      setSelectedReportIds(prev => prev.filter(id => !visibleIds.includes(id)));
    } else {
      setSelectedReportIds(prev => Array.from(new Set([...prev, ...visibleIds])));
    }
  };

  const handleBatchComplete = async () => {
    if (selectedReportIds.length === 0) return;
    const confirmed = await confirm({
      title: 'Concluir Clicks Selecionados',
      message: `Deseja marcar ${selectedReportIds.length} Click(s) de segurança selecionados como Concluídos?`,
      confirmText: 'Sim, Concluir Todos',
      cancelText: 'Cancelar'
    });
    if (!confirmed) return;

    setLoading(true);
    try {
      if (fetchWithAuth) {
        await Promise.all(selectedReportIds.map(id => 
          fetchWithAuth(`/api/safety/reports/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'completed' })
          })
        ));
      }
      await loadReports();
      setSelectedReportIds([]);
    } catch (err) {
      console.error("Error batch completing reports:", err);
      dialogAlert({
        title: 'Erro',
        message: 'Ocorreu um erro ao atualizar os relatórios selecionados.'
      });
    } finally {
      setLoading(false);
    }
  };

  const generateGroupedPDF = async (reportIdsToExport?: string[]) => {
    const targetIds = reportIdsToExport && reportIdsToExport.length > 0 
      ? reportIdsToExport 
      : (selectedReportIds.length > 0 ? selectedReportIds : (currentReport.id ? [currentReport.id] : []));

    const validIds = targetIds.filter(Boolean);
    const isExportingCurrentDraft = validIds.length === 0 && Boolean(currentReport.report_number || currentReport.nonConformities.length > 0);

    if (validIds.length === 0 && !isExportingCurrentDraft) {
      dialogAlert({
        title: 'Nenhum Click Selecionado',
        message: 'Selecione pelo menos um Click Segurança para gerar o PDF agrupado.'
      });
      return;
    }

    const orientation = await askOptions({
      title: 'Formato do PDF',
      message: validIds.length > 1 
        ? `Como você deseja gerar o PDF agrupado com ${validIds.length} Clicks?` 
        : 'Como você deseja gerar este arquivo PDF?',
      options: [
        { label: 'Vertical (Retrato) - Recomendado', value: 'p' },
        { label: 'Horizontal (Paisagem)', value: 'l' }
      ]
    });
    if (!orientation) return;

    setLoading(true);
    try {
      const fullReports: SafetyReport[] = [];

      if (isExportingCurrentDraft) {
        fullReports.push(currentReport);
      } else {
        for (const id of validIds) {
          const rep = reports.find(r => r.id === id);
          if (rep) {
            if (rep.nonConformities && rep.nonConformities.length > 0) {
              fullReports.push(rep);
            } else if (fetchWithAuth) {
              try {
                const res = await fetchWithAuth(`/api/safety/reports/${id}/non-conformities`);
                if (res.ok) {
                  const ncs = await res.json();
                  fullReports.push({
                    ...rep,
                    logo_1: rep.logo_1 || DEFAULT_LOGOS.logo1,
                    logo_2: rep.logo_2 || DEFAULT_LOGOS.logo2,
                    nonConformities: ncs.map((nc: any) => ({
                      id: nc.id,
                      description: nc.description || '',
                      suggestion: nc.suggestion || '',
                      normativeItems: nc.normative_items || nc.normativeItems || '',
                      classification: nc.classification || 'GRAVE',
                      dueDate: nc.due_date || nc.dueDate || '',
                      images: Array.isArray(nc.images) && nc.images.length > 0 
                        ? nc.images 
                        : (nc.image_data ? [nc.image_data] : [])
                    }))
                  });
                } else {
                  fullReports.push(rep);
                }
              } catch (e) {
                fullReports.push(rep);
              }
            } else {
              fullReports.push(rep);
            }
          }
        }
      }

      if (fullReports.length === 0) {
        dialogAlert({
          title: 'Aviso',
          message: 'Nenhum dado de relatório encontrado para exportação.'
        });
        return;
      }

      const doc = new jsPDF(orientation as 'p'|'l', 'mm', 'a4');
      const margin = 14;
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const contentWidth = pageWidth - (margin * 2);

      // Helper to safely add image with format detection
      const addImageSafe = (imgData: string, imgX: number, imgY: number, imgW: number, imgH: number) => {
        try {
          let format = 'PNG';
          if (imgData.startsWith('data:image/jpeg') || imgData.startsWith('data:image/jpg')) {
            format = 'JPEG';
          } else if (imgData.startsWith('data:image/webp')) {
            format = 'WEBP';
          }
          doc.addImage(imgData, format, imgX, imgY, imgW, imgH);
          return true;
        } catch (err) {
          console.warn("Error embedding image into PDF:", err);
          return false;
        }
      };

      const drawHeader = (yPos: number, logo1?: string, logo2?: string) => {
        const l1 = logo1 || DEFAULT_LOGOS.logo1;
        const l2 = logo2 || DEFAULT_LOGOS.logo2;
        if (l1) addImageSafe(l1, margin, yPos, 40, 24);
        if (l2) {
          const copasaW = 46;
          const copasaH = 16;
          addImageSafe(l2, pageWidth - margin - copasaW, yPos + 4, copasaW, copasaH);
        }
        doc.setDrawColor(203, 213, 225);
        doc.setLineWidth(0.5);
        doc.line(margin, yPos + 28, pageWidth - margin, yPos + 28);
        return yPos + 36;
      };

      let y = 12;

      // If multiple Clicks are grouped, generate a consolidated cover/index section
      if (fullReports.length > 1) {
        y = drawHeader(y);

        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text('Relatório Consolidado de Inconformidades', margin, y);
        y += 6;

        const totalNCs = fullReports.reduce((acc, r) => acc + (r.nonConformities?.length || 0), 0);
        const totalCompleted = fullReports.filter(r => r.status === 'completed').length;
        const totalPending = fullReports.filter(r => r.status === 'pending').length;
        const totalOverdue = fullReports.filter(r => reportHasOverdue(r)).length;

        // Metrics Banner Box
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(margin, y, contentWidth, 20, 2, 2, 'FD');

        doc.setFontSize(9.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(51, 65, 85);
        
        const colW = contentWidth / 4;
        doc.text(`Total de Clicks: ${fullReports.length}`, margin + 5, y + 7);
        doc.text(`Total de Inconformidades: ${totalNCs}`, margin + colW + 5, y + 7);
        doc.text(`Pendentes: ${totalPending}`, margin + (colW * 2) + 5, y + 7);
        doc.text(`Concluídos: ${totalCompleted}`, margin + (colW * 3) + 5, y + 7);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(100, 116, 139);
        const subtitle = `Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}${totalOverdue > 0 ? ` • ${totalOverdue} Click(s) com itens vencidos` : ''}`;
        doc.text(subtitle, margin + 5, y + 15);
        y += 27;

        // Index of Clicks included
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text('Sumário dos Clicks Agrupados:', margin, y);
        y += 6;

        fullReports.forEach((rep, rIdx) => {
          if (y > pageHeight - 35) {
            doc.addPage();
            y = drawHeader(12);
          }

          doc.setFillColor(rIdx % 2 === 0 ? 255 : 248, rIdx % 2 === 0 ? 255 : 250, rIdx % 2 === 0 ? 255 : 252);
          doc.setDrawColor(226, 232, 240);
          doc.roundedRect(margin, y - 4, contentWidth, 10, 1, 1, 'FD');

          doc.setFontSize(9.5);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(15, 23, 42);
          doc.text(`Click #${rep.report_number || '-'}`, margin + 4, y + 2.5);

          doc.setFont('helvetica', 'normal');
          doc.setTextColor(51, 65, 85);
          const locText = doc.splitTextToSize(rep.location || '-', (contentWidth * 0.45))[0] || '-';
          doc.text(locText, margin + 34, y + 2.5);

          doc.text(`${rep.nonConformities?.length || 0} NC(s)`, margin + (contentWidth * 0.70), y + 2.5);

          if (rep.status === 'completed') {
            doc.setTextColor(22, 101, 52);
            doc.setFont('helvetica', 'bold');
            doc.text('CONCLUÍDO', pageWidth - margin - 26, y + 2.5);
          } else {
            const isOver = reportHasOverdue(rep);
            if (isOver) {
              doc.setTextColor(220, 38, 38);
              doc.setFont('helvetica', 'bold');
              doc.text('VENCIDO', pageWidth - margin - 24, y + 2.5);
            } else {
              doc.setTextColor(180, 83, 9);
              doc.setFont('helvetica', 'bold');
              doc.text('PENDENTE', pageWidth - margin - 26, y + 2.5);
            }
          }

          y += 12;
        });

        y += 4;
      }

      // Render each report with its complete non-conformities & photos
      fullReports.forEach((rep, rIdx) => {
        if (rIdx > 0 || (fullReports.length > 1 && y > pageHeight - 80)) {
          doc.addPage();
          y = 12;
        }

        y = drawHeader(y, rep.logo_1, rep.logo_2);

        // Report Title & Info Card
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text(`Relatório de Inconformidade • Click #${rep.report_number || '-'}`, margin, y);
        y += 6;

        const cardY = y;
        const cardH = 22;
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(margin, cardY, contentWidth, cardH, 2, 2, 'FD');

        const col1X = margin + 5;
        const col2X = margin + (contentWidth / 2) + 5;

        // Row 1
        doc.setFontSize(9.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(71, 85, 105);
        doc.text('Número do Click:', col1X, cardY + 7);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text(rep.report_number || '-', col1X + 35, cardY + 7);

        doc.setFont('helvetica', 'bold');
        doc.setTextColor(71, 85, 105);
        doc.text('Data de Emissão:', col2X, cardY + 7);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(15, 23, 42);
        doc.text(new Date(rep.created_at || new Date()).toLocaleDateString('pt-BR'), col2X + 30, cardY + 7);

        // Row 2
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(71, 85, 105);
        doc.text('Local:', col1X, cardY + 15);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(15, 23, 42);
        const locText = doc.splitTextToSize(rep.location || '-', (contentWidth / 2) - 20)[0] || '-';
        doc.text(locText, col1X + 12, cardY + 15);

        doc.setFont('helvetica', 'bold');
        doc.setTextColor(71, 85, 105);
        doc.text('Status:', col2X, cardY + 15);
        if (rep.status === 'completed') {
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(22, 101, 52);
          doc.text('CONCLUÍDO', col2X + 14, cardY + 15);
        } else {
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(180, 83, 9);
          doc.text('PENDENTE', col2X + 14, cardY + 15);
        }

        y = cardY + cardH + 10;

        // Non-Conformities List
        if (!rep.nonConformities || rep.nonConformities.length === 0) {
          doc.setFontSize(10);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(100, 116, 139);
          doc.text('Nenhuma inconformidade cadastrada para este Click.', margin, y);
          y += 12;
        } else {
          rep.nonConformities.forEach((nc, index) => {
            if (y > pageHeight - 45) {
              doc.addPage();
              y = drawHeader(12, rep.logo_1, rep.logo_2);
            }

            // Non-conformity header badge
            doc.setFillColor(241, 245, 249);
            doc.setDrawColor(203, 213, 225);
            doc.roundedRect(margin, y - 4, contentWidth, 8, 1.5, 1.5, 'FD');

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(11);
            doc.setTextColor(15, 23, 42);
            doc.text(`Inconformidade ${index + 1}`, margin + 3, y + 1.5);
            y += 10;

            doc.setFontSize(10);
            
            const addWrappedText = (label: string, text: string) => {
              doc.setFont('helvetica', 'bold');
              doc.setTextColor(30, 41, 59);
              const labelStr = `${label}: `;
              const labelWidth = doc.getTextWidth(labelStr);
              
              doc.setFont('helvetica', 'normal');
              doc.setTextColor(51, 65, 85);
              const lines = doc.splitTextToSize(`${labelStr}${text}`, contentWidth);
              
              if (y + (lines.length * 6) > pageHeight - 25) {
                doc.addPage();
                y = drawHeader(12, rep.logo_1, rep.logo_2);
              }

              doc.setFont('helvetica', 'bold');
              doc.setTextColor(30, 41, 59);
              doc.text(labelStr, margin, y);

              doc.setFont('helvetica', 'normal');
              doc.setTextColor(51, 65, 85);
              
              if (lines.length === 1) {
                doc.text(text, margin + labelWidth, y);
                y += 6;
              } else {
                doc.text(lines, margin, y);
                y += lines.length * 6;
              }
            };

            addWrappedText('Descrição', nc.description);
            
            if (nc.suggestion) {
              addWrappedText('Sugestão', nc.suggestion);
            }

            // Normative Items
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(30, 41, 59);
            doc.text('Itens Normativos:', margin, y);
            y += 5;

            doc.setFont('helvetica', 'normal');
            doc.setTextColor(51, 65, 85);
            const normLines = doc.splitTextToSize(nc.normativeItems || 'Não especificado', contentWidth);
            if (y + (normLines.length * 5.5) > pageHeight - 25) {
              doc.addPage();
              y = drawHeader(12, rep.logo_1, rep.logo_2);
            }
            doc.text(normLines, margin, y);
            y += normLines.length * 5.5 + 2;

            // Classification
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(30, 41, 59);
            doc.text('Classificação: ', margin, y);
            const classLabelWidth = doc.getTextWidth('Classificação: ');
            
            let color: [number, number, number] = [0, 0, 0];
            switch (nc.classification) {
              case 'LEVE': color = [2, 132, 199]; break;
              case 'MÉDIA': color = [217, 119, 6]; break;
              case 'GRAVE': color = [234, 88, 12]; break;
              case 'GRAVÍSSIMA': color = [220, 38, 38]; break;
            }
            
            doc.setTextColor(color[0], color[1], color[2]);
            doc.text(nc.classification, margin + classLabelWidth, y);
            doc.setTextColor(51, 65, 85);
            doc.setFont('helvetica', 'normal');
            y += 6;

            // Due Date
            if (nc.dueDate) {
              const [year, month, day] = nc.dueDate.split('-');
              const isOver = isDateOverdue(nc.dueDate, rep.status);
              doc.setFont('helvetica', 'bold');
              doc.setTextColor(30, 41, 59);
              doc.text('Data de Vencimento: ', margin, y);
              const dueLabelWidth = doc.getTextWidth('Data de Vencimento: ');

              if (isOver) {
                doc.setTextColor(220, 38, 38);
                doc.text(`${day}/${month}/${year} (VENCIDO)`, margin + dueLabelWidth, y);
              } else {
                doc.setTextColor(51, 65, 85);
                doc.setFont('helvetica', 'normal');
                doc.text(`${day}/${month}/${year}`, margin + dueLabelWidth, y);
              }
              y += 7;
            }
            
            // Images
            if (nc.images && nc.images.length > 0) {
              nc.images.forEach((img, imgIdx) => {
                try {
                  const imgProps = doc.getImageProperties(img);
                  const maxImgW = Math.min(contentWidth, 140);
                  const ratio = Math.min(maxImgW / imgProps.width, 85 / imgProps.height);
                  const finalWidth = imgProps.width * ratio;
                  const finalHeight = imgProps.height * ratio;

                  if (y + finalHeight > pageHeight - 25) {
                    doc.addPage();
                    y = drawHeader(12, rep.logo_1, rep.logo_2);
                  }

                  doc.setDrawColor(226, 232, 240);
                  doc.rect(margin - 1, y - 1, finalWidth + 2, finalHeight + 2);
                  doc.addImage(img, imgProps.fileType || 'JPEG', margin, y, finalWidth, finalHeight);
                  y += finalHeight + 8;
                } catch (e) {
                  console.error(`Error adding image ${imgIdx} to PDF`, e);
                }
              });
            } else {
              y += 4;
            }
          });
        }
      });

      // Running Footer on all pages
      const pageCount = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.4);
        doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);

        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(148, 163, 184);
        
        doc.text('Click Segurança • Copasa', margin, pageHeight - 7);
        doc.text(`Página ${i} de ${pageCount}`, pageWidth / 2, pageHeight - 7, { align: 'center' });

        const nowStr = `Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
        doc.text(nowStr, pageWidth - margin, pageHeight - 7, { align: 'right' });
      }

      const fileName = fullReports.length === 1 
        ? `Inconformidade_${fullReports[0].report_number || 'Relatorio'}.pdf`
        : `Relatorio_Agrupado_Clicks_${fullReports.length}_itens_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.pdf`;

      doc.save(fileName);
    } catch (error) {
      console.error("Error generating PDF:", error);
      dialogAlert({
        title: 'Erro ao gerar PDF',
        message: 'Ocorreu um erro ao processar os relatórios para o arquivo PDF.'
      });
    } finally {
      setLoading(false);
    }
  };

  const generatePDF = () => generateGroupedPDF();

  // Check if a report has any overdue non-conformity
  const reportHasOverdue = (r: SafetyReport) => {
    if (r.status === 'completed') return false;
    return r.nonConformities?.some(nc => isDateOverdue(nc.dueDate, r.status));
  };

  // Check if a report is expiring soon (0 to 5 days remaining)
  const reportIsSoon = (r: SafetyReport) => {
    if (r.status === 'completed') return false;
    return r.nonConformities?.some(nc => {
      const info = getDueDateInfo(nc.dueDate, r.status);
      return info && !info.isOverdue && info.diffDays <= 5;
    });
  };

  if (view === 'list') {
    const overdueReports = reports.filter(r => reportHasOverdue(r));
    const soonReports = reports.filter(r => !reportHasOverdue(r) && reportIsSoon(r));
    const pendingOnTimeReports = reports.filter(r => r.status === 'pending' && !reportHasOverdue(r) && !reportIsSoon(r));
    const completedReports = reports.filter(r => r.status === 'completed');

    const filteredReports = reports.filter(r => {
      if (filter === 'all') return true;
      if (filter === 'overdue') return reportHasOverdue(r);
      if (filter === 'soon') return !reportHasOverdue(r) && reportIsSoon(r);
      if (filter === 'pending') return r.status === 'pending' && !reportHasOverdue(r);
      return r.status === filter;
    });

    const stats = {
      total: reports.length,
      pending: pendingOnTimeReports.length,
      soon: soonReports.length,
      overdue: overdueReports.length,
      completed: completedReports.length
    };

    return (
      <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
            <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Total Clicks</p>
            <p className="text-2xl font-black text-gray-800 mt-1">{stats.total}</p>
          </div>
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-red-100 bg-gradient-to-br from-white to-red-50/50">
            <p className="text-[11px] font-bold text-red-600 uppercase tracking-wider flex items-center gap-1">
              <AlertOctagon size={12} /> Vencidos
            </p>
            <p className="text-2xl font-black text-red-600 mt-1">{stats.overdue}</p>
          </div>
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-amber-100 bg-gradient-to-br from-white to-amber-50/50">
            <p className="text-[11px] font-bold text-amber-700 uppercase tracking-wider flex items-center gap-1">
              <Timer size={12} /> Vencem em Breve
            </p>
            <p className="text-2xl font-black text-amber-700 mt-1">{stats.soon}</p>
          </div>
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-blue-100">
            <p className="text-[11px] font-bold text-blue-600 uppercase tracking-wider flex items-center gap-1">
              <Clock size={12} /> No Prazo
            </p>
            <p className="text-2xl font-black text-blue-600 mt-1">{stats.pending}</p>
          </div>
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-emerald-100">
            <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider flex items-center gap-1">
              <CheckCircle2 size={12} /> Concluídos
            </p>
            <p className="text-2xl font-black text-emerald-600 mt-1">{stats.completed}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-5 md:p-6 border-b border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <Shield className="text-emerald-600" />
                Histórico de Segurança & Prazos dos Clicks
              </h2>
              <p className="text-xs sm:text-sm text-gray-500 mt-1">Acompanhe contadores de dias para vencimento, prazos de adequação e relatórios.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <button
                onClick={() => toggleSelectAll(filteredReports)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border shadow-2xs",
                  filteredReports.length > 0 && filteredReports.every(r => selectedReportIds.includes(r.id!))
                    ? "bg-emerald-600 text-white border-emerald-600 shadow-emerald-600/20"
                    : "bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-200"
                )}
                title="Selecionar ou desmarcar todos os relatórios filtrados"
              >
                {filteredReports.length > 0 && filteredReports.every(r => selectedReportIds.includes(r.id!)) ? (
                  <CheckSquare size={15} />
                ) : (
                  <Square size={15} />
                )}
                <span>{filteredReports.length > 0 && filteredReports.every(r => selectedReportIds.includes(r.id!)) ? "Desmarcar Todos" : "Selecionar Todos"}</span>
              </button>

              <div className="flex flex-wrap bg-gray-100 p-1 rounded-xl gap-0.5">
                {([
                  { key: 'all', label: 'Todos' },
                  { key: 'overdue', label: `Vencidos (${stats.overdue})` },
                  { key: 'soon', label: `Vencem em Breve (${stats.soon})` },
                  { key: 'pending', label: 'No Prazo' },
                  { key: 'completed', label: 'Concluídos' }
                ] as const).map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setFilter(key)}
                    className={cn(
                      "px-3 py-1.5 text-xs font-bold rounded-lg transition-all",
                      filter === key 
                        ? key === 'overdue' 
                          ? "bg-red-600 text-white shadow-sm"
                          : key === 'soon'
                            ? "bg-amber-600 text-white shadow-sm"
                            : "bg-white text-emerald-600 shadow-sm" 
                        : "text-gray-500 hover:text-gray-700"
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setShowConfigModal(true)}
                className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-colors font-bold text-xs"
                title="Configurar formatação da mensagem padrão"
              >
                <Settings size={15} />
                Mensagem Padrão
              </button>
              <button
                onClick={() => {
                  setCurrentReport({
                    report_number: '',
                    location: '',
                    supervisor: '',
                    status: 'pending',
                    logo_1: DEFAULT_LOGOS.logo1,
                    logo_2: DEFAULT_LOGOS.logo2,
                    nonConformities: []
                  });
                  setView('editor');
                }}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors font-bold text-xs sm:text-sm whitespace-nowrap shadow-sm shadow-emerald-600/20"
              >
                <Plus size={16} />
                Novo Relatório
              </button>
            </div>
          </div>

          {/* Barra de Ações em Massa / Agrupamento para PDF */}
          {selectedReportIds.length > 0 && (
            <div className="bg-slate-900 text-white px-5 py-3.5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 animate-in fade-in slide-in-from-top-1">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-emerald-500 text-slate-950 font-black text-xs">
                  {selectedReportIds.length}
                </div>
                <div>
                  <p className="font-extrabold text-xs sm:text-sm text-white flex items-center gap-1.5">
                    <Layers size={14} className="text-emerald-400" />
                    {selectedReportIds.length === 1 ? '1 Click selecionado' : `${selectedReportIds.length} Clicks selecionados`}
                  </p>
                  <p className="text-[11px] text-slate-400">Pronto para gerar PDF consolidado com todos os Clicks agrupados</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => generateGroupedPDF(selectedReportIds)}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-black shadow-sm transition-all"
                  title="Gerar um único arquivo PDF com todos os Clicks selecionados"
                >
                  <FileText size={15} />
                  Gerar PDF Agrupado ({selectedReportIds.length})
                </button>
                <button
                  onClick={handleBatchComplete}
                  className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded-xl text-xs font-bold border border-slate-700 transition-all"
                  title="Concluir todos os Clicks selecionados"
                >
                  <CheckCircle2 size={15} />
                  Concluir Selecionados
                </button>
                <button
                  onClick={() => setSelectedReportIds([])}
                  className="px-2.5 py-1.5 text-slate-400 hover:text-white text-xs font-bold transition-colors"
                >
                  Desmarcar
                </button>
              </div>
            </div>
          )}

          <div className="p-6">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto mb-4"></div>
                <p className="text-gray-500 text-sm">Carregando relatórios...</p>
              </div>
            ) : filteredReports.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                <History size={48} className="text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-sm">Nenhum relatório encontrado para este filtro.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3.5">
                {filteredReports.map((r) => {
                  const countdown = getReportCountdown(r);
                  const isOver = reportHasOverdue(r);
                  const isSoon = !isOver && reportIsSoon(r);
                  const isSelected = selectedReportIds.includes(r.id!);

                  return (
                    <div 
                      key={r.id} 
                      className={cn(
                        "bg-white border rounded-2xl p-4 sm:p-5 hover:shadow-md transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4",
                        isSelected
                          ? "border-emerald-500 bg-emerald-50/25 ring-2 ring-emerald-500/20"
                          : isOver 
                            ? "border-red-300 bg-red-50/20" 
                            : isSoon 
                              ? "border-amber-200 bg-amber-50/15" 
                              : r.status === 'completed'
                                ? "border-emerald-100 bg-emerald-50/10"
                                : "border-gray-100"
                      )}
                    >
                      <div className="flex items-start gap-3.5 flex-1 min-w-0">
                        {/* Checkbox de Seleção */}
                        <button
                          type="button"
                          onClick={(e) => toggleSelectReport(r.id!, e)}
                          className={cn(
                            "mt-0.5 h-6 w-6 rounded-lg flex items-center justify-center transition-all border shrink-0 cursor-pointer",
                            isSelected
                              ? "bg-emerald-600 border-emerald-600 text-white shadow-2xs"
                              : "bg-gray-50 hover:bg-gray-100 border-gray-300 text-transparent"
                          )}
                          title={isSelected ? "Desmarcar este Click" : "Selecionar este Click para agrupar em PDF"}
                        >
                          <Check size={14} className={isSelected ? "stroke-[3] text-white" : "opacity-0"} />
                        </button>

                        <div className="flex-1 min-w-0">
                          {/* Header com Número do Click e Contadores de Vencimento */}
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <span className="text-xs font-black px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200/60 rounded-full">
                              #{r.report_number}
                            </span>

                          {/* Contador de Dias Principal */}
                          {r.status === 'completed' ? (
                            <span className="text-[10px] font-extrabold px-2.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-full flex items-center gap-1">
                              <Check size={11} /> CONCLUÍDO {r.completed_at && `em ${new Date(r.completed_at).toLocaleDateString('pt-BR')}`}
                            </span>
                          ) : countdown?.mostCritical ? (
                            countdown.mostCritical.isOverdue ? (
                              <span className="text-xs font-black px-3 py-0.5 bg-red-100 text-red-700 border border-red-300 rounded-full flex items-center gap-1.5 animate-pulse shadow-sm">
                                <AlertOctagon size={13} className="text-red-600" />
                                {countdown.mostCritical.badgeLabel}
                              </span>
                            ) : countdown.mostCritical.isToday ? (
                              <span className="text-xs font-black px-3 py-0.5 bg-red-50 text-red-700 border border-red-400 rounded-full flex items-center gap-1.5 shadow-sm">
                                <Clock size={13} className="text-red-600" />
                                VENCE HOJE
                              </span>
                            ) : countdown.mostCritical.isTomorrow ? (
                              <span className="text-xs font-black px-3 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 rounded-full flex items-center gap-1.5 shadow-sm">
                                <Hourglass size={13} className="text-amber-700" />
                                VENCE AMANHÃ (FALTA 1 DIA)
                              </span>
                            ) : countdown.mostCritical.isSoon ? (
                              <span className="text-xs font-black px-3 py-0.5 bg-amber-50 text-amber-800 border border-amber-300 rounded-full flex items-center gap-1.5 shadow-sm">
                                <Timer size={13} className="text-amber-700" />
                                FALTAM {countdown.mostCritical.diffDays} DIAS
                              </span>
                            ) : (
                              <span className="text-xs font-black px-3 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-full flex items-center gap-1.5 shadow-sm">
                                <Calendar size={13} className="text-blue-600" />
                                FALTAM {countdown.mostCritical.diffDays} DIAS
                              </span>
                            )
                          ) : (
                            <span className="text-[10px] font-extrabold px-2.5 py-0.5 bg-gray-100 text-gray-600 rounded-full flex items-center gap-1">
                              <Clock size={11} /> SEM DATA DEFINIDA
                            </span>
                          )}
                        </div>

                        <h3 className="font-extrabold text-gray-800 text-base leading-snug">{r.location}</h3>
                        
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5">
                          <p className="text-xs text-gray-500 font-medium flex items-center gap-1">
                            <Calendar size={13} className="text-gray-400" /> Cadastrado em: {new Date(r.created_at!).toLocaleDateString('pt-BR')}
                          </p>
                          {r.nonConformities && r.nonConformities.length > 0 && (
                            <p className="text-xs text-gray-500 font-medium flex items-center gap-1">
                              <Shield size={13} className="text-gray-400" /> {r.nonConformities.length} {r.nonConformities.length === 1 ? 'inconformidade' : 'inconformidades'}
                            </p>
                          )}
                        </div>

                        {/* Detalhamento dos Prazos de cada NC */}
                        {countdown?.all && countdown.all.length > 0 && r.status !== 'completed' && (
                          <div className="flex flex-wrap items-center gap-1.5 mt-2.5 pt-2 border-t border-gray-100">
                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-500 flex items-center gap-1 mr-1">
                              <Timer size={12} className="text-emerald-600" /> {countdown.all.length === 1 ? 'Prazo:' : 'Prazos das NCs:'}
                            </span>
                            {countdown.all.map((item, idx) => (
                              <span 
                                key={idx} 
                                className={cn(
                                  "text-[11px] font-bold px-2.5 py-0.5 rounded-lg border flex items-center gap-1 transition-all",
                                  item.isOverdue 
                                    ? "bg-red-100/80 text-red-700 border-red-300 shadow-2xs font-extrabold" 
                                    : item.isToday 
                                      ? "bg-red-50 text-red-700 border-red-300 font-extrabold"
                                      : item.isTomorrow || item.isSoon
                                        ? "bg-amber-50 text-amber-900 border-amber-300 font-bold"
                                        : "bg-blue-50/60 text-blue-800 border-blue-200"
                                )}
                                title={`Inconformidade ${idx + 1} - Vencimento: ${item.formattedDate}`}
                              >
                                {item.isOverdue ? (
                                  <AlertOctagon size={11} className="text-red-600" />
                                ) : item.isToday ? (
                                  <Clock size={11} className="text-red-600" />
                                ) : item.isSoon || item.isTomorrow ? (
                                  <Hourglass size={11} className="text-amber-700" />
                                ) : (
                                  <Calendar size={11} className="text-blue-600" />
                                )}
                                {countdown.all.length > 1 && <span className="opacity-80 font-bold">NC {idx + 1}:</span>}
                                <span>{item.statusText}</span>
                                <span className="text-[10px] opacity-75 font-normal">({item.formattedDate})</span>
                              </span>
                            ))}
                          </div>
                        )}
                        </div>
                      </div>

                      <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full sm:w-auto border-t sm:border-t-0 pt-3 sm:pt-0">
                        {/* Botão Copiar Lembrete disponível diretamente na listagem */}
                        <button
                          onClick={() => copyReminder(r)}
                          className={cn(
                            "flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl transition-all text-xs font-bold border",
                            copiedType === `reminder-${r.id}`
                              ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                              : "text-amber-800 bg-amber-50 hover:bg-amber-100 border-amber-200"
                          )}
                          title="Copiar mensagem de lembrete de vencimento para WhatsApp/E-mail"
                        >
                          {copiedType === `reminder-${r.id}` ? <CheckCircle2 size={15} className="text-white" /> : <Bell size={15} className="text-amber-600" />}
                          <span>{copiedType === `reminder-${r.id}` ? 'Lembrete Copiado!' : 'Copiar Lembrete'}</span>
                        </button>

                        {r.status === 'pending' && (
                          <button
                            onClick={() => markAsCompleted(r)}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-colors text-xs font-bold border border-emerald-200"
                            title="Marcar como concluído"
                          >
                            <CheckCircle2 size={15} />
                            Concluir
                          </button>
                        )}
                        <button
                          onClick={() => loadReportDetails(r)}
                          className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-colors text-xs font-bold border border-indigo-200"
                          title="Abrir / Editar e Gerar Mensagem"
                        >
                          <Edit2 size={15} />
                          Abrir / Editar
                        </button>
                        <button
                          onClick={() => deleteReport(r.id!)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-xl transition-colors border border-red-100"
                          title="Excluir"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Modal de Configuração de Formatação da Mensagem */}
        {showConfigModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                    <Settings size={20} />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-gray-800 text-lg">Configurar Mensagem Padrão</h3>
                    <p className="text-xs text-gray-500">Defina o que fica em negrito, cores/emojis e alertas</p>
                  </div>
                </div>
                <button onClick={() => setShowConfigModal(false)} className="text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-gray-100">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-2xl space-y-3 border border-gray-100">
                  <p className="text-xs font-extrabold text-gray-700 uppercase tracking-wider">Formatação de Negrito (*Texto*)</p>
                  
                  <label className="flex items-center justify-between cursor-pointer text-xs font-semibold text-gray-700">
                    <span>Negrito nos Rótulos (*Número:*, *Local:*, etc.)</span>
                    <input 
                      type="checkbox" 
                      checked={msgConfig.boldLabels} 
                      onChange={(e) => setMsgConfig(prev => ({ ...prev, boldLabels: e.target.checked }))}
                      className="w-4 h-4 text-emerald-600 rounded"
                    />
                  </label>

                  <label className="flex items-center justify-between cursor-pointer text-xs font-semibold text-gray-700">
                    <span>Negrito nos Valores (*5481*, *GRAVÍSSIMA*, etc.)</span>
                    <input 
                      type="checkbox" 
                      checked={msgConfig.boldValues} 
                      onChange={(e) => setMsgConfig(prev => ({ ...prev, boldValues: e.target.checked }))}
                      className="w-4 h-4 text-emerald-600 rounded"
                    />
                  </label>

                  <label className="flex items-center justify-between cursor-pointer text-xs font-semibold text-gray-700">
                    <span>Negrito nos Cabeçalhos (*Prezados!*, *Inconformidade 1*)</span>
                    <input 
                      type="checkbox" 
                      checked={msgConfig.boldHeaders} 
                      onChange={(e) => setMsgConfig(prev => ({ ...prev, boldHeaders: e.target.checked }))}
                      className="w-4 h-4 text-emerald-600 rounded"
                    />
                  </label>
                </div>

                <div className="p-4 bg-gray-50 rounded-2xl space-y-3 border border-gray-100">
                  <p className="text-xs font-extrabold text-gray-700 uppercase tracking-wider">Cores, Emojis & Prazos</p>
                  
                  <label className="flex items-center justify-between cursor-pointer text-xs font-semibold text-gray-700">
                    <span className="flex items-center gap-1.5">
                      <span>Cores nas Classificações (🔴 🟠 🟡 🔵)</span>
                    </span>
                    <input 
                      type="checkbox" 
                      checked={msgConfig.useColorEmojis} 
                      onChange={(e) => setMsgConfig(prev => ({ ...prev, useColorEmojis: e.target.checked }))}
                      className="w-4 h-4 text-emerald-600 rounded"
                    />
                  </label>

                  <label className="flex items-center justify-between cursor-pointer text-xs font-semibold text-gray-700">
                    <span>Destacar Prazos Vencidos com ⚠️ *[VENCIDO]*</span>
                    <input 
                      type="checkbox" 
                      checked={msgConfig.highlightOverdue} 
                      onChange={(e) => setMsgConfig(prev => ({ ...prev, highlightOverdue: e.target.checked }))}
                      className="w-4 h-4 text-emerald-600 rounded"
                    />
                  </label>

                  <label className="flex items-center justify-between cursor-pointer text-xs font-semibold text-gray-700">
                    <span>Incluir campo "Sugestão de Adequação"</span>
                    <input 
                      type="checkbox" 
                      checked={msgConfig.includeSuggestion} 
                      onChange={(e) => setMsgConfig(prev => ({ ...prev, includeSuggestion: e.target.checked }))}
                      className="w-4 h-4 text-emerald-600 rounded"
                    />
                  </label>
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-gray-700 uppercase tracking-wider mb-1.5">Texto de Introdução</label>
                  <input 
                    type="text" 
                    value={msgConfig.introText} 
                    onChange={(e) => setMsgConfig(prev => ({ ...prev, introText: e.target.value }))}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500/20 outline-none"
                    placeholder="Ex: Informo sobre o click segurança com inconformidades de:"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setMsgConfig(DEFAULT_MSG_CONFIG)}
                  className="px-4 py-2 text-xs font-bold text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  Restaurar Padrão
                </button>
                <button
                  onClick={() => setShowConfigModal(false)}
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors shadow-sm"
                >
                  Salvar Preferências
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
        <div className="p-5 md:p-6 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <button onClick={() => setView('list')} className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-500">
              <X size={20} />
            </button>
            <div>
              <h2 className="text-xl font-extrabold text-gray-800 flex items-center gap-2">
                <FileText className="text-emerald-600" />
                {currentReport.id ? `Editar Relatório #${currentReport.report_number}` : 'Novo Relatório de Segurança'}
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">Preencha o local, as inconformidades e copie a mensagem formatada.</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <button
              onClick={copyForEmail}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl transition-colors font-bold text-xs shadow-sm shadow-indigo-600/20"
              title="Copiar mensagem formatada para colar no E-mail ou WhatsApp com negritos e cores"
            >
              {copiedType === 'email' ? <CheckCircle2 size={15} className="text-emerald-200" /> : <Mail size={15} />}
              {copiedType === 'email' ? 'Copiado p/ E-mail!' : 'Copiar p/ E-mail'}
            </button>
            <button
              onClick={() => copyReminder()}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl transition-colors font-bold text-xs shadow-sm shadow-amber-500/20"
              title="Copiar mensagem de lembrete de vencimento"
            >
              {copiedType === 'reminder' ? <CheckCircle2 size={15} className="text-amber-100" /> : <Bell size={15} />}
              {copiedType === 'reminder' ? 'Lembrete Copiado!' : 'Copiar Lembrete'}
            </button>
            <button
              onClick={generatePDF}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-xl transition-colors font-bold text-xs border border-amber-200"
              title="Exportar PDF Oficial"
            >
              <Download size={15} />
              PDF
            </button>
            <button
              onClick={saveReport}
              disabled={loading}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-5 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors font-bold text-xs disabled:opacity-50 shadow-sm shadow-emerald-600/20"
            >
              {loading ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Logos Upload */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
            <div className="bg-white p-3.5 rounded-xl border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-[11px] font-extrabold text-gray-700 uppercase tracking-wider">
                  Logo 1 • Click Segurança
                </label>
                {currentReport.logo_1 === DEFAULT_LOGOS.logo1 ? (
                  <span className="text-[10px] font-extrabold px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md">
                    Padrão Oficial
                  </span>
                ) : (
                  <button
                    onClick={() => setCurrentReport(prev => ({ ...prev, logo_1: DEFAULT_LOGOS.logo1 }))}
                    className="text-[10px] font-bold text-gray-500 hover:text-emerald-700 flex items-center gap-1 transition-colors"
                    title="Restaurar logo padrão do Click Segurança"
                  >
                    <RotateCcw size={11} /> Restaurar Padrão
                  </button>
                )}
              </div>
              <div className="flex items-center gap-3">
                <div className="w-16 h-12 rounded-lg border border-gray-200 overflow-hidden bg-white p-1 flex items-center justify-center flex-shrink-0 shadow-2xs">
                  <img 
                    src={currentReport.logo_1 || DEFAULT_LOGOS.logo1} 
                    alt="Logo Click Segurança" 
                    className="w-full h-full object-contain" 
                  />
                </div>
                <label className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gray-50 hover:bg-emerald-50/50 border border-gray-200 hover:border-emerald-300 rounded-lg cursor-pointer transition-all text-gray-700 font-bold text-xs">
                  <ImageIcon size={14} className="text-emerald-600" />
                  <span>Substituir Logo</span>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleLogoUpload(1, e.target.files[0])} />
                </label>
              </div>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-[11px] font-extrabold text-gray-700 uppercase tracking-wider">
                  Logo 2 • Copasa
                </label>
                {currentReport.logo_2 === DEFAULT_LOGOS.logo2 ? (
                  <span className="text-[10px] font-extrabold px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md">
                    Padrão Oficial
                  </span>
                ) : (
                  <button
                    onClick={() => setCurrentReport(prev => ({ ...prev, logo_2: DEFAULT_LOGOS.logo2 }))}
                    className="text-[10px] font-bold text-gray-500 hover:text-emerald-700 flex items-center gap-1 transition-colors"
                    title="Restaurar logo padrão da Copasa"
                  >
                    <RotateCcw size={11} /> Restaurar Padrão
                  </button>
                )}
              </div>
              <div className="flex items-center gap-3">
                <div className="w-16 h-12 rounded-lg border border-gray-200 overflow-hidden bg-white p-1 flex items-center justify-center flex-shrink-0 shadow-2xs">
                  <img 
                    src={currentReport.logo_2 || DEFAULT_LOGOS.logo2} 
                    alt="Logo Copasa" 
                    className="w-full h-full object-contain" 
                  />
                </div>
                <label className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gray-50 hover:bg-emerald-50/50 border border-gray-200 hover:border-emerald-300 rounded-lg cursor-pointer transition-all text-gray-700 font-bold text-xs">
                  <ImageIcon size={14} className="text-emerald-600" />
                  <span>Substituir Logo</span>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleLogoUpload(2, e.target.files[0])} />
                </label>
              </div>
            </div>
          </div>

          {/* Dados Principais do Relatório */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[11px] font-extrabold text-gray-700 uppercase tracking-wider mb-1">
                Número da Inconformidade *
              </label>
              <input
                type="text"
                value={currentReport.report_number}
                onChange={(e) => setCurrentReport({ ...currentReport, report_number: e.target.value })}
                placeholder="Ex: 5481"
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none font-bold text-sm"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-[11px] font-extrabold text-gray-700 uppercase tracking-wider mb-1">
                Local da Inconformidade *
              </label>
              <input
                type="text"
                value={currentReport.location}
                onChange={(e) => setCurrentReport({ ...currentReport, location: e.target.value })}
                placeholder="Ex: ETA Tarumirim - Rua da Copasa, 155"
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none font-bold text-sm"
              />
            </div>
          </div>

          {/* Lista de Não Conformidades */}
          <div className="border-t border-gray-100 pt-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-extrabold text-gray-800">Inconformidades Identificadas</h3>
                <p className="text-xs text-gray-500">Adicione as descrições, normas infringidas e datas de vencimento.</p>
              </div>
              <button
                onClick={addNonConformity}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 text-emerald-700 rounded-xl hover:bg-emerald-100 transition-colors text-xs font-bold border border-emerald-200"
              >
                <Plus size={16} />
                Adicionar NC
              </button>
            </div>

            {currentReport.nonConformities.length === 0 ? (
              <div className="text-center py-10 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                <AlertTriangle size={36} className="text-gray-300 mx-auto mb-2" />
                <p className="text-gray-600 font-bold text-sm">Nenhuma inconformidade cadastrada ainda.</p>
                <p className="text-xs text-gray-400 mt-0.5">Clique no botão acima para adicionar a primeira NC.</p>
              </div>
            ) : (
              <div className="space-y-5">
                {currentReport.nonConformities.map((nc, index) => {
                  const isOver = isDateOverdue(nc.dueDate, currentReport.status);
                  return (
                    <div 
                      key={index} 
                      className={cn(
                        "p-5 rounded-2xl border relative transition-all bg-white",
                        isOver ? "border-red-300 bg-red-50/10 shadow-sm" : "border-gray-200 bg-gray-50/40"
                      )}
                    >
                      <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-3">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-black text-xs flex items-center justify-center">
                            {index + 1}
                          </span>
                          <h4 className="font-extrabold text-gray-800 text-sm">Inconformidade {index + 1}</h4>
                          {isOver && (
                            <span className="text-[10px] font-black px-2 py-0.5 bg-red-100 text-red-700 rounded-full border border-red-200 flex items-center gap-1 animate-pulse">
                              <AlertOctagon size={11} /> VENCIDO
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => removeNonConformity(index)}
                          className="text-gray-400 hover:text-red-600 p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                          title="Remover esta NC"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-1 gap-4">
                        <div>
                          <label className="block text-[11px] font-extrabold text-gray-600 uppercase tracking-wider mb-1">
                            Descrição da Não Conformidade
                          </label>
                          <textarea
                            value={nc.description}
                            onChange={(e) => updateNonConformity(index, 'description', e.target.value)}
                            placeholder="Descreva detalhadamente o desvio encontrado..."
                            className="w-full px-3.5 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none text-xs font-medium min-h-[75px]"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-extrabold text-gray-600 uppercase tracking-wider mb-1">
                            Sugestão de Adequação / Medida Corretiva
                          </label>
                          <textarea
                            value={nc.suggestion}
                            onChange={(e) => updateNonConformity(index, 'suggestion', e.target.value)}
                            placeholder="Ação recomendada para correção da inconformidade..."
                            className="w-full px-3.5 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none text-xs font-medium min-h-[60px]"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-[11px] font-extrabold text-gray-600 uppercase tracking-wider mb-1">
                            Itens Normativos (NRs / Requisitos)
                          </label>
                          <textarea
                            value={nc.normativeItems}
                            onChange={(e) => updateNonConformity(index, 'normativeItems', e.target.value)}
                            placeholder="Ex: NR-10 item 10.2.8.2; NR-12 item 12.4"
                            className="w-full px-3.5 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none text-xs font-medium min-h-[60px]"
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[11px] font-extrabold text-gray-600 uppercase tracking-wider mb-1">
                              Classificação de Risco
                            </label>
                            <select
                              value={nc.classification}
                              onChange={(e) => updateNonConformity(index, 'classification', e.target.value as any)}
                              className={cn(
                                "w-full px-3.5 py-2 bg-white border rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none font-black text-xs",
                                getClassificationColor(nc.classification)
                              )}
                            >
                              <option value="LEVE">🔵 LEVE</option>
                              <option value="MÉDIA">🟡 MÉDIA</option>
                              <option value="GRAVE">🟠 GRAVE</option>
                              <option value="GRAVÍSSIMA">🔴 GRAVÍSSIMA</option>
                            </select>
                          </div>
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className="block text-[11px] font-extrabold text-gray-600 uppercase tracking-wider">
                                Data de Vencimento do Prazo
                              </label>
                            </div>
                            <input
                              type="date"
                              value={nc.dueDate}
                              onChange={(e) => updateNonConformity(index, 'dueDate', e.target.value)}
                              className={cn(
                                "w-full px-3.5 py-2 bg-white border rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none font-bold text-xs",
                                isOver ? "border-red-400 text-red-700 bg-red-50/20" : "border-gray-200"
                              )}
                            />
                            {nc.dueDate && (() => {
                              const info = getDueDateInfo(nc.dueDate, currentReport.status);
                              if (!info) return null;
                              return (
                                <div className={cn(
                                  "mt-1.5 px-2.5 py-1 rounded-lg border text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs",
                                  info.isOverdue 
                                    ? "bg-red-50 text-red-700 border-red-200 font-extrabold" 
                                    : info.isToday 
                                      ? "bg-red-50 text-red-700 border-red-300 font-extrabold"
                                      : info.isTomorrow || info.isSoon
                                        ? "bg-amber-50 text-amber-900 border-amber-300"
                                        : "bg-blue-50 text-blue-700 border-blue-200"
                                )}>
                                  <Timer size={13} className={info.isOverdue ? "text-red-500" : info.isToday ? "text-red-600" : info.isSoon || info.isTomorrow ? "text-amber-600" : "text-blue-500"} />
                                  <span>{info.tagText}</span>
                                </div>
                              );
                            })()}
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-extrabold text-gray-600 uppercase tracking-wider mb-1.5">
                            Evidências Fotográficas
                          </label>
                          <div className="flex flex-wrap gap-3">
                            {nc.images && nc.images.map((img, imgIdx) => (
                              <div key={imgIdx} className="relative w-20 h-20 rounded-xl overflow-hidden border border-gray-200 group bg-white">
                                <img src={img} alt="Preview" className="w-full h-full object-cover" />
                                <button
                                  onClick={() => removeImage(index, imgIdx)}
                                  className="absolute top-1 right-1 bg-red-600 text-white p-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <X size={12} />
                                </button>
                              </div>
                            ))}
                            <label className="flex flex-col items-center justify-center w-20 h-20 bg-white border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-emerald-300 hover:bg-emerald-50/30 transition-all text-gray-400 hover:text-emerald-600">
                              <Plus size={18} />
                              <span className="text-[10px] font-black mt-0.5">Foto</span>
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                  if (e.target.files && e.target.files[0]) {
                                    handleImageUpload(index, e.target.files[0]);
                                  }
                                }}
                              />
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de Pré-visualização da Mensagem (E-mail & WhatsApp) */}
      {showPreviewModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Eye size={20} />
                </div>
                <div>
                  <h3 className="font-extrabold text-gray-800 text-base">Pré-visualização da Mensagem</h3>
                  <p className="text-xs text-gray-500">Veja exatamente como o conteúdo será enviado por E-mail ou WhatsApp</p>
                </div>
              </div>
              <button onClick={() => setShowPreviewModal(false)} className="text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-gray-100">
                <X size={20} />
              </button>
            </div>

            {/* Selector between Email and WhatsApp */}
            <div className="flex bg-gray-100 p-1 rounded-2xl">
              <button
                onClick={() => setPreviewTab('email')}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-2 text-xs font-extrabold rounded-xl transition-all",
                  previewTab === 'email' ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-800"
                )}
              >
                <Mail size={15} />
                Formato para E-mail (HTML com Cores & Negrito)
              </button>
              <button
                onClick={() => setPreviewTab('whatsapp')}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-2 text-xs font-extrabold rounded-xl transition-all",
                  previewTab === 'whatsapp' ? "bg-white text-emerald-600 shadow-sm" : "text-gray-500 hover:text-gray-800"
                )}
              >
                <WhatsAppIcon size={15} />
                Formato para WhatsApp (*Texto*)
              </button>
            </div>

            {previewTab === 'email' ? (
              <div className="flex-1 overflow-y-auto bg-slate-100/80 p-4 rounded-2xl border border-slate-200">
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/60 max-w-full">
                  <div className="border-b border-gray-100 pb-3 mb-4 flex items-center justify-between text-xs text-gray-500">
                    <span className="font-bold text-gray-700">Assunto: <span className="font-semibold text-indigo-700">{generateEmailSubject()}</span></span>
                    <span className="text-[11px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded font-bold">HTML Renderizado</span>
                  </div>
                  <div dangerouslySetInnerHTML={{ __html: generateEmailHTML() }} />
                </div>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto bg-[#e5ddd5] p-4 rounded-2xl border border-gray-200">
                <div className="bg-white p-4 rounded-2xl shadow-sm max-w-[95%] space-y-2 text-xs text-gray-800 whitespace-pre-wrap font-sans leading-relaxed">
                  {generateMessage()}
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-gray-100">
              <button
                onClick={() => {
                  setShowPreviewModal(false);
                  setShowConfigModal(true);
                }}
                className="flex items-center gap-1.5 text-xs font-bold text-gray-600 hover:text-gray-900 px-3 py-2 rounded-xl hover:bg-gray-100 transition-colors"
              >
                <Settings size={15} />
                Personalizar Cores e Negritos
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={openEmailClient}
                  className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors"
                  title="Abrir aplicativo de e-mail padrão"
                >
                  <ExternalLink size={14} />
                  Abrir no E-mail
                </button>
                <button
                  onClick={copyForWhatsApp}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-green-500 hover:bg-green-600 text-white font-bold text-xs rounded-xl transition-colors shadow-sm"
                >
                  <WhatsAppIcon size={14} />
                  {copiedType === 'whatsapp' ? 'Copiado WhatsApp!' : 'Copiar p/ WhatsApp'}
                </button>
                <button
                  onClick={copyForEmail}
                  className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-colors shadow-sm shadow-indigo-600/20"
                >
                  <Mail size={14} />
                  {copiedType === 'email' ? 'Copiado p/ E-mail!' : 'Copiar p/ E-mail'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Configuração de Formatação, Cores e Negritos */}
      {showConfigModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                  <Settings size={20} />
                </div>
                <div>
                  <h3 className="font-extrabold text-gray-800 text-base">Configurar Mensagem e E-mail</h3>
                  <p className="text-xs text-gray-500">Personalize negritos, cores para cada gravidade e textos padrão</p>
                </div>
              </div>
              <button onClick={() => setShowConfigModal(false)} className="text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-gray-100">
                <X size={20} />
              </button>
            </div>

            {/* Config Tabs */}
            <div className="flex bg-gray-100 p-1 rounded-2xl">
              <button
                onClick={() => setConfigTab('bold')}
                className={cn(
                  "flex-1 py-1.5 text-xs font-extrabold rounded-xl transition-all",
                  configTab === 'bold' ? "bg-white text-emerald-600 shadow-sm" : "text-gray-500 hover:text-gray-800"
                )}
              >
                🔤 Negritos
              </button>
              <button
                onClick={() => setConfigTab('colors')}
                className={cn(
                  "flex-1 py-1.5 text-xs font-extrabold rounded-xl transition-all",
                  configTab === 'colors' ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-800"
                )}
              >
                🎨 Cores do E-mail
              </button>
              <button
                onClick={() => setConfigTab('text')}
                className={cn(
                  "flex-1 py-1.5 text-xs font-extrabold rounded-xl transition-all",
                  configTab === 'text' ? "bg-white text-amber-600 shadow-sm" : "text-gray-500 hover:text-gray-800"
                )}
              >
                ✉️ Textos & Assunto
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {configTab === 'bold' && (
                <div className="p-4 bg-gray-50 rounded-2xl space-y-3.5 border border-gray-100">
                  <p className="text-xs font-extrabold text-gray-700 uppercase tracking-wider">Onde aplicar negrito?</p>
                  
                  <label className="flex items-center justify-between cursor-pointer text-xs font-semibold text-gray-700 bg-white p-3 rounded-xl border border-gray-100 hover:border-emerald-200 transition">
                    <div>
                      <p className="font-bold text-gray-800">Negrito nos Rótulos</p>
                      <p className="text-[11px] text-gray-400 font-normal">Ex: <b>Número da Inconformidade:</b>, <b>Local:</b>, <b>Descrição:</b></p>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={msgConfig.boldLabels} 
                      onChange={(e) => setMsgConfig(prev => ({ ...prev, boldLabels: e.target.checked }))}
                      className="w-4 h-4 text-emerald-600 rounded cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between cursor-pointer text-xs font-semibold text-gray-700 bg-white p-3 rounded-xl border border-gray-100 hover:border-emerald-200 transition">
                    <div>
                      <p className="font-bold text-gray-800">Negrito nos Valores e Gravidades</p>
                      <p className="text-[11px] text-gray-400 font-normal">Ex: <b>5481</b>, <b>GRAVÍSSIMA</b>, <b>20/05/2024</b></p>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={msgConfig.boldValues} 
                      onChange={(e) => setMsgConfig(prev => ({ ...prev, boldValues: e.target.checked }))}
                      className="w-4 h-4 text-emerald-600 rounded cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between cursor-pointer text-xs font-semibold text-gray-700 bg-white p-3 rounded-xl border border-gray-100 hover:border-emerald-200 transition">
                    <div>
                      <p className="font-bold text-gray-800">Negrito nos Cabeçalhos e Títulos</p>
                      <p className="text-[11px] text-gray-400 font-normal">Ex: <b>Prezados!</b>, <b>🚨 Inconformidade 1</b></p>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={msgConfig.boldHeaders} 
                      onChange={(e) => setMsgConfig(prev => ({ ...prev, boldHeaders: e.target.checked }))}
                      className="w-4 h-4 text-emerald-600 rounded cursor-pointer"
                    />
                  </label>
                </div>
              )}

              {configTab === 'colors' && (
                <div className="p-4 bg-gray-50 rounded-2xl space-y-4 border border-gray-100">
                  <div>
                    <p className="text-xs font-extrabold text-gray-700 uppercase tracking-wider mb-1">Cores por Gravidade (E-mail & Destaques)</p>
                    <p className="text-[11px] text-gray-500 mb-3">Escolha a cor exata para as bordas, textos e cartões no E-mail enviado.</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="bg-white p-3 rounded-xl border border-gray-100 flex items-center justify-between">
                      <div>
                        <span className="text-xs font-extrabold text-gray-800 flex items-center gap-1.5">
                          🔴 Gravíssima
                        </span>
                        <span className="text-[10px] text-gray-400 font-mono">{msgConfig.colorGravissima}</span>
                      </div>
                      <input 
                        type="color" 
                        value={msgConfig.colorGravissima} 
                        onChange={(e) => setMsgConfig(prev => ({ ...prev, colorGravissima: e.target.value }))}
                        className="w-8 h-8 rounded-lg cursor-pointer border border-gray-200 p-0.5"
                      />
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-gray-100 flex items-center justify-between">
                      <div>
                        <span className="text-xs font-extrabold text-gray-800 flex items-center gap-1.5">
                          🟠 Grave
                        </span>
                        <span className="text-[10px] text-gray-400 font-mono">{msgConfig.colorGrave}</span>
                      </div>
                      <input 
                        type="color" 
                        value={msgConfig.colorGrave} 
                        onChange={(e) => setMsgConfig(prev => ({ ...prev, colorGrave: e.target.value }))}
                        className="w-8 h-8 rounded-lg cursor-pointer border border-gray-200 p-0.5"
                      />
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-gray-100 flex items-center justify-between">
                      <div>
                        <span className="text-xs font-extrabold text-gray-800 flex items-center gap-1.5">
                          🟡 Média
                        </span>
                        <span className="text-[10px] text-gray-400 font-mono">{msgConfig.colorMedia}</span>
                      </div>
                      <input 
                        type="color" 
                        value={msgConfig.colorMedia} 
                        onChange={(e) => setMsgConfig(prev => ({ ...prev, colorMedia: e.target.value }))}
                        className="w-8 h-8 rounded-lg cursor-pointer border border-gray-200 p-0.5"
                      />
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-gray-100 flex items-center justify-between">
                      <div>
                        <span className="text-xs font-extrabold text-gray-800 flex items-center gap-1.5">
                          🔵 Leve
                        </span>
                        <span className="text-[10px] text-gray-400 font-mono">{msgConfig.colorLeve}</span>
                      </div>
                      <input 
                        type="color" 
                        value={msgConfig.colorLeve} 
                        onChange={(e) => setMsgConfig(prev => ({ ...prev, colorLeve: e.target.value }))}
                        className="w-8 h-8 rounded-lg cursor-pointer border border-gray-200 p-0.5"
                      />
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-red-100 flex items-center justify-between bg-red-50/20">
                      <div>
                        <span className="text-xs font-extrabold text-red-700 flex items-center gap-1.5">
                          ⚠️ Prazo Vencido
                        </span>
                        <span className="text-[10px] text-gray-400 font-mono">{msgConfig.colorOverdue}</span>
                      </div>
                      <input 
                        type="color" 
                        value={msgConfig.colorOverdue} 
                        onChange={(e) => setMsgConfig(prev => ({ ...prev, colorOverdue: e.target.value }))}
                        className="w-8 h-8 rounded-lg cursor-pointer border border-gray-200 p-0.5"
                      />
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-gray-100 flex items-center justify-between">
                      <div>
                        <span className="text-xs font-extrabold text-gray-800 flex items-center gap-1.5">
                          🔠 Título / Cabeçalho
                        </span>
                        <span className="text-[10px] text-gray-400 font-mono">{msgConfig.colorHeader}</span>
                      </div>
                      <input 
                        type="color" 
                        value={msgConfig.colorHeader} 
                        onChange={(e) => setMsgConfig(prev => ({ ...prev, colorHeader: e.target.value }))}
                        className="w-8 h-8 rounded-lg cursor-pointer border border-gray-200 p-0.5"
                      />
                    </div>
                  </div>

                  <label className="flex items-center justify-between cursor-pointer text-xs font-semibold text-gray-700 pt-1">
                    <span>Exibir Emojis Coloridos (🔴 🟠 🟡 🔵) nas mensagens</span>
                    <input 
                      type="checkbox" 
                      checked={msgConfig.useColorEmojis} 
                      onChange={(e) => setMsgConfig(prev => ({ ...prev, useColorEmojis: e.target.checked }))}
                      className="w-4 h-4 text-emerald-600 rounded cursor-pointer"
                    />
                  </label>
                </div>
              )}

              {configTab === 'text' && (
                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 rounded-2xl space-y-3.5 border border-gray-100">
                    <div>
                      <label className="block text-xs font-extrabold text-gray-700 uppercase tracking-wider mb-1">
                        Modelo de Assunto do E-mail
                      </label>
                      <p className="text-[11px] text-gray-400 mb-1.5">Use <code className="bg-gray-200 px-1 py-0.5 rounded text-gray-800 font-bold">{'{local}'}</code> e <code className="bg-gray-200 px-1 py-0.5 rounded text-gray-800 font-bold">{'{numero}'}</code> para substituição automática.</p>
                      <input 
                        type="text" 
                        value={msgConfig.emailSubjectTemplate} 
                        onChange={(e) => setMsgConfig(prev => ({ ...prev, emailSubjectTemplate: e.target.value }))}
                        className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-emerald-500/20 outline-none"
                        placeholder="Ex: Relatório de Inconformidade - {local} - Nº {numero}"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-extrabold text-gray-700 uppercase tracking-wider mb-1">
                        Texto de Introdução
                      </label>
                      <input 
                        type="text" 
                        value={msgConfig.introText} 
                        onChange={(e) => setMsgConfig(prev => ({ ...prev, introText: e.target.value }))}
                        className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500/20 outline-none"
                        placeholder="Ex: Informo sobre o click segurança com inconformidades de:"
                      />
                    </div>
                  </div>

                  <div className="p-4 bg-gray-50 rounded-2xl space-y-3 border border-gray-100">
                    <p className="text-xs font-extrabold text-gray-700 uppercase tracking-wider">Opções Adicionais</p>

                    <label className="flex items-center justify-between cursor-pointer text-xs font-semibold text-gray-700">
                      <span>Destacar Prazos Vencidos com etiqueta ⚠️ [PRAZO VENCIDO]</span>
                      <input 
                        type="checkbox" 
                        checked={msgConfig.highlightOverdue} 
                        onChange={(e) => setMsgConfig(prev => ({ ...prev, highlightOverdue: e.target.checked }))}
                        className="w-4 h-4 text-emerald-600 rounded cursor-pointer"
                      />
                    </label>

                    <label className="flex items-center justify-between cursor-pointer text-xs font-semibold text-gray-700">
                      <span>Incluir campo "Sugestão de Adequação"</span>
                      <input 
                        type="checkbox" 
                        checked={msgConfig.includeSuggestion} 
                        onChange={(e) => setMsgConfig(prev => ({ ...prev, includeSuggestion: e.target.checked }))}
                        className="w-4 h-4 text-emerald-600 rounded cursor-pointer"
                      />
                    </label>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
              <button
                onClick={() => setMsgConfig(DEFAULT_MSG_CONFIG)}
                className="px-3.5 py-2 text-xs font-bold text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
              >
                Restaurar Padrão
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setShowConfigModal(false);
                    setShowPreviewModal(true);
                  }}
                  className="px-4 py-2 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-colors"
                >
                  Ver Prévia
                </button>
                <button
                  onClick={() => setShowConfigModal(false)}
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors shadow-sm"
                >
                  Salvar Preferências
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

