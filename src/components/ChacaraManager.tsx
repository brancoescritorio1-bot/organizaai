import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  Users, 
  Zap, 
  Settings as SettingsIcon, 
  Plus, 
  Trash2, 
  Edit2, 
  Save, 
  MessageCircle, 
  Calendar,
  DollarSign,
  ArrowRight,
  Download,
  Filter,
  CheckCircle,
  XCircle,
  Check,
  Search,
  History,
  PlusCircle,
  Shield,
  Briefcase,
  Layers,
  PieChart,
  CheckCircle2,
  FileText,
  AlertCircle,
  Eye,
  FileDown,
  Share2,
  Droplets,
  User,
  UserPlus,
  Phone,
  Power,
  X,
  Gauge,
  Clock,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import jsPDF from 'jspdf';
import * as htmlToImage from 'html-to-image';
import autoTable from 'jspdf-autotable';
import { ChacaraUser, ChacaraBill, ChacaraSettings } from '../types';
import { ChacaraFinanceDashboard } from './ChacaraFinanceDashboard';
import { WhatsAppIcon, getGreeting } from '../MainApp';
import { cn } from '../lib/utils';
import { PdfService } from '../lib/PdfService';
import { useDialog } from './DialogContext';
import { StrictFinanceDashboard, Lancamento } from './StrictFinanceDashboard';

interface ChacaraManagerProps {
  fetchWithAuth: (url: string, options?: RequestInit) => Promise<Response>;
  activeTab: string;
  onDataUpdate?: () => void;
  setActiveTab?: (tab: string) => void;
}

const Card = ({ children, title, icon: Icon, className = "" }: { children: React.ReactNode, title?: string, icon?: any, key?: any, className?: string }) => (
  <div className={cn("bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6 transition-all hover:shadow-md", className)}>
    {title && (
      <div className="px-5 md:px-6 py-4 md:py-5 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
        <div className="flex items-center gap-3">
          {Icon && <Icon size={20} className="text-indigo-600" />}
          <h3 className="font-bold text-gray-800 text-sm md:text-base tracking-tight uppercase">{title}</h3>
        </div>
      </div>
    )}
    <div className="p-5 md:p-8">
      {children}
    </div>
  </div>
);

const formatWAPhone = (phone: string) => {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 11) {
    return '55' + cleaned;
  }
  return cleaned;
};

const normalizeSearchText = (text: string | null | undefined): string => {
  if (!text) return '';
  return text
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
};

const extractDigits = (text: string | null | undefined): string => {
  if (!text) return '';
  return text.toString().replace(/\D/g, '');
};

const getFirstName = (fullName: string | null | undefined): string => {
  if (!fullName) return '';
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  const prefixes = ['sr.', 'sr', 'sra.', 'sra', 'dr.', 'dr', 'dra.', 'dra', 'dona', 'seu'];
  if (parts.length > 1 && prefixes.includes(parts[0].toLowerCase())) {
    return `${parts[0]} ${parts[1]}`;
  }
  return parts[0];
};

const MonthYearPicker = ({ 
  year, 
  month, 
  onSelect
}: { 
  year: string, 
  month: string, 
  onSelect: (y: string, m: string) => void
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [viewYear, setViewYear] = useState(year === 'all' ? new Date().getFullYear().toString() : year);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const months = [
    { id: '01', label: 'jan' }, { id: '02', label: 'fev' }, { id: '03', label: 'mar' }, { id: '04', label: 'abr' },
    { id: '05', label: 'mai' }, { id: '06', label: 'jun' }, { id: '07', label: 'jul' }, { id: '08', label: 'ago' },
    { id: '09', label: 'set' }, { id: '10', label: 'out' }, { id: '11', label: 'nov' }, { id: '12', label: 'dez' }
  ];

  const getLabel = () => {
    if (year === 'all' && month === 'all') return 'Todos os Períodos';
    if (year === 'all') return months.find(m => m.id === month)?.label || month;
    if (month === 'all') return year;
    const monthLabel = months.find(m => m.id === month)?.label || month;
    return `${monthLabel} de ${year}`;
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-medium hover:border-indigo-300 transition-all shadow-sm group"
      >
        <Filter size={14} className="text-gray-400 group-hover:text-indigo-500" />
        <span className="text-gray-700 min-w-[100px] text-left">{getLabel()}</span>
        <Calendar size={14} className="text-gray-400 group-hover:text-indigo-500" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute top-full left-0 mt-2 bg-white border border-gray-100 rounded-2xl shadow-2xl z-50 p-4 min-w-[260px]"
          >
            <div className="flex items-center justify-between mb-4 bg-gray-50/80 p-2 rounded-xl">
              <button 
                onClick={() => setViewYear((parseInt(viewYear) - 1).toString())}
                className="p-1.5 hover:bg-white rounded-lg transition-all text-gray-400 hover:text-indigo-600 active:scale-95"
              >
                <ArrowRight size={16} className="rotate-180" />
              </button>
              <span className="font-black text-gray-800 text-sm tracking-tight">{viewYear}</span>
              <button 
                onClick={() => setViewYear((parseInt(viewYear) + 1).toString())}
                className="p-1.5 hover:bg-white rounded-lg transition-all text-gray-400 hover:text-indigo-600 active:scale-95"
              >
                <ArrowRight size={16} />
              </button>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {months.map((m) => {
                const isActive = month === m.id && year === viewYear;
                return (
                  <button
                    key={m.id}
                    onClick={() => {
                      onSelect(viewYear, m.id);
                      setIsOpen(false);
                    }}
                    className={cn(
                      "py-2 rounded-xl text-[10px] font-black transition-all border uppercase tracking-wider",
                      isActive 
                        ? "bg-[#007bff] text-white border-[#007bff] shadow-md scale-105" 
                        : "bg-white text-gray-600 border-gray-100/50 hover:border-indigo-100 hover:bg-indigo-50/50"
                    )}
                  >
                    {m.label}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-between mt-5 pt-4 border-t border-gray-50">
              <button
                onClick={() => {
                  onSelect('all', 'all');
                  setIsOpen(false);
                }}
                className="text-[10px] font-black text-indigo-600 hover:text-indigo-700 uppercase tracking-widest px-2"
              >
                Limpar
              </button>
              <button
                onClick={() => {
                  const now = new Date();
                  onSelect(now.getFullYear().toString(), (now.getMonth() + 1).toString().padStart(2, '0'));
                  setIsOpen(false);
                }}
                className="text-[10px] font-black text-indigo-600 hover:text-indigo-700 uppercase tracking-widest px-2"
              >
                Este mês
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const ChacaraManager: React.FC<ChacaraManagerProps> = ({ fetchWithAuth, activeTab, onDataUpdate, setActiveTab }) => {
  const { confirm: dialogConfirm, alert: dialogAlert, askOptions, preview } = useDialog();
  const [users, setUsers] = useState<ChacaraUser[]>([]);
  const [bills, setBills] = useState<ChacaraBill[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [settings, setSettings] = useState<ChacaraSettings>({
    id: 1,
    default_kwh: 0.95,
    default_water_value: 5.00,
    default_water_service_fee: 0,
    default_apportionment_value: 20.00,
    default_due_day: 10,
    default_reading_day: 5,
    reserve_fund_value: 50.00,
    default_month_reference: ''
  });

  // Form States
  const [userForm, setUserForm] = useState({ 
    name: '', 
    street: '',
    house_number: '',
    cpf: '',
    phone: '', 
    has_energy: true, 
    has_water: true, 
    energy_meters_count: 1, 
    water_meters_count: 1,
    energy_active: true,
    water_active: true
  });
  const [editingUser, setEditingUser] = useState<ChacaraUser | null>(null);
  const [isSavingUser, setIsSavingUser] = useState(false);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [userServiceFilter, setUserServiceFilter] = useState<'all' | 'energy' | 'water' | 'inactive'>('all');
  const [userSortField, setUserSortField] = useState<'name' | 'street' | 'house_number' | 'cpf' | 'phone'>('name');
  const [userSortOrder, setUserSortOrder] = useState<'asc' | 'desc'>('asc');
  const userFormRef = useRef<HTMLDivElement>(null);

  const toggleUserSort = (field: 'name' | 'street' | 'house_number' | 'cpf' | 'phone') => {
    if (userSortField === field) {
      setUserSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setUserSortField(field);
      setUserSortOrder('asc');
    }
  };
  
  const [billForm, setBillForm] = useState({
    user_id: '',
    month_reference: new Date().toISOString().slice(0, 7), // YYYY-MM
    reading_date: '',
    due_date: '',
    // Energy
    prev_reading: 0,
    curr_reading: 0,
    prev_reading_2: 0,
    curr_reading_2: 0,
    kwh_value: 0,
    // Water
    water_prev_reading: 0,
    water_curr_reading: 0,
    water_prev_reading_2: 0,
    water_curr_reading_2: 0,
    water_value: 0,
    water_service_fee: 0,
    // Apportionment
    apportionment_value: 0,
    include_apportionment: true,
    
    include_reserve_fund: true,
    status: 'pending' as 'pending' | 'paid',
    payment_date: '',
    energy_readings: [] as { prev: number; curr: number }[],
    water_readings: [] as { prev: number; curr: number }[],
    observations: ''
  });
  const [editingBill, setEditingBill] = useState<ChacaraBill | null>(null);
  
  const [expenseForm, setExpenseForm] = useState({
    month_reference: new Date().toISOString().slice(0, 7),
    description: '',
    category: 'manutencao',
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    receipt_url: ''
  });
  const [editingExpense, setEditingExpense] = useState<any | null>(null);
  const [whatsappChacaraTemplate, setWhatsappChacaraTemplate] = useState(() => localStorage.getItem('whatsappChacaraTemplate') || 'Olá {nome}, tudo bem?');
  const [sentChacaraMessages, setSentChacaraMessages] = useState<string[]>([]);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const [filterMonth, setFilterMonth] = useState(new Date().toISOString().slice(0, 7));
  const [searchBill, setSearchBill] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'paid' | 'partial'>('all');
  const [paymentDateModal, setPaymentDateModal] = useState<{isOpen: boolean, bill: ChacaraBill | null, date: string, amountPaid: number, paidCategories: Record<string, boolean>, isDivergent: boolean}>({isOpen: false, bill: null, date: '', amountPaid: 0, paidCategories: {}, isDivergent: false});
  const [pendingDetailsModal, setPendingDetailsModal] = useState<{isOpen: boolean, user: ChacaraUser | null}>({isOpen: false, user: null});
  const [invoiceDetailsModal, setInvoiceDetailsModal] = useState<{isOpen: boolean, bill: ChacaraBill | null}>({isOpen: false, bill: null});
  const [highlightedBillId, setHighlightedBillId] = useState<number | null>(null);
  const [pendingSearch, setPendingSearch] = useState('');
  const [pendingSort, setPendingSort] = useState<'name' | 'balance'>('name');
  const [detailsYearFilter, setDetailsYearFilter] = useState<string>('all');
  const [detailsMonthFilter, setDetailsMonthFilter] = useState<string>('all');
  const modalContentRef = useRef<HTMLDivElement>(null);

  const exportPendingDetailsToPDF = async (ref: React.RefObject<HTMLDivElement>, fileName: string, action: 'save' | 'share' = 'save', shareText?: string) => {
    if (!ref.current) return;
    const element = ref.current;
    
    // Show preview first (PdfPreviewModal clones the element and applies its own cleaning)
    const pdfAction = await preview(element, 'Visualização do Extrato');
    if (!pdfAction) return;

    setIsGeneratingPdf(true);
    // Give a small delay for the preview modal to fully close
    await new Promise(resolve => setTimeout(resolve, 400));
    
    let container: HTMLDivElement | null = null;
    try {
      // Create a temporary container for the clone
      container = document.createElement('div');
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      container.style.top = '0';
      container.style.width = '1000px';
      container.style.backgroundColor = 'white';
      document.body.appendChild(container);

      // Clone the element for export
      const clone = element.cloneNode(true) as HTMLElement;
      clone.classList.add('report-view');
      
      // Force the clone to show all content without scrolling
      const scrollable = clone.querySelector('.report-container');
      if (scrollable) {
        (scrollable as HTMLElement).style.height = 'auto';
        (scrollable as HTMLElement).style.maxHeight = 'none';
        (scrollable as HTMLElement).style.overflow = 'visible';
      }
      
      clone.style.height = 'auto';
      clone.style.maxHeight = 'none';
      clone.style.overflow = 'visible';
      
      // Remove interactive elements from clone
      const interactive = clone.querySelectorAll('button, .action-exclude, .no-export');
      interactive.forEach(el => (el as HTMLElement).style.display = 'none');
      
      // Ensure "show-on-export" elements are visible
      const exportOnly = clone.querySelectorAll('.show-on-export');
      exportOnly.forEach(el => (el as HTMLElement).style.display = 'block');

      container.appendChild(clone);

      await PdfService.exportToPDF(clone, fileName, 'p', pdfAction, shareText);
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      // Cleanup
      if (container && document.body.contains(container)) {
        document.body.removeChild(container);
      }
      // Ensure state is reset even if user navigated away or error occurred
      setTimeout(() => setIsGeneratingPdf(false), 100);
    }
  };

  const invoiceModalRef = useRef<HTMLDivElement>(null);

  const calculateBillCategories = (bill: ChacaraBill) => {
    const energyConsumption = bill.energy_readings && bill.energy_readings.length > 0
      ? bill.energy_readings.reduce((acc, r) => acc + (r.curr - r.prev), 0)
      : (bill.curr_reading || 0) - (bill.prev_reading || 0) + ((bill.curr_reading_2 || 0) - (bill.prev_reading_2 || 0));
    const energyTotal = energyConsumption * bill.kwh_value;
    
    const waterConsumption = bill.water_readings && bill.water_readings.length > 0
      ? bill.water_readings.reduce((acc, r) => acc + (r.curr - r.prev), 0)
      : (bill.water_curr_reading || 0) - (bill.water_prev_reading || 0) + ((bill.water_curr_reading_2 || 0) - (bill.water_prev_reading_2 || 0));
    const waterValueTotal = waterConsumption * (bill.water_value || 0);
    
    const apportionment = bill.include_apportionment ? (bill.apportionment_value || 0) : 0;
    const reserveFund = bill.include_reserve_fund ? (bill.reserve_fund || 0) : 0;
    const serviceFee = bill.water_service_fee || 0;

    return {
      energy_total: energyTotal,
      water_total: waterValueTotal,
      apportionment: apportionment,
      reserve_fund: reserveFund,
      water_service_fee: serviceFee
    };
  };

  const [settingsForm, setSettingsForm] = useState<ChacaraSettings>(settings);

  const selectedUserForBill = users.find(u => u.id === Number(billForm.user_id));
  const showEnergy = selectedUserForBill ? (selectedUserForBill.has_energy !== false && selectedUserForBill.energy_active !== false) : true;
  const showWater = selectedUserForBill ? (selectedUserForBill.has_water !== false && selectedUserForBill.water_active !== false) : true;

  const filteredBills = bills.filter(bill => {
    if (filterMonth && bill.month_reference !== filterMonth) return false;
    
    if (statusFilter !== 'all' && bill.status !== statusFilter) return false;
    
    if (searchBill && searchBill.trim()) {
      const user = users.find(u => u.id === bill.chacara_user_id);
      
      const queryNorm = normalizeSearchText(searchBill);
      const queryTokens = queryNorm.split(/\s+/).filter(Boolean);
      if (queryTokens.length === 0) return true;

      // User attributes
      const userNameNorm = normalizeSearchText(user?.name);
      const userPhoneNorm = normalizeSearchText(user?.phone);
      const userPhoneDigits = extractDigits(user?.phone);
      const userStreetNorm = normalizeSearchText(user?.street || user?.rua);
      const userHouseNorm = normalizeSearchText(user?.house_number || user?.casa);
      const userHouseDigits = extractDigits(user?.house_number || user?.casa);
      const userCpfNorm = normalizeSearchText(user?.cpf);
      const userCpfDigits = extractDigits(user?.cpf);

      // Bill energy & water calculations
      const energyReadings = bill.energy_readings || [];
      const waterReadings = bill.water_readings || [];
      const energyConsumption = energyReadings.length > 0
        ? energyReadings.reduce((acc, r) => acc + (r.curr - r.prev), 0)
        : (bill.curr_reading - bill.prev_reading) + ((bill.curr_reading_2 || 0) - (bill.prev_reading_2 || 0));
      const energyTotal = energyConsumption * bill.kwh_value;

      const waterConsumption = waterReadings.length > 0
        ? waterReadings.reduce((acc, r) => acc + (r.curr - r.prev), 0)
        : (bill.water_curr_reading || 0) - (bill.water_prev_reading || 0) + ((bill.water_curr_reading_2 || 0) - (bill.water_prev_reading_2 || 0));
      const waterTotal = waterConsumption * (bill.water_value || 0);

      // Financial representations (dot, comma, integers, formatted)
      const billTotalFixed2 = bill.total.toFixed(2);
      const billTotalPtBr = bill.total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const billTotalInt = Math.floor(bill.total).toString();

      const energyTotalPtBr = energyTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const waterTotalPtBr = waterTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

      // Month info in pt-BR
      let monthName = '';
      let monthNumber = '';
      let yearNumber = '';
      if (bill.month_reference && bill.month_reference.includes('-')) {
        const [y, m] = bill.month_reference.split('-');
        yearNumber = y;
        monthNumber = m;
        try {
          monthName = normalizeSearchText(new Date(Number(y), Number(m) - 1).toLocaleString('pt-BR', { month: 'long' }));
        } catch (_) {}
      }

      const statusText = bill.status === 'paid' ? 'pago paga liquidado' : bill.status === 'partial' ? 'parcial' : 'pendente pendencia aberto receber';

      // Chacara & Address aliases
      const addressAliases = [
        userStreetNorm,
        userHouseNorm ? `casa ${userHouseNorm}` : '',
        userHouseNorm ? `chacara ${userHouseNorm}` : '',
        userHouseNorm ? `lote ${userHouseNorm}` : '',
        userHouseNorm ? `n ${userHouseNorm}` : '',
        userHouseNorm ? `num ${userHouseNorm}` : '',
        userHouseNorm ? 'casa' : '',
        userHouseNorm ? 'chacara' : '',
        userHouseNorm ? 'lote' : ''
      ].filter(Boolean).join(' ');

      const combinedSearchBlock = [
        userNameNorm,
        userPhoneNorm,
        userStreetNorm,
        userHouseNorm,
        userCpfNorm,
        addressAliases,
        billTotalFixed2,
        billTotalPtBr,
        `r$ ${billTotalPtBr}`,
        `r$${billTotalPtBr}`,
        billTotalInt,
        `energia ${energyTotalPtBr}`,
        `agua ${waterTotalPtBr}`,
        monthName,
        `${monthNumber}/${yearNumber}`,
        bill.month_reference,
        statusText,
        bill.id.toString(),
        user?.id ? `id ${user.id}` : ''
      ].join(' ');

      return queryTokens.every(token => {
        const cleanToken = token.replace(/^(r\$|rs|\$)/i, '').trim() || token;
        const tokenDigits = extractDigits(token);

        // Substring match in the full normalized bill block
        if (combinedSearchBlock.includes(token) || combinedSearchBlock.includes(cleanToken)) {
          return true;
        }

        // Match CPF digits (min 3 digits)
        if (tokenDigits.length >= 3 && userCpfDigits && userCpfDigits.includes(tokenDigits)) {
          return true;
        }

        // Match Phone digits (min 3 digits)
        if (tokenDigits.length >= 3 && userPhoneDigits && userPhoneDigits.includes(tokenDigits)) {
          return true;
        }

        // Match House / Chácara number
        if (userHouseDigits && userHouseDigits === tokenDigits) {
          return true;
        }

        // Match numerical amount (bill total, energy, or water)
        const parsedToken = parseFloat(cleanToken.replace(',', '.'));
        if (!isNaN(parsedToken) && parsedToken > 0) {
          if (Math.abs(bill.total - parsedToken) < 0.01) return true;
          if (!cleanToken.includes('.') && !cleanToken.includes(',') && Math.floor(bill.total) === Math.floor(parsedToken)) {
            return true;
          }
          if (Math.abs(energyTotal - parsedToken) < 0.01) return true;
          if (Math.abs(waterTotal - parsedToken) < 0.01) return true;
        }

        return false;
      });
    }
    return true;
  });

  const totalToPay = filteredBills.reduce((acc, bill) => acc + bill.total, 0);
  const totalPaid = filteredBills.reduce((acc, bill) => acc + (bill.status === 'paid' ? bill.total : (bill.amount_paid || 0)), 0);
  const totalPending = totalToPay - totalPaid;

  const statsBills = bills.filter(bill => !filterMonth || bill.month_reference === filterMonth);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [usersRes, billsRes, settingsRes, expensesRes] = await Promise.all([
        fetchWithAuth('/api/chacara/users'),
        fetchWithAuth('/api/chacara/bills'),
        fetchWithAuth('/api/chacara/settings'),
        fetchWithAuth('/api/chacara/expenses')
      ]);

      const processRes = async (res: Response, name: string) => {
        if (!res.ok) {
          console.error(`Error fetching ${name}:`, res.status);
          return null;
        }
        const text = await res.text();
        try {
          return JSON.parse(text);
        } catch (e) {
          console.error(`Error parsing JSON for ${name}. Status: ${res.status}. Text:`, text.substring(0, 100));
          return null;
        }
      };

      const usersData = await processRes(usersRes, 'users');
      if (usersData) setUsers(Array.isArray(usersData) ? usersData : []);

      const billsData = await processRes(billsRes, 'bills');
      if (billsData) setBills(Array.isArray(billsData) ? billsData : []);

      const expsData = await processRes(expensesRes, 'expenses');
      if (expsData) setExpenses(Array.isArray(expsData) ? expsData : []);

      const sData = await processRes(settingsRes, 'settings');
      if (sData) {
        setSettings(sData);
        setSettingsForm(sData);
        
        // Apply default month reference if set and not editing
        if (sData.default_month_reference && !editingBill && !billForm.user_id) {
           setBillForm(prev => ({ ...prev, month_reference: sData.default_month_reference }));
           setFilterMonth(sData.default_month_reference);
        }
      }
    } catch (error) {
      console.error('Error fetching chacara data:', error);
    }
  };

  const handleUserPhoneChange = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 11);
    let formatted = digits;
    if (digits.length > 2) {
      formatted = `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    }
    if (digits.length > 7) {
      formatted = `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    }
    setUserForm(prev => ({ ...prev, phone: formatted }));
  };

  const handleUserCpfChange = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 11);
    let formatted = digits;
    if (digits.length > 3) {
      formatted = `${digits.slice(0, 3)}.${digits.slice(3)}`;
    }
    if (digits.length > 6) {
      formatted = `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    }
    if (digits.length > 9) {
      formatted = `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
    }
    setUserForm(prev => ({ ...prev, cpf: formatted }));
  };

  const handleCancelEditUser = () => {
    setEditingUser(null);
    setUserForm({ 
      name: '', 
      street: '',
      house_number: '',
      cpf: '',
      phone: '', 
      has_energy: true, 
      has_water: true, 
      energy_meters_count: 1, 
      water_meters_count: 1,
      energy_active: true,
      water_active: true
    });
  };

  const handleSaveUser = async () => {
    if (!userForm.name.trim()) {
      dialogAlert('O nome do morador/usuário é obrigatório.');
      return;
    }
    if (!userForm.phone.trim()) {
      dialogAlert('O telefone/WhatsApp é obrigatório.');
      return;
    }

    setIsSavingUser(true);
    try {
      const method = editingUser ? 'PUT' : 'POST';
      const url = editingUser ? `/api/chacara/users/${editingUser.id}` : '/api/chacara/users';
      const res = await fetchWithAuth(url, {
        method,
        body: JSON.stringify({
          ...userForm,
          name: userForm.name.trim(),
          street: userForm.street.trim(),
          house_number: userForm.house_number.trim(),
          cpf: userForm.cpf.trim(),
          phone: userForm.phone.trim()
        })
      });

      if (res.ok) {
        setUserForm({ 
          name: '', 
          street: '',
          house_number: '',
          cpf: '',
          phone: '', 
          has_energy: true, 
          has_water: true, 
          energy_meters_count: 1, 
          water_meters_count: 1,
          energy_active: true,
          water_active: true
        });
        setEditingUser(null);
        await fetchData();
        if (onDataUpdate) onDataUpdate();
        dialogAlert(editingUser ? 'Morador atualizado com sucesso!' : 'Morador cadastrado com sucesso!');
      } else {
        const errorData = await res.json().catch(() => ({ message: res.statusText }));
        dialogAlert(`Erro ao salvar morador: ${errorData.message || JSON.stringify(errorData)}`);
      }
    } catch (error) {
      console.error('Error saving user:', error);
      dialogAlert('Erro ao salvar morador. Verifique o console para mais detalhes.');
    } finally {
      setIsSavingUser(false);
    }
  };

  const handleDeleteUser = async (id: number) => {
    if (!(await dialogConfirm('Deseja realmente excluir este usuário?'))) return;
    try {
      const res = await fetchWithAuth(`/api/chacara/users/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchData();
        if (onDataUpdate) onDataUpdate();
      } else {
        const err = await res.json().catch(() => ({ message: res.statusText }));
        dialogAlert(`Erro ao excluir usuário: ${err.message || 'Erro desconhecido'}`);
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      dialogAlert('Erro de conexão ao excluir usuário.');
    }
  };

  const handleUserSelectForBill = (userId: string) => {
    const user = users.find(u => u.id === Number(userId));
    if (user) {
      const now = new Date();
      const readingDate = new Date(now.getFullYear(), now.getMonth() - 1, settings.default_reading_day);
      const dueDate = new Date(now.getFullYear(), now.getMonth(), settings.default_due_day);
      const currentMonthRef = billForm.month_reference;

      // Initialize energy readings
      const energyReadings = [];
      const energyCount = user.energy_meters_count || 1;
      for (let i = 0; i < energyCount; i++) {
        let prev = 0;
        if (user.energy_readings && user.energy_readings[i]) {
          prev = user.energy_readings[i].curr;
        } else if (i === 0) {
          prev = user.last_reading || 0;
        } else if (i === 1) {
          prev = user.last_reading_2 || 0;
        }
        energyReadings.push({ prev, curr: 0 });
      }

      // Initialize water readings
      const waterReadings = [];
      const waterCount = user.water_meters_count || 1;
      for (let i = 0; i < waterCount; i++) {
        let prev = 0;
        if (user.water_readings && user.water_readings[i]) {
          prev = user.water_readings[i].curr;
        } else if (i === 0) {
          prev = user.last_water_reading || 0;
        } else if (i === 1) {
          prev = user.last_water_reading_2 || 0;
        }
        waterReadings.push({ prev, curr: 0 });
      }

      setBillForm({
        ...billForm,
        user_id: userId,
        prev_reading: user.last_reading || 0,
        prev_reading_2: user.last_reading_2 || 0,
        curr_reading: 0,
        curr_reading_2: 0,
        kwh_value: settings.default_kwh,
        water_prev_reading: user.last_water_reading || 0,
        water_prev_reading_2: user.last_water_reading_2 || 0,
        water_curr_reading: 0,
        water_curr_reading_2: 0,
        water_value: settings.default_water_value,
        water_service_fee: settings.default_water_service_fee || 0,
        apportionment_value: settings.default_apportionment_value,
        include_apportionment: true,
        reading_date: readingDate.toISOString().split('T')[0],
        due_date: dueDate.toISOString().split('T')[0],
        month_reference: currentMonthRef,
        energy_readings: energyReadings,
        water_readings: waterReadings
      });
    } else {
      dialogAlert('Usuário não encontrado.');
    }
  };

  const handleClearBillForm = () => {
    setBillForm({
      user_id: '',
      month_reference: settings.default_month_reference || new Date().toISOString().slice(0, 7),
      reading_date: '',
      due_date: '',
      prev_reading: 0,
      curr_reading: 0,
      prev_reading_2: 0,
      curr_reading_2: 0,
      kwh_value: settings.default_kwh,
      water_prev_reading: 0,
      water_curr_reading: 0,
      water_prev_reading_2: 0,
      water_curr_reading_2: 0,
      water_value: settings.default_water_value,
      water_service_fee: settings.default_water_service_fee || 0,
      apportionment_value: settings.default_apportionment_value,
      include_apportionment: true,
      include_reserve_fund: true,
      status: 'pending',
      payment_date: '',
      energy_readings: [],
      water_readings: [],
      observations: ''
    });
    setEditingBill(null);
  };

  const handleSaveBill = async () => {
    console.log('DEBUG: handleSaveBill - users:', users);
    console.log('DEBUG: handleSaveBill - billForm.user_id:', billForm.user_id);
    const user = users.find(u => u.id === Number(billForm.user_id));
    console.log('DEBUG: handleSaveBill - found user:', user);
    const hasEnergy = user ? (user.has_energy !== false && user.energy_active !== false) : true;
    const hasWater = user ? (user.has_water !== false && user.water_active !== false) : true;

    if (!billForm.user_id) {
      dialogAlert('Selecione um usuário.');
      return;
    }

    if (hasEnergy && (!billForm.energy_readings || billForm.energy_readings.length === 0 || billForm.energy_readings[0].curr === undefined || billForm.energy_readings[0].curr === null)) {
      dialogAlert('Leitura atual de energia é obrigatória.');
      return;
    }

    if (hasWater && (!billForm.water_readings || billForm.water_readings.length === 0 || billForm.water_readings[0].curr === undefined || billForm.water_readings[0].curr === null)) {
      dialogAlert('Leitura atual de água é obrigatória.');
      return;
    }

    const consumption = billForm.energy_readings.reduce((acc, r) => acc + (r.curr - r.prev), 0);
    const waterConsumption = billForm.water_readings.reduce((acc, r) => acc + (r.curr - r.prev), 0);

    // Validation
    for (let i = 0; i < billForm.energy_readings.length; i++) {
      if (hasEnergy && billForm.energy_readings[i].curr < billForm.energy_readings[i].prev) {
        dialogAlert(`A leitura atual de energia (Padrão ${i + 1}) não pode ser menor que a anterior.`);
        return;
      }
    }
    for (let i = 0; i < billForm.water_readings.length; i++) {
      if (hasWater && billForm.water_readings[i].curr < billForm.water_readings[i].prev) {
        dialogAlert(`A leitura atual de água (Hidrômetro ${i + 1}) não pode ser menor que a anterior.`);
        return;
      }
    }

    const energyTotal = hasEnergy ? (consumption * billForm.kwh_value) : 0;
    const waterTotal = hasWater ? (waterConsumption * billForm.water_value) : 0;
    const apportionment = billForm.include_apportionment ? billForm.apportionment_value : 0;
    const reserveFund = billForm.include_reserve_fund ? settings.reserve_fund_value : 0;
    const waterServiceFee = hasWater ? (billForm.water_service_fee || 0) : 0;
    
    const total = Number((energyTotal + waterTotal + apportionment + reserveFund + waterServiceFee).toFixed(2));

    const payload = {
      ...billForm,
      chacara_user_id: Number(billForm.user_id),
      reserve_fund: reserveFund,
      water_service_fee: waterServiceFee,
      total: total,
      // Fallback for old columns
      prev_reading: billForm.energy_readings[0]?.prev || 0,
      curr_reading: billForm.energy_readings[0]?.curr || 0,
      prev_reading_2: billForm.energy_readings[1]?.prev || 0,
      curr_reading_2: billForm.energy_readings[1]?.curr || 0,
      water_prev_reading: billForm.water_readings[0]?.prev || 0,
      water_curr_reading: billForm.water_readings[0]?.curr || 0,
      water_prev_reading_2: billForm.water_readings[1]?.prev || 0,
      water_curr_reading_2: billForm.water_readings[1]?.curr || 0
    };

    try {
      const method = editingBill ? 'PUT' : 'POST';
      const url = editingBill ? `/api/chacara/bills/${editingBill.id}` : '/api/chacara/bills';
      const res = await fetchWithAuth(url, {
        method,
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const savedBill = await res.json();
        const wasEditing = !!editingBill;
        const targetId = savedBill.id;
        
        handleClearBillForm();
        // Update filter to show the month of the newly saved bill
        setFilterMonth(payload.month_reference);
        fetchData();
        if (onDataUpdate) onDataUpdate();
        
        const choice = await askOptions({
          title: 'Conta Salva',
          message: wasEditing ? 'Conta atualizada com sucesso!' : 'Conta lançada com sucesso!',
          options: [
            { label: 'Visualizar Extrato (PDF)', value: 'pdf' },
            { label: 'Enviar WhatsApp', value: 'whatsapp' },
            { label: 'Apenas salvar e continuar', value: 'continue' }
          ]
        });
        
        if (choice === 'pdf') {
          setInvoiceDetailsModal({ isOpen: true, bill: savedBill });
        } else if (choice === 'whatsapp') {
          sendWhatsApp(savedBill);
        }
        
        setHighlightedBillId(targetId);
      } else {
        const errorData = await res.json().catch(() => ({ message: res.statusText }));
        dialogAlert(`Erro ao salvar conta: ${errorData.message || JSON.stringify(errorData)}`);
      }
    } catch (error) {
      console.error('Error saving bill:', error);
      dialogAlert('Erro ao salvar conta. Verifique o console para mais detalhes.');
    }
  };

  const handleDeleteBill = async (id: number) => {
    if (!(await dialogConfirm('Deseja realmente excluir este lançamento?'))) return;
    try {
      const res = await fetchWithAuth(`/api/chacara/bills/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchData();
        if (onDataUpdate) onDataUpdate();
      } else {
        const err = await res.json().catch(() => ({ message: res.statusText }));
        dialogAlert(`Erro ao excluir lançamento: ${err.message || 'Erro desconhecido'}`);
      }
    } catch (error) {
      console.error('Error deleting bill:', error);
      dialogAlert('Erro de conexão ao excluir lançamento.');
    }
  };

  const handleSaveExpense = async () => {
    if (!expenseForm.description || !expenseForm.amount) {
      dialogAlert('Preencha a descrição e o valor da despesa.');
      return;
    }

    try {
      const url = editingExpense ? `/api/chacara/expenses/${editingExpense.id}` : '/api/chacara/expenses';
      const method = editingExpense ? 'PUT' : 'POST';
      
      const res = await fetchWithAuth(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(expenseForm)
      });
      
      if (res.ok) {
        setExpenseForm({
          month_reference: new Date().toISOString().slice(0, 7),
          description: '',
          category: 'manutencao',
          amount: 0,
          date: new Date().toISOString().split('T')[0],
          receipt_url: ''
        });
        setEditingExpense(null);
        fetchData();
        if (onDataUpdate) onDataUpdate();
      } else {
        const err = await res.json().catch(() => ({ message: res.statusText }));
        dialogAlert(`Erro ao salvar despesa: ${err.message || 'Erro desconhecido'}`);
      }
    } catch (error) {
      console.error('Error saving expense:', error);
      dialogAlert('Erro de conexão ao salvar despesa.');
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!(await dialogConfirm('Tem certeza que deseja excluir esta despesa?'))) return;
    try {
      const res = await fetchWithAuth(`/api/chacara/expenses/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchData();
        if (onDataUpdate) onDataUpdate();
      } else {
        const err = await res.json().catch(() => ({ message: res.statusText }));
        dialogAlert(`Erro ao excluir despesa: ${err.message || 'Erro desconhecido'}`);
      }
    } catch (error) {
      console.error('Error deleting expense:', error);
      dialogAlert('Erro de conexão ao excluir despesa.');
    }
  };

  const handleEditExpense = (expense: any) => {
    setEditingExpense(expense);
    setExpenseForm({
      month_reference: expense.month_reference || new Date().toISOString().slice(0, 7),
      description: expense.description,
      category: expense.category,
      amount: expense.amount,
      date: expense.date,
      receipt_url: expense.receipt_url || ''
    });
    if (setActiveTab) {
      setActiveTab('chacara_expenses');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      dialogAlert('O arquivo deve ter no máximo 50MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64String = event.target?.result as string;
      setExpenseForm(prev => ({ ...prev, receipt_url: base64String }));
    };
    reader.readAsDataURL(file);
  };

  const handleEditBill = (bill: ChacaraBill) => {
    setEditingBill(bill);
    
    const user = users.find(u => u.id === bill.chacara_user_id);
    const energyCount = user?.energy_meters_count || 1;
    const waterCount = user?.water_meters_count || 1;

    let energyReadings = [];
    try {
      energyReadings = typeof bill.energy_readings === 'string' ? JSON.parse(bill.energy_readings) : (bill.energy_readings || []);
    } catch (e) {
      energyReadings = [];
    }
    
    if (!Array.isArray(energyReadings) || energyReadings.length === 0) {
      energyReadings = [{ prev: bill.prev_reading || 0, curr: bill.curr_reading || 0 }];
      if (bill.curr_reading_2 || bill.prev_reading_2) {
        energyReadings.push({ prev: bill.prev_reading_2 || 0, curr: bill.curr_reading_2 || 0 });
      }
    }

    while (energyReadings.length < energyCount) {
      energyReadings.push({ prev: 0, curr: 0 });
    }

    let waterReadings = [];
    try {
      waterReadings = typeof bill.water_readings === 'string' ? JSON.parse(bill.water_readings) : (bill.water_readings || []);
    } catch (e) {
      waterReadings = [];
    }
    
    if (!Array.isArray(waterReadings) || waterReadings.length === 0) {
      waterReadings = [{ prev: bill.water_prev_reading || 0, curr: bill.water_curr_reading || 0 }];
      if (bill.water_curr_reading_2 || bill.water_prev_reading_2) {
        waterReadings.push({ prev: bill.water_prev_reading_2 || 0, curr: bill.water_curr_reading_2 || 0 });
      }
    }

    while (waterReadings.length < waterCount) {
      waterReadings.push({ prev: 0, curr: 0 });
    }

    setBillForm({
      user_id: String(bill.chacara_user_id),
      month_reference: bill.month_reference || '',
      reading_date: bill.reading_date ? String(bill.reading_date).split('T')[0].split(' ')[0] : '',
      due_date: bill.due_date ? String(bill.due_date).split('T')[0].split(' ')[0] : '',
      prev_reading: bill.prev_reading || 0,
      curr_reading: bill.curr_reading || 0,
      prev_reading_2: bill.prev_reading_2 || 0,
      curr_reading_2: bill.curr_reading_2 || 0,
      kwh_value: bill.kwh_value || 0,
      water_prev_reading: bill.water_prev_reading || 0,
      water_curr_reading: bill.water_curr_reading || 0,
      water_prev_reading_2: bill.water_prev_reading_2 || 0,
      water_curr_reading_2: bill.water_curr_reading_2 || 0,
      water_value: bill.water_value || 0,
      water_service_fee: bill.water_service_fee || 0,
      apportionment_value: bill.apportionment_value || 0,
      include_apportionment: bill.include_apportionment ?? true,
      include_reserve_fund: bill.include_reserve_fund ?? true,
      status: bill.status || 'pending',
      payment_date: bill.payment_date ? String(bill.payment_date).split('T')[0].split(' ')[0] : '',
      energy_readings: energyReadings,
      water_readings: waterReadings,
      observations: bill.observations || ''
    });
    // Change tab to main to show the form
    if (setActiveTab) {
      setActiveTab('chacara_main');
    }
    // Scroll to top of form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleToggleStatusClick = (bill: ChacaraBill) => {
    const defaultCategories = {
      reserve_fund: true,
      water_service_fee: true,
      water_total: true,
      energy_total: true,
      apportionment: true
    };
    
    const initialCategories = bill.paid_categories && Object.keys(bill.paid_categories).length > 0 
      ? bill.paid_categories 
      : defaultCategories;

    const cats = calculateBillCategories(bill);
    const items = [
      { key: 'reserve_fund', value: cats.reserve_fund },
      { key: 'water_service_fee', value: cats.water_service_fee },
      { key: 'water_total', value: cats.water_total },
      { key: 'energy_total', value: cats.energy_total },
      { key: 'apportionment', value: cats.apportionment }
    ];
    
    const initialAmount = items.reduce((sum, item) => sum + (initialCategories[item.key] ? item.value : 0), 0);

    setPaymentDateModal({ 
      isOpen: true, 
      bill, 
      date: bill.payment_date ? String(bill.payment_date).split('T')[0].split(' ')[0] : new Date().toISOString().split('T')[0],
      amountPaid: initialAmount,
      paidCategories: initialCategories,
      isDivergent: false
    });
  };

  const handleConfirmToggleStatus = async (bill: ChacaraBill, newStatus: 'pending' | 'paid' | 'partial', paymentDate: string | null, amountPaid: number = 0, paidCategories: Record<string, boolean> = {}, isDivergent: boolean = false) => {
    try {
      const finalStatus = amountPaid === 0 ? 'pending' : (amountPaid >= bill.total - 0.01 ? 'paid' : 'partial');
      const res = await fetchWithAuth(`/api/chacara/bills/${bill.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          ...bill,
          status: finalStatus,
          payment_date: paymentDate,
          amount_paid: amountPaid,
          paid_categories: paidCategories,
          is_divergent: isDivergent
        })
      });
      if (res.ok) {
        fetchData();
        if (onDataUpdate) onDataUpdate();
        setPaymentDateModal({ isOpen: false, bill: null, date: '', amountPaid: 0, paidCategories: {} });
      } else {
        const errorData = await res.json().catch(() => ({}));
        console.error('API Error:', errorData);
        dialogAlert(`Erro ao salvar o pagamento. Se você ainda não executou o comando SQL no Supabase, por favor execute:\n\nALTER TABLE chacara_bills ADD COLUMN IF NOT EXISTS amount_paid NUMERIC DEFAULT 0;\n\nDetalhes do erro: ${errorData.message || errorData.details || 'Erro desconhecido'}`);
      }
    } catch (error) {
      console.error('Error toggling status:', error);
      dialogAlert('Erro de conexão ao tentar salvar o pagamento.');
    }
  };

  const exportToPDF = async () => {
    const orientation = await askOptions({
      title: 'Formato do PDF',
      message: 'Como você deseja gerar este arquivo PDF?',
      options: [
        { label: 'Vertical (Retrato)', value: 'p' },
        { label: 'Horizontal (Paisagem)', value: 'l' }
      ]
    });
    if (!orientation) return;
    
    const tableData = filteredBills.map(bill => {
      const user = users.find(u => u.id === bill.chacara_user_id);
      const energyReadings = bill.energy_readings || [];
      const waterReadings = bill.water_readings || [];

      const consumption = energyReadings.length > 0
        ? energyReadings.reduce((acc, r) => acc + (r.curr - r.prev), 0)
        : (bill.curr_reading - bill.prev_reading) + ((bill.curr_reading_2 || 0) - (bill.prev_reading_2 || 0));
      const energyTotal = consumption * bill.kwh_value;
      
      const waterConsumption = waterReadings.length > 0
        ? waterReadings.reduce((acc, r) => acc + (r.curr - r.prev), 0)
        : (bill.water_curr_reading || 0) - (bill.water_prev_reading || 0) + ((bill.water_curr_reading_2 || 0) - (bill.water_prev_reading_2 || 0));
      const waterValueTotal = waterConsumption * (bill.water_value || 0);
      const waterServiceFee = bill.water_service_fee || 0;
      
      const apportionment = bill.include_apportionment ? (bill.apportionment_value || 0) : 0;
      const reserveFund = bill.include_reserve_fund ? (bill.reserve_fund || 0) : 0;
      
      const isPaid = bill.status === 'paid';
      const isPartial = bill.status === 'partial' || (!isPaid && (bill.amount_paid || 0) > 0);
      const amountPaid = isPaid ? bill.total : (bill.amount_paid || 0);
      const pendingAmount = isPaid ? 0 : (bill.total - amountPaid);
      
      return [
        user?.name || 'N/I',
        `R$ ${energyTotal.toFixed(2)}`,
        `R$ ${waterValueTotal.toFixed(2)}`,
        `R$ ${apportionment.toFixed(2)}`,
        `R$ ${reserveFund.toFixed(2)}`,
        `R$ ${waterServiceFee.toFixed(2)}`,
        `R$ ${bill.total.toFixed(2)}`,
        `R$ ${amountPaid.toFixed(2)}`,
        `R$ ${pendingAmount.toFixed(2)}`,
        isPaid ? 'PAGO' : isPartial ? 'PARCIAL' : 'PENDENTE',
        bill.payment_date ? new Date(bill.payment_date + 'T12:00:00').toLocaleDateString('pt-BR') : '-'
      ];
    });

    const rowStatuses = filteredBills.map(bill => {
      const isPaid = bill.status === 'paid';
      const isPartial = bill.status === 'partial' || (!isPaid && (bill.amount_paid || 0) > 0);
      return isPaid ? 'PAGO' : isPartial ? 'PARCIAL' : 'PENDENTE';
    });

    const pdfTotalToPay = filteredBills.reduce((acc, b) => acc + b.total, 0);
    const pdfTotalPaid = filteredBills.reduce((acc, b) => {
      const isPaid = b.status === 'paid';
      const amt = isPaid ? b.total : (b.amount_paid || 0);
      return acc + amt;
    }, 0);
    const pdfTotalPending = pdfTotalToPay - pdfTotalPaid;

    const summaryCards = [
      {
        label: 'TOTAL A PAGAR',
        value: `R$ ${pdfTotalToPay.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        textColor: '#1e293b'
      },
      {
        label: 'TOTAL PAGO',
        value: `R$ ${pdfTotalPaid.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        textColor: '#16a34a'
      },
      {
        label: 'TOTAL PENDENTE',
        value: `R$ ${pdfTotalPending.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        textColor: '#dc2626'
      }
    ];

    const totalMonth = filteredBills.reduce((acc, curr) => acc + curr.total, 0);

    await PdfService.exportTableToPDF(
      'Relatório de Energia - Chácara Vivendas da Serra',
      `Mês de Referência: ${filterMonth}`,
      ['Usuário', 'Energia', 'Água', 'Pag. Adv. e Cont.', 'Fundo Res.', 'Taxas', 'Total', 'Pago', 'Pendente', 'Status', 'Data Pag.'],
      tableData as string[][],
      `Total Geral do Mês: R$ ${totalMonth.toFixed(2)}`,
      orientation as 'p'|'l',
      `relatorio-energia-${filterMonth}`,
      'save',
      undefined,
      rowStatuses,
      summaryCards
    );
  };

  useEffect(() => {
    const handleExport = () => {
      if (activeTab === 'chacara_history') {
        exportToPDF();
      }
    };
    window.addEventListener('export-chacara-history', handleExport);
    return () => window.removeEventListener('export-chacara-history', handleExport);
  }, [activeTab, exportToPDF]);

  useEffect(() => {
    if (activeTab === 'chacara_history' && highlightedBillId) {
      setTimeout(() => {
        const element = document.getElementById(`bill-${highlightedBillId}`) || document.getElementById(`bill-mob-${highlightedBillId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          // Optional: clear the highlight after some time
          setTimeout(() => setHighlightedBillId(null), 5000);
        }
      }, 300);
    }
  }, [activeTab, highlightedBillId]);

  const handleSaveSettings = async () => {
    try {
      const res = await fetchWithAuth('/api/chacara/settings', {
        method: 'PUT',
        body: JSON.stringify(settingsForm)
      });

      if (res.ok) {
        setSettings(settingsForm);
        dialogAlert('Configurações salvas!');
      } else {
        const err = await res.json().catch(() => ({ message: res.statusText }));
        dialogAlert(`Erro ao salvar configurações: ${err.message || 'Erro desconhecido'}`);
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      dialogAlert('Erro de conexão ao salvar configurações.');
    }
  };

  const sendWhatsApp = (bill: ChacaraBill) => {
    const user = users.find(u => u.id === Number(bill.chacara_user_id));
    if (!user) {
      dialogAlert(`Usuário não encontrado para este lançamento. ID procurado: ${bill.chacara_user_id}`);
      return;
    }

    const msg = getBillWhatsAppMessage(bill, user, settings);
    const encodedMessage = encodeURIComponent(msg);
    const phone = formatWAPhone(user.phone);
    window.open(`https://wa.me/${phone}?text=${encodedMessage}`, '_blank');
  };

  const getBillWhatsAppMessage = (bill: ChacaraBill, user: ChacaraUser, settings: ChacaraSettings) => {
    const hasEnergy = user.has_energy !== false && user.energy_active !== false;
    const hasWater = user.has_water !== false && user.water_active !== false;

    const energyReadings = bill.energy_readings || [];
    const waterReadings = bill.water_readings || [];

    const consumption = energyReadings.length > 0 
      ? energyReadings.reduce((acc, r) => acc + (r.curr - r.prev), 0)
      : (bill.curr_reading - bill.prev_reading) + ((bill.curr_reading_2 || 0) - (bill.prev_reading_2 || 0));
    const energyTotal = consumption * bill.kwh_value;
    
    const waterConsumption = waterReadings.length > 0
      ? waterReadings.reduce((acc, r) => acc + (r.curr - r.prev), 0)
      : (bill.water_curr_reading || 0) - (bill.water_prev_reading || 0) + ((bill.water_curr_reading_2 || 0) - (bill.water_prev_reading_2 || 0));
    const waterServiceFee = bill.water_service_fee || 0;
    const waterTotal = (waterConsumption * (bill.water_value || 0)) + waterServiceFee;
    const apportionment = bill.include_apportionment ? (bill.apportionment_value || 0) : 0;
    const reserveFund = bill.include_reserve_fund ? (bill.reserve_fund || 0) : 0;

    const [year, month] = bill.month_reference.split('-');
    const monthName = new Date(Number(year), Number(month) - 1).toLocaleString('pt-BR', { month: 'long' });
    const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);

    const greeting = getGreeting();
    const firstName = getFirstName(user.name) || user.name;
    let message = `${greeting}, ${firstName}!
Segue a conta referente à Associação Comunitária Vivendas da Serra – ${capitalizedMonth}/${year}.

Data da leitura: ${new Date(bill.reading_date + 'T12:00:00').toLocaleDateString('pt-BR')}

*Energia*`;

    if (hasEnergy) {
      if (energyReadings.length > 1) {
        energyReadings.forEach((r, idx) => {
          message += `\n*Padrão ${idx + 1}*
Leitura anterior: ${Number(r.prev).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
Leitura atual: ${Number(r.curr).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
Consumo: ${Number(r.curr - r.prev).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} kWh\n`;
        });
        message += `\nConsumo Total: ${Number(consumption).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} kWh`;
      } else if (energyReadings.length === 1) {
        message += `
Leitura anterior: ${Number(energyReadings[0].prev).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
Leitura atual: ${Number(energyReadings[0].curr).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
Consumo: ${Number(consumption).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} kWh`;
      }
      message += `\nValor do kWh: R$ ${Number(bill.kwh_value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
Subtotal: R$ ${Number(energyTotal).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    } else {
      message += `\n(Não aplicável)`;
    }

    message += `\n\n*Água*`;
    if (hasWater) {
      if (waterReadings.length > 1) {
        waterReadings.forEach((r, idx) => {
          message += `\n*Hidrômetro ${idx + 1}*
Leitura anterior: ${Number(r.prev).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
Leitura atual: ${Number(r.curr).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
Consumo: ${Number(r.curr - r.prev).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} m³\n`;
        });
        message += `\nConsumo Total: ${Number(waterConsumption).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} m³`;
      } else if (waterReadings.length === 1) {
        message += `
Leitura anterior: ${Number(waterReadings[0].prev).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
Leitura atual: ${Number(waterReadings[0].curr).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
Consumo: ${Number(waterConsumption).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} m³`;
      }
      message += `
Valor do m³: R$ ${Number(bill.water_value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
Prestador de serviço: R$ ${Number(waterServiceFee).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
Subtotal: R$ ${Number(waterTotal).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    } else {
      message += `\n(Não aplicável)`;
    }

    message += `\n\nFundo de reserva: R$ ${reserveFund > 0 ? Number(reserveFund).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ' — '}`;
    message += `\nPag. Adv. e Contador: R$ ${Number(apportionment).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    
    message += `\n\n*Data de vencimento: ${new Date(bill.due_date + 'T12:00:00').toLocaleDateString('pt-BR')}*`;
    message += `\n\n*Total a pagar: R$ ${Number(bill.total).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}*`;

    if (bill.observations) {
      message += `\n\nObservações: ${bill.observations}`;
    }

    if (settings.whatsapp_observation) {
      message += `\n\n${settings.whatsapp_observation}`;
    }
    
    return message;
  };

  const sendPendingSummaryWhatsApp = (user: ChacaraUser, pendingBills: ChacaraBill[]) => {
    if (!user.phone) {
      dialogAlert('Usuário não possui telefone cadastrado.');
      return;
    }

    const message = getPendingSummaryWhatsAppMessage(user, pendingBills, settings);
    const encodedMessage = encodeURIComponent(message);
    const phone = formatWAPhone(user.phone);
    window.open(`https://wa.me/${phone}?text=${encodedMessage}`, '_blank');
  };

  const getPendingSummaryWhatsAppMessage = (user: ChacaraUser, pendingBills: ChacaraBill[], settings: ChacaraSettings) => {
    const totalPending = pendingBills.reduce((acc, bill) => acc + (bill.total - (bill.amount_paid || 0)), 0);
    const greeting = getGreeting();
    const firstName = getFirstName(user.name) || user.name;
    
    let message = `${greeting}, ${firstName}!
Sou da Associação Comunitária Vivendas da Serra.
Verifiquei aqui que constam valores pendentes em seu nome acumulados.

*Resumo de Pendências:*
`;

    pendingBills.forEach(bill => {
      const [year, month] = bill.month_reference.split('-');
      const monthName = new Date(Number(year), Number(month) - 1).toLocaleString('pt-BR', { month: 'long' });
      const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);
      const pendingPart = bill.total - (bill.amount_paid || 0);
      
      message += `\n• ${capitalizedMonth}/${year}: R$ ${pendingPart.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      if (bill.amount_paid && bill.amount_paid > 0) {
        message += ` (Pago: R$ ${bill.amount_paid.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`;
      }
    });

    message += `\n\n*Total Acumulado: R$ ${totalPending.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}*`;
    message += `\n\nPor favor, entre em contato para regularizarmos esses valores. Caso já tenha realizado o pagamento, por favor envie o comprovante.`;

    if (settings.whatsapp_observation) {
      message += `\n\n${settings.whatsapp_observation}`;
    }
    
    return message;
  };

  const generateLancamentos = (): Lancamento[] => {
    const lancamentos: Lancamento[] = [];

    bills.forEach(bill => {
      const isPaid = bill.status === 'paid';
      const isPartial = bill.status === 'partial';

      const fundoReserva = bill.include_reserve_fund ? (bill.reserve_fund || 0) : 0;
      const rateio = bill.include_apportionment ? (bill.apportionment_value || 0) : 0;
      const prestador = bill.water_service_fee || 0;

      const energyConsumption = bill.energy_readings && bill.energy_readings.length > 0
        ? bill.energy_readings.reduce((acc, r) => acc + (r.curr - r.prev), 0)
        : (bill.curr_reading || 0) - (bill.prev_reading || 0) + ((bill.curr_reading_2 || 0) - (bill.prev_reading_2 || 0));
      const energia = energyConsumption * (bill.kwh_value || 0);

      const waterConsumption = bill.water_readings && bill.water_readings.length > 0
        ? bill.water_readings.reduce((acc, r) => acc + (r.curr - r.prev), 0)
        : (bill.water_curr_reading || 0) - (bill.water_prev_reading || 0) + ((bill.water_curr_reading_2 || 0) - (bill.water_prev_reading_2 || 0));
      const agua = waterConsumption * (bill.water_value || 0);

      const calculatedTotal = fundoReserva + rateio + prestador + agua + energia;

      const cats = [
        { cat: 'fundo_reserva', val: fundoReserva },
        { cat: 'rateio', val: rateio },
        { cat: 'prestador', val: prestador },
        { cat: 'agua', val: agua },
        { cat: 'energia', val: energia },
      ];

      const amountPaid = bill.amount_paid || 0;
      const hasPaidCategories = bill.paid_categories && Object.keys(bill.paid_categories).length > 0;

      cats.forEach(c => {
        let valorPagoCat = 0;
        let statusCat: 'pago' | 'pendente' | 'parcial' = 'pendente';

        if (c.val <= 0) {
          valorPagoCat = 0;
          statusCat = 'pago';
        } else if (isPaid) {
          valorPagoCat = c.val;
          statusCat = 'pago';
        } else if (isPartial && hasPaidCategories) {
          const keyMap: Record<string, string> = {
            'fundo_reserva': 'reserve_fund',
            'rateio': 'apportionment',
            'prestador': 'water_service_fee',
            'agua': 'water_total',
            'energia': 'energy_total'
          };
          const isCatPaid = bill.paid_categories![keyMap[c.cat]];
          valorPagoCat = isCatPaid ? c.val : 0;
          statusCat = isCatPaid ? 'pago' : 'pendente';
        } else if (isPartial && !hasPaidCategories) {
          const ratio = calculatedTotal > 0 ? amountPaid / calculatedTotal : 0;
          valorPagoCat = c.val * ratio;
          statusCat = 'parcial';
        } else {
          valorPagoCat = 0;
          statusCat = 'pendente';
        }

        const user = users.find(u => u.id === bill.chacara_user_id);
        const userName = user ? user.name : 'Desconhecido';

        lancamentos.push({
          id: `${bill.id}-${c.cat}`,
          data: bill.due_date,
          mes_referencia: bill.month_reference,
          categoria: c.cat as any,
          tipo: 'receita',
          valor: c.val,
          status: statusCat,
          valor_pago: valorPagoCat,
          descricao: userName,
          is_divergent: bill.is_divergent || false
        });
      });
    });

    expenses.forEach(exp => {
      lancamentos.push({
        id: exp.id,
        data: exp.date,
        mes_referencia: exp.month_reference,
        categoria: 'despesa_geral',
        tipo: 'despesa',
        valor: Number(exp.amount),
        status: 'pago',
        valor_pago: Number(exp.amount),
        descricao: exp.description
      });
    });

    return lancamentos;
  };

  const lancamentos = generateLancamentos();

  return (
    <div className="space-y-6">
      <AnimatePresence mode="wait">
        {activeTab === 'chacara_dashboard' && (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.15, ease: "easeOut" }}
          >
            <StrictFinanceDashboard 
              lancamentos={lancamentos} 
              filterMonth={filterMonth}
              setFilterMonth={setFilterMonth}
              onRefresh={fetchData}
            />
          </motion.div>
        )}
        {activeTab === 'chacara_pending' && (
          <motion.div
            key="chacara_pending"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.15, ease: "easeOut" }}
          >
            <Card title="Relatório de Pendências Acumuladas" icon={AlertCircle}>
              <div className="space-y-6">
                <div className="bg-gray-50/50 p-6 rounded-3xl border border-gray-100 mb-8 space-y-6">
                  <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 items-end">
                      {/* Search */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Buscar Morador</label>
                        <div className="relative group">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 transition-colors" size={16} />
                          <input 
                            type="text" 
                            placeholder="Nome ou telefone..."
                            value={pendingSearch}
                            onChange={(e) => setPendingSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-2xl text-xs focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none"
                          />
                        </div>
                      </div>

                      {/* Sort */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Ordenar Lista</label>
                        <select
                          value={pendingSort}
                          onChange={(e) => setPendingSort(e.target.value as 'name' | 'balance')}
                          className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-2xl text-xs focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none"
                        >
                          <option value="name">Por Nome (A-Z)</option>
                          <option value="balance">Por Saldo (Maior)</option>
                        </select>
                      </div>

                      <div className="flex flex-col items-start lg:items-end gap-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Resumo Financeiro</label>
                        <div className="bg-amber-100 text-amber-800 px-6 py-2.5 rounded-2xl text-xs font-black border border-amber-200 shadow-sm whitespace-nowrap">
                          Total em Aberto: R$ {users.reduce((acc, user) => {
                            const userBills = bills.filter(b => {
                              if (b.chacara_user_id !== user.id || b.status === 'paid') return false;
                              const [y, m] = b.month_reference.split('-');
                              if (detailsYearFilter !== 'all' && y !== detailsYearFilter) return false;
                              if (detailsMonthFilter !== 'all' && m !== detailsMonthFilter) return false;
                              return true;
                            });
                            return acc + userBills.reduce((sum, b) => sum + (b.total - (b.amount_paid || 0)), 0);
                          }, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start border-t border-gray-100 pt-6">
                    <div className="lg:col-span-12 space-y-2">
                       <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Selecione o Período de Pendência</label>
                       <div className="flex flex-wrap gap-3">
                         <MonthYearPicker 
                           year={detailsYearFilter}
                           month={detailsMonthFilter}
                           onSelect={(y, m) => {
                             setDetailsYearFilter(y);
                             setDetailsMonthFilter(m);
                           }}
                         />
                       </div>
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto -mx-5 md:mx-0">
                  <table className="w-full text-left border-collapse min-w-[600px]">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Morador</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Meses Devendo</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Total Pendente</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users
                        .filter(user => {
                          const pending = bills.filter(b => {
                            if (b.chacara_user_id !== user.id || b.status === 'paid') return false;
                            const [y, m] = b.month_reference.split('-');
                            if (detailsYearFilter !== 'all' && y !== detailsYearFilter) return false;
                            if (detailsMonthFilter !== 'all' && m !== detailsMonthFilter) return false;
                            return true;
                          });
                          if (pending.length === 0) return false;
                          if (pendingSearch) {
                            return user.name.toLowerCase().includes(pendingSearch.toLowerCase()) || 
                                   user.phone.includes(pendingSearch);
                          }
                          return true;
                        })
                        .sort((a, b) => {
                          if (pendingSort === 'name') return a.name.localeCompare(b.name);
                          const balanceA = bills.filter(b => {
                            if (b.chacara_user_id !== a.id || b.status === 'paid') return false;
                            const [y, m] = b.month_reference.split('-');
                            if (detailsYearFilter !== 'all' && y !== detailsYearFilter) return false;
                            if (detailsMonthFilter !== 'all' && m !== detailsMonthFilter) return false;
                            return true;
                          }).reduce((sum, b) => sum + (b.total - (b.amount_paid || 0)), 0);

                          const balanceB = bills.filter(b => {
                            if (b.chacara_user_id !== b.id || b.status === 'paid') return false;
                            const [y, m] = b.month_reference.split('-');
                            if (detailsYearFilter !== 'all' && y !== detailsYearFilter) return false;
                            if (detailsMonthFilter !== 'all' && m !== detailsMonthFilter) return false;
                            return true;
                          }).reduce((sum, b) => sum + (b.total - (b.amount_paid || 0)), 0);
                          
                          return balanceB - balanceA;
                        })
                        .length > 0 ? (
                        users
                          .filter(user => {
                            const pending = bills.filter(b => {
                              if (b.chacara_user_id !== user.id || b.status === 'paid') return false;
                              const [y, m] = b.month_reference.split('-');
                              if (detailsYearFilter !== 'all' && y !== detailsYearFilter) return false;
                              if (detailsMonthFilter !== 'all' && m !== detailsMonthFilter) return false;
                              return true;
                            });
                            if (pending.length === 0) return false;
                            if (pendingSearch) {
                              return user.name.toLowerCase().includes(pendingSearch.toLowerCase()) || 
                                     user.phone.includes(pendingSearch);
                            }
                            return true;
                          })
                          .sort((userA, userB) => {
                            if (pendingSort === 'name') return userA.name.localeCompare(userB.name);
                            const balanceA = bills.filter(b => {
                              if (b.chacara_user_id !== userA.id || b.status === 'paid') return false;
                              const [y, m] = b.month_reference.split('-');
                              if (detailsYearFilter !== 'all' && y !== detailsYearFilter) return false;
                              if (detailsMonthFilter !== 'all' && m !== detailsMonthFilter) return false;
                              return true;
                            }).reduce((sum, b) => sum + (b.total - (b.amount_paid || 0)), 0);

                            const balanceB = bills.filter(b => {
                              if (b.chacara_user_id !== userB.id || b.status === 'paid') return false;
                              const [y, m] = b.month_reference.split('-');
                              if (detailsYearFilter !== 'all' && y !== detailsYearFilter) return false;
                              if (detailsMonthFilter !== 'all' && m !== detailsMonthFilter) return false;
                              return true;
                            }).reduce((sum, b) => sum + (b.total - (b.amount_paid || 0)), 0);
                            
                            return balanceB - balanceA;
                          })
                          .map(user => {
                            const pendingBills = bills.filter(b => {
                              if (b.chacara_user_id !== user.id || b.status === 'paid') return false;
                              const [y, m] = b.month_reference.split('-');
                              if (detailsYearFilter !== 'all' && y !== detailsYearFilter) return false;
                              if (detailsMonthFilter !== 'all' && m !== detailsMonthFilter) return false;
                              return true;
                            }).sort((a, b) => a.month_reference.localeCompare(b.month_reference));
                            
                            const totalPending = pendingBills.reduce((acc, b) => acc + (b.total - (b.amount_paid || 0)), 0);

                            return (
                              <tr key={user.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-all">
                                <td className="px-6 py-4">
                                  <div className="font-bold text-gray-800">{user.name}</div>
                                  <div className="text-xs text-gray-500">{user.phone}</div>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="flex flex-wrap gap-1">
                                    {pendingBills.map(b => {
                                      const [y, m] = b.month_reference.split('-');
                                      return (
                                        <button 
                                          key={b.id} 
                                          onClick={() => handleToggleStatusClick(b)}
                                          className="bg-red-50 text-red-600 px-2 py-0.5 rounded-md text-[10px] font-bold border border-red-100 hover:bg-red-100 transition-all flex items-center gap-1 group"
                                          title="Dar baixa neste pagamento"
                                        >
                                          {m}/{y}
                                          <Check size={10} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </button>
                                      );
                                    })}
                                  </div>
                                </td>
                                <td className="px-6 py-4 text-right font-black text-red-600">
                                  R$ {totalPending.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                                <td className="px-6 py-4 text-right">
                                  <div className="flex flex-col sm:flex-row items-center justify-end gap-2">
                                    <button
                                      onClick={() => setPendingDetailsModal({ isOpen: true, user })}
                                      className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-600 px-4 py-2 rounded-xl text-xs font-bold hover:bg-indigo-100 transition-all shadow-sm active:scale-95"
                                    >
                                      <Eye size={14} />
                                      Ver Detalhes
                                    </button>
                                    <button
                                      onClick={() => sendPendingSummaryWhatsApp(user, pendingBills)}
                                      className="inline-flex items-center gap-2 bg-green-500 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-green-600 transition-all shadow-sm active:scale-95"
                                    >
                                      <WhatsAppIcon size={14} />
                                      Enviar Resumo
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                      ) : (
                        <tr>
                          <td colSpan={4} className="px-6 py-12 text-center text-gray-400">
                            <CheckCircle size={48} className="mx-auto mb-2 opacity-20 text-emerald-500" />
                            <p className="font-medium text-gray-500">Nenhuma pendência encontrada com esses filtros.</p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {activeTab === 'chacara_messages' && (
          <motion.div
            key="messages"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.15, ease: "easeOut" }}
          >
            <Card title="Mensagem em Massa (WhatsApp)" icon={WhatsAppIcon}>
              <div className="space-y-4">
                <p className="text-sm text-gray-500">
                  Crie uma mensagem padrão para enviar aos seus usuários da chácara. Use <span className="font-bold text-indigo-600">{'{nome}'}</span> e <span className="font-bold text-indigo-600">{'{observacoes}'}</span> para inserir as informações automaticamente.
                </p>
                
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">Mensagem</label>
                  <textarea
                    value={whatsappChacaraTemplate}
                    onChange={(e) => setWhatsappChacaraTemplate(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm resize-y min-h-[120px]"
                    placeholder="Olá {nome}, tudo bem?"
                  />
                  <button
                    onClick={() => {
                      localStorage.setItem('whatsappChacaraTemplate', whatsappChacaraTemplate);
                      dialogAlert('Mensagem salva como padrão!');
                    }}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                  >
                    Salvar como padrão
                  </button>
                </div>

                <div className="pt-4 border-t border-gray-100">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="font-bold text-gray-800">Selecione os usuários para enviar:</h4>
                    {sentChacaraMessages.length > 0 && (
                      <button
                        onClick={() => setSentChacaraMessages([])}
                        className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
                      >
                        Reiniciar Envios
                      </button>
                    )}
                  </div>
                  <div className="space-y-3">
                    {users.length > 0 ? (
                      users.map(user => {
                        const userBill = bills.find(b => Number(b.chacara_user_id) === user.id);
                        const firstName = getFirstName(user.name) || user.name;
                        const message = `${getGreeting()}! ` + whatsappChacaraTemplate
                          .replace(/{primeiro_nome}/g, firstName)
                          .replace(/{nome}/g, firstName)
                          .replace(/{nome_completo}/g, user.name)
                          .replace(/{observacoes}/g, userBill?.observations || '');
                        const whatsappLink = user.phone ? `https://wa.me/${formatWAPhone(user.phone)}?text=${encodeURIComponent(message)}` : '#';
                        const hasSent = sentChacaraMessages.includes(String(user.id));
                        
                        return (
                          <div key={user.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100 gap-4">
                            <div>
                              <h5 className="font-bold text-gray-800">{user.name}</h5>
                              <p className="text-xs text-gray-500">{user.phone || 'Sem telefone'}</p>
                            </div>
                            <div className="flex-shrink-0">
                              <a
                                href={whatsappLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={() => {
                                  if (user.phone && !hasSent) {
                                    setSentChacaraMessages(prev => [...prev, String(user.id)]);
                                  }
                                }}
                                className={cn(
                                  "flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-colors",
                                  !user.phone 
                                    ? "bg-gray-100 text-gray-400 cursor-not-allowed pointer-events-none"
                                    : hasSent
                                      ? "bg-gray-200 text-gray-600 hover:bg-gray-300"
                                      : "bg-green-500 text-white hover:bg-green-600 shadow-sm"
                                )}
                              >
                                {hasSent ? <CheckCircle2 size={16} /> : <WhatsAppIcon size={16} />}
                                {hasSent ? 'Enviado' : 'Enviar Mensagem'}
                              </a>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center py-6 text-gray-400">
                        <p>Nenhum usuário cadastrado.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
        {activeTab === 'chacara_users' && (() => {
          const totalUsersCount = users.length;
          const activeEnergyUsersCount = users.filter(u => u.has_energy !== false && u.energy_active !== false).length;
          const totalEnergyMetersCount = users.reduce((acc, u) => acc + (u.has_energy !== false ? (u.energy_meters_count || 1) : 0), 0);
          const activeWaterUsersCount = users.filter(u => u.has_water !== false && u.water_active !== false).length;
          const totalWaterMetersCount = users.reduce((acc, u) => acc + (u.has_water !== false ? (u.water_meters_count || 1) : 0), 0);
          const inactiveServicesCount = users.filter(u => (u.has_energy !== false && u.energy_active === false) || (u.has_water !== false && u.water_active === false)).length;

          const filteredUsersList = users.filter(user => {
            const queryNorm = normalizeSearchText(userSearchTerm);
            if (queryNorm) {
              const queryTokens = queryNorm.split(/\s+/).filter(Boolean);
              const userNameNorm = normalizeSearchText(user.name);
              const userPhoneNorm = normalizeSearchText(user.phone);
              const userPhoneDigits = extractDigits(user.phone);
              const userStreetNorm = normalizeSearchText(user.street || user.rua);
              const userHouseNorm = normalizeSearchText(user.house_number || user.casa);
              const userHouseDigits = extractDigits(user.house_number || user.casa);
              const userCpfNorm = normalizeSearchText(user.cpf);
              const userCpfDigits = extractDigits(user.cpf);

              const addressAliases = [
                userStreetNorm,
                userHouseNorm ? `casa ${userHouseNorm}` : '',
                userHouseNorm ? `chacara ${userHouseNorm}` : '',
                userHouseNorm ? `lote ${userHouseNorm}` : '',
                userHouseNorm ? 'casa' : '',
                userHouseNorm ? 'chacara' : '',
                userHouseNorm ? 'lote' : ''
              ].filter(Boolean).join(' ');

              const combinedUserBlock = [
                userNameNorm,
                userPhoneNorm,
                userStreetNorm,
                userHouseNorm,
                userCpfNorm,
                addressAliases,
                user.id.toString()
              ].join(' ');

              const matchesSearch = queryTokens.every(token => {
                const tokenDigits = extractDigits(token);
                if (combinedUserBlock.includes(token)) return true;
                if (tokenDigits.length >= 3 && userCpfDigits && userCpfDigits.includes(tokenDigits)) return true;
                if (tokenDigits.length >= 3 && userPhoneDigits && userPhoneDigits.includes(tokenDigits)) return true;
                if (userHouseDigits && userHouseDigits === tokenDigits) return true;
                return false;
              });

              if (!matchesSearch) return false;
            }

            if (userServiceFilter === 'energy') {
              return user.has_energy !== false && user.energy_active !== false;
            }
            if (userServiceFilter === 'water') {
              return user.has_water !== false && user.water_active !== false;
            }
            if (userServiceFilter === 'inactive') {
              return (user.has_energy !== false && user.energy_active === false) || (user.has_water !== false && user.water_active === false);
            }
            return true;
          }).sort((a, b) => {
            if (userSortField === 'street') {
              const sA = (a.street || a.rua || '').toLowerCase();
              const sB = (b.street || b.rua || '').toLowerCase();
              return userSortOrder === 'asc' ? sA.localeCompare(sB) : sB.localeCompare(sA);
            }
            if (userSortField === 'house_number') {
              const hA = (a.house_number || a.casa || '').toLowerCase();
              const hB = (b.house_number || b.casa || '').toLowerCase();
              return userSortOrder === 'asc' ? hA.localeCompare(hB, undefined, { numeric: true }) : hB.localeCompare(hA, undefined, { numeric: true });
            }
            if (userSortField === 'cpf') {
              const cA = (a.cpf || '').toLowerCase();
              const cB = (b.cpf || '').toLowerCase();
              return userSortOrder === 'asc' ? cA.localeCompare(cB) : cB.localeCompare(cA);
            }
            if (userSortField === 'phone') {
              const pA = (a.phone || '').toLowerCase();
              const pB = (b.phone || '').toLowerCase();
              return userSortOrder === 'asc' ? pA.localeCompare(pB) : pB.localeCompare(pA);
            }
            const nA = a.name.toLowerCase();
            const nB = b.name.toLowerCase();
            return userSortOrder === 'asc' ? nA.localeCompare(nB) : nB.localeCompare(nA);
          });

          return (
            <motion.div
              key="users"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }} 
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="space-y-6"
            >
              {/* Top Stats / KPI Cards - Minimalist & Modern */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
                <div className="bg-white rounded-xl p-4 sm:p-5 border border-gray-100 shadow-xs">
                  <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block mb-1">Total de Moradores</span>
                  <div className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">{totalUsersCount}</div>
                  <span className="text-xs text-gray-500 mt-1 block">titulares cadastrados</span>
                </div>

                <div className="bg-white rounded-xl p-4 sm:p-5 border border-gray-100 shadow-xs">
                  <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block mb-1">Energia Elétrica</span>
                  <div className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
                    {activeEnergyUsersCount} <span className="text-sm font-normal text-gray-400">ativos</span>
                  </div>
                  <span className="text-xs text-gray-500 mt-1 block">{totalEnergyMetersCount} padrão(ões) totais</span>
                </div>

                <div className="bg-white rounded-xl p-4 sm:p-5 border border-gray-100 shadow-xs">
                  <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block mb-1">Água Encanada</span>
                  <div className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
                    {activeWaterUsersCount} <span className="text-sm font-normal text-gray-400">ativos</span>
                  </div>
                  <span className="text-xs text-gray-500 mt-1 block">{totalWaterMetersCount} hidrômetro(s) totais</span>
                </div>

                <div className="bg-white rounded-xl p-4 sm:p-5 border border-gray-100 shadow-xs">
                  <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block mb-1">Pontos Desligados</span>
                  <div className={`text-2xl sm:text-3xl font-bold tracking-tight ${inactiveServicesCount > 0 ? 'text-rose-600' : 'text-gray-900'}`}>
                    {inactiveServicesCount}
                  </div>
                  <span className="text-xs text-gray-500 mt-1 block">
                    {inactiveServicesCount === 0 ? 'todas as ligações ativas' : 'pontos com corte/desligados'}
                  </span>
                </div>
              </div>

              {/* Main Content: Form (left) + List (right) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* FORM CADASTRO */}
                <div ref={userFormRef} className="lg:col-span-5 bg-white rounded-xl shadow-xs border border-gray-100 overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-gray-900 text-base">
                        {editingUser ? 'Editar Morador' : 'Novo Morador'}
                      </h3>
                      <p className="text-xs text-gray-500">
                        {editingUser ? 'Atualize os dados e pontos de fornecimento' : 'Preencha os dados do morador da chácara'}
                      </p>
                    </div>
                    {editingUser && (
                      <button
                        type="button"
                        onClick={handleCancelEditUser}
                        className="text-xs text-gray-500 hover:text-gray-800 font-medium px-2.5 py-1 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        Cancelar
                      </button>
                    )}
                  </div>

                  {editingUser && (
                    <div className="mx-6 mt-4 px-3.5 py-2.5 bg-amber-50/70 border border-amber-200/60 rounded-lg flex items-center justify-between text-xs text-amber-900">
                      <span>Editando cadastro de <strong className="font-semibold">{editingUser.name}</strong></span>
                      <span className="text-[11px] font-mono text-amber-700">#{editingUser.id}</span>
                    </div>
                  )}

                  <div className="p-6 space-y-4">
                    {/* Nome do Morador */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                        Nome Completo <span className="text-rose-500">*</span>
                      </label>
                      <input 
                        type="text"
                        value={userForm.name}
                        onChange={e => setUserForm({ ...userForm, name: e.target.value })}
                        className="w-full px-3.5 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all placeholder:text-gray-400"
                        placeholder="Nome do morador"
                      />
                    </div>

                    {/* Localização na Chácara: Rua e Casa */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                          Rua / Alameda
                        </label>
                        <input 
                          type="text"
                          value={userForm.street}
                          onChange={e => setUserForm({ ...userForm, street: e.target.value })}
                          className="w-full px-3.5 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all placeholder:text-gray-400"
                          placeholder="Ex: Rua 03, Alameda..."
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                          Casa / Lote
                        </label>
                        <input 
                          type="text"
                          value={userForm.house_number}
                          onChange={e => setUserForm({ ...userForm, house_number: e.target.value })}
                          className="w-full px-3.5 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all placeholder:text-gray-400"
                          placeholder="Ex: Casa 14, Lote 2"
                        />
                      </div>
                    </div>

                    {/* Identificação e Contato: CPF e Telefone */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                          CPF
                        </label>
                        <input 
                          type="text"
                          value={userForm.cpf}
                          onChange={e => handleUserCpfChange(e.target.value)}
                          className="w-full px-3.5 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all placeholder:text-gray-400 font-mono"
                          placeholder="000.000.000-00"
                          maxLength={14}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                          Telefone (WhatsApp) <span className="text-rose-500">*</span>
                        </label>
                        <input 
                          type="text"
                          value={userForm.phone}
                          onChange={e => handleUserPhoneChange(e.target.value)}
                          className="w-full px-3.5 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all placeholder:text-gray-400 font-mono"
                          placeholder="(00) 00000-0000"
                          maxLength={15}
                        />
                      </div>
                    </div>

                    {/* Serviços de Medição */}
                    <div className="pt-2 border-t border-gray-100 space-y-3">
                      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Pontos de Medição
                      </div>

                      {/* Energia */}
                      <div className="p-3.5 rounded-lg border border-gray-200 bg-gray-50/40">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm font-semibold text-gray-800">Energia Elétrica</div>
                            <div className="text-xs text-gray-500">Controle de padrões e consumo</div>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                              type="checkbox"
                              checked={userForm.has_energy}
                              onChange={e => setUserForm({ ...userForm, has_energy: e.target.checked })}
                              className="sr-only peer"
                            />
                            <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                          </label>
                        </div>

                        {userForm.has_energy && (
                          <div className="mt-3 pt-3 border-t border-gray-200/70 space-y-2.5">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-gray-600">Status</span>
                              <div className="inline-flex rounded-lg p-0.5 bg-gray-200/70 text-xs">
                                <button
                                  type="button"
                                  onClick={() => setUserForm({ ...userForm, energy_active: true })}
                                  className={`px-3 py-1 rounded-md font-medium transition-all ${
                                    userForm.energy_active
                                      ? 'bg-white text-gray-900 shadow-2xs'
                                      : 'text-gray-600 hover:text-gray-900'
                                  }`}
                                >
                                  Ligado
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setUserForm({ ...userForm, energy_active: false })}
                                  className={`px-3 py-1 rounded-md font-medium transition-all ${
                                    !userForm.energy_active
                                      ? 'bg-white text-rose-600 shadow-2xs'
                                      : 'text-gray-600 hover:text-gray-900'
                                  }`}
                                >
                                  Desligado
                                </button>
                              </div>
                            </div>

                            <div className="flex items-center justify-between">
                              <span className="text-xs text-gray-600">Padrões</span>
                              <div className="flex items-center border border-gray-200 bg-white rounded-lg overflow-hidden">
                                <button
                                  type="button"
                                  disabled={(userForm.energy_meters_count || 1) <= 1}
                                  onClick={() => setUserForm({ ...userForm, energy_meters_count: Math.max(1, (userForm.energy_meters_count || 1) - 1) })}
                                  className="px-2.5 py-1 text-gray-600 hover:bg-gray-50 disabled:opacity-30 text-xs font-semibold"
                                >
                                  -
                                </button>
                                <span className="px-3 py-1 text-xs font-semibold text-gray-800 min-w-[60px] text-center bg-gray-50/50">
                                  {userForm.energy_meters_count || 1}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setUserForm({ ...userForm, energy_meters_count: (userForm.energy_meters_count || 1) + 1 })}
                                  className="px-2.5 py-1 text-gray-600 hover:bg-gray-50 text-xs font-semibold"
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Água */}
                      <div className="p-3.5 rounded-lg border border-gray-200 bg-gray-50/40">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm font-semibold text-gray-800">Água Encanada</div>
                            <div className="text-xs text-gray-500">Controle de hidrômetros e consumo</div>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                              type="checkbox"
                              checked={userForm.has_water}
                              onChange={e => setUserForm({ ...userForm, has_water: e.target.checked })}
                              className="sr-only peer"
                            />
                            <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                          </label>
                        </div>

                        {userForm.has_water && (
                          <div className="mt-3 pt-3 border-t border-gray-200/70 space-y-2.5">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-gray-600">Status</span>
                              <div className="inline-flex rounded-lg p-0.5 bg-gray-200/70 text-xs">
                                <button
                                  type="button"
                                  onClick={() => setUserForm({ ...userForm, water_active: true })}
                                  className={`px-3 py-1 rounded-md font-medium transition-all ${
                                    userForm.water_active
                                      ? 'bg-white text-gray-900 shadow-2xs'
                                      : 'text-gray-600 hover:text-gray-900'
                                  }`}
                                >
                                  Ligado
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setUserForm({ ...userForm, water_active: false })}
                                  className={`px-3 py-1 rounded-md font-medium transition-all ${
                                    !userForm.water_active
                                      ? 'bg-white text-rose-600 shadow-2xs'
                                      : 'text-gray-600 hover:text-gray-900'
                                  }`}
                                >
                                  Desligado
                                </button>
                              </div>
                            </div>

                            <div className="flex items-center justify-between">
                              <span className="text-xs text-gray-600">Hidrômetros</span>
                              <div className="flex items-center border border-gray-200 bg-white rounded-lg overflow-hidden">
                                <button
                                  type="button"
                                  disabled={(userForm.water_meters_count || 1) <= 1}
                                  onClick={() => setUserForm({ ...userForm, water_meters_count: Math.max(1, (userForm.water_meters_count || 1) - 1) })}
                                  className="px-2.5 py-1 text-gray-600 hover:bg-gray-50 disabled:opacity-30 text-xs font-semibold"
                                >
                                  -
                                </button>
                                <span className="px-3 py-1 text-xs font-semibold text-gray-800 min-w-[60px] text-center bg-gray-50/50">
                                  {userForm.water_meters_count || 1}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setUserForm({ ...userForm, water_meters_count: (userForm.water_meters_count || 1) + 1 })}
                                  className="px-2.5 py-1 text-gray-600 hover:bg-gray-50 text-xs font-semibold"
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Botão de Ação */}
                    <div className="pt-2">
                      <button 
                        onClick={handleSaveUser}
                        disabled={isSavingUser}
                        className={`w-full py-2.5 text-white rounded-lg font-semibold text-sm transition-all shadow-xs ${
                          editingUser
                            ? 'bg-amber-600 hover:bg-amber-700'
                            : 'bg-indigo-600 hover:bg-indigo-700'
                        } ${isSavingUser ? 'opacity-70 cursor-not-allowed' : ''}`}
                      >
                        {isSavingUser 
                          ? 'Salvando...' 
                          : editingUser 
                            ? 'Atualizar Morador' 
                            : 'Salvar Morador'
                        }
                      </button>
                    </div>
                  </div>
                </div>

                {/* LISTAGEM DE MORADORES */}
                <div className="lg:col-span-7 space-y-4">
                  <div className="bg-white rounded-xl shadow-xs border border-gray-100 overflow-hidden">
                    {/* Header da Listagem */}
                    <div className="px-6 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-gray-900 text-base">Moradores Cadastrados</h3>
                          <span className="text-xs text-gray-500 font-medium">
                            ({filteredUsersList.length})
                          </span>
                        </div>
                        <p className="text-xs text-gray-500">Controle e histórico de consumos da chácara</p>
                      </div>

                      {editingUser && (
                        <button
                          onClick={handleCancelEditUser}
                          className="text-xs font-medium text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors"
                        >
                          + Novo Morador
                        </button>
                      )}
                    </div>

                    {/* Toolbar com Filtros e Busca */}
                    <div className="p-4 border-b border-gray-100 bg-gray-50/30 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
                      {/* Segmented Filter Tabs */}
                      <div className="inline-flex rounded-lg p-1 bg-gray-100 overflow-x-auto text-xs font-medium gap-1">
                        <button
                          onClick={() => setUserServiceFilter('all')}
                          className={`px-3 py-1.5 rounded-md transition-all whitespace-nowrap ${
                            userServiceFilter === 'all'
                              ? 'bg-white text-gray-900 shadow-2xs font-semibold'
                              : 'text-gray-500 hover:text-gray-800'
                          }`}
                        >
                          Todos ({totalUsersCount})
                        </button>
                        <button
                          onClick={() => setUserServiceFilter('energy')}
                          className={`px-3 py-1.5 rounded-md transition-all whitespace-nowrap ${
                            userServiceFilter === 'energy'
                              ? 'bg-white text-gray-900 shadow-2xs font-semibold'
                              : 'text-gray-500 hover:text-gray-800'
                          }`}
                        >
                          Energia ({activeEnergyUsersCount})
                        </button>
                        <button
                          onClick={() => setUserServiceFilter('water')}
                          className={`px-3 py-1.5 rounded-md transition-all whitespace-nowrap ${
                            userServiceFilter === 'water'
                              ? 'bg-white text-gray-900 shadow-2xs font-semibold'
                              : 'text-gray-500 hover:text-gray-800'
                          }`}
                        >
                          Água ({activeWaterUsersCount})
                        </button>
                        <button
                          onClick={() => setUserServiceFilter('inactive')}
                          className={`px-3 py-1.5 rounded-md transition-all whitespace-nowrap ${
                            userServiceFilter === 'inactive'
                              ? 'bg-white text-rose-600 shadow-2xs font-semibold'
                              : 'text-gray-500 hover:text-gray-800'
                          }`}
                        >
                          Desligados ({inactiveServicesCount})
                        </button>
                      </div>

                      {/* Campo de Busca */}
                      <div className="relative min-w-[240px]">
                        <input
                          type="text"
                          value={userSearchTerm}
                          onChange={e => setUserSearchTerm(e.target.value)}
                          placeholder="Buscar por nome, rua, casa, CPF..."
                          className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none text-gray-800 placeholder:text-gray-400"
                        />
                        {userSearchTerm && (
                          <button
                            onClick={() => setUserSearchTerm('')}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Tabela de Moradores */}
                    <div className="overflow-x-auto">
                      {filteredUsersList.length > 0 ? (
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-gray-100 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                              <th className="px-5 py-3">
                                <button
                                  type="button"
                                  onClick={() => toggleUserSort('name')}
                                  className="inline-flex items-center gap-1 hover:text-gray-700 transition-colors uppercase"
                                >
                                  Nome
                                  <span className="text-[10px] text-gray-400 font-mono">
                                    {userSortField === 'name' ? (userSortOrder === 'asc' ? '▲' : '▼') : '↕'}
                                  </span>
                                </button>
                              </th>
                              <th className="px-4 py-3">
                                <button
                                  type="button"
                                  onClick={() => toggleUserSort('street')}
                                  className="inline-flex items-center gap-1 hover:text-gray-700 transition-colors uppercase"
                                >
                                  Rua
                                  <span className="text-[10px] text-gray-400 font-mono">
                                    {userSortField === 'street' ? (userSortOrder === 'asc' ? '▲' : '▼') : '↕'}
                                  </span>
                                </button>
                              </th>
                              <th className="px-4 py-3">
                                <button
                                  type="button"
                                  onClick={() => toggleUserSort('house_number')}
                                  className="inline-flex items-center gap-1 hover:text-gray-700 transition-colors uppercase"
                                >
                                  Casa
                                  <span className="text-[10px] text-gray-400 font-mono">
                                    {userSortField === 'house_number' ? (userSortOrder === 'asc' ? '▲' : '▼') : '↕'}
                                  </span>
                                </button>
                              </th>
                              <th className="px-4 py-3">
                                <button
                                  type="button"
                                  onClick={() => toggleUserSort('cpf')}
                                  className="inline-flex items-center gap-1 hover:text-gray-700 transition-colors uppercase"
                                >
                                  CPF
                                  <span className="text-[10px] text-gray-400 font-mono">
                                    {userSortField === 'cpf' ? (userSortOrder === 'asc' ? '▲' : '▼') : '↕'}
                                  </span>
                                </button>
                              </th>
                              <th className="px-4 py-3">
                                <button
                                  type="button"
                                  onClick={() => toggleUserSort('phone')}
                                  className="inline-flex items-center gap-1 hover:text-gray-700 transition-colors uppercase"
                                >
                                  Contato
                                  <span className="text-[10px] text-gray-400 font-mono">
                                    {userSortField === 'phone' ? (userSortOrder === 'asc' ? '▲' : '▼') : '↕'}
                                  </span>
                                </button>
                              </th>
                              <th className="px-4 py-3">Serviços</th>
                              <th className="px-5 py-3 text-right">Ações</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {filteredUsersList.map((user) => {
                              const isCurrentlyEditing = editingUser?.id === user.id;
                              const userStreet = user.street || user.rua;
                              const userHouse = user.house_number || user.casa;

                              return (
                                <tr 
                                  key={user.id} 
                                  className={`transition-colors hover:bg-gray-50/50 ${
                                    isCurrentlyEditing ? 'bg-amber-50/30' : ''
                                  }`}
                                >
                                  {/* Nome */}
                                  <td className="px-5 py-3.5">
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <span className="font-semibold text-gray-900 text-sm">{user.name}</span>
                                        {isCurrentlyEditing && (
                                          <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded text-[10px] font-medium">
                                            editando
                                          </span>
                                        )}
                                      </div>
                                      <span className="text-[11px] text-gray-400 font-mono">ID #{user.id}</span>
                                    </div>
                                  </td>

                                  {/* Rua */}
                                  <td className="px-4 py-3.5">
                                    {userStreet ? (
                                      <span className="text-xs font-medium text-gray-800">
                                        {userStreet}
                                      </span>
                                    ) : (
                                      <span className="text-xs text-gray-300">-</span>
                                    )}
                                  </td>

                                  {/* Casa */}
                                  <td className="px-4 py-3.5">
                                    {userHouse ? (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-gray-100 text-gray-800 font-semibold text-xs font-mono">
                                        {userHouse}
                                      </span>
                                    ) : (
                                      <span className="text-xs text-gray-300">-</span>
                                    )}
                                  </td>

                                  {/* CPF */}
                                  <td className="px-4 py-3.5">
                                    {user.cpf ? (
                                      <span className="text-xs font-mono text-gray-600">
                                        {user.cpf}
                                      </span>
                                    ) : (
                                      <span className="text-xs text-gray-300">-</span>
                                    )}
                                  </td>

                                  {/* Telefone / WhatsApp */}
                                  <td className="px-4 py-3.5">
                                    {user.phone ? (
                                      <a
                                        href={`https://wa.me/${formatWAPhone(user.phone)}?text=${encodeURIComponent(`${getGreeting()} ${getFirstName(user.name) || user.name}! Tudo bem? Entro em contato sobre a chácara.`)}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs text-gray-700 hover:text-indigo-600 hover:underline font-mono"
                                        title="Abrir WhatsApp"
                                      >
                                        {user.phone}
                                      </a>
                                    ) : (
                                      <span className="text-xs text-gray-400">Não informado</span>
                                    )}
                                  </td>

                                  {/* Serviços & Medidores */}
                                  <td className="px-4 py-3.5">
                                    <div className="flex flex-wrap gap-1.5">
                                      {user.has_energy !== false ? (
                                        <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                                          user.energy_active !== false
                                            ? 'bg-amber-50 text-amber-800'
                                            : 'bg-gray-100 text-gray-400 line-through'
                                        }`}>
                                          Energia ({user.energy_meters_count || 1} pad.)
                                        </span>
                                      ) : null}

                                      {user.has_water !== false ? (
                                        <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                                          user.water_active !== false
                                            ? 'bg-sky-50 text-sky-800'
                                            : 'bg-gray-100 text-gray-400 line-through'
                                        }`}>
                                          Água ({user.water_meters_count || 1} hidr.)
                                        </span>
                                      ) : null}

                                      {user.has_energy === false && user.has_water === false && (
                                        <span className="text-gray-400 text-xs">Nenhum</span>
                                      )}
                                    </div>
                                  </td>

                                  {/* Ações */}
                                  <td className="px-5 py-3.5 text-right">
                                    <div className="inline-flex items-center gap-1">
                                      <button 
                                        onClick={() => {
                                          const userBill = bills.find(b => Number(b.chacara_user_id) === user.id && b.month_reference === filterMonth);
                                          if (userBill) {
                                            setInvoiceDetailsModal({ isOpen: true, bill: userBill });
                                          } else {
                                            setPendingDetailsModal({ isOpen: true, user });
                                          }
                                        }}
                                        className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-gray-100 rounded-lg transition-colors"
                                        title="Ver Extrato"
                                      >
                                        <FileText size={15} />
                                      </button>
                                      <button 
                                        onClick={() => { 
                                          setEditingUser(user); 
                                          setUserForm({ 
                                            name: user.name, 
                                            street: user.street || user.rua || '',
                                            house_number: user.house_number || user.casa || '',
                                            cpf: user.cpf || '',
                                            phone: user.phone || '',
                                            has_energy: user.has_energy !== undefined ? user.has_energy : true,
                                            has_water: user.has_water !== undefined ? user.has_water : true,
                                            energy_meters_count: user.energy_meters_count || 1,
                                            water_meters_count: user.water_meters_count || 1,
                                            energy_active: user.energy_active !== undefined ? user.energy_active : true,
                                            water_active: user.water_active !== undefined ? user.water_active : true
                                          }); 
                                          userFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                        }}
                                        className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-gray-100 rounded-lg transition-colors"
                                        title="Editar Morador"
                                      >
                                        <Edit2 size={15} />
                                      </button>
                                      <button 
                                        onClick={() => handleDeleteUser(user.id)}
                                        className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                        title="Excluir Morador"
                                      >
                                        <Trash2 size={15} />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      ) : (
                        <div className="p-8 text-center">
                          <h4 className="font-semibold text-gray-700 text-sm">Nenhum morador encontrado</h4>
                          <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                            {userSearchTerm 
                              ? `Nenhum resultado corresponde à busca "${userSearchTerm}".`
                              : 'Nenhum morador cadastrado. Utilize o formulário ao lado para cadastrar.'}
                          </p>
                          {userSearchTerm && (
                            <button
                              onClick={() => setUserSearchTerm('')}
                              className="mt-3 px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-medium transition-colors"
                            >
                              Limpar Pesquisa
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })()}

        {activeTab === 'chacara_expenses' && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Lançamento de Despesas</h2>
                <p className="text-gray-500">Gerencie as despesas e comprovantes</p>
              </div>
                <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-2xl border border-gray-200 shadow-sm focus-within:ring-4 focus-within:ring-indigo-500/10 transition-all">
                <Filter size={18} className="text-gray-400" />
                <input 
                  type="month" 
                  value={filterMonth}
                  onChange={(e) => setFilterMonth(e.target.value)}
                  className="bg-transparent border-none focus:ring-0 text-sm font-bold text-gray-700 outline-none cursor-pointer"
                />
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                <PlusCircle size={20} className="text-indigo-600" />
                {editingExpense ? 'Editar Despesa' : 'Nova Despesa'}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                  <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Mês de Referência</label>
                  <input 
                    type="month"
                    value={expenseForm.month_reference}
                    onChange={e => setExpenseForm({ ...expenseForm, month_reference: e.target.value })}
                    className="w-full px-5 py-3 bg-gray-50/50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Data</label>
                  <input 
                    type="date"
                    value={expenseForm.date}
                    onChange={e => setExpenseForm({ ...expenseForm, date: e.target.value })}
                    className="w-full px-5 py-3 bg-gray-50/50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Valor (R$)</label>
                  <input 
                    type="number"
                    step="0.01"
                    value={expenseForm.amount || ''}
                    onChange={e => setExpenseForm({ ...expenseForm, amount: Number(e.target.value) })}
                    className="w-full px-5 py-3 bg-gray-50/50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm font-medium"
                  />
                </div>
                <div className="lg:col-span-2">
                  <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Descrição</label>
                  <input 
                    type="text"
                    value={expenseForm.description}
                    onChange={e => setExpenseForm({ ...expenseForm, description: e.target.value })}
                    className="w-full px-5 py-3 bg-gray-50/50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm font-medium"
                    placeholder="Ex: Manutenção da bomba d'água"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Categoria</label>
                  <select 
                    value={expenseForm.category}
                    onChange={e => setExpenseForm({ ...expenseForm, category: e.target.value })}
                    className="w-full px-5 py-3 bg-gray-50/50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm font-medium appearance-none cursor-pointer"
                  >
                    <option value="manutencao">Manutenção</option>
                    <option value="limpeza">Limpeza</option>
                    <option value="energia">Energia</option>
                    <option value="agua">Água</option>
                    <option value="outros">Outros</option>
                  </select>
                </div>
                <div className="lg:col-span-3">
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Comprovante (Imagem ou PDF até 50MB)</label>
                  <input 
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={handleFileUpload}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                  />
                  {expenseForm.receipt_url && (
                    <div className="mt-2 text-sm text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 size={16} /> Arquivo anexado com sucesso
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-6 flex gap-3">
                <button 
                  onClick={handleSaveExpense}
                  className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all"
                >
                  <Save size={18} />
                  {editingExpense ? 'Atualizar Despesa' : 'Salvar Despesa'}
                </button>
                {editingExpense && (
                  <button 
                    onClick={() => {
                      setEditingExpense(null);
                      setExpenseForm({
                        month_reference: new Date().toISOString().slice(0, 7),
                        description: '',
                        category: 'manutencao',
                        amount: 0,
                        date: new Date().toISOString().split('T')[0],
                        receipt_url: ''
                      });
                    }}
                    className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-all"
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-6 border-b border-gray-50 flex justify-between items-center">
                <h3 className="text-lg font-bold text-gray-800">Despesas do Mês</h3>
                <button
                  onClick={async () => {
                    const orientation = await askOptions({
                      title: 'Formato do PDF',
                      message: 'Como você deseja gerar este arquivo PDF?',
                      options: [
                        { label: 'Vertical (Retrato)', value: 'p' },
                        { label: 'Horizontal (Paisagem)', value: 'l' }
                      ]
                    });
                    if (!orientation) return;
                    const filteredExps = expenses.filter(e => e.month_reference === filterMonth);
                    const total = filteredExps.reduce((sum, e) => sum + Number(e.amount), 0);
                    
                    const bodyData = filteredExps.map(e => [
                      new Date(e.date).toLocaleDateString('pt-BR'),
                      e.description,
                      e.category,
                      `R$ ${Number(e.amount).toFixed(2)}`
                    ]);

                    await PdfService.exportTableToPDF(
                      `Relatório de Despesas - ${filterMonth}`,
                      `Visão geral de despesas do mês`,
                      ['Data', 'Descrição', 'Categoria', 'Valor (R$)'],
                      bodyData,
                      `Total: R$ ${total.toFixed(2)}`,
                      orientation as 'p'|'l',
                      `despesas_${filterMonth}`
                    );
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg font-semibold hover:bg-indigo-100 transition-colors"
                >
                  <Download size={16} />
                  Exportar PDF
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Data</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Descrição</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Categoria</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Valor</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.filter(e => e.month_reference === filterMonth).map(expense => (
                      <tr key={expense.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-all">
                        <td className="px-6 py-4 text-gray-600">{new Date(expense.date).toLocaleDateString('pt-BR')}</td>
                        <td className="px-6 py-4 font-semibold text-gray-800">{expense.description}</td>
                        <td className="px-6 py-4 text-gray-600 capitalize">{expense.category}</td>
                        <td className="px-6 py-4 font-bold text-red-600">R$ {Number(expense.amount).toFixed(2)}</td>
                        <td className="px-6 py-4 text-right space-x-2">
                          {expense.receipt_url && (
                            <button 
                              onClick={() => {
                                const win = window.open();
                                if (win) {
                                  if (expense.receipt_url.startsWith('data:application/pdf')) {
                                    win.document.write(`<iframe src="${expense.receipt_url}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
                                  } else {
                                    win.document.write(`<img src="${expense.receipt_url}" style="max-width: 100%; height: auto;" />`);
                                  }
                                }
                              }}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                              title="Ver Comprovante"
                            >
                              <FileText size={16} />
                            </button>
                          )}
                          <button 
                            onClick={() => handleEditExpense(expense)}
                            className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button 
                            onClick={() => handleDeleteExpense(expense.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {expenses.filter(e => e.month_reference === filterMonth).length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                          Nenhuma despesa registrada para este mês.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'chacara_main' && (
          <motion.div
            key="bills"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.15, ease: "easeOut" }}
            className="space-y-6"
          >
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                <PlusCircle size={20} className="text-indigo-600" />
                {editingBill ? 'Editar Conta' : 'Lançar Nova Conta'}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div>
                  <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Usuário</label>
                  <select 
                    value={billForm.user_id}
                    onChange={e => handleUserSelectForBill(e.target.value)}
                    className="w-full px-5 py-3 bg-gray-50/50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm font-medium appearance-none cursor-pointer"
                  >
                    <option value="">Selecione um usuário...</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Mês de Referência</label>
                  <input 
                    type="month"
                    value={billForm.month_reference}
                    onChange={e => setBillForm({ ...billForm, month_reference: e.target.value })}
                    className="w-full px-5 py-3 bg-gray-50/50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Data da Leitura</label>
                  <input 
                    type="date"
                    value={billForm.reading_date}
                    onChange={e => setBillForm({ ...billForm, reading_date: e.target.value })}
                    className="w-full px-5 py-3 bg-gray-50/50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm font-medium"
                  />
                </div>
                {showEnergy && (
                  <>
                    <div className="col-span-full border-t border-gray-100 pt-4 mt-2">
                      <h4 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
                        <Zap size={16} className="text-yellow-500" />
                        Consumo de Energia
                      </h4>
                    </div>
                    {billForm.energy_readings.map((reading, index) => (
                      <React.Fragment key={`energy-${index}`}>
                        <div>
                          <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Leitura Anterior (Padrão {index + 1})</label>
                          <input 
                            type="number"
                            step="any"
                            value={reading.prev}
                            onChange={e => {
                              const val = e.target.value === '' ? 0 : Number(e.target.value);
                              setBillForm(prev => {
                                const newReadings = prev.energy_readings.map((r, i) => 
                                  i === index ? { ...r, prev: val } : r
                                );
                                return { ...prev, energy_readings: newReadings };
                              });
                            }}
                            className="w-full px-5 py-3 bg-gray-50/50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm font-medium"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Leitura Atual (Padrão {index + 1})</label>
                          <input 
                            type="number"
                            step="any"
                            value={reading.curr}
                            onChange={e => {
                              const val = e.target.value === '' ? 0 : Number(e.target.value);
                              setBillForm(prev => {
                                const newReadings = prev.energy_readings.map((r, i) => 
                                  i === index ? { ...r, curr: val } : r
                                );
                                return { ...prev, energy_readings: newReadings };
                              });
                            }}
                            className="w-full px-5 py-3 bg-gray-50/50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm font-medium"
                          />
                        </div>
                      </React.Fragment>
                    ))}
                    <div>
                      <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Valor do kWh (R$)</label>
                      <input 
                        type="number"
                        step="0.01"
                        value={billForm.kwh_value}
                        onChange={e => setBillForm({ ...billForm, kwh_value: Number(e.target.value) })}
                        className="w-full px-5 py-3 bg-gray-50/50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm font-medium"
                      />
                    </div>
                  </>
                )}

                {/* Reserve Fund Section - Separated */}
                <div className="col-span-full border-t border-gray-100 pt-4 mt-2">
                  <h4 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
                    <DollarSign size={16} className="text-green-500" />
                    Fundo de Reserva
                  </h4>
                </div>
                <div className="col-span-full">
                   <label className="flex items-center gap-2 cursor-pointer group">
                    <div className="relative">
                      <input 
                        type="checkbox"
                        checked={billForm.include_reserve_fund}
                        onChange={e => setBillForm({ ...billForm, include_reserve_fund: e.target.checked })}
                        className="sr-only"
                      />
                      <div className={`w-10 h-6 rounded-full transition-all ${billForm.include_reserve_fund ? 'bg-indigo-600' : 'bg-gray-300'}`}></div>
                      <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-all ${billForm.include_reserve_fund ? 'translate-x-4' : ''}`}></div>
                    </div>
                    <span className="text-sm font-semibold text-gray-600 group-hover:text-indigo-600 transition-all">
                      Incluir Fundo de Reserva (R$ {settings.reserve_fund_value.toFixed(2)})?
                    </span>
                  </label>
                </div>

                {/* Water Section */}
                {showWater && (
                  <>
                    <div className="col-span-full border-t border-gray-100 pt-4 mt-2">
                      <h4 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
                        <Zap size={16} className="text-blue-500" />
                        Consumo de Água
                      </h4>
                    </div>
                    {billForm.water_readings.map((reading, index) => (
                      <React.Fragment key={`water-${index}`}>
                        <div>
                          <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Leitura Anterior Água (Hidrômetro {index + 1})</label>
                          <input 
                            type="number"
                            step="any"
                            value={reading.prev}
                            onChange={e => {
                              const val = e.target.value === '' ? 0 : Number(e.target.value);
                              setBillForm(prev => {
                                const newReadings = prev.water_readings.map((r, i) => 
                                  i === index ? { ...r, prev: val } : r
                                );
                                return { ...prev, water_readings: newReadings };
                              });
                            }}
                            className="w-full px-5 py-3 bg-gray-50/50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm font-medium"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Leitura Atual Água (Hidrômetro {index + 1})</label>
                          <input 
                            type="number"
                            step="any"
                            value={reading.curr}
                            onChange={e => {
                              const val = e.target.value === '' ? 0 : Number(e.target.value);
                              setBillForm(prev => {
                                const newReadings = prev.water_readings.map((r, i) => 
                                  i === index ? { ...r, curr: val } : r
                                );
                                return { ...prev, water_readings: newReadings };
                              });
                            }}
                            className="w-full px-5 py-3 bg-gray-50/50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm font-medium"
                          />
                        </div>
                      </React.Fragment>
                    ))}
                    <div>
                      <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Valor da Água (R$/m³)</label>
                      <input 
                        type="number"
                        step="0.01"
                        value={billForm.water_value}
                        onChange={e => setBillForm({ ...billForm, water_value: Number(e.target.value) })}
                        className="w-full px-5 py-3 bg-gray-50/50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Taxa de Serviço (Água)</label>
                      <input 
                        type="number"
                        step="0.01"
                        value={billForm.water_service_fee}
                        onChange={e => setBillForm({ ...billForm, water_service_fee: Number(e.target.value) })}
                        className="w-full px-5 py-3 bg-gray-50/50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm font-medium"
                      />
                    </div>
                  </>
                )}

                {/* Apportionment Section */}
                <div className="col-span-full border-t border-gray-100 pt-4 mt-2">
                  <h4 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
                    <DollarSign size={16} className="text-amber-500" />
                    Pag. Adv. e Cont. e Outros
                  </h4>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Valor do Pag. Adv. e Cont. (R$)</label>
                  <input 
                    type="number"
                    step="0.01"
                    value={billForm.apportionment_value}
                    onChange={e => setBillForm({ ...billForm, apportionment_value: Number(e.target.value) })}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none"
                  />
                </div>
                <div className="flex items-end pb-2">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <div className="relative">
                      <input 
                        type="checkbox"
                        checked={billForm.include_apportionment}
                        onChange={e => setBillForm({ ...billForm, include_apportionment: e.target.checked })}
                        className="sr-only"
                      />
                      <div className={`w-10 h-6 rounded-full transition-all ${billForm.include_apportionment ? 'bg-indigo-600' : 'bg-gray-300'}`}></div>
                      <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-all ${billForm.include_apportionment ? 'translate-x-4' : ''}`}></div>
                    </div>
                    <span className="text-sm font-semibold text-gray-600 group-hover:text-indigo-600 transition-all">Incluir Pag. Adv. e Cont.?</span>
                  </label>
                </div>

                <div className="col-span-full mt-4">
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-2 ml-1">Observações da Fatura</label>
                  <textarea 
                    value={billForm.observations}
                    onChange={e => setBillForm({ ...billForm, observations: e.target.value })}
                    className="w-full px-5 py-3 bg-gray-50/50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm font-medium min-h-[100px]"
                    placeholder="Adicione observações que aparecerão na mensagem de WhatsApp..."
                  />
                </div>
              </div>

              <div className="mt-8 p-6 bg-indigo-50 rounded-2xl border border-indigo-100 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex flex-col sm:flex-row items-center gap-6">
                  <div className="text-center md:text-left">
                    <span className="block text-xs font-bold text-indigo-400 uppercase">Consumo Energia</span>
                    <span className="text-2xl font-black text-indigo-900">
                      {(billForm.energy_readings.reduce((acc, r) => acc + (r.curr - r.prev), 0)).toFixed(2)} kWh
                    </span>
                  </div>
                  <div className="h-10 w-px bg-indigo-200 hidden md:block"></div>
                  <div className="text-center md:text-left">
                    <span className="block text-xs font-bold text-indigo-400 uppercase">Consumo Água</span>
                    <span className="text-2xl font-black text-indigo-900">
                      {(billForm.water_readings.reduce((acc, r) => acc + (r.curr - r.prev), 0)).toFixed(2)} m³
                    </span>
                  </div>
                  <div className="h-10 w-px bg-indigo-200 hidden md:block"></div>
                  <div className="text-center md:text-left">
                    <span className="block text-xs font-bold text-indigo-400 uppercase">Total Estimado</span>
                    <span className="text-2xl font-black text-indigo-900">
                      R$ {(
                        (showEnergy ? (billForm.energy_readings.reduce((acc, r) => acc + (r.curr - r.prev), 0) * billForm.kwh_value) : 0) + 
                        (showWater ? ((billForm.water_readings.reduce((acc, r) => acc + (r.curr - r.prev), 0) * billForm.water_value) + (billForm.water_service_fee || 0)) : 0) +
                        (billForm.include_apportionment ? billForm.apportionment_value : 0) +
                        (billForm.include_reserve_fund ? settings.reserve_fund_value : 0)
                      ).toFixed(2)}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                  <button 
                    onClick={() => handleClearBillForm()}
                    className="p-4 bg-gray-100 text-gray-600 rounded-xl font-bold hover:bg-gray-200 transition-all shadow-sm flex items-center justify-center"
                    title="Limpar Formulário"
                  >
                    <Trash2 size={20} />
                  </button>
                  <button 
                    onClick={() => handleSaveBill()}
                    className="flex-1 px-6 py-4 bg-indigo-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all"
                  >
                    {editingBill ? <Save size={20} /> : <Plus size={20} />}
                    {editingBill ? 'Atualizar Conta' : 'Lançar Conta'}
                  </button>
                </div>
              </div>
              {editingBill && (
                <div className="mt-4 flex justify-center">
                  <button 
                    onClick={() => {
                      handleClearBillForm();
                      if (setActiveTab) setActiveTab('chacara_history');
                    }}
                    className="text-gray-500 font-semibold hover:text-gray-700"
                  >
                    Cancelar Edição
                  </button>
                </div>
              )}
            </div>

          </motion.div>
        )}

        {activeTab === 'chacara_history' && (
          <motion.div
            key="history"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.15, ease: "easeOut" }}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
              <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
                <span className="text-gray-500 text-[10px] md:text-sm font-semibold mb-1 uppercase tracking-wider">Total a Pagar</span>
                <span className="text-2xl md:text-3xl font-black text-gray-800">R$ {totalToPay.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
                <span className="text-gray-500 text-[10px] md:text-sm font-semibold mb-1 uppercase tracking-wider">Total Pago</span>
                <span className="text-2xl md:text-3xl font-black text-emerald-600">R$ {totalPaid.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
                <span className="text-gray-500 text-[10px] md:text-sm font-semibold mb-1 uppercase tracking-wider">Total Pendente</span>
                <span className="text-2xl md:text-3xl font-black text-rose-600">R$ {totalPending.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  <History size={20} className="text-indigo-600" />
                  Histórico de Lançamentos
                </h3>
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <div className="relative flex items-center gap-2 bg-gray-50 p-2 rounded-xl border border-gray-100 w-full sm:w-auto">
                    <Search size={18} className="text-gray-400 shrink-0" />
                    <input 
                      type="text" 
                      placeholder="Buscar por morador, valor, CPF, telefone, rua, casa..."
                      value={searchBill}
                      onChange={(e) => setSearchBill(e.target.value)}
                      className="bg-transparent border-none focus:ring-0 text-sm font-medium text-gray-700 w-full sm:w-64 pr-6 outline-none"
                    />
                    {searchBill && (
                      <button
                        onClick={() => setSearchBill('')}
                        className="text-gray-400 hover:text-gray-600 text-xs px-1"
                        title="Limpar busca"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-xl border border-gray-100 w-full sm:w-auto">
                    <Filter size={18} className="text-gray-400 shrink-0" />
                    <input 
                      type="month" 
                      value={filterMonth}
                      onChange={(e) => setFilterMonth(e.target.value)}
                      className="bg-transparent border-none focus:ring-0 text-sm font-medium text-gray-700 w-full"
                    />
                    {filterMonth && (
                      <button
                        onClick={() => setFilterMonth('')}
                        className="text-[11px] text-gray-500 hover:text-indigo-600 whitespace-nowrap font-medium px-1 bg-white/60 hover:bg-white rounded border border-gray-200/60"
                        title="Ver todos os meses"
                      >
                        Todos
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-xl border border-gray-100 w-full sm:w-auto">
                    <CheckCircle size={18} className="text-gray-400 shrink-0" />
                    <select 
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value as any)}
                      className="bg-transparent border-none focus:ring-0 text-sm font-medium text-gray-700 w-full outline-none"
                    >
                      <option value="all">Todos Status</option>
                      <option value="pending">Pendente</option>
                      <option value="partial">Parcial</option>
                      <option value="paid">Pago</option>
                    </select>
                  </div>
                  <button 
                    onClick={exportToPDF}
                    className="w-full sm:w-auto p-2 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-all flex items-center justify-center gap-2 px-4 font-bold text-sm"
                  >
                    <Download size={18} />
                    Exportar PDF
                  </button>
                </div>
              </div>

              {/* Desktop Table View */}
              <div className="overflow-x-auto hidden md:block">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Usuário</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase text-center">Total Energia</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase text-center">Total Água</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase text-center">Pag. Adv. e Cont.</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase text-center">Fundo de Reserva</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase text-center">Taxas de Serviço</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase text-center">Total</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase text-center">Status</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBills.map(bill => {
                        const user = users.find(u => u.id === bill.chacara_user_id);
                        const isPaid = bill.status === 'paid';
                        const isPartial = bill.status === 'partial' || (!isPaid && (bill.amount_paid || 0) > 0);
                        
                        const energyReadings = bill.energy_readings || [];
                        const waterReadings = bill.water_readings || [];

                        const energyConsumption = energyReadings.length > 0
                          ? energyReadings.reduce((acc, r) => acc + (r.curr - r.prev), 0)
                          : (bill.curr_reading - bill.prev_reading) + ((bill.curr_reading_2 || 0) - (bill.prev_reading_2 || 0));
                        const energyTotal = energyConsumption * bill.kwh_value;
                        
                        const waterConsumption = waterReadings.length > 0
                          ? waterReadings.reduce((acc, r) => acc + (r.curr - r.prev), 0)
                          : (bill.water_curr_reading || 0) - (bill.water_prev_reading || 0) + ((bill.water_curr_reading_2 || 0) - (bill.water_prev_reading_2 || 0));
                        const waterValueTotal = waterConsumption * (bill.water_value || 0);
                        
                        const apportionment = bill.include_apportionment ? (bill.apportionment_value || 0) : 0;
                        const reserveFund = bill.include_reserve_fund ? (bill.reserve_fund || 0) : 0;
                        const serviceFee = bill.water_service_fee || 0;

                        return (
                          <tr 
                            key={`desktop-${bill.id}`} 
                            id={`bill-${bill.id}`}
                            className={cn(
                              "border-b border-gray-50 hover:bg-gray-50/50 transition-all",
                              isPaid ? 'opacity-75' : '',
                              highlightedBillId === bill.id ? "bg-indigo-50 ring-2 ring-indigo-500 ring-inset" : ""
                            )}
                          >
                            <td className={`px-6 py-4 ${isPaid ? 'line-through text-gray-400' : ''}`}>
                              <span className="font-semibold text-gray-800 block">{user?.name || 'Não Identificado'}</span>
                              <div className="text-xs text-gray-500 flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                                {user?.phone && <span>{user.phone}</span>}
                                {((user?.street || user?.rua) || (user?.house_number || user?.casa)) && (
                                  <span className="text-gray-400">
                                    • {[user?.street || user?.rua, (user?.house_number || user?.casa) ? `Casa ${user?.house_number || user?.casa}` : ''].filter(Boolean).join(', ')}
                                  </span>
                                )}
                                {user?.cpf && <span className="font-mono text-gray-400">• CPF: {user.cpf}</span>}
                              </div>
                            </td>
                            <td className={`px-6 py-4 text-center text-gray-600 ${isPaid ? 'line-through' : ''}`}>
                              R$ {energyTotal.toFixed(2)}
                            </td>
                            <td className={`px-6 py-4 text-center text-gray-600 ${isPaid ? 'line-through' : ''}`}>
                              R$ {waterValueTotal.toFixed(2)}
                            </td>
                            <td className={`px-6 py-4 text-center text-gray-600 ${isPaid ? 'line-through' : ''}`}>
                              R$ {apportionment.toFixed(2)}
                            </td>
                            <td className={`px-6 py-4 text-center text-gray-600 ${isPaid ? 'line-through' : ''}`}>
                              R$ {reserveFund.toFixed(2)}
                            </td>
                            <td className={`px-6 py-4 text-center text-gray-600 ${isPaid ? 'line-through' : ''}`}>
                              R$ {serviceFee.toFixed(2)}
                            </td>
                            <td className={`px-6 py-4 text-center font-bold text-indigo-600 ${isPaid ? 'line-through' : ''}`}>
                              R$ {bill.total.toFixed(2)}
                            </td>
                            <td className="px-6 py-4 text-center">
                                <button 
                                  onClick={() => handleToggleStatusClick(bill)}
                                  className={`px-3 py-2 rounded-xl text-[11px] font-black flex items-center gap-2 mx-auto transition-all shadow-sm active:scale-95 uppercase tracking-wider ${
                                    isPaid 
                                      ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                                      : isPartial
                                        ? 'bg-indigo-500 text-white hover:bg-indigo-600'
                                        : 'bg-indigo-600 text-white hover:bg-indigo-700'
                                  }`}
                                >
                                  {isPaid ? <Check size={14} /> : isPartial ? <CheckCircle size={14} /> : <Check size={14} />}
                                  {isPaid ? 'PAGO' : isPartial ? 'PARCIAL' : 'RECEBER'}
                                </button>
                              {(isPaid || isPartial) && bill.payment_date && (
                                <div className="text-[10px] text-gray-500 mt-1 font-medium">
                                  Pago em: {new Date(bill.payment_date + 'T12:00:00').toLocaleDateString('pt-BR')}
                                </div>
                              )}
                              {isPartial && (
                                <div className="text-[10px] font-bold text-blue-600 mt-1">
                                  R$ {(bill.amount_paid || 0).toFixed(2)} / R$ {bill.total.toFixed(2)}
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 text-right space-x-1">
                              <button 
                                onClick={() => setInvoiceDetailsModal({ isOpen: true, bill })}
                                className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                title="Ver Extrato / PDF"
                              >
                                <FileText size={18} />
                              </button>
                              <button 
                                onClick={() => sendWhatsApp(bill)}
                                className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition-all"
                                title="Enviar WhatsApp"
                              >
                                <WhatsAppIcon size={18} />
                              </button>
                              <button 
                                onClick={() => handleEditBill(bill)}
                                className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                title="Editar Lançamento"
                              >
                                <Edit2 size={18} />
                              </button>
                              <button 
                                onClick={() => handleDeleteBill(bill.id)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                title="Excluir Lançamento"
                              >
                                <Trash2 size={18} />
                              </button>
                            </td>
                          </tr>
                        );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden divide-y divide-gray-100">
                {filteredBills.length === 0 ? (
                  <div className="p-8 text-center text-gray-400">
                    <History size={48} className="mx-auto mb-2 opacity-20" />
                    <p>Nenhum lançamento encontrado.</p>
                  </div>
                ) : (
                  filteredBills.map(bill => {
                    const user = users.find(u => u.id === bill.chacara_user_id);
                    const isPaid = bill.status === 'paid';
                    const isPartial = bill.status === 'partial' || (!isPaid && (bill.amount_paid || 0) > 0);
                    
                    const energyReadings = bill.energy_readings || [];
                    const waterReadings = bill.water_readings || [];

                    const energyConsumption = energyReadings.length > 0
                      ? energyReadings.reduce((acc, r) => acc + (r.curr - r.prev), 0)
                      : (bill.curr_reading - bill.prev_reading) + ((bill.curr_reading_2 || 0) - (bill.prev_reading_2 || 0));
                    const energyTotal = energyConsumption * bill.kwh_value;
                    
                    const waterConsumption = waterReadings.length > 0
                      ? waterReadings.reduce((acc, r) => acc + (r.curr - r.prev), 0)
                      : (bill.water_curr_reading || 0) - (bill.water_prev_reading || 0) + ((bill.water_curr_reading_2 || 0) - (bill.water_prev_reading_2 || 0));
                    const waterValueTotal = waterConsumption * (bill.water_value || 0);
                    
                    const apportionment = bill.include_apportionment ? (bill.apportionment_value || 0) : 0;
                    const reserveFund = bill.include_reserve_fund ? (bill.reserve_fund || 0) : 0;
                    const serviceFee = bill.water_service_fee || 0;
                    
                    return (
                      <div 
                        key={`mobile-${bill.id}`} 
                        id={`bill-mob-${bill.id}`}
                        className={cn(
                          "p-4 space-y-3 transition-all duration-500",
                          isPaid ? 'bg-gray-50/50' : 'bg-white',
                          highlightedBillId === bill.id ? "bg-indigo-50 ring-2 ring-indigo-500 ring-inset" : ""
                        )}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1 min-w-0">
                            <h4 className={`font-bold text-gray-900 truncate ${isPaid ? 'line-through text-gray-400' : ''}`}>
                              {user?.name || 'Não Identificado'}
                            </h4>
                            <div className="text-xs text-gray-500 flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                              {user?.phone && <span>{user.phone}</span>}
                              {((user?.street || user?.rua) || (user?.house_number || user?.casa)) && (
                                <span className="text-gray-400">
                                  • {[user?.street || user?.rua, (user?.house_number || user?.casa) ? `Casa ${user?.house_number || user?.casa}` : ''].filter(Boolean).join(', ')}
                                </span>
                              )}
                              {user?.cpf && <span className="font-mono text-gray-400">• CPF: {user.cpf}</span>}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`text-xl font-black text-indigo-600 ${isPaid ? 'line-through text-gray-400' : ''}`}>
                              R$ {bill.total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                            {isPartial && (
                              <p className="text-[10px] font-bold text-blue-600">
                                Pago: R$ {(bill.amount_paid || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                          {energyTotal > 0 && <span className="bg-gray-100 px-2 py-1 rounded-md">Energia: R$ {energyTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>}
                          {waterValueTotal > 0 && <span className="bg-gray-100 px-2 py-1 rounded-md">Água: R$ {waterValueTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>}
                          {apportionment > 0 && <span className="bg-gray-100 px-2 py-1 rounded-md">Pag. Adv. e Cont.: R$ {apportionment.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>}
                          {reserveFund > 0 && <span className="bg-gray-100 px-2 py-1 rounded-md">Fundo: R$ {reserveFund.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>}
                          {serviceFee > 0 && <span className="bg-gray-100 px-2 py-1 rounded-md">Taxa: R$ {serviceFee.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>}
                        </div>

                        <div className="flex flex-col sm:flex-row gap-2 pt-2">
                            <button 
                              onClick={() => handleToggleStatusClick(bill)}
                              className={`w-full py-3 rounded-2xl text-sm font-black flex items-center justify-center gap-3 transition-all shadow-lg active:scale-95 uppercase tracking-widest ${
                                isPaid 
                                  ? 'bg-green-100 text-green-700' 
                                  : isPartial
                                    ? 'bg-indigo-500 text-white'
                                    : 'bg-indigo-600 text-white'
                              }`}
                            >
                              {isPaid ? <Check size={20} /> : isPartial ? <CheckCircle size={20} /> : <Check size={20} />}
                              {isPaid ? 'PAGO' : isPartial ? 'PARCIAL' : 'RECEBER'}
                            </button>
                          
                          <button 
                            onClick={() => setInvoiceDetailsModal({ isOpen: true, bill })}
                            className="w-full sm:w-auto p-3 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-xl flex items-center justify-center transition-all active:scale-95 shadow-sm"
                            title="Ver Extrato"
                          >
                            <FileText size={20} className="sm:hidden mr-2" />
                            <span className="sm:hidden font-bold">Extrato PDF</span>
                            <FileText size={20} className="hidden sm:block" />
                          </button>
                          
                          <button 
                            onClick={() => sendWhatsApp(bill)}
                            className="w-full sm:w-auto p-3 bg-green-500 text-white rounded-xl flex items-center justify-center transition-all active:scale-95 shadow-sm"
                            title="WhatsApp"
                          >
                            <WhatsAppIcon size={20} className="sm:hidden mr-2" />
                            <span className="sm:hidden font-bold">WhatsApp</span>
                            <WhatsAppIcon size={20} className="hidden sm:block" />
                          </button>
                        </div>

                        <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                          <div className="flex gap-2">
                            <button 
                              onClick={() => handleEditBill(bill)}
                              className="p-2 bg-gray-50 text-gray-600 rounded-lg active:bg-gray-100"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button 
                              onClick={() => handleDeleteBill(bill.id)}
                              className="p-2 bg-red-50 text-red-600 rounded-lg active:bg-red-100"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                          {bill.payment_date && (
                            <span className="text-[10px] font-bold text-gray-400 uppercase">
                              Pago em: {new Date(bill.payment_date + 'T12:00:00').toLocaleDateString('pt-BR')}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'chacara_settings' && (
          <motion.div
            key="settings"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.15, ease: "easeOut" }}
            className="max-w-2xl mx-auto"
          >
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 md:p-8">
              <h3 className="text-xl font-bold text-gray-800 mb-6 md:mb-8 flex items-center gap-2">
                <SettingsIcon size={24} className="text-indigo-600" />
                Configurações Padrão
              </h3>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Valor do kWh Padrão (R$)</label>
                    <input 
                      type="number"
                      step="0.01"
                      value={settingsForm.default_kwh}
                      onChange={e => setSettingsForm({ ...settingsForm, default_kwh: Number(e.target.value) })}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Valor da Água Padrão (R$/m³)</label>
                    <input 
                      type="number"
                      step="0.01"
                      value={settingsForm.default_water_value}
                      onChange={e => setSettingsForm({ ...settingsForm, default_water_value: Number(e.target.value) })}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Taxa de Serviço Água Padrão (R$)</label>
                    <input 
                      type="number"
                      step="0.01"
                      value={settingsForm.default_water_service_fee || 0}
                      onChange={e => setSettingsForm({ ...settingsForm, default_water_service_fee: Number(e.target.value) })}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Valor do Pag. Adv. e Cont. Padrão (R$)</label>
                    <input 
                      type="number"
                      step="0.01"
                      value={settingsForm.default_apportionment_value}
                      onChange={e => setSettingsForm({ ...settingsForm, default_apportionment_value: Number(e.target.value) })}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Valor Fundo de Reserva (R$)</label>
                    <input 
                      type="number"
                      step="0.01"
                      value={settingsForm.reserve_fund_value}
                      onChange={e => setSettingsForm({ ...settingsForm, reserve_fund_value: Number(e.target.value) })}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Dia Padrão da Leitura</label>
                    <input 
                      type="number"
                      min="1"
                      max="31"
                      value={settingsForm.default_reading_day}
                      onChange={e => setSettingsForm({ ...settingsForm, default_reading_day: Number(e.target.value) })}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Dia Padrão de Vencimento</label>
                    <input 
                      type="number"
                      min="1"
                      max="31"
                      value={settingsForm.default_due_day}
                      onChange={e => setSettingsForm({ ...settingsForm, default_due_day: Number(e.target.value) })}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Mês de Referência Padrão (YYYY-MM)</label>
                    <input 
                      type="month"
                      value={settingsForm.default_month_reference || ''}
                      onChange={e => setSettingsForm({ ...settingsForm, default_month_reference: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none font-bold"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Observação Padrão (WhatsApp)</label>
                    <textarea 
                      value={settingsForm.whatsapp_observation || ''}
                      onChange={e => setSettingsForm({ ...settingsForm, whatsapp_observation: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none font-medium min-h-[100px]"
                      placeholder="Mensagem adicional que será enviada no final do WhatsApp..."
                    />
                  </div>
                </div>
                <button 
                  onClick={handleSaveSettings}
                  className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all mt-4"
                >
                  <Save size={20} />
                  Salvar Configurações
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Payment Date Modal */}
      <AnimatePresence>
        {paymentDateModal.isOpen && paymentDateModal.bill && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }} transition={{ duration: 0.15, ease: "easeOut" }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[70] p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }} transition={{ duration: 0.15, ease: "easeOut" }}
              className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl"
            >
              <h3 className="text-xl font-black text-gray-900 mb-4">Confirmar Pagamento</h3>
              <p className="text-gray-600 mb-6">
                Selecione os itens que foram pagos.
              </p>
              
              <div className="mb-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Data de Pagamento</label>
                  <input 
                    type="date" 
                    value={paymentDateModal.date}
                    onChange={e => setPaymentDateModal({ ...paymentDateModal, date: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none font-bold"
                  />
                </div>
                
                <div className="flex items-center gap-2 mb-4">
                  <input
                    type="checkbox"
                    id="isDivergent"
                    checked={paymentDateModal.isDivergent}
                    onChange={e => setPaymentDateModal({ ...paymentDateModal, isDivergent: e.target.checked })}
                    className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <label htmlFor="isDivergent" className="text-sm font-medium text-gray-700">Pagamento Divergente</label>
                </div>

                <div className="space-y-2 border border-gray-100 rounded-xl p-4 bg-gray-50/50">
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-3">Itens da Conta</label>
                  {paymentDateModal.bill && (() => {
                    const cats = calculateBillCategories(paymentDateModal.bill);
                    const items = [
                      { key: 'reserve_fund', label: 'Fundo de reserva', value: cats.reserve_fund },
                      { key: 'water_service_fee', label: 'Prestador de serviço', value: cats.water_service_fee },
                      { key: 'water_total', label: 'Conta de água', value: cats.water_total },
                      { key: 'energy_total', label: 'Conta de energia', value: cats.energy_total },
                      { key: 'apportionment', label: 'Pag. Adv. e Cont.', value: cats.apportionment }
                    ].filter(item => item.value > 0);

                    return items.map(item => (
                      <label key={item.key} className="flex items-center justify-between p-2 hover:bg-white rounded-lg cursor-pointer transition-colors">
                        <div className="flex items-center gap-3">
                          <input 
                            type="checkbox" 
                            checked={!!paymentDateModal.paidCategories[item.key]}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              const newCategories = { ...paymentDateModal.paidCategories, [item.key]: checked };
                              const newAmount = items.reduce((sum, i) => sum + (newCategories[i.key] ? i.value : 0), 0);
                              setPaymentDateModal({ 
                                ...paymentDateModal, 
                                paidCategories: newCategories,
                                amountPaid: newAmount
                              });
                            }}
                            className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="text-sm font-medium text-gray-700">{item.label}</span>
                        </div>
                        <span className="text-sm font-bold text-gray-900">R$ {item.value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </label>
                    ));
                  })()}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Valor Total Pago (R$)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={paymentDateModal.amountPaid}
                    onChange={e => setPaymentDateModal({ ...paymentDateModal, amountPaid: Number(e.target.value) })}
                    disabled={!paymentDateModal.isDivergent}
                    className={cn(
                      "w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none font-bold transition-all",
                      !paymentDateModal.isDivergent && "opacity-50 cursor-not-allowed"
                    )}
                  />
                  <p className="text-xs text-gray-500 mt-1">Total da conta: R$ {paymentDateModal.bill?.total?.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0,00'}</p>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <div className="flex gap-3">
                  <button 
                    onClick={() => setPaymentDateModal({ isOpen: false, bill: null, date: '', amountPaid: 0, paidCategories: {} })}
                    className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-all"
                  >
                    Fechar
                  </button>
                  <button 
                    onClick={() => handleConfirmToggleStatus(paymentDateModal.bill!, 'paid', paymentDateModal.date, paymentDateModal.amountPaid, paymentDateModal.paidCategories, paymentDateModal.isDivergent)}
                    className="flex-1 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-all shadow-lg shadow-green-200"
                  >
                    Confirmar
                  </button>
                </div>
                {paymentDateModal.bill?.status !== 'pending' && (
                  <button 
                    onClick={() => handleConfirmToggleStatus(paymentDateModal.bill!, 'pending', null, 0, {})}
                    className="w-full py-3 bg-red-50 text-red-600 rounded-xl font-bold hover:bg-red-100 transition-all"
                  >
                    Cancelar Pagamento
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {pendingDetailsModal.isOpen && pendingDetailsModal.user && createPortal(
        <div className="fixed inset-0 z-[60] flex items-center justify-center md:p-4 bg-black/60 backdrop-blur-sm shadow-2xl">
          {isGeneratingPdf && (
            <div className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-sm flex items-center justify-center">
              <div className="bg-white p-6 rounded-2xl shadow-2xl flex flex-col items-center gap-4">
                <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="font-bold text-gray-800 text-sm uppercase tracking-widest">Gerando PDF...</p>
              </div>
            </div>
          )}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white md:rounded-3xl shadow-2xl w-full h-full md:h-auto md:max-w-4xl md:max-h-[90vh] flex flex-col overflow-hidden overscroll-contain"
          >
            <div ref={modalContentRef} className="flex-1 min-h-0 overflow-hidden flex flex-col">
              <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/80 flex items-center justify-between">
                <div>
                  <h3 className="font-black text-gray-900 text-lg uppercase tracking-tight flex items-center gap-3">
                    <Eye className="text-indigo-600" size={24} />
                    Extrato de Pendências
                  </h3>
                  <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">
                    {pendingDetailsModal.user.name}
                    {((pendingDetailsModal.user.street || pendingDetailsModal.user.rua) || (pendingDetailsModal.user.house_number || pendingDetailsModal.user.casa)) && (
                      <span className="font-normal text-gray-400 normal-case ml-2">
                        • {[pendingDetailsModal.user.street || pendingDetailsModal.user.rua, (pendingDetailsModal.user.house_number || pendingDetailsModal.user.casa) ? `Casa ${pendingDetailsModal.user.house_number || pendingDetailsModal.user.casa}` : ''].filter(Boolean).join(', ')}
                      </span>
                    )}
                    {pendingDetailsModal.user.cpf && (
                      <span className="font-mono text-gray-400 normal-case ml-2">
                        • CPF: {pendingDetailsModal.user.cpf}
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2 no-export">
                  <button 
                    onClick={() => exportPendingDetailsToPDF(modalContentRef, `extrato-${pendingDetailsModal.user?.name.toLowerCase().replace(/\s+/g, '-')}`, 'save')}
                    className="flex items-center gap-2 bg-white text-gray-700 px-4 py-2 rounded-xl text-xs font-bold border border-gray-200 hover:bg-gray-50 transition-all shadow-sm"
                  >
                    <FileDown size={14} />
                    PDF
                  </button>
                  <button 
                    onClick={() => {
                      const user = pendingDetailsModal.user;
                      const pendingBills = bills.filter(b => b.chacara_user_id === user?.id && b.status !== 'paid');
                      const shareText = user ? getPendingSummaryWhatsAppMessage(user, pendingBills, settings) : undefined;
                      exportPendingDetailsToPDF(modalContentRef, `extrato-${pendingDetailsModal.user?.name.toLowerCase().replace(/\s+/g, '-')}`, 'share', shareText);
                    }}
                    className="flex items-center gap-2 bg-indigo-50 text-indigo-700 px-4 py-2 rounded-xl text-xs font-bold border border-indigo-100 hover:bg-indigo-100 transition-all shadow-sm"
                    title="Compartilhar PDF"
                  >
                    <Share2 size={14} />
                    Compartilhar
                  </button>
                  <button 
                    onClick={() => setPendingDetailsModal({ isOpen: false, user: null })}
                    className="p-2 hover:bg-gray-200 rounded-full transition-colors"
                  >
                    <XCircle size={24} className="text-gray-400" />
                  </button>
                </div>
              </div>

              <div className="p-6 overflow-y-auto flex-1 bg-gray-50/30 report-container">
                <div className="space-y-6">
                  {bills.filter(b => {
                    if (b.chacara_user_id !== pendingDetailsModal.user?.id || b.status === 'paid') return false;
                    const [y, m] = b.month_reference.split('-');
                    if (detailsYearFilter !== 'all' && y !== detailsYearFilter) return false;
                    if (detailsMonthFilter !== 'all' && m !== detailsMonthFilter) return false;
                    return true;
                  })
                    .sort((a, b) => a.month_reference.localeCompare(b.month_reference))
                    .map((bill) => {
                      const [year, month] = bill.month_reference.split('-');
                      const monthName = new Date(Number(year), Number(month) - 1).toLocaleString('pt-BR', { month: 'long' });
                      const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);
                      
                      const energyReadings = bill.energy_readings || [];
                      const waterReadings = bill.water_readings || [];
                      const consumption = energyReadings.reduce((acc, r) => acc + (r.curr - r.prev), 0);
                      const waterConsumption = waterReadings.reduce((acc, r) => acc + (r.curr - r.prev), 0);
                      const energyTotal = consumption * bill.kwh_value;
                      const waterTotalDetail = (waterConsumption * (bill.water_value || 0)) + (bill.water_service_fee || 0);
                      const pendingAmount = bill.total - (bill.amount_paid || 0);

                      return (
                        <div key={bill.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden report-card">
                          <div className="bg-indigo-50/50 px-5 py-3 border-b border-indigo-100 flex justify-between items-center report-section-header">
                            <div className="flex flex-col flex-shrink-0">
                              <span className="text-xs font-black text-indigo-600 uppercase tracking-widest mb-0.5">{pendingDetailsModal.user?.name}</span>
                              <span className="font-black text-indigo-900 uppercase tracking-tighter whitespace-nowrap min-w-fit">{capitalizedMonth} / {year}</span>
                              {bill.due_date && (
                                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">
                                  Vencimento: {new Date(bill.due_date + 'T12:00:00').toLocaleDateString('pt-BR')}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 no-export">
                              <button
                                onClick={() => handleToggleStatusClick(bill)}
                                className="text-[11px] font-black bg-indigo-600 text-white px-6 py-2 rounded-xl hover:bg-indigo-700 transition-all flex items-center gap-2 uppercase tracking-wider shadow-sm active:scale-95"
                              >
                                <Check size={14} />
                                RECEBER
                              </button>
                              <span className="text-xs font-bold px-3 py-1 bg-red-100 text-red-700 rounded-full uppercase">Pendente: R$ {pendingAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                            <div className="hidden show-on-export">
                              <span className="text-sm font-black text-rose-600">PENDENTE: R$ {pendingAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                          </div>
                          
                          <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                              <div>
                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                  <Zap size={12} className="text-amber-500" /> Energia
                                </h4>
                                {energyReadings.length > 0 ? (
                                  <div className="space-y-2">
                                    {energyReadings.map((r, idx) => (
                                      <div key={idx} className="bg-gray-50 p-2 rounded-lg text-xs">
                                        <div className="flex justify-between text-gray-500">
                                          <span>Padrão {idx + 1}:</span>
                                          <span className="font-mono">{r.prev.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} → {r.curr.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</span>
                                        </div>
                                        <div className="flex justify-between font-bold text-gray-700 mt-1">
                                          <span>Consumo:</span>
                                          <span>{Number(r.curr - r.prev).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} kWh</span>
                                        </div>
                                      </div>
                                    ))}
                                    <div className="pt-2 border-t border-gray-100 flex justify-between text-xs font-bold text-gray-900">
                                      <span>Subtotal Energia:</span>
                                      <span>R$ {energyTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                    </div>
                                  </div>
                                ) : <p className="text-xs text-gray-400 italic">Não aplicável</p>}
                              </div>
                            </div>

                            <div className="space-y-4">
                              <div>
                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                  <Droplets size={12} className="text-blue-500" /> Água
                                </h4>
                                {waterReadings.length > 0 ? (
                                  <div className="space-y-2">
                                    {waterReadings.map((r, idx) => (
                                      <div key={idx} className="bg-gray-50 p-2 rounded-lg text-xs">
                                        <div className="flex justify-between text-gray-500">
                                          <span>Mesa/Hidrômetro {idx + 1}:</span>
                                          <span className="font-mono">{r.prev.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} → {r.curr.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</span>
                                        </div>
                                        <div className="flex justify-between font-bold text-gray-700 mt-1">
                                          <span>Consumo:</span>
                                          <span>{Number(r.curr - r.prev).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} m³</span>
                                        </div>
                                      </div>
                                    ))}
                                    <div className="flex justify-between text-xs text-gray-600 mt-1">
                                        <span>Taxa Prestador:</span>
                                        <span>R$ {(bill.water_service_fee || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                      </div>
                                    <div className="pt-2 border-t border-gray-100 flex justify-between text-xs font-bold text-gray-900">
                                      <span>Subtotal Água:</span>
                                      <span>R$ {waterTotalDetail.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                    </div>
                                  </div>
                                ) : <p className="text-xs text-gray-400 italic">Não aplicável</p>}
                              </div>
                            </div>
                          </div>

                          <div className="bg-gray-50/50 p-5 pt-0 grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-indigo-50/30 p-3 rounded-xl border border-indigo-100/50">
                              <span className="text-[10px] block font-bold text-indigo-400 uppercase">Fundo de Reserva</span>
                              <span className="text-sm font-bold text-indigo-900">R$ {(bill.reserve_fund || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                            <div className="bg-indigo-50/30 p-3 rounded-xl border border-indigo-100/50">
                              <span className="text-[10px] block font-bold text-indigo-400 uppercase">Rateio Adv/Cont</span>
                              <span className="text-sm font-bold text-indigo-900">R$ {(bill.apportionment_value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                            <div className="bg-indigo-900 p-3 rounded-xl shadow-lg">
                              <span className="text-[10px] block font-bold text-indigo-200 uppercase">Total do Mês</span>
                              <span className="text-sm font-black text-white">R$ {bill.total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                          </div>
                          
                          {bill.amount_paid > 0 && (
                            <div className="px-5 pb-5 flex justify-end">
                              <div className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
                                Pago: R$ {(bill.amount_paid || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>

              <div className="px-6 py-5 bg-gray-50 border-t border-gray-100 flex flex-wrap gap-4 justify-between items-center report-total-footer">
                <div className="text-gray-500 text-xs font-bold">
                  Total Pendente Geral: <span className="text-red-600 font-black text-lg ml-2">R$ {
                    bills.filter(b => b.chacara_user_id === pendingDetailsModal.user?.id && b.status !== 'paid')
                      .reduce((acc, b) => acc + (b.total - (b.amount_paid || 0)), 0)
                      .toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                  }</span>
                </div>
                
                {settings.whatsapp_observation && (
                  <div className="mt-4 p-4 bg-amber-50 border border-amber-100 rounded-2xl text-xs text-amber-800 italic show-on-export w-full">
                    <p className="font-bold uppercase tracking-widest mb-1 not-italic text-amber-900">Observações:</p>
                    <div className="whitespace-pre-wrap">{settings.whatsapp_observation}</div>
                  </div>
                )}

                <div className="flex gap-3 no-export">
                  <button 
                    onClick={() => {
                      const user = pendingDetailsModal.user;
                      const pendingBills = bills.filter(b => b.chacara_user_id === user?.id && b.status !== 'paid');
                      const shareText = user ? getPendingSummaryWhatsAppMessage(user, pendingBills, settings) : undefined;
                      exportPendingDetailsToPDF(modalContentRef, `extrato-${pendingDetailsModal.user?.name.toLowerCase().replace(/\s+/g, '-')}`, 'share', shareText);
                    }}
                    className="flex items-center gap-2 bg-indigo-50 text-indigo-700 px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-indigo-100 transition-all shadow-sm active:scale-95 no-export"
                  >
                    <Share2 size={16} />
                    Compartilhar PDF
                  </button>
                  <button 
                    onClick={() => setPendingDetailsModal({ isOpen: false, user: null })}
                    className="bg-gray-200 text-gray-700 px-8 py-3 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-gray-300 transition-all shadow-md active:scale-95 no-export"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>,
        document.body
      )}

      {invoiceDetailsModal.isOpen && invoiceDetailsModal.bill && createPortal(
        <div className="fixed inset-0 z-[60] flex items-center justify-center md:p-4 bg-black/60 backdrop-blur-sm shadow-2xl">
          {isGeneratingPdf && (
            <div className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-sm flex items-center justify-center">
              <div className="bg-white p-6 rounded-2xl shadow-2xl flex flex-col items-center gap-4">
                <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="font-bold text-gray-800 text-sm uppercase tracking-widest">Gerando PDF...</p>
              </div>
            </div>
          )}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white md:rounded-3xl shadow-2xl w-full h-full md:h-auto md:max-w-4xl md:max-h-[90vh] flex flex-col overflow-hidden overscroll-contain"
          >
            <div ref={invoiceModalRef} className="flex-1 min-h-0 overflow-hidden flex flex-col">
              {(() => {
                const bill = invoiceDetailsModal.bill!;
                const user = users.find(u => u.id === bill.chacara_user_id);
                const [year, month] = bill.month_reference.split('-');
                const monthName = new Date(Number(year), Number(month) - 1).toLocaleString('pt-BR', { month: 'long' });
                const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);
                
                const energyReadings = bill.energy_readings || [];
                const waterReadings = bill.water_readings || [];
                const consumption = energyReadings.reduce((acc, r) => acc + (r.curr - r.prev), 0);
                const waterConsumption = waterReadings.reduce((acc, r) => acc + (r.curr - r.prev), 0);
                const energyTotal = consumption * bill.kwh_value;
                const waterTotalDetail = (waterConsumption * (bill.water_value || 0)) + (bill.water_service_fee || 0);

                return (
                  <>
                    <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/80 flex items-center justify-between">
                      <div>
                        <h3 className="font-black text-gray-900 text-lg uppercase tracking-tight flex items-center gap-3">
                          <FileText className="text-indigo-600" size={24} />
                          Extrato Mensal - {capitalizedMonth} / {year}
                        </h3>
                        <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">
                          {user?.name || 'Usuário'}
                          {user && ((user.street || user.rua) || (user.house_number || user.casa)) && (
                            <span className="font-normal text-gray-400 normal-case ml-2">
                              • {[user.street || user.rua, (user.house_number || user.casa) ? `Casa ${user.house_number || user.casa}` : ''].filter(Boolean).join(', ')}
                            </span>
                          )}
                          {user?.cpf && (
                            <span className="font-mono text-gray-400 normal-case ml-2">
                              • CPF: {user.cpf}
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 no-export">
                        <button 
                          onClick={() => exportPendingDetailsToPDF(invoiceModalRef, `extrato-${user?.name.toLowerCase().replace(/\s+/g, '-') || 'conta'}-${bill.month_reference}`, 'save')}
                          className="flex items-center gap-2 bg-white text-gray-700 px-4 py-2 rounded-xl text-xs font-bold border border-gray-200 hover:bg-gray-50 transition-all shadow-sm"
                          title="Gerar PDF"
                        >
                          <FileDown size={14} />
                          PDF
                        </button>
                        <button 
                          onClick={() => {
                            const shareText = user ? getBillWhatsAppMessage(bill, user, settings) : undefined;
                            exportPendingDetailsToPDF(invoiceModalRef, `extrato-${user?.name.toLowerCase().replace(/\s+/g, '-') || 'conta'}-${bill.month_reference}`, 'share', shareText);
                          }}
                          className="flex items-center gap-2 bg-indigo-50 text-indigo-700 px-4 py-2 rounded-xl text-xs font-bold border border-indigo-100 hover:bg-indigo-100 transition-all shadow-sm"
                          title="Compartilhar PDF"
                        >
                          <Share2 size={14} />
                          Compartilhar
                        </button>
                        {bill.status !== 'paid' && (
                          <button
                            onClick={() => {
                              setInvoiceDetailsModal({ isOpen: false, bill: null });
                              handleToggleStatusClick(bill);
                            }}
                            className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-indigo-700 transition-all shadow-sm"
                          >
                            <Check size={14} />
                            RECEBER
                          </button>
                        )}
                        <button
                          onClick={() => sendWhatsApp(bill)}
                          className="flex items-center gap-2 bg-green-500 text-white px-5 py-2 rounded-xl text-xs font-black hover:bg-green-600 transition-all shadow-sm"
                        >
                          <WhatsAppIcon size={14} />
                          WhatsApp
                        </button>
                        <button 
                          onClick={() => setInvoiceDetailsModal({ isOpen: false, bill: null })}
                          className="p-2 hover:bg-gray-200 rounded-full transition-colors ml-2"
                        >
                          <XCircle size={24} className="text-gray-400" />
                        </button>
                      </div>
                    </div>

                    <div className="p-6 overflow-y-auto flex-1 bg-gray-50/30 report-container">
                      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden report-card">
                        <div className="bg-indigo-50/50 px-5 py-3 border-b border-indigo-100 flex justify-between items-center report-section-header">
                          <div className="flex flex-col flex-shrink-0">
                            <span className="text-xs font-black text-indigo-600 uppercase tracking-widest mb-0.5">{user?.name}</span>
                            <span className="font-black text-indigo-900 uppercase tracking-tighter whitespace-nowrap min-w-fit">{capitalizedMonth} / {year}</span>
                            {bill.due_date && (
                              <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">
                                Vencimento: {new Date(bill.due_date + 'T12:00:00').toLocaleDateString('pt-BR')}
                              </span>
                            )}
                          </div>
                          <span className="text-xs font-bold px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full uppercase no-export">
                            Resumo da Conta
                          </span>
                        </div>
                        
                        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-4">
                            <div>
                              <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                <Zap size={12} className="text-amber-500" /> Energia
                              </h4>
                              {energyReadings.length > 0 ? (
                                <div className="space-y-2">
                                  {energyReadings.map((r, idx) => (
                                    <div key={idx} className="bg-gray-50 p-2 rounded-lg text-xs">
                                      <div className="flex justify-between text-gray-500">
                                        <span>Padrão {idx + 1}:</span>
                                        <span className="font-mono">{r.prev.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} → {r.curr.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</span>
                                      </div>
                                      <div className="flex justify-between font-bold text-gray-700 mt-1">
                                        <span>Consumo:</span>
                                        <span>{Number(r.curr - r.prev).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} kWh</span>
                                      </div>
                                    </div>
                                  ))}
                                  <div className="pt-2 border-t border-gray-100 flex justify-between text-xs font-bold text-gray-900">
                                    <span>Subtotal Energia:</span>
                                    <span>R$ {energyTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                  </div>
                                </div>
                              ) : <p className="text-xs text-gray-400 italic">Não aplicável</p>}
                            </div>
                          </div>

                          <div className="space-y-4">
                            <div>
                              <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                <Briefcase size={12} className="text-blue-500" /> Água
                              </h4>
                              {waterReadings.length > 0 ? (
                                <div className="space-y-2">
                                  {waterReadings.map((r, idx) => (
                                    <div key={idx} className="bg-gray-50 p-2 rounded-lg text-xs">
                                      <div className="flex justify-between text-gray-500">
                                        <span>Mesa/Hidrômetro {idx + 1}:</span>
                                        <span className="font-mono">{r.prev.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} → {r.curr.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</span>
                                      </div>
                                      <div className="flex justify-between font-bold text-gray-700 mt-1">
                                        <span>Consumo:</span>
                                        <span>{Number(r.curr - r.prev).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} m³</span>
                                      </div>
                                    </div>
                                  ))}
                                  <div className="flex justify-between text-xs text-gray-600 mt-1">
                                    <span>Taxa Prestador:</span>
                                    <span>R$ {(bill.water_service_fee || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                  </div>
                                  <div className="pt-2 border-t border-gray-100 flex justify-between text-xs font-bold text-gray-900">
                                    <span>Subtotal Água:</span>
                                    <span>R$ {waterTotalDetail.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                  </div>
                                </div>
                              ) : <p className="text-xs text-gray-400 italic">Não aplicável</p>}
                            </div>
                          </div>
                        </div>

                        <div className="bg-gray-50/50 p-5 pt-0 grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="bg-indigo-50/30 p-3 rounded-xl border border-indigo-100/50">
                            <span className="text-[10px] block font-bold text-indigo-400 uppercase">Fundo de Reserva</span>
                            <span className="text-sm font-bold text-indigo-900">R$ {(bill.reserve_fund || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>
                          <div className="bg-indigo-50/30 p-3 rounded-xl border border-indigo-100/50">
                            <span className="text-[10px] block font-bold text-indigo-400 uppercase">Rateio Adv/Cont</span>
                            <span className="text-sm font-bold text-indigo-900">R$ {(bill.apportionment_value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>
                          <div className="bg-indigo-900 p-3 rounded-xl shadow-lg">
                            <span className="text-[10px] block font-bold text-indigo-200 uppercase">Total Geral</span>
                            <span className="text-lg font-black text-white">R$ {bill.total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>
                        </div>
                        
                        {settings.whatsapp_observation && (
                          <div className="mx-5 mb-5 p-4 bg-amber-50 border border-amber-100 rounded-2xl text-xs text-amber-800 italic show-on-export">
                            <p className="font-bold uppercase tracking-widest mb-1 not-italic text-amber-900">Observações:</p>
                            <div className="whitespace-pre-wrap">{settings.whatsapp_observation}</div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="px-6 py-5 bg-gray-50 border-t border-gray-100 flex flex-col gap-3 no-export">
                      <div className="flex flex-col sm:flex-row gap-3">
                        {bill.status !== 'paid' && (
                          <button
                            onClick={() => {
                              setInvoiceDetailsModal({ isOpen: false, bill: null });
                              handleToggleStatusClick(bill);
                            }}
                            className="flex-1 flex items-center justify-center gap-3 bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-indigo-700 transition-all shadow-lg active:scale-95"
                          >
                            <Check size={20} />
                            RECEBER
                          </button>
                        )}
                        <button
                          onClick={() => sendWhatsApp(bill)}
                          className="flex-1 flex items-center justify-center gap-3 bg-green-500 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-green-600 transition-all shadow-lg active:scale-95"
                        >
                          <WhatsAppIcon size={20} />
                          WhatsApp
                        </button>
                      </div>
                      <div className="flex gap-3 justify-end items-center mt-2">
                        <button 
                          onClick={() => {
                            const shareText = user ? getBillWhatsAppMessage(bill, user, settings) : undefined;
                            exportPendingDetailsToPDF(invoiceModalRef, `extrato-${user?.name.toLowerCase().replace(/\s+/g, '-') || 'conta'}-${bill.month_reference}`, 'share', shareText);
                          }}
                          className="flex items-center gap-2 bg-indigo-50 text-indigo-700 px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-indigo-100 transition-all shadow-sm active:scale-95"
                        >
                          <Share2 size={16} />
                          Compartilhar PDF
                        </button>
                        <button 
                          onClick={() => setInvoiceDetailsModal({ isOpen: false, bill: null })}
                          className="bg-gray-200 text-gray-700 px-8 py-3 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-gray-300 transition-all shadow-md active:scale-95"
                        >
                          Fechar
                        </button>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          </motion.div>
        </div>,
        document.body
      )}
    </div>
  );
};
