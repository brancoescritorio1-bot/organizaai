import test from 'node:test';
import assert from 'node:assert/strict';
import { ChacaraBill, ChacaraExpense, ChacaraUser } from '../../types';
import {
  ChacaraDashboardFilter,
  allocateCentsProportionally,
  calcPct,
  computeBillBreakdown,
  computeBillSaveTotals,
  computeChacaraDashboardData,
  toCents,
} from '../chacaraFinance';

const makeUsers = (): ChacaraUser[] => [
  { id: 1, name: 'Ana Silva', phone: '62999990001', last_reading: 100, has_energy: true, has_water: true },
  { id: 2, name: 'Bruno Costa', phone: '62999990002', last_reading: 200, has_energy: true, has_water: true },
  { id: 3, name: 'Carlos Dias', phone: '62999990003', last_reading: 300, has_energy: false, has_water: true },
  { id: 4, name: 'Daniela Rocha', phone: '62999990004', last_reading: 400, has_energy: true, has_water: true },
];

const makeBill = (overrides: Partial<ChacaraBill>): ChacaraBill => ({
  id: 1,
  user_id: 'owner-1',
  chacara_user_id: 1,
  month_reference: '2026-04',
  reading_date: '2026-04-05',
  due_date: '2026-04-10',
  prev_reading: 0,
  curr_reading: 100,
  kwh_value: 1.0,
  water_prev_reading: 0,
  water_curr_reading: 10,
  water_value: 5.0,
  water_service_fee: 15.0,
  apportionment_value: 20.0,
  include_apportionment: true,
  reserve_fund: 50.0,
  include_reserve_fund: true,
  total: 235.0,
  status: 'pending',
  amount_paid: 0,
  paid_categories: {},
  ...overrides,
});

const defaultFilter = (year = '2026', month = '04'): ChacaraDashboardFilter => ({
  mode: 'competence',
  year,
  month,
  startDate: '2026-04-01',
  endDate: '2026-04-30',
  category: 'all',
});

test('1 & 2. Totais gerais e por categoria com separação de moradores isentos (R$ 0,00)', () => {
  const users = makeUsers();
  const bills: ChacaraBill[] = [
    // Ana: Energia 100 + Água 50 + Prestador 15 + Rateio 20 + Fundo 50 = 235,00 (PAGA)
    makeBill({ id: 1, chacara_user_id: 1, status: 'paid', payment_date: '2026-04-08', total: 235.0 }),
    // Carlos: SEM energia (0,00) + Água 50 + Prestador 15 + Rateio 0 + Fundo 50 = 115,00 (PENDENTE A VENCER)
    makeBill({
      id: 2,
      chacara_user_id: 3,
      curr_reading: 0,
      prev_reading: 0,
      include_apportionment: false,
      total: 115.0,
      due_date: '2026-04-20',
      status: 'pending',
    }),
  ];
  const expenses: ChacaraExpense[] = [
    {
      id: 'exp-1',
      accountability_id: 'acc-1',
      description: 'Manutenção bomba',
      category: 'manutencao',
      amount: 120.5,
      date: '2026-04-12',
      month_reference: '2026-04',
    } as any,
  ];

  const data = computeChacaraDashboardData(bills, users, expenses, defaultFilter(), '2026-04-15');

  assert.equal(data.lancamentosGerais.totalPrevistoCents, 35000);
  assert.equal(data.lancamentosGerais.totalRecebidoCents, 23500);
  assert.equal(data.lancamentosGerais.totalPendenteCents, 11500);
  assert.equal(data.lancamentosGerais.totalInadimplenteCents, 0);
  assert.equal(data.lancamentosGerais.contasAReceberCents, 11500);
  assert.equal(data.fluxoRealizado.receitasRecebidasCents, 23500);
  assert.equal(data.fluxoRealizado.despesasPagasCents, 12050);
  assert.equal(data.fluxoRealizado.saldoRealizadoCents, 11450);

  // Energia só deve contar Ana (1 morador pago, 0 pendente), ignorando Carlos (R$ 0,00)!
  const energia = data.categorias.find((c) => c.id === 'energia')!;
  assert.equal(energia.previstoCents, 10000);
  assert.equal(energia.moradoresPagantes, 1);
  assert.equal(energia.moradoresPendentes, 0);
  assert.equal(energia.totalMoradoresCobrados, 1);

  // Rateio só deve contar Ana (1 pago, 0 pendente)
  const rateio = data.categorias.find((c) => c.id === 'rateio')!;
  assert.equal(rateio.previstoCents, 2000);
  assert.equal(rateio.moradoresPagantes, 1);
  assert.equal(rateio.moradoresPendentes, 0);

  assert.equal(data.auditoria.allPassed, true);
});

test('3. Pagamentos parciais (paid_categories, divergente e proporcional sem paid_categories)', () => {
  const users = makeUsers();
  // Caso A: pagamento parcial marcando Fundo (50) + Rateio (20) = 70,00 de 235,00
  const billA = makeBill({
    id: 10,
    chacara_user_id: 1,
    status: 'partial',
    amount_paid: 70.0,
    payment_date: '2026-04-09',
    due_date: '2026-04-20',
    paid_categories: { reserve_fund: true, apportionment: true },
  });
  const bdA = computeBillBreakdown(billA, users[0], '2026-04-15');
  assert.equal(bdA.paidCents, 7000);
  assert.equal(bdA.categories.fundo_reserva.recebidoCents, 5000);
  assert.equal(bdA.categories.rateio.recebidoCents, 2000);
  assert.equal(bdA.categories.energia.pendenteCents, 10000);

  // Caso B: pagamento parcial sem paid_categories com divisão inexata (R$ 100,00 sobre R$ 300,00 de 3 itens iguais)
  const billB = makeBill({
    id: 11,
    chacara_user_id: 2,
    curr_reading: 100, // energia = 100
    kwh_value: 1,
    water_curr_reading: 20, // agua = 100
    water_value: 5,
    water_service_fee: 0,
    include_apportionment: false,
    reserve_fund: 100, // fundo = 100 -> total 300
    include_reserve_fund: true,
    total: 300.0,
    status: 'partial',
    amount_paid: 100.0,
    payment_date: '2026-04-09',
    due_date: '2026-04-05', // vencida!
    paid_categories: {},
  });
  const bdB = computeBillBreakdown(billB, users[1], '2026-04-15');
  const sumCatsPaid =
    bdB.categories.fundo_reserva.recebidoCents +
    bdB.categories.agua.recebidoCents +
    bdB.categories.energia.recebidoCents;
  assert.equal(sumCatsPaid, 10000); // 3334 + 3333 + 3333 = 10000 exatos!
  assert.equal(bdB.inadimplenteCents, 20000);
  assert.equal(bdB.pendenteCents, 0);

  // Caso C: pagamento divergente com paid_categories marcados + valor menor digitado manualmente
  const billC = makeBill({
    id: 12,
    chacara_user_id: 4,
    status: 'partial',
    amount_paid: 60.0,
    paid_categories: { reserve_fund: true, apportionment: true }, // soma 70,00, mas pagou 60,00
    is_divergent: true,
    due_date: '2026-04-20',
  } as any);
  const bdC = computeBillBreakdown(billC, users[3], '2026-04-15');
  assert.equal(bdC.paidCents, 6000);
  assert.equal(
    bdC.categories.fundo_reserva.recebidoCents + bdC.categories.rateio.recebidoCents,
    6000
  );
});

test('4 & 5. Separação estrita entre Vencido (Inadimplente) e Não Vencido (Pendente)', () => {
  const users = makeUsers();
  const todayStr = '2026-04-15';
  const bills: ChacaraBill[] = [
    // Venceu dia 10/04 -> Inadimplente
    makeBill({ id: 20, chacara_user_id: 1, due_date: '2026-04-10', status: 'pending', total: 235 }),
    // Vence hoje dia 15/04 -> Pendente (ainda não vencida)
    makeBill({ id: 21, chacara_user_id: 2, due_date: '2026-04-15', status: 'pending', total: 235 }),
    // Vence dia 25/04 -> Pendente (a vencer)
    makeBill({ id: 22, chacara_user_id: 4, due_date: '2026-04-25', status: 'pending', total: 235 }),
  ];

  const data = computeChacaraDashboardData(bills, users, [], defaultFilter(), todayStr);
  assert.equal(data.lancamentosGerais.totalInadimplenteCents, 23500);
  assert.equal(data.lancamentosGerais.totalPendenteCents, 47000);
  assert.equal(data.lancamentosGerais.contasAReceberCents, 70500);
  assert.equal(data.utilidadesECadastros.overdueBillsCount, 1);
  assert.equal(data.auditoria.allPassed, true);
});

test('6 & 7. Fechamento mensal, Fluxo Realizado por payment_date e Acumulado Anual sem duplicidade', () => {
  const users = makeUsers();
  const bills: ChacaraBill[] = [
    // Março paga em Março (100,00)
    makeBill({
      id: 30,
      chacara_user_id: 1,
      month_reference: '2026-03',
      due_date: '2026-03-10',
      payment_date: '2026-03-10',
      status: 'paid',
      total: 100,
      curr_reading: 100,
      kwh_value: 1,
      water_curr_reading: 0,
      water_service_fee: 0,
      include_apportionment: false,
      include_reserve_fund: false,
    }),
    // Março paga atrasada em ABRIL (150,00) -> aparece em Lançamentos Gerais de Março, mas Caixa Realizado de Abril!
    makeBill({
      id: 31,
      chacara_user_id: 2,
      month_reference: '2026-03',
      due_date: '2026-03-10',
      payment_date: '2026-04-02',
      status: 'paid',
      total: 150,
      curr_reading: 150,
      kwh_value: 1,
      water_curr_reading: 0,
      water_service_fee: 0,
      include_apportionment: false,
      include_reserve_fund: false,
    }),
    // Abril paga em Abril (200,00)
    makeBill({
      id: 32,
      chacara_user_id: 1,
      month_reference: '2026-04',
      due_date: '2026-04-10',
      payment_date: '2026-04-10',
      status: 'paid',
      total: 200,
      curr_reading: 200,
      kwh_value: 1,
      water_curr_reading: 0,
      water_service_fee: 0,
      include_apportionment: false,
      include_reserve_fund: false,
    }),
    // 2025 para comparativo entre anos (500,00)
    makeBill({
      id: 33,
      chacara_user_id: 1,
      month_reference: '2025-12',
      due_date: '2025-12-10',
      payment_date: '2025-12-10',
      status: 'paid',
      total: 500,
      curr_reading: 500,
      kwh_value: 1,
      water_curr_reading: 0,
      water_service_fee: 0,
      include_apportionment: false,
      include_reserve_fund: false,
    }),
  ];
  const expenses: ChacaraExpense[] = [
    { id: 'e1', accountability_id: 'a1', description: 'Luz', category: 'energia', amount: 80, date: '2026-03-20', month_reference: '2026-03' } as any,
    { id: 'e2', accountability_id: 'a2', description: 'Água', category: 'agua', amount: 120, date: '2026-04-15', month_reference: '2026-04' } as any,
  ];

  const dataAbril = computeChacaraDashboardData(bills, users, expenses, defaultFilter('2026', '04'), '2026-04-20');

  // Fluxo realizado em Abril = 150 (conta de março paga em abril) + 200 (abril paga em abril) = 350,00
  assert.equal(dataAbril.fluxoRealizado.receitasRecebidasCents, 35000);
  assert.equal(dataAbril.fluxoRealizado.despesasPagasCents, 12000);
  assert.equal(dataAbril.fluxoRealizado.saldoRealizadoCents, 23000);

  // Lançamentos Gerais em Abril = somente conta #32 (200,00)
  assert.equal(dataAbril.lancamentosGerais.totalPrevistoCents, 20000);
  assert.equal(dataAbril.lancamentosGerais.totalRecebidoCents, 20000);

  // Comparativo com Março (anterior): Março realizado = 100 - 80 = +20; Abril = 350 - 120 = +230
  assert.equal(dataAbril.analiseMensal.anterior?.recebidoRealizadoCents, 10000);
  assert.equal(dataAbril.analiseMensal.deltas.recebidoDiffCents, 25000);
  assert.equal(dataAbril.analiseMensal.deltas.recebidoDiffPct, 250);

  // Análise Anual 2026 (Mar + Abr, sem contar 2025 e sem duplicar): 100 + 150 + 200 = 450 previsto e realizado; despesas 200; resultado 250
  assert.equal(dataAbril.analiseAnual.totalPrevistoAnualCents, 45000);
  assert.equal(dataAbril.analiseAnual.totalRecebidoRealizadoAnualCents, 45000);
  assert.equal(dataAbril.analiseAnual.totalDespesasPagasAnualCents, 20000);
  assert.equal(dataAbril.analiseAnual.resultadoAnualRealizadoCents, 25000);

  // Comparativo anos: 2025 e 2026 separados corretamente
  assert.equal(dataAbril.analiseAnual.comparativoAnos.length, 2);
  assert.equal(dataAbril.analiseAnual.comparativoAnos[0].year, '2025');
  assert.equal(dataAbril.analiseAnual.comparativoAnos[0].recebidoRealizadoCents, 50000);
  assert.equal(dataAbril.analiseAnual.comparativoAnos[1].year, '2026');
});

test('8. Percentuais e segurança com divisor zero (sem NaN)', () => {
  assert.equal(calcPct(0, 0), 0);
  assert.equal(calcPct(500, 0), 0);
  assert.equal(calcPct(100, 200), 50);

  const empty = computeChacaraDashboardData([], [], [], defaultFilter(), '2026-04-15');
  assert.equal(empty.lancamentosGerais.percentRecebido, 0);
  assert.equal(empty.lancamentosGerais.percentPendente, 0);
  assert.equal(empty.lancamentosGerais.percentInadimplente, 0);
  assert.equal(Number.isNaN(empty.analiseAnual.percentRecebidoAnual), false);
  assert.equal(empty.auditoria.allPassed, true);
});

test('9. Arredondamento em centavos (caso 2665.11 + 2625.16 = 5290.27 vs 5290.28 e ajuste sub-centavo)', () => {
  const users = makeUsers();
  // Cenário exato que causava 5.290,27 vs 5.290,28:
  // Morador 1: consumo * tarifa = 2665.114 -> 266511 centavos (R$ 2.665,11)
  // Morador 2: consumo * tarifa = 2625.164 -> 262516 centavos (R$ 2.625,16)
  // Soma antiga em float: 2665.114 + 2625.164 = 5290.278 -> R$ 5.290,28 (divergindo 0,01 da soma dos cards/itens!)
  const save1 = computeBillSaveTotals({
    energyKwh: 2665.114,
    kwhValue: 1,
    hasEnergy: true,
    waterM3: 0,
    waterValue: 0,
    hasWater: false,
    waterServiceFee: 0,
    apportionmentValue: 0,
    includeApportionment: false,
    reserveFundValue: 0,
    includeReserveFund: false,
  });
  const save2 = computeBillSaveTotals({
    energyKwh: 2625.164,
    kwhValue: 1,
    hasEnergy: true,
    waterM3: 0,
    waterValue: 0,
    hasWater: false,
    waterServiceFee: 0,
    apportionmentValue: 0,
    includeApportionment: false,
    reserveFundValue: 0,
    includeReserveFund: false,
  });
  assert.equal(save1.total, 2665.11);
  assert.equal(save2.total, 2625.16);

  const b1 = makeBill({
    id: 50,
    chacara_user_id: 1,
    curr_reading: 2665.114,
    kwh_value: 1,
    water_curr_reading: 0,
    water_service_fee: 0,
    include_apportionment: false,
    include_reserve_fund: false,
    total: save1.total,
    status: 'paid',
    payment_date: '2026-04-10',
  });
  const b2 = makeBill({
    id: 51,
    chacara_user_id: 2,
    curr_reading: 2625.164,
    kwh_value: 1,
    water_curr_reading: 0,
    water_service_fee: 0,
    include_apportionment: false,
    include_reserve_fund: false,
    total: save2.total,
    status: 'pending',
    due_date: '2026-04-20',
  });

  // Também testamos uma conta legada onde o DB tinha total=15.01 mas sub-itens eram 10.004 e 5.004
  const bLegacy = makeBill({
    id: 52,
    chacara_user_id: 4,
    curr_reading: 10.004,
    kwh_value: 1,
    water_curr_reading: 5.004,
    water_value: 1,
    water_service_fee: 0,
    include_apportionment: false,
    include_reserve_fund: false,
    total: 15.01,
    status: 'pending',
    due_date: '2026-04-20',
  });

  const data = computeChacaraDashboardData([b1, b2, bLegacy], users, [], defaultFilter(), '2026-04-15');
  assert.equal(data.auditoria.allPassed, true);
  assert.equal(data.auditoria.subCentAdjustedBills.length, 1);
  assert.equal(data.auditoria.subCentAdjustedBills[0].diffCents, 1);
  const sumCatsPrev = data.categorias.reduce((s, c) => s + c.previstoCents, 0);
  assert.equal(sumCatsPrev, data.lancamentosGerais.totalPrevistoCents);
  assert.equal(toCents(2665.11) + toCents(2625.16), 529027);

  // Test allocateCentsProportionally invariant across irregular totals
  const alloc = allocateCentsProportionally(1000, [
    { key: 'a', weightCents: 333 },
    { key: 'b', weightCents: 333 },
    { key: 'c', weightCents: 334 },
  ]);
  assert.equal(alloc.a + alloc.b + alloc.c, 1000);
});

test('10 & 11. Reatividade após criação, edição e exclusão de lançamentos', () => {
  const users = makeUsers();
  const initialBills: ChacaraBill[] = [
    makeBill({ id: 60, chacara_user_id: 1, total: 235, status: 'pending', due_date: '2026-04-20' }),
  ];

  const d1 = computeChacaraDashboardData(initialBills, users, [], defaultFilter(), '2026-04-15');
  assert.equal(d1.lancamentosGerais.totalPrevistoCents, 23500);
  assert.equal(d1.lancamentosGerais.totalPendenteCents, 23500);

  // 10. Criação de novo lançamento + despesa
  const withNew = [
    ...initialBills,
    makeBill({ id: 61, chacara_user_id: 2, total: 235, status: 'paid', payment_date: '2026-04-12' }),
  ];
  const withExp: ChacaraExpense[] = [
    { id: 'ex1', accountability_id: 'ac1', description: 'Roçagem', category: 'limpeza', amount: 90, date: '2026-04-13', month_reference: '2026-04' } as any,
  ];
  const d2 = computeChacaraDashboardData(withNew, users, withExp, defaultFilter(), '2026-04-15');
  assert.equal(d2.lancamentosGerais.totalPrevistoCents, 47000);
  assert.equal(d2.fluxoRealizado.receitasRecebidasCents, 23500);
  assert.equal(d2.fluxoRealizado.despesasPagasCents, 9000);
  assert.equal(d2.fluxoRealizado.saldoRealizadoCents, 14500);

  // 11. Edição (conta #60 recebe pagamento) e exclusão (despesa removida)
  const editedBills = withNew.map((b) =>
    b.id === 60 ? { ...b, status: 'paid' as const, payment_date: '2026-04-14' } : b
  );
  const d3 = computeChacaraDashboardData(editedBills, users, [], defaultFilter(), '2026-04-15');
  assert.equal(d3.lancamentosGerais.totalRecebidoCents, 47000);
  assert.equal(d3.lancamentosGerais.contasAReceberCents, 0);
  assert.equal(d3.fluxoRealizado.despesasPagasCents, 0);
  assert.equal(d3.fluxoRealizado.saldoRealizadoCents, 47000);
  assert.equal(d3.auditoria.allPassed, true);
});
