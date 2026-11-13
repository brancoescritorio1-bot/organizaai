import { ChacaraBill, ChacaraExpense, ChacaraUser } from '../types';

export type ChacaraCategoryId =
  | 'fundo_reserva'
  | 'agua'
  | 'energia'
  | 'prestador'
  | 'rateio';

export interface ChacaraCategoryMeta {
  id: ChacaraCategoryId;
  paidKey: 'reserve_fund' | 'water_total' | 'energy_total' | 'water_service_fee' | 'apportionment';
  title: string;
  shortTitle: string;
}

export const CHACARA_CATEGORIES: ChacaraCategoryMeta[] = [
  { id: 'fundo_reserva', paidKey: 'reserve_fund', title: 'Fundo de Reserva', shortTitle: 'F. Reserva' },
  { id: 'agua', paidKey: 'water_total', title: 'Água', shortTitle: 'Água' },
  { id: 'energia', paidKey: 'energy_total', title: 'Energia', shortTitle: 'Energia' },
  { id: 'prestador', paidKey: 'water_service_fee', title: 'Prestador de Serviço', shortTitle: 'Prestador' },
  { id: 'rateio', paidKey: 'apportionment', title: 'Rateio', shortTitle: 'Rateio' },
];

export interface ChacaraDashboardFilter {
  mode: 'competence' | 'custom';
  year: string; // 'YYYY' or 'all'
  month: string; // 'MM' or 'all'
  startDate: string; // 'YYYY-MM-DD'
  endDate: string; // 'YYYY-MM-DD'
  category: 'all' | ChacaraCategoryId;
}

export interface Lancamento {
  id: string;
  data: string;
  mes_referencia: string;
  categoria: ChacaraCategoryId | 'despesa_geral';
  tipo: 'receita' | 'despesa';
  valor: number;
  status: 'pago' | 'pendente' | 'parcial';
  valor_pago: number;
  descricao: string;
  is_divergent?: boolean;
  due_date?: string;
  payment_date?: string | null;
  valor_inadimplente?: number;
  valor_pendente?: number;
  bill_id?: number;
  chacara_user_id?: number;
}

// ============================================================================
// INTEGER CENTS ARITHMETIC & FORMATTING HELPERS
// ============================================================================

export function toCents(value: number | string | null | undefined): number {
  const num = typeof value === 'string' ? Number(value.replace(',', '.')) : Number(value);
  if (!Number.isFinite(num)) return 0;
  return Math.round((num + (num >= 0 ? Number.EPSILON : -Number.EPSILON)) * 100);
}

export function fromCents(cents: number): number {
  return Math.round(cents) / 100;
}

export function formatBRL(cents: number): string {
  return `R$ ${fromCents(cents).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatCurrencyValue(value: number): string {
  return formatBRL(toCents(value));
}

export function calcPct(partCents: number, totalCents: number, decimals = 1): number {
  if (totalCents <= 0 || partCents <= 0) return 0;
  const pct = (partCents / totalCents) * 100;
  const factor = Math.pow(10, decimals);
  return Math.min(100, Math.round((pct + Number.EPSILON) * factor) / factor);
}

/**
 * Computes mutually cohesive rounded bar widths summing cleanly to 100% when totalCents > 0.
 */
export function calcStackedPercentages(
  recebidoCents: number,
  pendenteCents: number,
  inadimplenteCents: number,
  totalCents: number
): { pctRecebido: number; pctPendente: number; pctInadimplente: number } {
  if (totalCents <= 0) {
    return { pctRecebido: 0, pctPendente: 0, pctInadimplente: 0 };
  }
  const pctRecebido = calcPct(recebidoCents, totalCents, 1);
  const pctInadimplente = calcPct(inadimplenteCents, totalCents, 1);
  const remainingPct = Math.max(0, Number((100 - pctRecebido - pctInadimplente).toFixed(1)));
  const pctPendente = pendenteCents > 0 ? remainingPct : 0;
  // Re-normalize if pendente is 0 but rounding left 0.1
  if (pendenteCents === 0 && pctRecebido + pctInadimplente !== 100 && inadimplenteCents > 0) {
    return {
      pctRecebido,
      pctPendente: 0,
      pctInadimplente: Number((100 - pctRecebido).toFixed(1)),
    };
  }
  return { pctRecebido, pctPendente, pctInadimplente };
}

/**
 * Allocates targetCents across weighted buckets using the Largest Remainder (Hamilton) method.
 * Mathematically guarantees sum(allocated) === targetCents with 0 cent drift.
 */
export function allocateCentsProportionally<T extends string>(
  targetCents: number,
  buckets: Array<{ key: T; weightCents: number }>
): Record<T, number> {
  const result = {} as Record<T, number>;
  buckets.forEach((b) => {
    result[b.key] = 0;
  });

  if (targetCents <= 0 || buckets.length === 0) return result;

  const totalWeight = buckets.reduce((sum, b) => sum + Math.max(0, b.weightCents), 0);
  if (totalWeight <= 0) return result;

  // If target >= totalWeight and we shouldn't exceed weight when distributing
  const items = buckets.map((b, idx) => {
    const w = Math.max(0, b.weightCents);
    const exact = (targetCents * w) / totalWeight;
    const floored = Math.floor(exact);
    return {
      key: b.key,
      idx,
      floored,
      remainder: exact - floored,
    };
  });

  let allocated = 0;
  items.forEach((item) => {
    result[item.key] = item.floored;
    allocated += item.floored;
  });

  let leftover = targetCents - allocated;
  if (leftover > 0) {
    const sorted = [...items].sort((a, b) => {
      if (Math.abs(b.remainder - a.remainder) > 1e-12) {
        return b.remainder - a.remainder;
      }
      return a.idx - b.idx;
    });
    for (let i = 0; i < leftover; i++) {
      const target = sorted[i % sorted.length];
      result[target.key] += 1;
    }
  }

  return result;
}

// ============================================================================
// DATE HELPERS
// ============================================================================

export function getLocalTodayStr(refDate: Date = new Date()): string {
  const y = refDate.getFullYear();
  const m = String(refDate.getMonth() + 1).padStart(2, '0');
  const d = String(refDate.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function normalizeDateStr(raw: string | null | undefined): string {
  if (!raw) return '';
  const trimmed = String(raw).trim();
  const match = trimmed.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : '';
}

export function getMonthFromDateStr(dateStr: string | null | undefined): string {
  const norm = normalizeDateStr(dateStr);
  return norm ? norm.slice(0, 7) : '';
}

export function getPreviousMonthRef(monthRef: string): string {
  if (!/^\d{4}-\d{2}$/.test(monthRef)) return '';
  const [yStr, mStr] = monthRef.split('-');
  let year = Number(yStr);
  let month = Number(mStr) - 1;
  if (month === 0) {
    month = 12;
    year -= 1;
  }
  return `${year}-${String(month).padStart(2, '0')}`;
}

export function formatMonthLabelPtBr(monthRef: string): string {
  if (!/^\d{4}-\d{2}$/.test(monthRef)) return monthRef;
  const [y, m] = monthRef.split('-');
  return `${m}/${y}`;
}

// ============================================================================
// BILL BREAKDOWN & CENT RECONCILIATION ENGINE
// ============================================================================

export interface BillCategoryBreakdown {
  categoryId: ChacaraCategoryId;
  previstoCents: number;
  recebidoCents: number;
  pendenteCents: number; // unpaid & due_date >= today
  inadimplenteCents: number; // unpaid & due_date < today
  aReceberCents: number; // pendenteCents + inadimplenteCents
  status: 'pago' | 'parcial' | 'pendente' | 'inadimplente' | 'isento';
}

export interface BillBreakdown {
  bill: ChacaraBill;
  residentId: number;
  residentName: string;
  monthReference: string;
  dueDateStr: string;
  paymentDateStr: string;
  readingDateStr: string;
  energyKwh: number;
  energyMetersCount: number;
  waterM3: number;
  waterMetersCount: number;
  billTotalCents: number;
  storedTotalCents: number;
  rawCategoriesSumCents: number;
  paidCents: number;
  remainingCents: number;
  pendenteCents: number;
  inadimplenteCents: number;
  isOverdue: boolean;
  isPaid: boolean;
  isPartial: boolean;
  hasMissingPaymentDate: boolean;
  subCentAdjustment: {
    diffCents: number;
    adjustedCategory: ChacaraCategoryId;
  } | null;
  criticalMismatchCents: number;
  overpaymentCents: number;
  categories: Record<ChacaraCategoryId, BillCategoryBreakdown>;
}

export function extractBillConsumption(bill: ChacaraBill): {
  energyKwh: number;
  energyMetersCount: number;
  waterM3: number;
  waterMetersCount: number;
} {
  const energyReadings = bill.energy_readings || [];
  const waterReadings = bill.water_readings || [];

  let energyKwh = 0;
  let energyMetersCount = 0;
  if (energyReadings.length > 0) {
    energyKwh = energyReadings.reduce((acc, r) => acc + ((r.curr || 0) - (r.prev || 0)), 0);
    energyMetersCount = energyReadings.length;
  } else {
    const e1 = (bill.curr_reading || 0) - (bill.prev_reading || 0);
    const e2 = (bill.curr_reading_2 || 0) - (bill.prev_reading_2 || 0);
    energyKwh = e1 + e2;
    if ((bill.curr_reading || 0) > 0 || (bill.prev_reading || 0) > 0) energyMetersCount += 1;
    if ((bill.curr_reading_2 || 0) > 0 || (bill.prev_reading_2 || 0) > 0) energyMetersCount += 1;
  }

  let waterM3 = 0;
  let waterMetersCount = 0;
  if (waterReadings.length > 0) {
    waterM3 = waterReadings.reduce((acc, r) => acc + ((r.curr || 0) - (r.prev || 0)), 0);
    waterMetersCount = waterReadings.length;
  } else {
    const w1 = (bill.water_curr_reading || 0) - (bill.water_prev_reading || 0);
    const w2 = (bill.water_curr_reading_2 || 0) - (bill.water_prev_reading_2 || 0);
    waterM3 = w1 + w2;
    if ((bill.water_curr_reading || 0) > 0 || (bill.water_prev_reading || 0) > 0) waterMetersCount += 1;
    if ((bill.water_curr_reading_2 || 0) > 0 || (bill.water_prev_reading_2 || 0) > 0) waterMetersCount += 1;
  }

  return { energyKwh, energyMetersCount, waterM3, waterMetersCount };
}

/**
 * Helper for ChacaraManager UI & PDF exports: returns cent-rounded category values in reais.
 */
export function computeBillCategoryValues(bill: ChacaraBill) {
  const breakdown = computeBillBreakdown(bill, undefined, getLocalTodayStr());
  return {
    reserve_fund: fromCents(breakdown.categories.fundo_reserva.previstoCents),
    water_total: fromCents(breakdown.categories.agua.previstoCents),
    energy_total: fromCents(breakdown.categories.energia.previstoCents),
    water_service_fee: fromCents(breakdown.categories.prestador.previstoCents),
    apportionment: fromCents(breakdown.categories.rateio.previstoCents),
    total: fromCents(breakdown.billTotalCents),
  };
}

/**
 * Helper for saving bills so bill.total ALWAYS equals the exact integer-cent sum of its categories.
 */
export function computeBillSaveTotals(params: {
  energyKwh: number;
  kwhValue: number;
  hasEnergy: boolean;
  waterM3: number;
  waterValue: number;
  hasWater: boolean;
  waterServiceFee: number;
  apportionmentValue: number;
  includeApportionment: boolean;
  reserveFundValue: number;
  includeReserveFund: boolean;
}) {
  const energiaCents = params.hasEnergy ? toCents(params.energyKwh * (params.kwhValue || 0)) : 0;
  const aguaCents = params.hasWater ? toCents(params.waterM3 * (params.waterValue || 0)) : 0;
  const prestadorCents = params.hasWater ? toCents(params.waterServiceFee || 0) : 0;
  const rateioCents = params.includeApportionment ? toCents(params.apportionmentValue || 0) : 0;
  const fundoReservaCents = params.includeReserveFund ? toCents(params.reserveFundValue || 0) : 0;
  const totalCents = energiaCents + aguaCents + prestadorCents + rateioCents + fundoReservaCents;

  return {
    energyTotal: fromCents(energiaCents),
    waterTotal: fromCents(aguaCents),
    waterServiceFee: fromCents(prestadorCents),
    apportionment: fromCents(rateioCents),
    reserveFund: fromCents(fundoReservaCents),
    total: fromCents(totalCents),
  };
}

export function computeBillBreakdown(
  bill: ChacaraBill,
  resident?: ChacaraUser,
  todayStr: string = getLocalTodayStr()
): BillBreakdown {
  const { energyKwh, energyMetersCount, waterM3, waterMetersCount } = extractBillConsumption(bill);

  const rawEnergia = energyKwh * (bill.kwh_value || 0);
  const rawAgua = waterM3 * (bill.water_value || 0);
  const rawPrestador = bill.water_service_fee || 0;
  const rawRateio = bill.include_apportionment ? (bill.apportionment_value || 0) : 0;
  const rawFundoReserva = bill.include_reserve_fund ? (bill.reserve_fund || 0) : 0;

  const rawMap: Record<ChacaraCategoryId, number> = {
    fundo_reserva: rawFundoReserva,
    agua: rawAgua,
    energia: rawEnergia,
    prestador: rawPrestador,
    rateio: rawRateio,
  };

  const previstoCentsMap: Record<ChacaraCategoryId, number> = {
    fundo_reserva: toCents(rawFundoReserva),
    agua: toCents(rawAgua),
    energia: toCents(rawEnergia),
    prestador: toCents(rawPrestador),
    rateio: toCents(rawRateio),
  };

  const rawCategoriesSumCents =
    previstoCentsMap.fundo_reserva +
    previstoCentsMap.agua +
    previstoCentsMap.energia +
    previstoCentsMap.prestador +
    previstoCentsMap.rateio;

  const storedTotalCents = toCents(bill.total || 0);
  const billTotalCents = storedTotalCents > 0 ? storedTotalCents : rawCategoriesSumCents;
  const diffCents = billTotalCents - rawCategoriesSumCents;

  let subCentAdjustment: BillBreakdown['subCentAdjustment'] = null;
  let criticalMismatchCents = 0;

  if (diffCents !== 0) {
    if (Math.abs(diffCents) <= 5 && rawCategoriesSumCents > 0) {
      // Historical float drift between unrounded category sum and stored total:
      // deterministically absorb into the category with the largest rounding residual matching diff sign
      const candidates = (Object.keys(previstoCentsMap) as ChacaraCategoryId[])
        .filter((cat) => previstoCentsMap[cat] > 0)
        .map((cat) => ({
          cat,
          fractionalDiff: rawMap[cat] * 100 - previstoCentsMap[cat],
          amount: previstoCentsMap[cat],
        }))
        .sort((a, b) => {
          const scoreA = diffCents > 0 ? a.fractionalDiff : -a.fractionalDiff;
          const scoreB = diffCents > 0 ? b.fractionalDiff : -b.fractionalDiff;
          if (Math.abs(scoreB - scoreA) > 1e-9) return scoreB - scoreA;
          return b.amount - a.amount;
        });

      const targetCat = candidates[0]?.cat || 'energia';
      previstoCentsMap[targetCat] = Math.max(0, previstoCentsMap[targetCat] + diffCents);
      subCentAdjustment = { diffCents, adjustedCategory: targetCat };
    } else if (Math.abs(diffCents) > 5) {
      criticalMismatchCents = diffCents;
    }
  }

  // Paid & Remaining calculation in integer cents
  const rawPaidCents = toCents(bill.amount_paid || 0);
  const isPaidFlag = bill.status === 'paid';
  let paidCents = 0;
  let overpaymentCents = 0;

  if (isPaidFlag) {
    paidCents = billTotalCents;
    if (rawPaidCents > billTotalCents + 1) {
      overpaymentCents = rawPaidCents - billTotalCents;
    }
  } else if (bill.status === 'partial' || rawPaidCents > 0) {
    let effectivePaid = rawPaidCents;
    if (effectivePaid <= 0 && bill.paid_categories) {
      effectivePaid = CHACARA_CATEGORIES.reduce(
        (sum, meta) => sum + (bill.paid_categories?.[meta.paidKey] ? previstoCentsMap[meta.id] : 0),
        0
      );
    }
    if (effectivePaid > billTotalCents) {
      overpaymentCents = effectivePaid - billTotalCents;
    }
    paidCents = Math.max(0, Math.min(billTotalCents, effectivePaid));
  }

  const remainingCents = Math.max(0, billTotalCents - paidCents);
  const dueDateStr = normalizeDateStr(bill.due_date);
  const paymentDateStr = normalizeDateStr(bill.payment_date);
  const readingDateStr = normalizeDateStr(bill.reading_date);

  const isOverdue = remainingCents > 0 && Boolean(dueDateStr) && dueDateStr < todayStr;
  const inadimplenteCents = isOverdue ? remainingCents : 0;
  const pendenteCents = !isOverdue ? remainingCents : 0;
  const isPaid = remainingCents === 0 && billTotalCents > 0 ? true : isPaidFlag && remainingCents === 0;
  const isPartial = paidCents > 0 && remainingCents > 0;
  const hasMissingPaymentDate = paidCents > 0 && !paymentDateStr;

  // Exact allocation of paidCents across categories (guaranteed sum === paidCents)
  const catPaidCentsMap: Record<ChacaraCategoryId, number> = {
    fundo_reserva: 0,
    agua: 0,
    energia: 0,
    prestador: 0,
    rateio: 0,
  };

  // Note: if criticalMismatchCents !== 0, allocate proportional to categories sum so category reconciliation stays exact
  const categoriesTotalForAlloc =
    previstoCentsMap.fundo_reserva +
    previstoCentsMap.agua +
    previstoCentsMap.energia +
    previstoCentsMap.prestador +
    previstoCentsMap.rateio;

  if (paidCents >= billTotalCents && billTotalCents > 0) {
    CHACARA_CATEGORIES.forEach((meta) => {
      catPaidCentsMap[meta.id] = previstoCentsMap[meta.id];
    });
  } else if (paidCents > 0 && categoriesTotalForAlloc > 0) {
    const paidCatsObj = bill.paid_categories || {};
    const checkedCats = CHACARA_CATEGORIES.filter(
      (meta) => previstoCentsMap[meta.id] > 0 && paidCatsObj[meta.paidKey] === true
    );
    const checkedSum = checkedCats.reduce((sum, meta) => sum + previstoCentsMap[meta.id], 0);

    if (checkedCats.length > 0 && !bill.is_divergent && Math.abs(checkedSum - paidCents) <= 2) {
      if (checkedSum === paidCents) {
        checkedCats.forEach((meta) => {
          catPaidCentsMap[meta.id] = previstoCentsMap[meta.id];
        });
      } else {
        const allocated = allocateCentsProportionally(
          paidCents,
          checkedCats.map((meta) => ({ key: meta.id, weightCents: previstoCentsMap[meta.id] }))
        );
        checkedCats.forEach((meta) => {
          catPaidCentsMap[meta.id] = Math.min(previstoCentsMap[meta.id], allocated[meta.id]);
        });
      }
    } else if (checkedCats.length > 0 && paidCents <= checkedSum) {
      const allocated = allocateCentsProportionally(
        paidCents,
        checkedCats.map((meta) => ({ key: meta.id, weightCents: previstoCentsMap[meta.id] }))
      );
      checkedCats.forEach((meta) => {
        catPaidCentsMap[meta.id] = Math.min(previstoCentsMap[meta.id], allocated[meta.id]);
      });
    } else if (checkedCats.length > 0 && paidCents > checkedSum) {
      checkedCats.forEach((meta) => {
        catPaidCentsMap[meta.id] = previstoCentsMap[meta.id];
      });
      const remainingPaid = paidCents - checkedSum;
      const uncheckedCats = CHACARA_CATEGORIES.filter(
        (meta) => previstoCentsMap[meta.id] > 0 && !paidCatsObj[meta.paidKey]
      );
      const allocatedRest = allocateCentsProportionally(
        remainingPaid,
        uncheckedCats.map((meta) => ({ key: meta.id, weightCents: previstoCentsMap[meta.id] }))
      );
      uncheckedCats.forEach((meta) => {
        catPaidCentsMap[meta.id] = Math.min(previstoCentsMap[meta.id], allocatedRest[meta.id]);
      });
    } else {
      const activeCats = CHACARA_CATEGORIES.filter((meta) => previstoCentsMap[meta.id] > 0);
      const targetAlloc = Math.min(paidCents, categoriesTotalForAlloc);
      const allocated = allocateCentsProportionally(
        targetAlloc,
        activeCats.map((meta) => ({ key: meta.id, weightCents: previstoCentsMap[meta.id] }))
      );
      activeCats.forEach((meta) => {
        catPaidCentsMap[meta.id] = Math.min(previstoCentsMap[meta.id], allocated[meta.id]);
      });
    }
  }

  const categories = {} as Record<ChacaraCategoryId, BillCategoryBreakdown>;
  CHACARA_CATEGORIES.forEach((meta) => {
    const prev = previstoCentsMap[meta.id];
    const rec = catPaidCentsMap[meta.id];
    const rem = Math.max(0, prev - rec);
    const inad = isOverdue ? rem : 0;
    const pend = !isOverdue ? rem : 0;

    let status: BillCategoryBreakdown['status'] = 'isento';
    if (prev > 0) {
      if (rem === 0) status = 'pago';
      else if (rec > 0) status = 'parcial';
      else if (isOverdue) status = 'inadimplente';
      else status = 'pendente';
    }

    categories[meta.id] = {
      categoryId: meta.id,
      previstoCents: prev,
      recebidoCents: rec,
      pendenteCents: pend,
      inadimplenteCents: inad,
      aReceberCents: rem,
      status,
    };
  });

  return {
    bill,
    residentId: bill.chacara_user_id,
    residentName: resident?.name || 'Não identificado',
    monthReference: bill.month_reference || getMonthFromDateStr(dueDateStr) || '',
    dueDateStr,
    paymentDateStr,
    readingDateStr,
    energyKwh,
    energyMetersCount,
    waterM3,
    waterMetersCount,
    billTotalCents,
    storedTotalCents,
    rawCategoriesSumCents,
    paidCents,
    remainingCents,
    pendenteCents,
    inadimplenteCents,
    isOverdue,
    isPaid,
    isPartial,
    hasMissingPaymentDate,
    subCentAdjustment,
    criticalMismatchCents,
    overpaymentCents,
    categories,
  };
}

export function generateChacaraLancamentos(
  bills: ChacaraBill[],
  users: ChacaraUser[],
  expenses: ChacaraExpense[],
  todayStr: string = getLocalTodayStr()
): Lancamento[] {
  const usersById = new Map<number, ChacaraUser>();
  users.forEach((u) => usersById.set(u.id, u));

  const lancamentos: Lancamento[] = [];

  bills.forEach((bill) => {
    const bd = computeBillBreakdown(bill, usersById.get(bill.chacara_user_id), todayStr);
    CHACARA_CATEGORIES.forEach((meta) => {
      const cat = bd.categories[meta.id];
      const status: 'pago' | 'pendente' | 'parcial' =
        cat.status === 'pago' || cat.status === 'isento'
          ? 'pago'
          : cat.status === 'parcial'
          ? 'parcial'
          : 'pendente';

      lancamentos.push({
        id: `${bill.id}-${meta.id}`,
        bill_id: bill.id,
        chacara_user_id: bill.chacara_user_id,
        data: bd.dueDateStr,
        due_date: bd.dueDateStr,
        payment_date: bd.paymentDateStr || null,
        mes_referencia: bd.monthReference,
        categoria: meta.id,
        tipo: 'receita',
        valor: fromCents(cat.previstoCents),
        status,
        valor_pago: fromCents(cat.recebidoCents),
        valor_pendente: fromCents(cat.pendenteCents),
        valor_inadimplente: fromCents(cat.inadimplenteCents),
        descricao: bd.residentName,
        is_divergent: (bill as any).is_divergent || false,
      });
    });
  });

  expenses.forEach((exp) => {
    const amountCents = toCents(exp.amount);
    const expDateStr = normalizeDateStr(exp.date);
    lancamentos.push({
      id: exp.id,
      data: expDateStr,
      payment_date: expDateStr,
      mes_referencia: (exp as any).month_reference || getMonthFromDateStr(expDateStr),
      categoria: 'despesa_geral',
      tipo: 'despesa',
      valor: fromCents(amountCents),
      status: 'pago',
      valor_pago: fromCents(amountCents),
      descricao: exp.description,
    });
  });

  return lancamentos;
}

// ============================================================================
// FILTERING HELPERS
// ============================================================================

export function matchesMonthYearFilter(
  monthRef: string,
  year: string,
  month: string
): boolean {
  if (!monthRef || !monthRef.includes('-')) return year === 'all' && month === 'all';
  const [y, m] = monthRef.split('-');
  if (year !== 'all' && y !== year) return false;
  if (month !== 'all' && m !== month) return false;
  return true;
}

export function matchesDateRange(dateStr: string, startDate: string, endDate: string): boolean {
  if (!dateStr) return false;
  if (startDate && dateStr < startDate) return false;
  if (endDate && dateStr > endDate) return false;
  return true;
}

export function mapExpenseCategoryToRevenueCategory(expCat: string): ChacaraCategoryId | null {
  const norm = (expCat || '').toLowerCase().trim();
  if (norm === 'energia') return 'energia';
  if (norm === 'agua' || norm === 'água') return 'agua';
  if (norm === 'prestador') return 'prestador';
  if (norm === 'advogado' || norm === 'rateio') return 'rateio';
  return null;
}

// ============================================================================
// DASHBOARD ANALYTICS, VIEWS & AUDIT OUTPUT TYPES
// ============================================================================

export interface CategoryResidentTraceItem {
  billId: number;
  residentId: number;
  residentName: string;
  monthReference: string;
  dueDate: string;
  paymentDate: string;
  previstoCents: number;
  recebidoCents: number;
  pendenteCents: number;
  inadimplenteCents: number;
  aReceberCents: number;
  status: BillCategoryBreakdown['status'];
}

export interface CategorySummary {
  id: ChacaraCategoryId;
  title: string;
  shortTitle: string;
  previstoCents: number;
  recebidoCents: number;
  pendenteCents: number;
  inadimplenteCents: number;
  aReceberCents: number;
  percentRecebido: number;
  percentPendente: number;
  percentInadimplente: number;
  moradoresPagantes: number;
  moradoresPendentes: number; // includes pendente, parcial, inadimplente (unique residents)
  moradoresParciais: number;
  moradoresInadimplentes: number;
  totalMoradoresCobrados: number;
  registrosPagos: number;
  registrosPendentes: number;
  items: CategoryResidentTraceItem[];
}

export interface MonthlyHistoryPoint {
  monthRef: string;
  label: string;
  previstoCents: number;
  recebidoCompetenciaCents: number;
  recebidoRealizadoCents: number;
  pendenteCents: number;
  inadimplenteCents: number;
  aReceberCents: number;
  despesasLancadasCents: number;
  despesasPagasCents: number;
  saldoRealizadoCents: number;
  saldoPrevistoCents: number;
  saldoAcumuladoRealizadoCents: number;
  percentRecebido: number;
  percentInadimplente: number;
}

export interface YearlyComparisonPoint {
  year: string;
  previstoCents: number;
  recebidoCompetenciaCents: number;
  recebidoRealizadoCents: number;
  pendenteCents: number;
  inadimplenteCents: number;
  despesasPagasCents: number;
  resultadoRealizadoCents: number;
  resultadoPrevistoCents: number;
  percentRecebido: number;
  mesesAtivos: number;
}

export interface AuditCheckItem {
  id: string;
  label: string;
  leftValueCents: number;
  rightValueCents: number;
  diffCents: number;
  isCount?: boolean;
  passed: boolean;
  description: string;
}

export interface ChacaraDashboardData {
  todayStr: string;
  activePeriodLabel: string;
  availableYears: string[];

  // A) Fluxo Realizado (caixa efetivo pela data de pagamento/recebimento)
  fluxoRealizado: {
    receitasRecebidasCents: number;
    despesasPagasCents: number;
    saldoRealizadoCents: number;
    paidBillsCount: number;
    paidExpensesCount: number;
    missingPaymentDateCount: number;
  };

  // B) Lançamentos Gerais (por competência / vencimento)
  lancamentosGerais: {
    totalPrevistoCents: number;
    totalRecebidoCents: number;
    totalPendenteCents: number; // a vencer (due_date >= today)
    totalInadimplenteCents: number; // vencido (due_date < today)
    contasAReceberCents: number; // totalPendenteCents + totalInadimplenteCents
    despesasLancadasCents: number;
    contasAPagarCents: number; // 0 when all recorded expenses are settled on payment date
    saldoPrevistoCents: number; // totalPrevistoCents - despesasLancadasCents
    percentRecebido: number;
    percentPendente: number;
    percentInadimplente: number;
    billsCount: number;
    expensesCount: number;
  };

  utilidadesECadastros: {
    totalWaterM3: number;
    waterMetersCount: number;
    totalEnergyKwh: number;
    energyMetersCount: number;
    totalUsers: number;
    activeUsers: number;
    billsCount: number;
    paidBillsCount: number;
    partialBillsCount: number;
    pendingBillsCount: number;
    overdueBillsCount: number;
    paidBillsPct: number;
  };

  categorias: CategorySummary[];

  // Análise Mensal + Comparativo com Mês Anterior
  analiseMensal: {
    targetMonthRef: string;
    previousMonthRef: string;
    atual: MonthlyHistoryPoint;
    anterior: MonthlyHistoryPoint | null;
    deltas: {
      recebidoDiffCents: number;
      recebidoDiffPct: number | null;
      despesasDiffCents: number;
      despesasDiffPct: number | null;
      inadimplenteDiffCents: number;
      inadimplenteDiffPct: number | null;
      saldoRealizadoDiffCents: number;
    };
  };

  // Análise Anual e Geral
  analiseAnual: {
    targetYear: string;
    totalPrevistoAnualCents: number;
    totalRecebidoCompetenciaAnualCents: number;
    totalRecebidoRealizadoAnualCents: number;
    totalPendenteAnualCents: number;
    totalInadimplenteAnualCents: number;
    totalDespesasPagasAnualCents: number;
    resultadoAnualRealizadoCents: number;
    resultadoAnualPrevistoCents: number;
    mediaMensalReceitasCents: number;
    mediaMensalDespesasCents: number;
    percentRecebidoAnual: number;
    mesesComLancamento: number;
    ultimosMeses: MonthlyHistoryPoint[];
    comparativoAnos: YearlyComparisonPoint[];
    categoriasMaiorInadimplencia: Array<{
      id: ChacaraCategoryId;
      title: string;
      inadimplenteCents: number;
      previstoCents: number;
      percentInadimplenteCategoria: number;
      shareOfTotalInadimplenciaPct: number;
    }>;
  };

  // Conferência Matemática Obrigatória
  auditoria: {
    allPassed: boolean;
    checks: AuditCheckItem[];
    subCentAdjustedBills: Array<{
      billId: number;
      residentName: string;
      monthReference: string;
      diffCents: number;
      adjustedCategory: ChacaraCategoryId;
    }>;
    criticalMismatches: Array<{
      billId: number;
      residentName: string;
      monthReference: string;
      storedTotalCents: number;
      categoriesSumCents: number;
      diffCents: number;
    }>;
    missingPaymentDates: Array<{
      billId: number;
      residentName: string;
      monthReference: string;
      paidCents: number;
    }>;
    overpayments: Array<{
      billId: number;
      residentName: string;
      monthReference: string;
      overpaymentCents: number;
    }>;
  };
}

// ============================================================================
// MAIN COMPUTATION ENGINE
// ============================================================================

export function computeChacaraDashboardData(
  bills: ChacaraBill[],
  users: ChacaraUser[],
  expenses: ChacaraExpense[],
  filter: ChacaraDashboardFilter,
  todayStr: string = getLocalTodayStr()
): ChacaraDashboardData {
  const usersById = new Map<number, ChacaraUser>();
  users.forEach((u) => usersById.set(u.id, u));

  const activeCategoryFilter = filter.category !== 'all' ? filter.category : null;

  // 1. Break down every bill once with cent precision
  const allBreakdowns = bills.map((b) =>
    computeBillBreakdown(b, usersById.get(b.chacara_user_id), todayStr)
  );

  // Collect available years across bills and expenses
  const yearSet = new Set<string>();
  yearSet.add(todayStr.slice(0, 4));
  allBreakdowns.forEach((bd) => {
    if (bd.monthReference?.length >= 4) yearSet.add(bd.monthReference.slice(0, 4));
    if (bd.paymentDateStr?.length >= 4) yearSet.add(bd.paymentDateStr.slice(0, 4));
  });
  expenses.forEach((exp) => {
    const mRef = (exp as any).month_reference || getMonthFromDateStr(exp.date);
    if (mRef?.length >= 4) yearSet.add(mRef.slice(0, 4));
    const dStr = normalizeDateStr(exp.date);
    if (dStr?.length >= 4) yearSet.add(dStr.slice(0, 4));
  });
  const availableYears = Array.from(yearSet).sort((a, b) => b.localeCompare(a));

  // Helper to get bill's effective value under active category filter
  const getBillFilteredAmounts = (bd: BillBreakdown) => {
    if (!activeCategoryFilter) {
      return {
        previstoCents: bd.billTotalCents,
        recebidoCents: bd.paidCents,
        pendenteCents: bd.pendenteCents,
        inadimplenteCents: bd.inadimplenteCents,
        aReceberCents: bd.remainingCents,
      };
    }
    const c = bd.categories[activeCategoryFilter];
    return {
      previstoCents: c.previstoCents,
      recebidoCents: c.recebidoCents,
      pendenteCents: c.pendenteCents,
      inadimplenteCents: c.inadimplenteCents,
      aReceberCents: c.aReceberCents,
    };
  };

  // Expense category matching when category filter is active
  const matchesExpenseCategory = (exp: ChacaraExpense) => {
    if (!activeCategoryFilter) return true;
    return mapExpenseCategoryToRevenueCategory(exp.category) === activeCategoryFilter;
  };

  // 2. Filter Bills & Expenses for Lançamentos Gerais (by competence / due date)
  const competenceBills = allBreakdowns.filter((bd) => {
    if (filter.mode === 'custom') {
      const refDate = bd.dueDateStr || bd.readingDateStr || (bd.monthReference ? `${bd.monthReference}-01` : '');
      return matchesDateRange(refDate, filter.startDate, filter.endDate);
    }
    return matchesMonthYearFilter(bd.monthReference, filter.year, filter.month);
  });

  const competenceExpenses = expenses.filter((exp) => {
    if (!matchesExpenseCategory(exp)) return false;
    const expDateStr = normalizeDateStr(exp.date);
    const expMonthRef = (exp as any).month_reference || getMonthFromDateStr(expDateStr);
    if (filter.mode === 'custom') {
      return matchesDateRange(expDateStr, filter.startDate, filter.endDate);
    }
    return matchesMonthYearFilter(expMonthRef, filter.year, filter.month);
  });

  // 3. Filter Bills & Expenses for Fluxo Realizado (by payment_date / expense payment date)
  const realizedBills = allBreakdowns.filter((bd) => {
    if (bd.paidCents <= 0) return false;
    // Use actual payment_date when available; fallback to month_reference if payment_date is null in legacy rows
    if (filter.mode === 'custom') {
      const effDate = bd.paymentDateStr || bd.dueDateStr || (bd.monthReference ? `${bd.monthReference}-01` : '');
      return matchesDateRange(effDate, filter.startDate, filter.endDate);
    }
    const effMonth = getMonthFromDateStr(bd.paymentDateStr) || bd.monthReference;
    return matchesMonthYearFilter(effMonth, filter.year, filter.month);
  });

  const realizedExpenses = expenses.filter((exp) => {
    if (!matchesExpenseCategory(exp)) return false;
    const expDateStr = normalizeDateStr(exp.date);
    if (filter.mode === 'custom') {
      return matchesDateRange(expDateStr, filter.startDate, filter.endDate);
    }
    const effMonth = getMonthFromDateStr(expDateStr) || (exp as any).month_reference || '';
    return matchesMonthYearFilter(effMonth, filter.year, filter.month);
  });

  // 4. Compute Fluxo Realizado totals
  let realizedReceitasCents = 0;
  let realizedPaidBillsCount = 0;
  let missingPaymentDateCount = 0;
  realizedBills.forEach((bd) => {
    const amts = getBillFilteredAmounts(bd);
    if (amts.recebidoCents > 0) {
      realizedReceitasCents += amts.recebidoCents;
      realizedPaidBillsCount += 1;
      if (bd.hasMissingPaymentDate) missingPaymentDateCount += 1;
    }
  });

  const realizedDespesasCents = realizedExpenses.reduce((sum, e) => sum + toCents(e.amount), 0);
  const saldoRealizadoCents = realizedReceitasCents - realizedDespesasCents;

  // 5. Compute Lançamentos Gerais totals
  let totalPrevistoCents = 0;
  let totalRecebidoCents = 0;
  let totalPendenteCents = 0;
  let totalInadimplenteCents = 0;
  let totalCriticalMismatchCents = 0;

  competenceBills.forEach((bd) => {
    const amts = getBillFilteredAmounts(bd);
    totalPrevistoCents += amts.previstoCents;
    totalRecebidoCents += amts.recebidoCents;
    totalPendenteCents += amts.pendenteCents;
    totalInadimplenteCents += amts.inadimplenteCents;
    if (!activeCategoryFilter) {
      totalCriticalMismatchCents += bd.criticalMismatchCents;
    }
  });

  const contasAReceberCents = totalPendenteCents + totalInadimplenteCents;
  const despesasLancadasCents = competenceExpenses.reduce((sum, e) => sum + toCents(e.amount), 0);
  // Check if any expense explicitly carries unpaid status (for forward schema compatibility)
  const contasAPagarCents = competenceExpenses.reduce((sum, e) => {
    const st = (e as any).status;
    if (st === 'pending' || st === 'pendente') return sum + toCents(e.amount);
    return sum;
  }, 0);
  const saldoPrevistoCents = totalPrevistoCents - despesasLancadasCents;

  // 6. Utilities & Resident Stats (for competenceBills)
  let totalWaterM3 = 0;
  let waterMetersCount = 0;
  let totalEnergyKwh = 0;
  let energyMetersCount = 0;
  let paidBillsCount = 0;
  let partialBillsCount = 0;
  let pendingBillsCount = 0;
  let overdueBillsCount = 0;

  competenceBills.forEach((bd) => {
    totalWaterM3 += bd.waterM3;
    waterMetersCount += bd.waterMetersCount;
    totalEnergyKwh += bd.energyKwh;
    energyMetersCount += bd.energyMetersCount;

    if (bd.isPaid) paidBillsCount += 1;
    else if (bd.isPartial) partialBillsCount += 1;
    else pendingBillsCount += 1;

    if (bd.isOverdue) overdueBillsCount += 1;
  });

  const totalUsers = users.length;
  const activeUsers = users.filter((u: any) => u.active !== false).length;
  const billsCount = competenceBills.length;
  const paidBillsPct = billsCount > 0 ? Math.round((paidBillsCount / billsCount) * 100) : 0;

  // 7. Category Breakdown (Detalhamento por Categoria)
  const categorias: CategorySummary[] = CHACARA_CATEGORIES.map((meta) => {
    let previstoCents = 0;
    let recebidoCents = 0;
    let pendenteCents = 0;
    let inadimplenteCents = 0;
    let registrosPagos = 0;
    let registrosPendentes = 0;
    const items: CategoryResidentTraceItem[] = [];

    // Aggregate per resident ID for exact unique resident counts
    const residentStatusMap = new Map<
      number,
      { hasRemaining: boolean; hasPaidSome: boolean; hasOverdue: boolean }
    >();

    competenceBills.forEach((bd) => {
      if (activeCategoryFilter && activeCategoryFilter !== meta.id) return;
      const cat = bd.categories[meta.id];
      if (cat.previstoCents <= 0) return;

      previstoCents += cat.previstoCents;
      recebidoCents += cat.recebidoCents;
      pendenteCents += cat.pendenteCents;
      inadimplenteCents += cat.inadimplenteCents;

      if (cat.aReceberCents === 0) {
        registrosPagos += 1;
      } else {
        registrosPendentes += 1;
      }

      const prevResState = residentStatusMap.get(bd.residentId) || {
        hasRemaining: false,
        hasPaidSome: false,
        hasOverdue: false,
      };
      if (cat.aReceberCents > 0) prevResState.hasRemaining = true;
      if (cat.recebidoCents > 0) prevResState.hasPaidSome = true;
      if (cat.inadimplenteCents > 0) prevResState.hasOverdue = true;
      residentStatusMap.set(bd.residentId, prevResState);

      items.push({
        billId: bd.bill.id,
        residentId: bd.residentId,
        residentName: bd.residentName,
        monthReference: bd.monthReference,
        dueDate: bd.dueDateStr,
        paymentDate: bd.paymentDateStr,
        previstoCents: cat.previstoCents,
        recebidoCents: cat.recebidoCents,
        pendenteCents: cat.pendenteCents,
        inadimplenteCents: cat.inadimplenteCents,
        aReceberCents: cat.aReceberCents,
        status: cat.status,
      });
    });

    let moradoresPagantes = 0;
    let moradoresPendentes = 0;
    let moradoresParciais = 0;
    let moradoresInadimplentes = 0;

    residentStatusMap.forEach((st) => {
      if (!st.hasRemaining) {
        moradoresPagantes += 1;
      } else {
        moradoresPendentes += 1;
        if (st.hasPaidSome) moradoresParciais += 1;
        if (st.hasOverdue) moradoresInadimplentes += 1;
      }
    });

    items.sort(
      (a, b) =>
        a.residentName.localeCompare(b.residentName, 'pt-BR') ||
        b.monthReference.localeCompare(a.monthReference)
    );

    const aReceberCents = pendenteCents + inadimplenteCents;
    const stacked = calcStackedPercentages(
      recebidoCents,
      pendenteCents,
      inadimplenteCents,
      previstoCents
    );

    return {
      id: meta.id,
      title: meta.title,
      shortTitle: meta.shortTitle,
      previstoCents,
      recebidoCents,
      pendenteCents,
      inadimplenteCents,
      aReceberCents,
      percentRecebido: stacked.pctRecebido,
      percentPendente: stacked.pctPendente,
      percentInadimplente: stacked.pctInadimplente,
      moradoresPagantes,
      moradoresPendentes,
      moradoresParciais,
      moradoresInadimplentes,
      totalMoradoresCobrados: residentStatusMap.size,
      registrosPagos,
      registrosPendentes,
      items,
    };
  });

  // 8. Monthly Timeline (all months in DB, honoring activeCategoryFilter if selected)
  const monthlyMap = new Map<
    string,
    {
      previstoCents: number;
      recebidoCompetenciaCents: number;
      recebidoRealizadoCents: number;
      pendenteCents: number;
      inadimplenteCents: number;
      despesasLancadasCents: number;
      despesasPagasCents: number;
    }
  >();

  const ensureMonth = (mRef: string) => {
    if (!monthlyMap.has(mRef)) {
      monthlyMap.set(mRef, {
        previstoCents: 0,
        recebidoCompetenciaCents: 0,
        recebidoRealizadoCents: 0,
        pendenteCents: 0,
        inadimplenteCents: 0,
        despesasLancadasCents: 0,
        despesasPagasCents: 0,
      });
    }
    return monthlyMap.get(mRef)!;
  };

  allBreakdowns.forEach((bd) => {
    const amts = getBillFilteredAmounts(bd);
    if (bd.monthReference) {
      const mBucket = ensureMonth(bd.monthReference);
      mBucket.previstoCents += amts.previstoCents;
      mBucket.recebidoCompetenciaCents += amts.recebidoCents;
      mBucket.pendenteCents += amts.pendenteCents;
      mBucket.inadimplenteCents += amts.inadimplenteCents;
    }
    if (amts.recebidoCents > 0) {
      const payMonth = getMonthFromDateStr(bd.paymentDateStr) || bd.monthReference;
      if (payMonth) {
        const pBucket = ensureMonth(payMonth);
        pBucket.recebidoRealizadoCents += amts.recebidoCents;
      }
    }
  });

  expenses.forEach((exp) => {
    if (!matchesExpenseCategory(exp)) return;
    const amtCents = toCents(exp.amount);
    const expDateStr = normalizeDateStr(exp.date);
    const compMonth = (exp as any).month_reference || getMonthFromDateStr(expDateStr);
    const paidMonth = getMonthFromDateStr(expDateStr) || compMonth;
    if (compMonth) {
      ensureMonth(compMonth).despesasLancadasCents += amtCents;
    }
    if (paidMonth) {
      ensureMonth(paidMonth).despesasPagasCents += amtCents;
    }
  });

  const sortedMonths = Array.from(monthlyMap.keys())
    .filter((m) => /^\d{4}-\d{2}$/.test(m))
    .sort((a, b) => a.localeCompare(b));

  let runningSaldoRealizadoCents = 0;
  const fullMonthlyHistory: MonthlyHistoryPoint[] = sortedMonths.map((monthRef) => {
    const d = monthlyMap.get(monthRef)!;
    const saldoRealizadoMonth = d.recebidoRealizadoCents - d.despesasPagasCents;
    runningSaldoRealizadoCents += saldoRealizadoMonth;
    const aReceber = d.pendenteCents + d.inadimplenteCents;
    return {
      monthRef,
      label: formatMonthLabelPtBr(monthRef),
      previstoCents: d.previstoCents,
      recebidoCompetenciaCents: d.recebidoCompetenciaCents,
      recebidoRealizadoCents: d.recebidoRealizadoCents,
      pendenteCents: d.pendenteCents,
      inadimplenteCents: d.inadimplenteCents,
      aReceberCents: aReceber,
      despesasLancadasCents: d.despesasLancadasCents,
      despesasPagasCents: d.despesasPagasCents,
      saldoRealizadoCents: saldoRealizadoMonth,
      saldoPrevistoCents: d.previstoCents - d.despesasLancadasCents,
      saldoAcumuladoRealizadoCents: runningSaldoRealizadoCents,
      percentRecebido: calcPct(d.recebidoCompetenciaCents, d.previstoCents, 1),
      percentInadimplente: calcPct(d.inadimplenteCents, d.previstoCents, 1),
    };
  });

  // 9. Análise Mensal & Previous Month Comparison
  const targetMonthRef =
    filter.mode === 'competence' && filter.year !== 'all' && filter.month !== 'all'
      ? `${filter.year}-${filter.month}`
      : sortedMonths[sortedMonths.length - 1] || todayStr.slice(0, 7);

  const previousMonthRef = getPreviousMonthRef(targetMonthRef);

  const emptyMonthPoint = (mRef: string): MonthlyHistoryPoint => ({
    monthRef: mRef,
    label: formatMonthLabelPtBr(mRef),
    previstoCents: 0,
    recebidoCompetenciaCents: 0,
    recebidoRealizadoCents: 0,
    pendenteCents: 0,
    inadimplenteCents: 0,
    aReceberCents: 0,
    despesasLancadasCents: 0,
    despesasPagasCents: 0,
    saldoRealizadoCents: 0,
    saldoPrevistoCents: 0,
    saldoAcumuladoRealizadoCents: 0,
    percentRecebido: 0,
    percentInadimplente: 0,
  });

  const atualMonthPoint =
    fullMonthlyHistory.find((p) => p.monthRef === targetMonthRef) || emptyMonthPoint(targetMonthRef);
  const anteriorMonthPoint =
    fullMonthlyHistory.find((p) => p.monthRef === previousMonthRef) || null;

  const calcDeltaPct = (curr: number, prev: number | undefined): number | null => {
    if (prev === undefined || prev === 0) return null;
    return Number((((curr - prev) / Math.abs(prev)) * 100).toFixed(1));
  };

  const analiseMensal = {
    targetMonthRef,
    previousMonthRef,
    atual: atualMonthPoint,
    anterior: anteriorMonthPoint,
    deltas: {
      recebidoDiffCents:
        atualMonthPoint.recebidoRealizadoCents - (anteriorMonthPoint?.recebidoRealizadoCents || 0),
      recebidoDiffPct: calcDeltaPct(
        atualMonthPoint.recebidoRealizadoCents,
        anteriorMonthPoint?.recebidoRealizadoCents
      ),
      despesasDiffCents:
        atualMonthPoint.despesasPagasCents - (anteriorMonthPoint?.despesasPagasCents || 0),
      despesasDiffPct: calcDeltaPct(
        atualMonthPoint.despesasPagasCents,
        anteriorMonthPoint?.despesasPagasCents
      ),
      inadimplenteDiffCents:
        atualMonthPoint.inadimplenteCents - (anteriorMonthPoint?.inadimplenteCents || 0),
      inadimplenteDiffPct: calcDeltaPct(
        atualMonthPoint.inadimplenteCents,
        anteriorMonthPoint?.inadimplenteCents
      ),
      saldoRealizadoDiffCents:
        atualMonthPoint.saldoRealizadoCents - (anteriorMonthPoint?.saldoRealizadoCents || 0),
    },
  };

  // 10. Análise Anual e Geral (without double-counting)
  const targetYear =
    filter.mode === 'competence' && filter.year !== 'all'
      ? filter.year
      : targetMonthRef.slice(0, 4) || todayStr.slice(0, 4);

  const yearMonths = fullMonthlyHistory.filter((p) => p.monthRef.startsWith(`${targetYear}-`));
  const totalPrevistoAnualCents = yearMonths.reduce((s, p) => s + p.previstoCents, 0);
  const totalRecebidoCompetenciaAnualCents = yearMonths.reduce(
    (s, p) => s + p.recebidoCompetenciaCents,
    0
  );
  const totalRecebidoRealizadoAnualCents = yearMonths.reduce(
    (s, p) => s + p.recebidoRealizadoCents,
    0
  );
  const totalPendenteAnualCents = yearMonths.reduce((s, p) => s + p.pendenteCents, 0);
  const totalInadimplenteAnualCents = yearMonths.reduce((s, p) => s + p.inadimplenteCents, 0);
  const totalDespesasPagasAnualCents = yearMonths.reduce((s, p) => s + p.despesasPagasCents, 0);
  const totalDespesasLancadasAnualCents = yearMonths.reduce((s, p) => s + p.despesasLancadasCents, 0);
  const mesesComLancamento = yearMonths.length;

  // Yearly comparison across all available years
  const comparativoAnosMap = new Map<string, YearlyComparisonPoint>();
  fullMonthlyHistory.forEach((p) => {
    const y = p.monthRef.slice(0, 4);
    if (!comparativoAnosMap.has(y)) {
      comparativoAnosMap.set(y, {
        year: y,
        previstoCents: 0,
        recebidoCompetenciaCents: 0,
        recebidoRealizadoCents: 0,
        pendenteCents: 0,
        inadimplenteCents: 0,
        despesasPagasCents: 0,
        resultadoRealizadoCents: 0,
        resultadoPrevistoCents: 0,
        percentRecebido: 0,
        mesesAtivos: 0,
      });
    }
    const yp = comparativoAnosMap.get(y)!;
    yp.previstoCents += p.previstoCents;
    yp.recebidoCompetenciaCents += p.recebidoCompetenciaCents;
    yp.recebidoRealizadoCents += p.recebidoRealizadoCents;
    yp.pendenteCents += p.pendenteCents;
    yp.inadimplenteCents += p.inadimplenteCents;
    yp.despesasPagasCents += p.despesasPagasCents;
    yp.resultadoRealizadoCents += p.saldoRealizadoCents;
    yp.resultadoPrevistoCents += p.saldoPrevistoCents;
    yp.mesesAtivos += 1;
  });

  const comparativoAnos = Array.from(comparativoAnosMap.values())
    .sort((a, b) => a.year.localeCompare(b.year))
    .map((yp) => ({
      ...yp,
      percentRecebido: calcPct(yp.recebidoCompetenciaCents, yp.previstoCents, 1),
    }));

  // Categories with highest delinquency (within filtered period)
  const totalInadAllCats = categorias.reduce((s, c) => s + c.inadimplenteCents, 0);
  const categoriasMaiorInadimplencia = [...categorias]
    .sort((a, b) => b.inadimplenteCents - a.inadimplenteCents)
    .map((c) => ({
      id: c.id,
      title: c.title,
      inadimplenteCents: c.inadimplenteCents,
      previstoCents: c.previstoCents,
      percentInadimplenteCategoria: calcPct(c.inadimplenteCents, c.previstoCents, 1),
      shareOfTotalInadimplenciaPct: calcPct(c.inadimplenteCents, totalInadAllCats, 1),
    }));

  // 11. Mandatory Mathematical Audit (Conferência Matemática)
  const sumCatPrevisto = categorias.reduce((s, c) => s + c.previstoCents, 0);
  const sumCatRecebido = categorias.reduce((s, c) => s + c.recebidoCents, 0);
  const sumCatAberto = categorias.reduce((s, c) => s + c.pendenteCents + c.inadimplenteCents, 0);

  // Check #5: Resident counts vs unique records across all categories
  let residentCountDrift = 0;
  let totalCobrancasRegistros = 0;
  let totalCobrancasSoma = 0;
  categorias.forEach((c) => {
    totalCobrancasRegistros += c.items.length;
    totalCobrancasSoma += c.registrosPagos + c.registrosPendentes;
    if (c.moradoresPagantes + c.moradoresPendentes !== c.totalMoradoresCobrados) {
      residentCountDrift += 1;
    }
    if (c.registrosPagos + c.registrosPendentes !== c.items.length) {
      residentCountDrift += 1;
    }
  });

  const checks: AuditCheckItem[] = [
    {
      id: 'cats_vs_previsto',
      label: 'Soma das Categorias vs Total Previsto Geral',
      leftValueCents: sumCatPrevisto,
      rightValueCents: totalPrevistoCents - totalCriticalMismatchCents,
      diffCents: sumCatPrevisto - (totalPrevistoCents - totalCriticalMismatchCents),
      passed:
        sumCatPrevisto === totalPrevistoCents && totalCriticalMismatchCents === 0,
      description:
        'Garante que a soma de Fundo de Reserva + Água + Energia + Prestador + Rateio é idêntica ao Total Previsto.',
    },
    {
      id: 'cats_vs_recebido',
      label: 'Soma das Categorias Recebidas vs Recebido Geral',
      leftValueCents: sumCatRecebido,
      rightValueCents: totalRecebidoCents,
      diffCents: sumCatRecebido - totalRecebidoCents,
      passed: sumCatRecebido === totalRecebidoCents,
      description:
        'Valida que pagamentos integrais, parciais e divergentes somam exatamente ao Total Recebido na competência.',
    },
    {
      id: 'cats_vs_aberto',
      label: 'Soma Pendente + Inadimplente das Categorias vs Contas a Receber',
      leftValueCents: sumCatAberto,
      rightValueCents: contasAReceberCents,
      diffCents: sumCatAberto - contasAReceberCents,
      passed: sumCatAberto === contasAReceberCents,
      description:
        'Comprova que os saldos a vencer e vencidos por categoria fecham em centavos com o total a receber.',
    },
    {
      id: 'recebido_mais_aberto_vs_previsto',
      label: 'Recebido + Pendente + Inadimplente vs Total Previsto',
      leftValueCents: totalRecebidoCents + totalPendenteCents + totalInadimplenteCents,
      rightValueCents: totalPrevistoCents,
      diffCents:
        totalRecebidoCents + totalPendenteCents + totalInadimplenteCents - totalPrevistoCents,
      passed:
        totalRecebidoCents + totalPendenteCents + totalInadimplenteCents === totalPrevistoCents,
      description:
        'Equação contábil fundamental das receitas lançadas no período selecionado.',
    },
    {
      id: 'moradores_vs_registros',
      label: 'Contagem de Moradores vs Registros Individuais',
      leftValueCents: totalCobrancasSoma,
      rightValueCents: totalCobrancasRegistros,
      diffCents: residentCountDrift + (totalCobrancasSoma - totalCobrancasRegistros),
      isCount: true,
      passed: residentCountDrift === 0 && totalCobrancasSoma === totalCobrancasRegistros,
      description:
        'Confere que apenas moradores com cobrança ativa (> R$ 0,00) são contabilizados e pagos + pendentes = total.',
    },
  ];

  const subCentAdjustedBills = competenceBills
    .filter((bd) => bd.subCentAdjustment !== null)
    .map((bd) => ({
      billId: bd.bill.id,
      residentName: bd.residentName,
      monthReference: bd.monthReference,
      diffCents: bd.subCentAdjustment!.diffCents,
      adjustedCategory: bd.subCentAdjustment!.adjustedCategory,
    }));

  const criticalMismatches = competenceBills
    .filter((bd) => bd.criticalMismatchCents !== 0)
    .map((bd) => ({
      billId: bd.bill.id,
      residentName: bd.residentName,
      monthReference: bd.monthReference,
      storedTotalCents: bd.storedTotalCents,
      categoriesSumCents: bd.rawCategoriesSumCents,
      diffCents: bd.criticalMismatchCents,
    }));

  const missingPaymentDates = allBreakdowns
    .filter((bd) => bd.hasMissingPaymentDate)
    .map((bd) => ({
      billId: bd.bill.id,
      residentName: bd.residentName,
      monthReference: bd.monthReference,
      paidCents: bd.paidCents,
    }));

  const overpayments = allBreakdowns
    .filter((bd) => bd.overpaymentCents > 0)
    .map((bd) => ({
      billId: bd.bill.id,
      residentName: bd.residentName,
      monthReference: bd.monthReference,
      overpaymentCents: bd.overpaymentCents,
    }));

  const overallPercentages = calcStackedPercentages(
    totalRecebidoCents,
    totalPendenteCents,
    totalInadimplenteCents,
    totalPrevistoCents
  );

  // Build readable active period label
  let activePeriodLabel = '';
  if (filter.mode === 'custom') {
    const s = filter.startDate ? filter.startDate.split('-').reverse().join('/') : '...';
    const e = filter.endDate ? filter.endDate.split('-').reverse().join('/') : '...';
    activePeriodLabel = `${s} a ${e}`;
  } else if (filter.year === 'all' && filter.month === 'all') {
    activePeriodLabel = 'Todo o Histórico';
  } else if (filter.month === 'all') {
    activePeriodLabel = `Ano ${filter.year}`;
  } else if (filter.year === 'all') {
    activePeriodLabel = `Mês ${filter.month} (Todos os anos)`;
  } else {
    activePeriodLabel = `${filter.month}/${filter.year}`;
  }

  return {
    todayStr,
    activePeriodLabel,
    availableYears,
    fluxoRealizado: {
      receitasRecebidasCents: realizedReceitasCents,
      despesasPagasCents: realizedDespesasCents,
      saldoRealizadoCents,
      paidBillsCount: realizedPaidBillsCount,
      paidExpensesCount: realizedExpenses.length,
      missingPaymentDateCount,
    },
    lancamentosGerais: {
      totalPrevistoCents,
      totalRecebidoCents,
      totalPendenteCents,
      totalInadimplenteCents,
      contasAReceberCents,
      despesasLancadasCents,
      contasAPagarCents,
      saldoPrevistoCents,
      percentRecebido: overallPercentages.pctRecebido,
      percentPendente: overallPercentages.pctPendente,
      percentInadimplente: overallPercentages.pctInadimplente,
      billsCount,
      expensesCount: competenceExpenses.length,
    },
    utilidadesECadastros: {
      totalWaterM3,
      waterMetersCount,
      totalEnergyKwh,
      energyMetersCount,
      totalUsers,
      activeUsers,
      billsCount,
      paidBillsCount,
      partialBillsCount,
      pendingBillsCount,
      overdueBillsCount,
      paidBillsPct,
    },
    categorias,
    analiseMensal,
    analiseAnual: {
      targetYear,
      totalPrevistoAnualCents,
      totalRecebidoCompetenciaAnualCents,
      totalRecebidoRealizadoAnualCents,
      totalPendenteAnualCents,
      totalInadimplenteAnualCents,
      totalDespesasPagasAnualCents,
      resultadoAnualRealizadoCents: totalRecebidoRealizadoAnualCents - totalDespesasPagasAnualCents,
      resultadoAnualPrevistoCents: totalPrevistoAnualCents - totalDespesasLancadasAnualCents,
      mediaMensalReceitasCents:
        mesesComLancamento > 0 ? Math.round(totalRecebidoRealizadoAnualCents / mesesComLancamento) : 0,
      mediaMensalDespesasCents:
        mesesComLancamento > 0 ? Math.round(totalDespesasPagasAnualCents / mesesComLancamento) : 0,
      percentRecebidoAnual: calcPct(totalRecebidoCompetenciaAnualCents, totalPrevistoAnualCents, 1),
      mesesComLancamento,
      ultimosMeses: fullMonthlyHistory.slice(-12),
      comparativoAnos,
      categoriasMaiorInadimplencia,
    },
    auditoria: {
      allPassed: checks.every((c) => c.passed) && criticalMismatches.length === 0,
      checks,
      subCentAdjustedBills,
      criticalMismatches,
      missingPaymentDates,
      overpayments,
    },
  };
}
