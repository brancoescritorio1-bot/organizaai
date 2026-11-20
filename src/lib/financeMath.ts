import { FinancialAccount, FinancialTransaction } from '../types';

export function normalizeDateStr(dateStr?: string | null): string {
  if (!dateStr) return '';
  return String(dateStr).split('T')[0].split(' ')[0];
}

export function addMonthsPreservingDay(dateStr: string, monthsToAdd: number): string {
  if (!dateStr) return dateStr;
  const clean = normalizeDateStr(dateStr);
  const [y, m, d] = clean.split('-').map(Number);
  if (!y || !m || !d) return dateStr;

  let targetYear = y;
  let targetMonth = (m - 1) + monthsToAdd;
  targetYear += Math.floor(targetMonth / 12);
  targetMonth = ((targetMonth % 12) + 12) % 12;

  const maxDays = new Date(targetYear, targetMonth + 1, 0).getDate();
  const clampedDay = Math.min(d, maxDays);

  return `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}-${String(clampedDay).padStart(2, '0')}`;
}

export interface CreditCardInvoiceInfo {
  closingYear: number;
  closingMonth: number; // 0-indexed
  dueYear: number;
  dueMonth: number; // 0-indexed
  dueDateStr: string;
}

/**
 * Determines which invoice billing cycle and due date a credit card purchase belongs to.
 * Purchases strictly ON or BEFORE closingDay enter the current billing cycle;
 * Purchases AFTER closingDay enter the following billing cycle.
 * If dueDay <= closingDay, due date shifts to the month after closing (e.g., closes 25th, due 5th of next month).
 */
export function calculateCreditCardInvoiceDates(
  purchaseDateStr: string,
  closingDay: number,
  dueDay: number
): CreditCardInvoiceInfo {
  const clean = normalizeDateStr(purchaseDateStr);
  if (!clean) {
    const now = new Date();
    return {
      closingYear: now.getFullYear(),
      closingMonth: now.getMonth(),
      dueYear: now.getFullYear(),
      dueMonth: now.getMonth(),
      dueDateStr: '',
    };
  }

  const [y, m, d] = clean.split('-').map(Number);
  let closingMonth = m - 1;
  let closingYear = y;

  if (d > closingDay) {
    closingMonth += 1;
  }
  if (closingMonth > 11) {
    closingYear += Math.floor(closingMonth / 12);
    closingMonth = closingMonth % 12;
  }

  let dueMonth = closingMonth;
  let dueYear = closingYear;
  if (dueDay <= closingDay) {
    dueMonth += 1;
    if (dueMonth > 11) {
      dueYear += Math.floor(dueMonth / 12);
      dueMonth = dueMonth % 12;
    }
  }

  const maxDueDays = new Date(dueYear, dueMonth + 1, 0).getDate();
  const clampedDueDay = Math.min(dueDay, maxDueDays);
  const dueDateStr = `${dueYear}-${String(dueMonth + 1).padStart(2, '0')}-${String(clampedDueDay).padStart(2, '0')}`;

  return { closingYear, closingMonth, dueYear, dueMonth, dueDateStr };
}

/**
 * Computes the billing window [start, end] and actual due date for a card's invoice due in (targetYear, targetMonth 0-indexed).
 */
export function getCreditCardInvoiceWindow(
  targetYear: number,
  targetMonth: number,
  closingDay: number,
  dueDay: number
): { startDate: Date; endDate: Date; dueDate: Date; startStr: string; endStr: string; dueStr: string } {
  // Closing happens in targetMonth if dueDay > closingDay, else in targetMonth - 1
  let closingYear = targetYear;
  let closingMonth = dueDay <= closingDay ? targetMonth - 1 : targetMonth;
  if (closingMonth < 0) {
    closingYear -= 1;
    closingMonth += 12;
  }

  // Previous closing was in closingMonth - 1
  let prevClosingYear = closingYear;
  let prevClosingMonth = closingMonth - 1;
  if (prevClosingMonth < 0) {
    prevClosingYear -= 1;
    prevClosingMonth += 12;
  }

  const prevMaxDays = new Date(prevClosingYear, prevClosingMonth + 1, 0).getDate();
  const clampedPrevClose = Math.min(closingDay, prevMaxDays);
  const startDate = new Date(prevClosingYear, prevClosingMonth, clampedPrevClose + 1, 12, 0, 0);

  const currMaxDays = new Date(closingYear, closingMonth + 1, 0).getDate();
  const clampedCurrClose = Math.min(closingDay, currMaxDays);
  const endDate = new Date(closingYear, closingMonth, clampedCurrClose, 12, 0, 0);

  const dueMaxDays = new Date(targetYear, targetMonth + 1, 0).getDate();
  const clampedDueDay = Math.min(dueDay, dueMaxDays);
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
  tx: Pick<FinancialTransaction, 'date' | 'due_date' | 'account_id'>,
  account?: Pick<FinancialAccount, 'type' | 'closing_day' | 'due_day'> | null
): { year: number; month: number } {
  if (account?.type === 'credito') {
    const cleanDue = normalizeDateStr(tx.due_date);
    if (cleanDue) {
      const [y, m] = cleanDue.split('-').map(Number);
      if (y && m) return { year: y, month: m - 1 };
    }
    const info = calculateCreditCardInvoiceDates(
      tx.date,
      Number(account.closing_day || 1),
      Number(account.due_day || 10)
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
