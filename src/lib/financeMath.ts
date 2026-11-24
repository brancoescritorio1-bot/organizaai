import {
  FinancialAccount,
  FinancialCategory,
  FinancialTransaction,
  FinancialTransactionSplit,
} from '../types';

export function round2(val: number): number {
  return Math.round((Number(val) + Number.EPSILON) * 100) / 100;
}

export function normalizeDateStr(dateStr?: string | null): string {
  if (!dateStr) return '';
  return String(dateStr).split('T')[0].split(' ')[0];
}

export function daysInMonth(year: number, month0: number): number {
  return new Date(year, month0 + 1, 0).getDate();
}

export function clampDayToMonth(year: number, month0: number, day: number): number {
  const maxDays = daysInMonth(year, month0);
  const cleanDay = Math.max(1, Math.floor(Number(day) || 1));
  return Math.min(cleanDay, maxDays);
}

export function shiftYearMonth(year: number, month0: number, monthsToAdd: number): { year: number; month: number } {
  const totalMonths = year * 12 + month0 + monthsToAdd;
  const targetYear = Math.floor(totalMonths / 12);
  const targetMonth = ((totalMonths % 12) + 12) % 12;
  return { year: targetYear, month: targetMonth };
}

export function formatYearMonthDay(year: number, month0: number, day: number): string {
  const clamped = clampDayToMonth(year, month0, day);
  return `${year}-${String(month0 + 1).padStart(2, '0')}-${String(clamped).padStart(2, '0')}`;
}

export function addMonthsPreservingDay(dateStr: string, monthsToAdd: number): string {
  if (!dateStr) return dateStr;
  const clean = normalizeDateStr(dateStr);
  const [y, m, d] = clean.split('-').map(Number);
  if (!y || !m || !d) return dateStr;

  const shifted = shiftYearMonth(y, m - 1, monthsToAdd);
  return formatYearMonthDay(shifted.year, shifted.month, d);
}

export interface CreditCardInvoiceInfo {
  closingYear: number;
  closingMonth: number; // 0-indexed
  closingDateStr: string;
  dueYear: number;
  dueMonth: number; // 0-indexed
  dueDateStr: string;
}

/**
 * Determines which invoice billing cycle and due date a credit card purchase (or installment) belongs to.
 * - Effective closing day in purchase month is clamped to calendar days in that month (28/29/30/31).
 * - Purchases ON or BEFORE effective closing day enter the current cycle closing in purchase month.
 * - Purchases AFTER effective closing day enter the next billing cycle.
 * - If dueDay <= closingDay, due date shifts to the month after closing (e.g., closes 25th, due 5th of next month).
 * - installmentIndex (0-indexed) advances the due competence month while keeping the card's configured dueDay clamped per month.
 */
export function calculateCreditCardInvoiceDates(
  purchaseDateStr: string,
  closingDay: number,
  dueDay: number,
  installmentIndex: number = 0
): CreditCardInvoiceInfo {
  const clean = normalizeDateStr(purchaseDateStr);
  if (!clean) {
    const now = new Date();
    return {
      closingYear: now.getFullYear(),
      closingMonth: now.getMonth(),
      closingDateStr: '',
      dueYear: now.getFullYear(),
      dueMonth: now.getMonth(),
      dueDateStr: '',
    };
  }

  const [y, m, d] = clean.split('-').map(Number);
  if (!y || !m || !d) {
    const now = new Date();
    return {
      closingYear: now.getFullYear(),
      closingMonth: now.getMonth(),
      closingDateStr: '',
      dueYear: now.getFullYear(),
      dueMonth: now.getMonth(),
      dueDateStr: '',
    };
  }

  const cleanClosingDay = Math.max(1, Math.min(31, Math.floor(Number(closingDay) || 1)));
  const cleanDueDay = Math.max(1, Math.min(31, Math.floor(Number(dueDay) || 10)));
  const instOffset = Math.max(0, Math.floor(Number(installmentIndex) || 0));

  const effectiveClosingDayInPurchaseMonth = clampDayToMonth(y, m - 1, cleanClosingDay);
  const cycleShift = d > effectiveClosingDayInPurchaseMonth ? 1 : 0;

  const baseClosing = shiftYearMonth(y, m - 1, cycleShift + instOffset);
  const closingDateStr = formatYearMonthDay(baseClosing.year, baseClosing.month, cleanClosingDay);

  const dueMonthOffset = cleanDueDay <= cleanClosingDay ? 1 : 0;
  const dueYM = shiftYearMonth(baseClosing.year, baseClosing.month, dueMonthOffset);
  const dueDateStr = formatYearMonthDay(dueYM.year, dueYM.month, cleanDueDay);

  return {
    closingYear: baseClosing.year,
    closingMonth: baseClosing.month,
    closingDateStr,
    dueYear: dueYM.year,
    dueMonth: dueYM.month,
    dueDateStr,
  };
}

/**
 * Computes the billing window [startDate, endDate] and actual dueDate for a card's invoice due in (targetYear, targetMonth 0-indexed).
 */
export function getCreditCardInvoiceWindow(
  targetYear: number,
  targetMonth: number,
  closingDay: number,
  dueDay: number
): {
  startDate: Date;
  endDate: Date;
  dueDate: Date;
  startStr: string;
  endStr: string;
  dueStr: string;
} {
  const cleanClosingDay = Math.max(1, Math.min(31, Math.floor(Number(closingDay) || 1)));
  const cleanDueDay = Math.max(1, Math.min(31, Math.floor(Number(dueDay) || 10)));

  const closingShift = cleanDueDay <= cleanClosingDay ? -1 : 0;
  const closingYM = shiftYearMonth(targetYear, targetMonth, closingShift);
  const prevClosingYM = shiftYearMonth(closingYM.year, closingYM.month, -1);

  const clampedPrevClose = clampDayToMonth(prevClosingYM.year, prevClosingYM.month, cleanClosingDay);
  const startDate = new Date(prevClosingYM.year, prevClosingYM.month, clampedPrevClose + 1, 12, 0, 0);

  const clampedCurrClose = clampDayToMonth(closingYM.year, closingYM.month, cleanClosingDay);
  const endDate = new Date(closingYM.year, closingYM.month, clampedCurrClose, 12, 0, 0);

  const clampedDueDay = clampDayToMonth(targetYear, targetMonth, cleanDueDay);
  const dueDate = new Date(targetYear, targetMonth, clampedDueDay, 12, 0, 0);

  const fmt = (dt: Date) =>
    `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;

  return {
    startDate,
    endDate,
    dueDate,
    startStr: fmt(startDate),
    endStr: fmt(endDate),
    dueStr: fmt(dueDate),
  };
}

/**
 * Resolves the canonical competence year & 0-indexed month for ANY transaction.
 * For credit cards: uses due_date (invoice competence month), falling back to calculateCreditCardInvoiceDates.
 * For liquid accounts: uses transaction date (YYYY-MM-DD).
 */
export function getTransactionCompetence(
  tx: Pick<FinancialTransaction, 'date' | 'due_date' | 'account_id' | 'is_installment' | 'installment_number'>,
  account?: Pick<FinancialAccount, 'type' | 'closing_day' | 'due_day'> | null
): { year: number; month: number } {
  if (account?.type === 'credito') {
    const cleanDue = normalizeDateStr(tx.due_date);
    if (cleanDue) {
      const [y, m] = cleanDue.split('-').map(Number);
      if (y && m) return { year: y, month: m - 1 };
    }
    const instOffset = tx.is_installment ? Math.max(0, Number(tx.installment_number || 1) - 1) : 0;
    const info = calculateCreditCardInvoiceDates(
      tx.date,
      Number(account.closing_day || 1),
      Number(account.due_day || 10),
      instOffset
    );
    return { year: info.dueYear, month: info.dueMonth };
  }

  const cleanDate = normalizeDateStr(tx.date);
  if (cleanDate) {
    const [y, m] = cleanDate.split('-').map(Number);
    if (y && m) return { year: y, month: m - 1 };
  }
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() };
}

export function doesTransactionBelongToCompetence(
  tx: Pick<FinancialTransaction, 'date' | 'due_date' | 'account_id' | 'is_installment' | 'installment_number'>,
  account: Pick<FinancialAccount, 'type' | 'closing_day' | 'due_day'> | null | undefined,
  targetYear: number,
  targetMonth: number
): boolean {
  const comp = getTransactionCompetence(tx, account);
  return comp.year === targetYear && comp.month === targetMonth;
}

export function isTransactionBeforeCompetence(
  tx: Pick<FinancialTransaction, 'date' | 'due_date' | 'account_id' | 'is_installment' | 'installment_number'>,
  account: Pick<FinancialAccount, 'type' | 'closing_day' | 'due_day'> | null | undefined,
  targetYear: number,
  targetMonth: number
): boolean {
  const comp = getTransactionCompetence(tx, account);
  return comp.year < targetYear || (comp.year === targetYear && comp.month < targetMonth);
}

export function distributeInstallmentsCents(totalAmount: number, totalInstallments: number): number[] {
  const totalCents = Math.round(Number(totalAmount || 0) * 100);
  const n = Math.max(1, Math.floor(totalInstallments));
  const baseCents = Math.floor(totalCents / n);
  const remainderCents = totalCents % n;

  const results: number[] = [];
  for (let i = 1; i <= n; i++) {
    const cents = baseCents + (i <= remainderCents ? 1 : 0);
    results.push(Number((cents / 100).toFixed(2)));
  }
  return results;
}

export function distributeSplitsCents(
  splits: FinancialTransactionSplit[],
  totalInstallments: number,
  existingPerInstallmentSplits?: Array<FinancialTransactionSplit[] | undefined>,
  forceInitialPending: boolean = false
): FinancialTransactionSplit[][] {
  const n = Math.max(1, Math.floor(totalInstallments));
  if (!Array.isArray(splits) || splits.length === 0) {
    return Array.from({ length: n }, () => []);
  }

  const distributedPerPerson = splits.map((s) => {
    const amounts = distributeInstallmentsCents(Number(s.amount || 0), n);
    return {
      name: String(s.name || '').trim(),
      amounts,
      defaultStatus: forceInitialPending ? ('pendente' as const) : (s.status || 'pendente'),
    };
  });

  const result: FinancialTransactionSplit[][] = [];
  for (let i = 0; i < n; i++) {
    const existingForInst = existingPerInstallmentSplits?.[i];
    result.push(
      distributedPerPerson
        .filter((p) => p.name.length > 0)
        .map((p) => {
          const matchedExisting = Array.isArray(existingForInst)
            ? existingForInst.find((es) => String(es.name || '').trim().toLowerCase() === p.name.toLowerCase())
            : undefined;
          return {
            name: p.name,
            amount: p.amounts[i],
            status: forceInitialPending
              ? 'pendente'
              : matchedExisting?.status || p.defaultStatus,
          };
        })
    );
  }
  return result;
}

export type ConsolidatedPurchaseStatus = 'pendente' | 'parcial' | 'quitada';

export interface ResolvedPurchaseGroup {
  parentId: number;
  anchor: FinancialTransaction;
  siblings: FinancialTransaction[];
  isInstallmentPurchase: boolean;
  totalAmount: number;
  grossAmount: number;
  discountAmount: number;
  purchaseDate: string;
  totalInstallments: number;
  splits: FinancialTransactionSplit[];
  paidCount: number;
  pendingCount: number;
  paidAmount: number;
  pendingAmount: number;
  consolidatedStatus: ConsolidatedPurchaseStatus;
}

/**
 * Reconstructs the original purchase record from ANY installment (or single transaction).
 * Guarantees that editing always opens the true original purchase total, purchase date,
 * installment count, and total splits instead of a single installment slice.
 */
export function resolvePurchaseGroup(
  tx: FinancialTransaction,
  allTransactions: FinancialTransaction[]
): ResolvedPurchaseGroup {
  const isInst = Boolean(tx.is_installment && Number(tx.total_installments || 1) > 1);
  if (!isInst) {
    const amt = round2(Number(tx.amount || 0));
    const discount = round2(Number(tx.discount_amount || 0));
    const gross = tx.gross_amount != null ? round2(Number(tx.gross_amount)) : round2(amt + discount);
    const isPaid = tx.status === 'pago';
    return {
      parentId: tx.id,
      anchor: tx,
      siblings: [tx],
      isInstallmentPurchase: false,
      totalAmount: amt,
      grossAmount: gross,
      discountAmount: discount,
      purchaseDate: normalizeDateStr(tx.date),
      totalInstallments: 1,
      splits: (tx.splits || []).map((s) => ({ ...s, amount: round2(Number(s.amount || 0)) })),
      paidCount: isPaid ? 1 : 0,
      pendingCount: isPaid ? 0 : 1,
      paidAmount: isPaid ? amt : 0,
      pendingAmount: isPaid ? 0 : amt,
      consolidatedStatus: isPaid ? 'quitada' : 'pendente',
    };
  }

  const parentId = Number(tx.parent_transaction_id || tx.id);
  const siblings = allTransactions
    .filter((s) => Number(s.id) === parentId || Number(s.parent_transaction_id) === parentId)
    .sort((a, b) => Number(a.installment_number || 1) - Number(b.installment_number || 1));

  const safeSiblings = siblings.length > 0 ? siblings : [tx];
  const anchor = safeSiblings[0];

  const totalAmount = round2(safeSiblings.reduce((sum, s) => sum + Number(s.amount || 0), 0));
  const discountAmount = round2(
    safeSiblings.reduce((sum, s) => sum + Number(s.discount_amount || 0), 0)
  );
  const grossAmount =
    anchor.gross_amount != null && Number(anchor.gross_amount) > 0 && safeSiblings.every((s) => s.gross_amount == null || s.id === anchor.id)
      ? round2(Number(anchor.gross_amount))
      : round2(totalAmount + discountAmount);

  const totalInstallments = Math.max(
    safeSiblings.length,
    Number(anchor.total_installments || safeSiblings.length)
  );

  // Aggregate splits across all siblings so the form receives the total purchase split per person
  const splitsMap = new Map<
    string,
    { name: string; amountCents: number; allPaid: boolean; anyPaid: boolean }
  >();
  safeSiblings.forEach((s) => {
    if (Array.isArray(s.splits)) {
      s.splits.forEach((sp) => {
        const trimmed = String(sp.name || '').trim();
        if (!trimmed) return;
        const key = trimmed.toLowerCase();
        const existing = splitsMap.get(key);
        const spPaid = sp.status === 'pago';
        const cents = Math.round(Number(sp.amount || 0) * 100);
        if (existing) {
          existing.amountCents += cents;
          existing.allPaid = existing.allPaid && spPaid;
          existing.anyPaid = existing.anyPaid || spPaid;
        } else {
          splitsMap.set(key, {
            name: trimmed,
            amountCents: cents,
            allPaid: spPaid,
            anyPaid: spPaid,
          });
        }
      });
    }
  });

  const splits: FinancialTransactionSplit[] = Array.from(splitsMap.values()).map((v) => ({
    name: v.name,
    amount: Number((v.amountCents / 100).toFixed(2)),
    status: v.allPaid ? 'pago' : 'pendente',
  }));

  const paidCount = safeSiblings.filter((s) => s.status === 'pago').length;
  const pendingCount = safeSiblings.length - paidCount;
  const paidAmount = round2(
    safeSiblings.filter((s) => s.status === 'pago').reduce((sum, s) => sum + Number(s.amount || 0), 0)
  );
  const pendingAmount = round2(Math.max(0, totalAmount - paidAmount));

  const consolidatedStatus: ConsolidatedPurchaseStatus =
    pendingCount === 0 ? 'quitada' : paidCount > 0 ? 'parcial' : 'pendente';

  return {
    parentId,
    anchor,
    siblings: safeSiblings,
    isInstallmentPurchase: true,
    totalAmount,
    grossAmount,
    discountAmount,
    purchaseDate: normalizeDateStr(anchor.date),
    totalInstallments,
    splits,
    paidCount,
    pendingCount,
    paidAmount,
    pendingAmount,
    consolidatedStatus,
  };
}

export function getAccountCreditLimit(acc?: Pick<FinancialAccount, 'type' | 'credit_limit' | 'initial_balance'> | null): number {
  if (!acc || acc.type !== 'credito') return 0;
  const raw = acc.credit_limit != null ? Number(acc.credit_limit) : Number(acc.initial_balance || 0);
  return Number.isFinite(raw) && raw > 0 ? round2(raw) : 0;
}

export function isInvoicePaymentTransaction(
  tx: Pick<FinancialTransaction, 'description'>,
  categoryName: string = ''
): boolean {
  const cat = String(categoryName || '').toLowerCase();
  const desc = String(tx.description || '').toLowerCase();
  return cat.includes('fatura') || desc.includes('pagamento fatura');
}

export function isTransferTransaction(
  tx: Pick<FinancialTransaction, 'description' | 'is_transfer'>,
  categoryName: string = ''
): boolean {
  if (tx.is_transfer) return true;
  const cat = String(categoryName || '').toLowerCase();
  const desc = String(tx.description || '').toLowerCase();
  return (
    cat.includes('transferência') ||
    cat.includes('transferencia') ||
    desc.startsWith('transferência ') ||
    desc.startsWith('transferencia ')
  );
}

export interface AccountSummaryItem {
  id: number;
  name: string;
  type: FinancialAccount['type'];
  initial_balance: number;
  balance: number; // Realized cash balance up to filtered month (liquid) or negative invoice pending (credit card compat)
  projected_balance: number; // Liquid balance including pending items up to filtered month
  credit_limit: number;
  credit_used: number;
  credit_available: number | null;
  closing_day?: number | null;
  due_day?: number | null;
  invoice_due_date?: string | null;
  invoice_total: number;
  invoice_paid: number;
  invoice_pending: number;
  responsibles: Record<string, number>;
}

export interface ResponsibleDetailItem {
  name: string;
  total: number;
  paid: number;
  pending: number;
}

export interface ComputedFinancialDashboard {
  total_balance: number; // Projected end-of-month balance across liquid accounts after pending items & unpaid CC bills
  cash_balance: number; // Realized cash balance across liquid accounts up to end of filtered month
  previous_balance: number; // Realized cash balance at end of previous month
  month_income: number;
  month_income_paid: number;
  month_income_pending: number;
  month_expense: number; // Total expenses of competence (liquid non-invoice/non-transfer + CC invoice items)
  month_expense_paid: number;
  month_expense_pending: number;
  month_liquid_expense: number;
  month_invoice_payments: number;
  month_net: number;
  pending_receivables: number;
  pending_payables: number;
  credit_card_total: number;
  credit_card_paid: number;
  credit_card_pending: number;
  expenses_by_category: Array<{ category_id: number | null; name: string; value: number }>;
  responsibility_summary: Record<string, number>;
  responsibility_details: ResponsibleDetailItem[];
  accounts_summary: AccountSummaryItem[];
  transactions: FinancialTransaction[];
  accounts: FinancialAccount[];
}

export function computeFinancialDashboard(params: {
  transactions: FinancialTransaction[];
  accounts: FinancialAccount[];
  categories: FinancialCategory[];
  month: number;
  year: number;
}): ComputedFinancialDashboard {
  const { transactions = [], accounts = [], categories = [], month: filterMonth, year: filterYear } = params;

  const accountMap = new Map<number, FinancialAccount>();
  accounts.forEach((acc) => accountMap.set(Number(acc.id), acc));

  const categoryMap = new Map<number, string>();
  categories.forEach((cat) => categoryMap.set(Number(cat.id), String(cat.name || '')));

  let liquidInitialBalance = 0;
  accounts.forEach((acc) => {
    if (acc.type !== 'credito') {
      liquidInitialBalance += Number(acc.initial_balance || 0);
    }
  });

  let previousRealizedBalance = liquidInitialBalance;
  let monthLiquidPaidIn = 0;
  let monthLiquidPaidOut = 0;
  let monthLiquidNetAll = 0; // all liquid flows in month (including pending & transfers & invoice payments)
  let monthLiquidExpense = 0;
  let monthLiquidInvoicePayments = 0;

  let monthIncome = 0;
  let monthIncomePaid = 0;
  let monthIncomePending = 0;

  let monthExpense = 0;
  let monthExpensePaid = 0;
  let monthExpensePending = 0;

  let pendingReceivablesMonth = 0;
  let pendingPayablesMonth = 0;

  let creditCardMonthTotal = 0;
  let creditCardMonthPaid = 0;
  let creditCardMonthPending = 0;

  const categoryExpensesMap = new Map<string, { category_id: number | null; name: string; value: number }>();
  const responsibilityMap = new Map<string, ResponsibleDetailItem>();
  const accountsSummaryMap = new Map<number, AccountSummaryItem>();

  accounts.forEach((acc) => {
    const isCard = acc.type === 'credito';
    const closingDay = Number(acc.closing_day || 1);
    const dueDay = Number(acc.due_day || 10);
    const limit = getAccountCreditLimit(acc);

    accountsSummaryMap.set(Number(acc.id), {
      id: Number(acc.id),
      name: acc.name,
      type: acc.type,
      initial_balance: isCard ? 0 : Number(acc.initial_balance || 0),
      balance: isCard ? 0 : Number(acc.initial_balance || 0),
      projected_balance: isCard ? 0 : Number(acc.initial_balance || 0),
      credit_limit: limit,
      credit_used: 0,
      credit_available: isCard && limit > 0 ? limit : null,
      closing_day: acc.closing_day ?? null,
      due_day: acc.due_day ?? null,
      invoice_due_date: isCard ? getCreditCardInvoiceWindow(filterYear, filterMonth, closingDay, dueDay).dueStr : null,
      invoice_total: 0,
      invoice_paid: 0,
      invoice_pending: 0,
      responsibles: {},
    });
  });

  transactions.forEach((t) => {
    if (!t.date) return;
    const amount = round2(Number(t.amount || 0));
    const acc = t.account_id != null ? accountMap.get(Number(t.account_id)) : undefined;
    const isCreditCard = acc?.type === 'credito';
    const isPaid = t.status === 'pago';
    const rawCatName = t.category_id != null ? categoryMap.get(Number(t.category_id)) || '' : '';
    const catLower = rawCatName.toLowerCase();

    const isInvPayment = isInvoicePaymentTransaction(t, catLower);
    const isTransfer = isTransferTransaction(t, catLower);

    const belongsToMonth = doesTransactionBelongToCompetence(t, acc, filterYear, filterMonth);
    const isBeforeMonth = isTransactionBeforeCompetence(t, acc, filterYear, filterMonth);
    const isUpToMonth = belongsToMonth || isBeforeMonth;

    const accSummary = t.account_id != null ? accountsSummaryMap.get(Number(t.account_id)) : undefined;

    // 1. Account balances & credit card limit usage
    if (accSummary) {
      if (!isCreditCard) {
        if (isUpToMonth) {
          const signed = t.type === 'receita' ? amount : -amount;
          accSummary.projected_balance = round2(accSummary.projected_balance + signed);
          if (isPaid) {
            accSummary.balance = round2(accSummary.balance + signed);
          }
        }
      } else {
        // Credit card used limit across ALL unpaid items (including future installments)
        if (!isPaid && !isTransfer) {
          const delta = t.type === 'despesa' ? amount : -amount;
          accSummary.credit_used = round2(accSummary.credit_used + delta);
        }
        if (belongsToMonth && !isTransfer) {
          if (t.type === 'despesa') {
            const paidPart =
              Array.isArray(t.splits) && t.splits.length > 0 && !isPaid
                ? round2(
                    t.splits.reduce(
                      (sSum, s) => sSum + (s.status === 'pago' ? Number(s.amount || 0) : 0),
                      0
                    )
                  )
                : isPaid
                ? amount
                : 0;
            const boundedPaid = Math.min(amount, paidPart);
            const pendingPart = round2(Math.max(0, amount - boundedPaid));
            accSummary.invoice_total = round2(accSummary.invoice_total + amount);
            accSummary.invoice_paid = round2(accSummary.invoice_paid + boundedPaid);
            accSummary.invoice_pending = round2(accSummary.invoice_pending + pendingPart);
          } else {
            // Credit/refund on card reduces invoice total and pending
            accSummary.invoice_total = round2(accSummary.invoice_total - amount);
            if (isPaid) {
              accSummary.invoice_paid = round2(accSummary.invoice_paid - amount);
            } else {
              accSummary.invoice_pending = round2(accSummary.invoice_pending - amount);
            }
          }
        }
      }
    }

    // 2. Previous realized liquid cash balance
    if (isBeforeMonth && !isCreditCard && isPaid) {
      if (t.type === 'receita') {
        previousRealizedBalance = round2(previousRealizedBalance + amount);
      } else {
        previousRealizedBalance = round2(previousRealizedBalance - amount);
      }
    }

    // 3. Selected Month Flows & Competence Metrics
    if (belongsToMonth) {
      if (!isCreditCard) {
        const signed = t.type === 'receita' ? amount : -amount;
        monthLiquidNetAll = round2(monthLiquidNetAll + signed);
        if (isPaid) {
          if (t.type === 'receita') monthLiquidPaidIn = round2(monthLiquidPaidIn + amount);
          else monthLiquidPaidOut = round2(monthLiquidPaidOut + amount);
        }
      }

      if (t.type === 'receita') {
        if (!isTransfer) {
          if (isCreditCard) {
            // Refund on credit card lowers monthly expenses & CC total
            monthExpense = round2(monthExpense - amount);
            if (isPaid) monthExpensePaid = round2(monthExpensePaid - amount);
            else monthExpensePending = round2(monthExpensePending - amount);

            creditCardMonthTotal = round2(creditCardMonthTotal - amount);
            if (isPaid) creditCardMonthPaid = round2(creditCardMonthPaid - amount);
            else creditCardMonthPending = round2(creditCardMonthPending - amount);
          } else {
            monthIncome = round2(monthIncome + amount);
            if (isPaid) {
              monthIncomePaid = round2(monthIncomePaid + amount);
            } else {
              monthIncomePending = round2(monthIncomePending + amount);
              pendingReceivablesMonth = round2(pendingReceivablesMonth + amount);
            }
          }
        }
      } else {
        // Expense
        if (isInvPayment && !isCreditCard) {
          monthLiquidInvoicePayments = round2(monthLiquidInvoicePayments + amount);
        } else if (!isTransfer) {
          if (!isCreditCard) {
            monthLiquidExpense = round2(monthLiquidExpense + amount);
            if (!isPaid) {
              pendingPayablesMonth = round2(pendingPayablesMonth + amount);
            }
          } else {
            const paidPart =
              Array.isArray(t.splits) && t.splits.length > 0 && !isPaid
                ? round2(
                    t.splits.reduce(
                      (sSum, s) => sSum + (s.status === 'pago' ? Number(s.amount || 0) : 0),
                      0
                    )
                  )
                : isPaid
                ? amount
                : 0;
            const boundedPaid = Math.min(amount, paidPart);
            const pendingPart = round2(Math.max(0, amount - boundedPaid));

            creditCardMonthTotal = round2(creditCardMonthTotal + amount);
            creditCardMonthPaid = round2(creditCardMonthPaid + boundedPaid);
            creditCardMonthPending = round2(creditCardMonthPending + pendingPart);
            pendingPayablesMonth = round2(pendingPayablesMonth + pendingPart);
          }

          const paidPortion = isCreditCard
            ? isPaid
              ? amount
              : Array.isArray(t.splits) && t.splits.length > 0
              ? Math.min(
                  amount,
                  round2(
                    t.splits.reduce(
                      (sSum, s) => sSum + (s.status === 'pago' ? Number(s.amount || 0) : 0),
                      0
                    )
                  )
                )
              : 0
            : isPaid
            ? amount
            : 0;
          const pendingPortion = round2(Math.max(0, amount - paidPortion));

          monthExpense = round2(monthExpense + amount);
          monthExpensePaid = round2(monthExpensePaid + paidPortion);
          monthExpensePending = round2(monthExpensePending + pendingPortion);

          const catDisplayName = rawCatName || 'Sem Categoria';
          const catKey = `${t.category_id ?? 'none'}::${catDisplayName}`;
          const prevCat = categoryExpensesMap.get(catKey);
          if (prevCat) {
            prevCat.value = round2(prevCat.value + amount);
          } else {
            categoryExpensesMap.set(catKey, {
              category_id: t.category_id ?? null,
              name: catDisplayName,
              value: amount,
            });
          }
        }

        // Splits / Responsibility Summary for the month
        if (!isTransfer && !isInvPayment && Array.isArray(t.splits)) {
          t.splits.forEach((s) => {
            const trimmedName = String(s.name || '').trim() || 'Outros';
            const key = trimmedName.toLowerCase();
            const sAmount = round2(Number(s.amount || 0));
            const sPaid = isPaid || s.status === 'pago';

            const cur = responsibilityMap.get(key) || {
              name: trimmedName,
              total: 0,
              paid: 0,
              pending: 0,
            };
            cur.total = round2(cur.total + sAmount);
            if (sPaid) {
              cur.paid = round2(cur.paid + sAmount);
            } else {
              cur.pending = round2(cur.pending + sAmount);
              pendingReceivablesMonth = round2(pendingReceivablesMonth + sAmount);
              if (accSummary) {
                accSummary.responsibles[cur.name] = round2(
                  (accSummary.responsibles[cur.name] || 0) + sAmount
                );
              }
            }
            responsibilityMap.set(key, cur);
          });
        }
      }
    }
  });

  // Finalize credit card limit availability & clean rounding
  accountsSummaryMap.forEach((acc) => {
    if (acc.type === 'credito') {
      acc.credit_used = Math.max(0, round2(acc.credit_used));
      acc.credit_available = acc.credit_limit > 0 ? round2(acc.credit_limit - acc.credit_used) : null;
      acc.balance = round2(-acc.invoice_pending);
      acc.projected_balance = round2(-acc.invoice_total);
    }
  });

  const cashRealizedBalance = round2(previousRealizedBalance + monthLiquidPaidIn - monthLiquidPaidOut);
  const projectedBalance = round2(
    previousRealizedBalance + monthLiquidNetAll - Math.max(0, creditCardMonthPending)
  );

  const responsibilitySummary: Record<string, number> = {};
  const responsibilityDetails = Array.from(responsibilityMap.values()).sort((a, b) =>
    a.name.localeCompare(b.name)
  );
  responsibilityDetails.forEach((item) => {
    if (item.pending > 0) {
      responsibilitySummary[item.name] = item.pending;
    }
  });

  const expensesByCategory = Array.from(categoryExpensesMap.values())
    .filter((c) => c.value > 0)
    .sort((a, b) => b.value - a.value);

  return {
    total_balance: projectedBalance,
    cash_balance: cashRealizedBalance,
    previous_balance: round2(previousRealizedBalance),
    month_income: round2(monthIncome),
    month_income_paid: round2(monthIncomePaid),
    month_income_pending: round2(monthIncomePending),
    month_expense: round2(monthExpense),
    month_expense_paid: round2(monthExpensePaid),
    month_expense_pending: round2(monthExpensePending),
    month_liquid_expense: round2(monthLiquidExpense),
    month_invoice_payments: round2(monthLiquidInvoicePayments),
    month_net: round2(monthIncome - monthExpense),
    pending_receivables: round2(pendingReceivablesMonth),
    pending_payables: round2(pendingPayablesMonth),
    credit_card_total: round2(creditCardMonthTotal),
    credit_card_paid: round2(creditCardMonthPaid),
    credit_card_pending: round2(creditCardMonthPending),
    expenses_by_category: expensesByCategory,
    responsibility_summary: responsibilitySummary,
    responsibility_details: responsibilityDetails,
    accounts_summary: Array.from(accountsSummaryMap.values()),
    transactions,
    accounts,
  };
}
