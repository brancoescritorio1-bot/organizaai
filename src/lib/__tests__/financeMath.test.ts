import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FinancialAccount,
  FinancialCategory,
  FinancialTransaction,
} from '../../types';
import {
  addMonthsPreservingDay,
  calculateCreditCardInvoiceDates,
  computeFinancialDashboard,
  distributeInstallmentsCents,
  distributeSplitsCents,
  doesTransactionBelongToCompetence,
  getAccountCreditLimit,
  getCreditCardInvoiceWindow,
  getTransactionCompetence,
  isInvoicePaymentTransaction,
  isTransferTransaction,
  resolvePurchaseGroup,
  round2,
} from '../financeMath';

const categories: FinancialCategory[] = [
  { id: 1, name: 'Salário', type: 'receita' },
  { id: 2, name: 'Alimentação', type: 'despesa' },
  { id: 3, name: 'Eletrônicos', type: 'despesa' },
  { id: 4, name: 'Pagamento de Fatura', type: 'despesa' },
  { id: 5, name: 'Transferência', type: 'despesa' },
  { id: 6, name: 'Transferência', type: 'receita' },
];

const makeAccounts = (): FinancialAccount[] => [
  {
    id: 10,
    name: 'Conta Corrente',
    type: 'corrente',
    initial_balance: 2000,
  },
  {
    id: 11,
    name: 'Carteira',
    type: 'dinheiro',
    initial_balance: 300,
  },
  {
    id: 20,
    name: 'Nubank',
    type: 'credito',
    initial_balance: 5000,
    credit_limit: 5000,
    closing_day: 25,
    due_day: 5,
  },
  {
    id: 21,
    name: 'Cartão Dia 31',
    type: 'credito',
    initial_balance: 3000,
    credit_limit: 3000,
    closing_day: 31,
    due_day: 31,
  },
];

function makeInstallmentSeries(params: {
  baseId: number;
  description: string;
  totalAmount: number;
  discountAmount?: number;
  totalInstallments: number;
  purchaseDate: string;
  account: FinancialAccount;
  categoryId?: number;
  splits?: Array<{ name: string; amount: number; status?: 'pago' | 'pendente' }>;
  paidIndices?: number[]; // 1-based installment numbers
}): FinancialTransaction[] {
  const {
    baseId,
    description,
    totalAmount,
    discountAmount = 0,
    totalInstallments,
    purchaseDate,
    account,
    categoryId = 3,
    splits = [],
    paidIndices = [],
  } = params;

  const amounts = distributeInstallmentsCents(totalAmount, totalInstallments);
  const splitSlices = distributeSplitsCents(splits, totalInstallments, undefined, true);
  const grossTotal = round2(totalAmount + discountAmount);

  return amounts.map((amt, idx0) => {
    const num = idx0 + 1;
    const isPaid = paidIndices.includes(num);
    const dueStr =
      account.type === 'credito'
        ? calculateCreditCardInvoiceDates(
            purchaseDate,
            Number(account.closing_day || 1),
            Number(account.due_day || 10),
            idx0
          ).dueDateStr
        : addMonthsPreservingDay(purchaseDate, idx0);

    return {
      id: baseId + idx0,
      description,
      amount: amt,
      gross_amount: idx0 === 0 ? grossTotal : undefined,
      discount_amount: idx0 === 0 ? discountAmount : 0,
      type: 'despesa',
      category_id: categoryId,
      account_id: account.id,
      date: account.type === 'credito' ? purchaseDate : addMonthsPreservingDay(purchaseDate, idx0),
      due_date: dueStr,
      status: isPaid ? 'pago' : 'pendente',
      is_installment: totalInstallments > 1,
      installment_number: num,
      total_installments: totalInstallments,
      parent_transaction_id: totalInstallments > 1 ? baseId : null,
      splits: splitSlices[idx0].map((s) => ({
        ...s,
        status: isPaid ? 'pago' : s.status || 'pendente',
      })),
    };
  });
}

test('Cenário 1: Lançamento simples (resolução, desconto e edição)', () => {
  const singleTx: FinancialTransaction = {
    id: 101,
    description: 'Supermercado',
    amount: 450,
    gross_amount: 500,
    discount_amount: 50,
    type: 'despesa',
    category_id: 2,
    account_id: 10,
    date: '2026-04-12',
    due_date: '2026-04-12',
    status: 'pago',
    is_installment: false,
    installment_number: 1,
    total_installments: 1,
    splits: [{ name: 'João', amount: 225, status: 'pago' }],
  };

  const resolved = resolvePurchaseGroup(singleTx, [singleTx]);
  assert.equal(resolved.isInstallmentPurchase, false);
  assert.equal(resolved.totalAmount, 450);
  assert.equal(resolved.grossAmount, 500);
  assert.equal(resolved.discountAmount, 50);
  assert.equal(resolved.purchaseDate, '2026-04-12');
  assert.equal(resolved.consolidatedStatus, 'quitada');
  assert.equal(resolved.splits[0].amount, 225);
});

test('Cenário 2: Compra parcelada inicia pendente (Regra 8) e abre edição sempre com o valor TOTAL original', () => {
  const accounts = makeAccounts();
  const card = accounts[2]; // Nubank
  const txs = makeInstallmentSeries({
    baseId: 200,
    description: 'Notebook',
    totalAmount: 1200,
    totalInstallments: 6,
    purchaseDate: '2026-04-10',
    account: card,
    splits: [
      { name: 'Ana', amount: 720, status: 'pago' }, // deve ser forçado a pendente na criação!
      { name: 'Bruno', amount: 480, status: 'pago' },
    ],
  });

  // Regra 8: toda nova compra parcelada e splits nascem pendentes
  assert.equal(txs.length, 6);
  txs.forEach((t) => {
    assert.equal(t.status, 'pendente');
    t.splits?.forEach((s) => assert.equal(s.status, 'pendente'));
  });

  // Abrindo edição pela 3ª ou 6ª parcela deve reconstruir R$ 1.200,00, 6x, data 2026-04-10 e splits totais
  const fromThird = resolvePurchaseGroup(txs[2], txs);
  const fromSixth = resolvePurchaseGroup(txs[5], txs);

  assert.equal(fromThird.isInstallmentPurchase, true);
  assert.equal(fromThird.totalAmount, 1200);
  assert.equal(fromThird.grossAmount, 1200);
  assert.equal(fromThird.totalInstallments, 6);
  assert.equal(fromThird.purchaseDate, '2026-04-10');
  assert.equal(fromThird.consolidatedStatus, 'pendente');
  assert.equal(fromThird.splits.find((s) => s.name === 'Ana')?.amount, 720);
  assert.equal(fromThird.splits.find((s) => s.name === 'Bruno')?.amount, 480);

  assert.equal(fromSixth.totalAmount, 1200);
  assert.equal(fromSixth.purchaseDate, '2026-04-10');

  // Simulando edição de 1200 -> 1500 em 6x
  const updatedSlices = distributeInstallmentsCents(1500, 6);
  assert.deepEqual(updatedSlices, [250, 250, 250, 250, 250, 250]);
});

test('Cenário 3: Centavos exatos na divisão (R$ 100 / 3) e alteração estrutural de parcelas (6x -> 10x / 4x / 1x)', () => {
  const threeWay = distributeInstallmentsCents(100, 3);
  assert.deepEqual(threeWay, [33.34, 33.33, 33.33]);
  assert.equal(round2(threeWay.reduce((a, b) => a + b, 0)), 100);

  // 1500 em 10x -> 150 cada; 1500 em 4x -> 375 cada; 1500 em 1x -> 1500
  const tenWay = distributeInstallmentsCents(1500, 10);
  assert.equal(tenWay.length, 10);
  assert.equal(round2(tenWay.reduce((a, b) => a + b, 0)), 1500);

  const fourWay = distributeInstallmentsCents(1500, 4);
  assert.deepEqual(fourWay, [375, 375, 375, 375]);

  const singleWay = distributeInstallmentsCents(1500, 1);
  assert.deepEqual(singleWay, [1500]);
});

test('Cenário 4: Preservação de parcelas pagas ao editar compra e alternância individual de parcela', () => {
  const accounts = makeAccounts();
  const card = accounts[2];
  const txs = makeInstallmentSeries({
    baseId: 300,
    description: 'Monitor 4K',
    totalAmount: 1200,
    totalInstallments: 4,
    purchaseDate: '2026-01-10',
    account: card,
    paidIndices: [1, 2], // parcelas 1 e 2 já pagas
  });

  const group = resolvePurchaseGroup(txs[2], txs);
  assert.equal(group.paidCount, 2);
  assert.equal(group.pendingCount, 2);
  assert.equal(group.paidAmount, 600);
  assert.equal(group.pendingAmount, 600);
  assert.equal(group.consolidatedStatus, 'parcial');

  // Redimensionando para 6x mantendo status das parcelas 1 e 2 como pagas
  const newAmounts = distributeInstallmentsCents(1500, 6);
  const rebuilt = newAmounts.map((amt, i) => ({
    installment_number: i + 1,
    amount: amt,
    status: txs[i]?.status === 'pago' ? 'pago' : 'pendente',
  }));
  assert.equal(rebuilt[0].status, 'pago');
  assert.equal(rebuilt[1].status, 'pago');
  assert.equal(rebuilt[2].status, 'pendente');
  assert.equal(rebuilt[5].status, 'pendente');
  assert.equal(round2(rebuilt.reduce((s, r) => s + r.amount, 0)), 1500);
});

test('Cenário 5: Divisão de responsabilidade por pessoa com preservação de splits já pagos', () => {
  const existingPerInstallment = [
    [
      { name: 'Maria', amount: 100, status: 'pago' as const },
      { name: 'Pedro', amount: 100, status: 'pendente' as const },
    ],
    [
      { name: 'Maria', amount: 100, status: 'pendente' as const },
      { name: 'Pedro', amount: 100, status: 'pendente' as const },
    ],
    [
      { name: 'Maria', amount: 100, status: 'pendente' as const },
      { name: 'Pedro', amount: 100, status: 'pendente' as const },
    ],
  ];

  // Edita total da compra de 600 -> 900 (Maria 450, Pedro 450) mantendo 1ª parcela de Maria como paga
  const distributed = distributeSplitsCents(
    [
      { name: 'Maria', amount: 450, status: 'pendente' },
      { name: 'Pedro', amount: 450, status: 'pendente' },
    ],
    3,
    existingPerInstallment,
    false
  );

  assert.equal(distributed[0][0].amount, 150);
  assert.equal(distributed[0][0].status, 'pago'); // preservado!
  assert.equal(distributed[0][1].amount, 150);
  assert.equal(distributed[0][1].status, 'pendente');
  assert.equal(distributed[1][0].status, 'pendente');
});

test('Cenário 6: Ciclo do cartão antes, no dia e após fechamento (dueDay <= closingDay e dueDay > closingDay)', () => {
  // Cartão A: fecha dia 25, vence dia 05 do mês seguinte (dueDay <= closingDay)
  const beforeClose = calculateCreditCardInvoiceDates('2026-04-24', 25, 5, 0);
  assert.equal(beforeClose.closingDateStr, '2026-04-25');
  assert.equal(beforeClose.dueDateStr, '2026-05-05');

  const onClose = calculateCreditCardInvoiceDates('2026-04-25', 25, 5, 0);
  assert.equal(onClose.closingDateStr, '2026-04-25');
  assert.equal(onClose.dueDateStr, '2026-05-05');

  const afterClose = calculateCreditCardInvoiceDates('2026-04-26', 25, 5, 0);
  assert.equal(afterClose.closingDateStr, '2026-05-25');
  assert.equal(afterClose.dueDateStr, '2026-06-05');

  // Cartão B: fecha dia 05, vence dia 15 do mesmo mês (dueDay > closingDay)
  const cardBBefore = calculateCreditCardInvoiceDates('2026-04-04', 5, 15, 0);
  assert.equal(cardBBefore.dueDateStr, '2026-04-15');

  const cardBAfter = calculateCreditCardInvoiceDates('2026-04-06', 5, 15, 0);
  assert.equal(cardBAfter.dueDateStr, '2026-05-15');

  // Janela de fatura para vencimento Maio/2026 (month=4) no Cartão A (fecha 25, vence 5)
  const winMay = getCreditCardInvoiceWindow(2026, 4, 25, 5);
  assert.equal(winMay.startStr, '2026-03-26');
  assert.equal(winMay.endStr, '2026-04-25');
  assert.equal(winMay.dueStr, '2026-05-05');
});

test('Cenário 7: Meses de 28, 29 (bissexto), 30 e 31 dias sem drift de dia', () => {
  // Caso A: Cartão fecha 25, vence 31 (dueDay > closingDay): compra 20/01 em 4x
  // Parcela 1: fecha 25/01 -> vence 31/01
  // Parcela 2: fecha 25/02 -> vence 28/02 (2026 não bissexto)
  // Parcela 3: fecha 25/03 -> vence 31/03 (recupera o dia 31 sem drift!)
  // Parcela 4: fecha 25/04 -> vence 30/04
  const a1 = calculateCreditCardInvoiceDates('2026-01-20', 25, 31, 0);
  const a2 = calculateCreditCardInvoiceDates('2026-01-20', 25, 31, 1);
  const a3 = calculateCreditCardInvoiceDates('2026-01-20', 25, 31, 2);
  const a4 = calculateCreditCardInvoiceDates('2026-01-20', 25, 31, 3);

  assert.equal(a1.dueDateStr, '2026-01-31');
  assert.equal(a2.dueDateStr, '2026-02-28');
  assert.equal(a3.dueDateStr, '2026-03-31');
  assert.equal(a4.dueDateStr, '2026-04-30');

  // Caso B: Cartão fecha 31, vence 31 (dueDay <= closingDay -> vence no mês seguinte ao fechamento)
  const b1 = calculateCreditCardInvoiceDates('2026-01-31', 31, 31, 0);
  const b2 = calculateCreditCardInvoiceDates('2026-01-31', 31, 31, 1);
  const b3 = calculateCreditCardInvoiceDates('2026-01-31', 31, 31, 2);
  assert.equal(b1.dueDateStr, '2026-02-28');
  assert.equal(b2.dueDateStr, '2026-03-31');
  assert.equal(b3.dueDateStr, '2026-04-30');

  // Ano bissexto 2024: fevereiro tem 29 dias
  const leapFeb = calculateCreditCardInvoiceDates('2024-01-20', 25, 31, 1);
  assert.equal(leapFeb.dueDateStr, '2024-02-29');

  // addMonthsPreservingDay também preserva o dia 31 após fevereiro
  assert.equal(addMonthsPreservingDay('2026-01-31', 1), '2026-02-28');
  assert.equal(addMonthsPreservingDay('2026-01-31', 2), '2026-03-31');
  assert.equal(addMonthsPreservingDay('2024-01-31', 1), '2024-02-29');
});

test('Cenário 8: Virada de ano Dezembro -> Janeiro -> Fevereiro', () => {
  // Compra em 28/12/2026 num cartão que fecha dia 25 e vence dia 05:
  // 28 > 25 => entra no ciclo que fecha em 25/01/2027 e vence em 05/02/2027!
  const decAfterClose = calculateCreditCardInvoiceDates('2026-12-28', 25, 5, 0);
  assert.equal(decAfterClose.closingDateStr, '2027-01-25');
  assert.equal(decAfterClose.dueDateStr, '2027-02-05');
  assert.equal(decAfterClose.dueYear, 2027);
  assert.equal(decAfterClose.dueMonth, 1);

  // Compra em 20/12/2026 fecha em 25/12/2026 -> vence em 05/01/2027
  const decBeforeClose = calculateCreditCardInvoiceDates('2026-12-20', 25, 5, 0);
  assert.equal(decBeforeClose.closingDateStr, '2026-12-25');
  assert.equal(decBeforeClose.dueDateStr, '2027-01-05');
  assert.equal(decBeforeClose.dueYear, 2027);
  assert.equal(decBeforeClose.dueMonth, 0);
});

test('Cenário 9: Recálculo de vencimentos ao alterar dia de fechamento/vencimento do cartão', () => {
  // Compra em 22/04/2026. Antes: fechava 25, vencia 05/05.
  // Usuário altera o cartão para fechar dia 20 e vencer dia 28 (do mesmo mês de fechamento!).
  // Logo 22/04 > 20 -> entra no ciclo de Maio (fecha 20/05 -> vence 28/05).
  const oldDue = calculateCreditCardInvoiceDates('2026-04-22', 25, 5, 0);
  const newDue = calculateCreditCardInvoiceDates('2026-04-22', 20, 28, 0);
  assert.equal(oldDue.dueDateStr, '2026-05-05');
  assert.equal(newDue.dueDateStr, '2026-05-28');
});

test('Cenário 10: Consistência Dashboard x Extrato x Cartão x Limite x Categorias', () => {
  const accounts = makeAccounts();
  const nubank = accounts[2]; // Limite 5000, fecha 25, vence 5

  // Compra parcelada em 3x de R$ 300 (total R$ 900) feita em 10/04/2026:
  // Parcela 1 -> vence 05/05/2026 (Maio)
  // Parcela 2 -> vence 05/06/2026 (Junho)
  // Parcela 3 -> vence 05/07/2026 (Julho)
  const ccInstallments = makeInstallmentSeries({
    baseId: 500,
    description: 'Cadeira Ergonômica',
    totalAmount: 900,
    totalInstallments: 3,
    purchaseDate: '2026-04-10',
    account: nubank,
    categoryId: 3,
    splits: [{ name: 'Lucas', amount: 450 }],
  });

  const liquidTransactions: FinancialTransaction[] = [
    {
      id: 1,
      description: 'Salário Maio',
      amount: 4000,
      type: 'receita',
      category_id: 1,
      account_id: 10,
      date: '2026-05-02',
      status: 'pago',
    },
    {
      id: 2,
      description: 'Mercado Maio',
      amount: 600,
      type: 'despesa',
      category_id: 2,
      account_id: 10,
      date: '2026-05-08',
      status: 'pago',
    },
    {
      id: 3,
      description: 'Internet Pendente',
      amount: 150,
      type: 'despesa',
      category_id: 2,
      account_id: 11,
      date: '2026-05-15',
      status: 'pendente',
    },
  ];

  const allTx = [...liquidTransactions, ...ccInstallments];

  // Dashboard de Maio/2026 (month = 4)
  const dashMay = computeFinancialDashboard({
    transactions: allTx,
    accounts,
    categories,
    month: 4,
    year: 2026,
  });

  // Receita: 4000
  assert.equal(dashMay.month_income, 4000);
  // Despesas de competência de Maio: Mercado (600) + Internet (150) + Parcela 1/3 do cartão (300) = 1050
  assert.equal(dashMay.month_expense, 1050);
  assert.equal(dashMay.month_expense_paid, 600);
  assert.equal(dashMay.month_expense_pending, 450);

  // Soma das categorias deve bater EXATAMENTE com month_expense!
  const catSum = round2(dashMay.expenses_by_category.reduce((s, c) => s + c.value, 0));
  assert.equal(catSum, dashMay.month_expense);

  // Saldo realizado em caixa: Inicial líquido (2000 + 300 = 2300) + 4000 - 600 = 5700
  assert.equal(dashMay.cash_balance, 5700);
  // Saldo previsto: 5700 - Internet Pendente (150) - Fatura Pendente (300) = 5250
  assert.equal(dashMay.total_balance, 5250);

  // Limite do Nubank: todas as 3 parcelas estão pendentes -> usado = 900, disponível = 4100
  const nubankSummary = dashMay.accounts_summary.find((a) => a.id === 20)!;
  assert.equal(nubankSummary.credit_limit, 5000);
  assert.equal(nubankSummary.credit_used, 900);
  assert.equal(nubankSummary.credit_available, 4100);
  assert.equal(nubankSummary.invoice_total, 300);
  assert.equal(nubankSummary.invoice_pending, 300);

  // Extrato de Maio usando doesTransactionBelongToCompetence deve selecionar exatamente as mesmas 4 transações de Maio
  const mayCompetenceTxs = allTx.filter((t) => {
    const acc = accounts.find((a) => a.id === t.account_id);
    return doesTransactionBelongToCompetence(t, acc, 2026, 4);
  });
  assert.equal(mayCompetenceTxs.length, 4); // 3 líquidas + 1ª parcela cartão
  assert.equal(dashMay.responsibility_details[0].name, 'Lucas');
  assert.equal(dashMay.responsibility_details[0].pending, 150); // 450 / 3
});

test('Cenário 11: Quitação de fatura e Transferência entre contas sem duplicação ou inflação de DRE', () => {
  const accounts = makeAccounts();
  const nubank = accounts[2];

  // Compra no cartão no ciclo de Maio (vence 05/05) já quitada pelo pagamento da fatura
  const cardItem: FinancialTransaction = {
    id: 700,
    description: 'Assinatura Software',
    amount: 200,
    type: 'despesa',
    category_id: 3,
    account_id: nubank.id,
    date: '2026-04-20',
    due_date: '2026-05-05',
    status: 'pago',
  };

  // Lançamento bancário de quitação da fatura (saiu R$ 200 da Conta Corrente)
  const invoicePayment: FinancialTransaction = {
    id: 701,
    description: 'Pagamento Fatura Nubank',
    amount: 200,
    type: 'despesa',
    category_id: 4, // "Pagamento de Fatura"
    account_id: 10,
    date: '2026-05-05',
    status: 'pago',
  };

  // Transferência entre contas: R$ 500 da Conta Corrente -> Carteira
  const transferOut: FinancialTransaction = {
    id: 702,
    description: 'Transferência para Carteira',
    amount: 500,
    type: 'despesa',
    category_id: 5,
    account_id: 10,
    date: '2026-05-10',
    status: 'pago',
    is_transfer: true,
  };
  const transferIn: FinancialTransaction = {
    id: 703,
    description: 'Transferência de Conta Corrente',
    amount: 500,
    type: 'receita',
    category_id: 6,
    account_id: 11,
    date: '2026-05-10',
    status: 'pago',
    is_transfer: true,
  };

  assert.equal(isInvoicePaymentTransaction(invoicePayment, 'Pagamento de Fatura'), true);
  assert.equal(isTransferTransaction(transferOut, 'Transferência'), true);
  assert.equal(isTransferTransaction(transferIn, 'Transferência'), true);

  const dash = computeFinancialDashboard({
    transactions: [cardItem, invoicePayment, transferOut, transferIn],
    accounts,
    categories,
    month: 4,
    year: 2026,
  });

  // Transferência NÃO infla receita (0) nem despesa (apenas 200 da compra real no cartão, sem contar os 200 do Pagamento de Fatura em dobro!)
  assert.equal(dash.month_income, 0);
  assert.equal(dash.month_expense, 200);
  assert.equal(dash.month_invoice_payments, 200);

  // Categorias só mostram Eletrônicos = 200 (nem Pagamento de Fatura nem Transferência!)
  assert.deepEqual(dash.expenses_by_category, [{ category_id: 3, name: 'Eletrônicos', value: 200 }]);

  // Caixa líquido: Conta Corrente = 2000 - 200 - 500 = 1300; Carteira = 300 + 500 = 800; Total = 2100
  const cc = dash.accounts_summary.find((a) => a.id === 10)!;
  const wallet = dash.accounts_summary.find((a) => a.id === 11)!;
  assert.equal(cc.balance, 1300);
  assert.equal(wallet.balance, 800);
  assert.equal(dash.cash_balance, 2100);
});

test('Cenário 12: Compatibilidade retroativa com registros legados sem novos campos', () => {
  const legacyCard: FinancialAccount = {
    id: 99,
    name: 'Cartão Legado',
    type: 'credito',
    initial_balance: 2500, // credit_limit ausente -> fallback para initial_balance
    closing_day: 10,
    due_day: 20,
  };
  assert.equal(getAccountCreditLimit(legacyCard), 2500);

  // Transações antigas sem gross_amount, discount_amount, due_date ou com parent_transaction_id = null na 1ª parcela
  const legacyTx1: FinancialTransaction = {
    id: 900,
    description: 'Compra Antiga',
    amount: 100,
    type: 'despesa',
    category_id: 3,
    account_id: 99,
    date: '2026-04-15', // após fechamento dia 10 -> deve ir para 20/05
    status: 'pago',
    is_installment: true,
    installment_number: 1,
    total_installments: 2,
    parent_transaction_id: null,
  };
  const legacyTx2: FinancialTransaction = {
    id: 901,
    description: 'Compra Antiga',
    amount: 100,
    type: 'despesa',
    category_id: 3,
    account_id: 99,
    date: '2026-04-15',
    status: 'pendente',
    is_installment: true,
    installment_number: 2,
    total_installments: 2,
    parent_transaction_id: 900,
  };

  // Competência cai corretamente no vencimento calculado quando due_date é nulo
  const comp1 = getTransactionCompetence(legacyTx1, legacyCard);
  const comp2 = getTransactionCompetence(legacyTx2, legacyCard);
  assert.deepEqual(comp1, { year: 2026, month: 4 }); // Maio
  assert.deepEqual(comp2, { year: 2026, month: 5 }); // Junho

  // Resolução pela 2ª parcela reconstrói total legado (200) e detecta status parcial
  const resolved = resolvePurchaseGroup(legacyTx2, [legacyTx1, legacyTx2]);
  assert.equal(resolved.totalAmount, 200);
  assert.equal(resolved.grossAmount, 200);
  assert.equal(resolved.discountAmount, 0);
  assert.equal(resolved.consolidatedStatus, 'parcial');
  assert.equal(resolved.paidCount, 1);
  assert.equal(resolved.pendingCount, 1);
});
