import express, { type Request, type Response } from 'express';
import path from 'node:path';
import { createServer as createViteServer } from 'vite';
import {
  calculateLoanTerms,
  generateInstallmentDueDates,
  maskCpf,
  resolveSharedLocationConsent,
} from './packages/api-client/finance';
import type {
  CollectionVisit,
  Customer,
  DashboardSummary,
  Installment,
  Loan,
  LoanFrequency,
  LoanGuaranteeType,
  LoanInterestModel,
  ReportSummary,
  TenantSummary,
  UserRole,
  UserSession,
} from './packages/api-client/types';

const PORT = 3000;

// Banco em memória estruturado para o servidor Express
const idempotencyStore = new Map<string, { status: number; body: unknown }>();

function makeSessionForRole(role: UserRole, email?: string): UserSession {
  const presets: Record<UserRole, Omit<UserSession, 'expiraEm'>> = {
    emprestador: {
      id: 'usr_1',
      nome: 'Ricardo Mendes',
      email: email || 'ricardo@creditoverde.com.br',
      role: 'emprestador',
      tenantNome: 'Mendes Crédito Regional',
      plano: 'Profissional',
      permissoes: ['clientes:ler', 'clientes:criar', 'emprestimos:aprovar', 'parcelas:receber', 'relatorios:ver'],
      notificacoesNaoLidas: 3,
    },
    equipe: {
      id: 'usr_2',
      nome: 'Camila Rocha',
      email: email || 'camila@creditoverde.com.br',
      role: 'equipe',
      tenantNome: 'Mendes Crédito Regional',
      plano: 'Profissional',
      permissoes: ['clientes:ler', 'parcelas:receber', 'cobranca:visitar'],
      notificacoesNaoLidas: 3,
    },
    cliente: {
      id: 'cli_1',
      nome: 'Mariana Oliveira Costa',
      email: email || 'mariana.costa@email.com.br',
      role: 'cliente',
      tenantNome: 'Mendes Crédito Regional',
      plano: 'Profissional',
      permissoes: ['meus_emprestimos:ler', 'minhas_parcelas:pagar'],
      notificacoesNaoLidas: 1,
    },
    super_admin: {
      id: 'usr_admin',
      nome: 'Diretoria CréditoVerde',
      email: email || 'diretoria@creditoverde.com.br',
      role: 'super_admin',
      tenantNome: 'Plataforma CréditoVerde',
      plano: 'Corporativo',
      permissoes: ['tenants:gerenciar', 'relatorios:global'],
      notificacoesNaoLidas: 2,
    },
  };

  return {
    ...presets[role],
    expiraEm: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };
}

const activeTokens = new Map<string, UserSession>([
  ['demo-emprestador', makeSessionForRole('emprestador')],
  ['demo-equipe', makeSessionForRole('equipe')],
  ['demo-cliente', makeSessionForRole('cliente')],
  ['demo-super_admin', makeSessionForRole('super_admin')],
]);

let customers: Customer[] = [
  {
    id: 'cli_1',
    nome: 'Mariana Oliveira Costa',
    cpfMascarado: '***.482.190-**',
    cpfCompleto: '12348219011',
    telefone: '(11) 98742-3104',
    email: 'mariana.costa@email.com.br',
    cidade: 'São Paulo',
    bairro: 'Vila Mariana',
    score: 845,
    status: 'ativo',
    limiteCredito: 12000,
    saldoDevedor: 3420.0,
    chavePix: 'mariana.costa@pix.com.br',
    avatarUrl: '/assets/avatar-1.svg',
    criadoEm: '2026-06-14T10:00:00.000Z',
    localizacaoConsentimento: {
      status: 'nao_solicitada',
      autorizada: false,
      finalidade: 'Confirmar presença e última localização ativa para análise cadastral e atendimento presencial.',
      ultimaLocalizacao: null,
    },
    documentos: [
      {
        id: 'doc_1',
        tipo: 'RG / CNH',
        nomeArquivo: 'cnh-mariana-frente.svg',
        enviadoEm: '2026-06-14T10:05:00.000Z',
        verificado: true,
        previewUrl: '/assets/doc-preview.svg',
      },
      {
        id: 'doc_2',
        tipo: 'Comprovante de Residência',
        nomeArquivo: 'conta-energia-outubro.svg',
        enviadoEm: '2026-06-14T10:07:00.000Z',
        verificado: true,
        previewUrl: '/assets/doc-preview.svg',
      },
    ],
    historico: [
      {
        id: 'evt_1',
        titulo: 'Parcela 3/6 recebida via PIX',
        descricao: 'Pagamento confirmado de R$ 684,00 sem atraso.',
        dataIso: '2026-11-10T14:22:00.000Z',
        tipo: 'pagamento',
      },
      {
        id: 'evt_2',
        titulo: 'Contrato EMP-2026-041 liberado',
        descricao: 'Valor principal de R$ 3.600,00 em 6 parcelas mensais.',
        dataIso: '2026-08-10T09:15:00.000Z',
        tipo: 'emprestimo',
      },
      {
        id: 'evt_3',
        titulo: 'Cadastro aprovado com score 845',
        descricao: 'Documentos validados e limite inicial definido.',
        dataIso: '2026-06-14T10:15:00.000Z',
        tipo: 'cadastro',
      },
    ],
  },
  {
    id: 'cli_2',
    nome: 'Carlos Eduardo Ferreira',
    cpfMascarado: '***.915.304-**',
    cpfCompleto: '45691530422',
    telefone: '(11) 99120-5588',
    email: 'carlos.ferreira@comercio.br',
    cidade: 'São Paulo',
    bairro: 'Mooca',
    score: 590,
    status: 'atraso',
    limiteCredito: 6500,
    saldoDevedor: 4180.5,
    chavePix: '11991205588',
    avatarUrl: '/assets/avatar-2.svg',
    criadoEm: '2026-05-03T11:30:00.000Z',
    localizacaoConsentimento: {
      status: 'autorizada',
      autorizada: true,
      consentidoEm: '2026-11-12T08:15:00.000Z',
      finalidade: 'Confirmar presença e última localização ativa para visita de cobrança e validação.',
      ultimaLocalizacao: {
        latitude: -23.5567,
        longitude: -46.5973,
        precisaoMetros: 22,
        cidadeAproximada: 'São Paulo',
        bairroAproximado: 'Mooca',
        atualizadaEm: '2026-11-14T11:40:00.000Z',
        origem: 'gps_navegador',
      },
    },
    documentos: [
      {
        id: 'doc_3',
        tipo: 'RG / CNH',
        nomeArquivo: 'rg-carlos-eduardo.svg',
        enviadoEm: '2026-05-03T11:40:00.000Z',
        verificado: true,
        previewUrl: '/assets/doc-preview.svg',
      },
    ],
    historico: [
      {
        id: 'evt_4',
        titulo: 'Aviso de vencimento enviado',
        descricao: 'Parcela 4/8 em atraso há 5 dias.',
        dataIso: '2026-11-12T08:30:00.000Z',
        tipo: 'cobranca',
      },
      {
        id: 'evt_5',
        titulo: 'Contrato EMP-2026-032 liberado',
        descricao: 'Valor principal de R$ 5.000,00 para capital de giro.',
        dataIso: '2026-07-05T15:10:00.000Z',
        tipo: 'emprestimo',
      },
    ],
  },
  {
    id: 'cli_3',
    nome: 'Fernanda Alves Nogueira',
    cpfMascarado: '***.734.612-**',
    cpfCompleto: '78973461233',
    telefone: '(11) 97654-1920',
    email: 'fernanda.nogueira@atelier.com.br',
    cidade: 'Santo André',
    bairro: 'Jardim',
    score: 912,
    status: 'ativo',
    limiteCredito: 18000,
    saldoDevedor: 6250.0,
    chavePix: 'fernanda.nogueira@pix.br',
    avatarUrl: '/assets/avatar-3.svg',
    criadoEm: '2026-04-18T16:00:00.000Z',
    localizacaoConsentimento: {
      status: 'autorizada',
      autorizada: true,
      consentidoEm: '2026-11-08T10:50:00.000Z',
      finalidade: 'Confirmar presença e última localização ativa para validação de cadastro.',
      ultimaLocalizacao: {
        latitude: -23.6528,
        longitude: -46.5391,
        precisaoMetros: 15,
        cidadeAproximada: 'Santo André',
        bairroAproximado: 'Jardim',
        atualizadaEm: '2026-11-14T09:10:00.000Z',
        origem: 'gps_navegador',
      },
    },
    documentos: [
      {
        id: 'doc_4',
        tipo: 'Comprovante de Renda',
        nomeArquivo: 'faturamento-mei-2026.svg',
        enviadoEm: '2026-04-18T16:15:00.000Z',
        verificado: true,
        previewUrl: '/assets/doc-preview.svg',
      },
    ],
    historico: [
      {
        id: 'evt_6',
        titulo: 'Parcela 5/10 liquidada antecipadamente',
        descricao: 'Recebimento de R$ 940,00 via PIX.',
        dataIso: '2026-11-08T11:05:00.000Z',
        tipo: 'pagamento',
      },
    ],
  },
  {
    id: 'cli_4',
    nome: 'João Pedro Vasconcelos',
    cpfMascarado: '***.208.449-**',
    cpfCompleto: '32120844944',
    telefone: '(11) 96321-8840',
    email: 'joao.vasconcelos@oficina.br',
    cidade: 'Guarulhos',
    bairro: 'Centro',
    score: 760,
    status: 'quitado',
    limiteCredito: 9000,
    saldoDevedor: 0,
    chavePix: '32120844944',
    avatarUrl: '/assets/avatar-2.svg',
    criadoEm: '2026-02-11T09:00:00.000Z',
    localizacaoConsentimento: {
      status: 'revogada',
      autorizada: false,
      consentidoEm: '2026-05-10T12:00:00.000Z',
      revogadoEm: '2026-10-26T09:00:00.000Z',
      finalidade: 'Confirmar presença e última localização ativa durante contrato vigente.',
      ultimaLocalizacao: null,
    },
    documentos: [],
    historico: [
      {
        id: 'evt_7',
        titulo: 'Contrato EMP-2026-014 quitado',
        descricao: 'Todas as 6 parcelas foram pagas em dia.',
        dataIso: '2026-10-25T17:40:00.000Z',
        tipo: 'pagamento',
      },
    ],
  },
  {
    id: 'cli_5',
    nome: 'Patrícia Lima Duarte',
    cpfMascarado: '***.661.825-**',
    cpfCompleto: '65466182555',
    telefone: '(11) 98410-7723',
    email: 'patricia.duarte@salao.com.br',
    cidade: 'São Bernardo',
    bairro: 'Rudge Ramos',
    score: 675,
    status: 'ativo',
    limiteCredito: 8000,
    saldoDevedor: 2890.0,
    chavePix: 'patricia.lima@pix.com.br',
    avatarUrl: '/assets/avatar-1.svg',
    criadoEm: '2026-07-22T13:20:00.000Z',
    localizacaoConsentimento: {
      status: 'nao_solicitada',
      autorizada: false,
      finalidade: 'Confirmar presença e última localização ativa para análise e atendimento.',
      ultimaLocalizacao: null,
    },
    documentos: [],
    historico: [
      {
        id: 'evt_8',
        titulo: 'Parcela 2/5 paga via transferência',
        descricao: 'Valor de R$ 722,50 compensado.',
        dataIso: '2026-11-04T16:10:00.000Z',
        tipo: 'pagamento',
      },
    ],
  },
];

let loans: Loan[] = [
  {
    id: 'emp_1',
    codigo: 'EMP-2026-041',
    clienteId: 'cli_1',
    clienteNome: 'Mariana Oliveira Costa',
    valorPrincipal: 3600,
    taxaMensalPct: 4.5,
    tipoJuros: 'composto',
    periodicidade: 'mensal',
    taxaAbertura: 0,
    multaAtrasoPct: 2,
    jurosMoraDiaPct: 0.33,
    garantiaTipo: 'sem_garantia',
    formasPagamentoPermitidas: ['PIX', 'Transferência'],
    observacoes: 'Liberação padrão para cliente recorrente com score acima de 800.',
    totalParcelas: 6,
    parcelasPagas: 3,
    valorTotal: 4104,
    valorParcela: 684,
    status: 'ativo',
    dataContratacao: '2026-08-10',
    primeiroVencimento: '2026-09-18',
    proximoVencimento: '2026-11-18',
    chavePixRecebimento: '00020126580014BR.GOV.BCB.PIX0136creditoverde-emp-0415204000053039865802BR',
    decididoPor: 'Ricardo Mendes',
  },
  {
    id: 'emp_2',
    codigo: 'EMP-2026-032',
    clienteId: 'cli_2',
    clienteNome: 'Carlos Eduardo Ferreira',
    valorPrincipal: 5000,
    taxaMensalPct: 5.2,
    tipoJuros: 'composto',
    periodicidade: 'mensal',
    taxaAbertura: 80,
    multaAtrasoPct: 3,
    jurosMoraDiaPct: 0.5,
    garantiaTipo: 'cheque_nota',
    garantiaDescricao: 'Nota promissória assinada em 05/07/2026',
    formasPagamentoPermitidas: ['PIX', 'Dinheiro'],
    observacoes: 'Em caso de atraso superior a 3 dias, acionar visita presencial.',
    totalParcelas: 8,
    parcelasPagas: 3,
    valorTotal: 6208,
    valorParcela: 776,
    status: 'atraso',
    dataContratacao: '2026-07-05',
    primeiroVencimento: '2026-08-09',
    proximoVencimento: '2026-11-09',
    chavePixRecebimento: '00020126580014BR.GOV.BCB.PIX0136creditoverde-emp-0325204000053039865802BR',
    decididoPor: 'Ricardo Mendes',
  },
  {
    id: 'emp_3',
    codigo: 'EMP-2026-028',
    clienteId: 'cli_3',
    clienteNome: 'Fernanda Alves Nogueira',
    valorPrincipal: 8000,
    taxaMensalPct: 3.8,
    tipoJuros: 'simples',
    periodicidade: 'mensal',
    taxaAbertura: 0,
    multaAtrasoPct: 2,
    jurosMoraDiaPct: 0.25,
    garantiaTipo: 'avalista',
    garantiaDescricao: 'Avalista: Marcos Nogueira (sócio MEI)',
    formasPagamentoPermitidas: ['PIX', 'Transferência'],
    observacoes: 'Taxa reduzida definida pelo emprestador mediante avalista.',
    totalParcelas: 10,
    parcelasPagas: 5,
    valorTotal: 9400,
    valorParcela: 940,
    status: 'ativo',
    dataContratacao: '2026-06-08',
    primeiroVencimento: '2026-07-20',
    proximoVencimento: '2026-11-20',
    chavePixRecebimento: '00020126580014BR.GOV.BCB.PIX0136creditoverde-emp-0285204000053039865802BR',
    decididoPor: 'Ricardo Mendes',
  },
  {
    id: 'emp_4',
    codigo: 'EMP-2026-047',
    clienteId: 'cli_5',
    clienteNome: 'Patrícia Lima Duarte',
    valorPrincipal: 3200,
    taxaMensalPct: 4.2,
    tipoJuros: 'composto',
    periodicidade: 'quinzenal',
    taxaAbertura: 50,
    multaAtrasoPct: 2,
    jurosMoraDiaPct: 0.33,
    garantiaTipo: 'sem_garantia',
    formasPagamentoPermitidas: ['PIX', 'Dinheiro', 'Transferência'],
    observacoes: 'Parcelamento quinzenal ajustado ao fluxo do salão.',
    totalParcelas: 5,
    parcelasPagas: 2,
    valorTotal: 3612.5,
    valorParcela: 722.5,
    status: 'ativo',
    dataContratacao: '2026-09-04',
    primeiroVencimento: '2026-09-19',
    proximoVencimento: '2026-11-14',
    chavePixRecebimento: '00020126580014BR.GOV.BCB.PIX0136creditoverde-emp-0475204000053039865802BR',
    decididoPor: 'Ricardo Mendes',
  },
  {
    id: 'emp_5',
    codigo: 'EMP-2026-014',
    clienteId: 'cli_4',
    clienteNome: 'João Pedro Vasconcelos',
    valorPrincipal: 4200,
    taxaMensalPct: 4.0,
    tipoJuros: 'simples',
    periodicidade: 'mensal',
    taxaAbertura: 0,
    multaAtrasoPct: 2,
    jurosMoraDiaPct: 0.33,
    garantiaTipo: 'veiculo',
    garantiaDescricao: 'Alienação fiduciária Honda CG 160',
    formasPagamentoPermitidas: ['PIX', 'Transferência'],
    totalParcelas: 6,
    parcelasPagas: 6,
    valorTotal: 4812,
    valorParcela: 802,
    status: 'quitado',
    dataContratacao: '2026-04-25',
    primeiroVencimento: '2026-05-25',
    proximoVencimento: '2026-10-25',
    chavePixRecebimento: '00020126580014BR.GOV.BCB.PIX0136creditoverde-emp-0145204000053039865802BR',
    decididoPor: 'Ricardo Mendes',
  },
];

let installments: Installment[] = [
  {
    id: 'par_1',
    emprestimoId: 'emp_2',
    emprestimoCodigo: 'EMP-2026-032',
    clienteId: 'cli_2',
    clienteNome: 'Carlos Eduardo Ferreira',
    numero: 4,
    totalParcelas: 8,
    vencimento: '2026-11-09',
    valor: 776,
    status: 'atrasada',
  },
  {
    id: 'par_2',
    emprestimoId: 'emp_4',
    emprestimoCodigo: 'EMP-2026-047',
    clienteId: 'cli_5',
    clienteNome: 'Patrícia Lima Duarte',
    numero: 3,
    totalParcelas: 5,
    vencimento: '2026-11-14',
    valor: 722.5,
    status: 'pendente',
  },
  {
    id: 'par_3',
    emprestimoId: 'emp_1',
    emprestimoCodigo: 'EMP-2026-041',
    clienteId: 'cli_1',
    clienteNome: 'Mariana Oliveira Costa',
    numero: 4,
    totalParcelas: 6,
    vencimento: '2026-11-18',
    valor: 684,
    status: 'pendente',
  },
  {
    id: 'par_4',
    emprestimoId: 'emp_3',
    emprestimoCodigo: 'EMP-2026-028',
    clienteId: 'cli_3',
    clienteNome: 'Fernanda Alves Nogueira',
    numero: 6,
    totalParcelas: 10,
    vencimento: '2026-11-20',
    valor: 940,
    status: 'pendente',
  },
  {
    id: 'par_5',
    emprestimoId: 'emp_1',
    emprestimoCodigo: 'EMP-2026-041',
    clienteId: 'cli_1',
    clienteNome: 'Mariana Oliveira Costa',
    numero: 3,
    totalParcelas: 6,
    vencimento: '2026-10-18',
    valor: 684,
    status: 'paga',
    pagoEm: '2026-10-18',
    formaPagamento: 'PIX',
  },
  {
    id: 'par_6',
    emprestimoId: 'emp_3',
    emprestimoCodigo: 'EMP-2026-028',
    clienteId: 'cli_3',
    clienteNome: 'Fernanda Alves Nogueira',
    numero: 5,
    totalParcelas: 10,
    vencimento: '2026-10-20',
    valor: 940,
    status: 'paga',
    pagoEm: '2026-10-19',
    formaPagamento: 'PIX',
  },
];

let collectionVisits: CollectionVisit[] = [
  {
    id: 'cob_1',
    clienteId: 'cli_2',
    clienteNome: 'Carlos Eduardo Ferreira',
    endereco: 'Rua da Mooca, 1420',
    bairro: 'Mooca · São Paulo',
    valorEmAberto: 776,
    diasAtraso: 5,
    horarioPrevisto: '09:30',
    status: 'pendente',
  },
  {
    id: 'cob_2',
    clienteId: 'cli_5',
    clienteNome: 'Patrícia Lima Duarte',
    endereco: 'Av. Senador Vergueiro, 890',
    bairro: 'Rudge Ramos · São Bernardo',
    valorEmAberto: 722.5,
    diasAtraso: 0,
    horarioPrevisto: '11:15',
    status: 'promessa',
    observacao: 'Confirmou envio de PIX após as 14h.',
  },
  {
    id: 'cob_3',
    clienteId: 'cli_1',
    clienteNome: 'Mariana Oliveira Costa',
    endereco: 'Rua Domingos de Morais, 2105',
    bairro: 'Vila Mariana · São Paulo',
    valorEmAberto: 684,
    diasAtraso: 0,
    horarioPrevisto: '15:00',
    status: 'visitado',
    observacao: 'Boleto/PIX entregue via WhatsApp.',
  },
];

function computeDashboardSummary(): DashboardSummary {
  const activeLoans = loans.filter((l) => l.status !== 'quitado');
  const totalEmprestado = activeLoans.reduce((acc, l) => acc + l.valorPrincipal, 0);
  const totalRecebidoMes = installments
    .filter((i) => i.status === 'paga')
    .reduce((acc, i) => acc + i.valor, 0) + 12450;
  const aReceber30Dias = installments
    .filter((i) => i.status !== 'paga')
    .reduce((acc, i) => acc + i.valor, 0);
  const atrasadas = installments.filter((i) => i.status === 'atrasada').length;
  const taxaInadimplenciaPct =
    installments.length > 0 ? Math.round((atrasadas / installments.length) * 1000) / 10 : 0;

  return {
    totalEmprestado,
    totalRecebidoMes,
    aReceber30Dias,
    taxaInadimplenciaPct,
    clientesAtivos: customers.filter((c) => c.status !== 'quitado').length,
    parcelasHoje: installments.filter((i) => i.status === 'pendente').length,
    fluxoMensal: [
      { mes: 'Jun', emprestado: 14200, recebido: 11800, inadimplenciaPct: 6.2 },
      { mes: 'Jul', emprestado: 18500, recebido: 14900, inadimplenciaPct: 5.8 },
      { mes: 'Ago', emprestado: 16400, recebido: 16100, inadimplenciaPct: 4.9 },
      { mes: 'Set', emprestado: 21300, recebido: 18400, inadimplenciaPct: 4.4 },
      { mes: 'Out', emprestado: 19800, recebido: 20200, inadimplenciaPct: 3.9 },
      { mes: 'Nov', emprestado: totalEmprestado, recebido: totalRecebidoMes, inadimplenciaPct: taxaInadimplenciaPct },
    ],
    atualizadoEm: new Date().toISOString(),
  };
}

function computeReportSummary(): ReportSummary {
  const dash = computeDashboardSummary();
  const totalPrincipal = loans.reduce((acc, l) => acc + l.valorPrincipal, 0);
  const totalContrato = loans.reduce((acc, l) => acc + l.valorTotal, 0);
  const jurosProjetados = Math.round((totalContrato - totalPrincipal) * 100) / 100;
  const emDia = loans.filter((l) => l.status === 'ativo').reduce((acc, l) => acc + l.valorTotal, 0);
  const emAtraso = loans.filter((l) => l.status === 'atraso').reduce((acc, l) => acc + l.valorTotal, 0);
  const quitado = loans.filter((l) => l.status === 'quitado').reduce((acc, l) => acc + l.valorTotal, 0);
  const soma = Math.max(1, emDia + emAtraso + quitado);

  return {
    carteiraTotal: totalContrato,
    jurosProjetados,
    taxaRecuperacaoPct: Math.max(70, Math.round((100 - dash.taxaInadimplenciaPct) * 10) / 10),
    ticketMedio: loans.length > 0 ? Math.round((totalPrincipal / loans.length) * 100) / 100 : 0,
    distribuicaoStatus: [
      { categoria: 'Em dia', valor: emDia, percentual: Math.round((emDia / soma) * 100) },
      { categoria: 'Em atraso', valor: emAtraso, percentual: Math.round((emAtraso / soma) * 100) },
      { categoria: 'Quitados', valor: quitado, percentual: Math.round((quitado / soma) * 100) },
    ],
    fluxoMensal: dash.fluxoMensal,
    atualizadoEm: new Date().toISOString(),
  };
}

async function maybeDelay(req: Request): Promise<void> {
  const raw = req.query.delay ?? req.header('x-mock-delay');
  const ms = Number(raw);
  if (Number.isFinite(ms) && ms > 0 && ms <= 25000) {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }
}

function maybeFail(req: Request, res: Response): boolean {
  if (req.query.fail === '1' || req.header('x-mock-fail') === '1') {
    res.status(503).json({ ok: false, error: 'service_unavailable' });
    return true;
  }
  return false;
}

async function startServer() {
  const app = express();
  app.use(express.json());

  // 1. Ping leve para BootScreen e monitoramento de conexão
  app.get('/api/ping', async (req, res) => {
    await maybeDelay(req);
    if (maybeFail(req, res)) return;
    res.setHeader('Cache-Control', 'no-store');
    res.json({ ok: true, ts: new Date().toISOString() });
  });

  // 2. Verificação de sessão
  app.get('/api/session', async (req, res) => {
    await maybeDelay(req);
    if (maybeFail(req, res)) return;
    const auth = req.header('authorization') || '';
    const token = auth.replace(/^Bearer\s+/i, '').trim();

    if (!token) {
      res.json({ session: null });
      return;
    }

    if (token === 'expired-token') {
      res.status(401).json({ session: null, expired: true });
      return;
    }

    const session = activeTokens.get(token);
    if (!session) {
      res.status(401).json({ session: null, expired: true });
      return;
    }
    res.json({ session });
  });

  // Login com seleção de perfil
  app.post('/api/login', async (req, res) => {
    const { email, role = 'emprestador' } = (req.body ?? {}) as { email?: string; role?: UserRole };
    const cleanEmail = (email || '').trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      res.status(400).json({ error: 'Informe um e-mail válido.' });
      return;
    }

    const token = `tok_${role}_${Date.now()}`;
    const session = makeSessionForRole(role, cleanEmail);
    activeTokens.set(token, session);
    res.json({ token, session });
  });

  app.post('/api/logout', (req, res) => {
    const token = (req.header('authorization') || '').replace(/^Bearer\s+/i, '').trim();
    if (token) activeTokens.delete(token);
    res.json({ ok: true });
  });

  // 3. Bootstrap inicial do usuário
  app.get('/api/bootstrap', async (req, res) => {
    await maybeDelay(req);
    if (maybeFail(req, res)) return;
    res.json({
      notificacoesNaoLidas: installments.filter((i) => i.status === 'atrasada').length + 2,
      tenantNome: 'Mendes Crédito Regional',
      plano: 'Profissional',
      serverTime: new Date().toISOString(),
    });
  });

  // 4. Dashboard
  app.get('/api/dashboard', async (req, res) => {
    await maybeDelay(req);
    if (maybeFail(req, res)) return;
    res.json(computeDashboardSummary());
  });

  // 5. Clientes
  app.get('/api/clientes', async (req, res) => {
    await maybeDelay(req);
    if (maybeFail(req, res)) return;
    const q = String(req.query.q ?? '').trim().toLowerCase();
    const status = String(req.query.status ?? 'todos');

    const filtered = customers.filter((c) => {
      const matchesStatus = status === 'todos' || c.status === status;
      const matchesQuery =
        !q ||
        c.nome.toLowerCase().includes(q) ||
        c.cidade.toLowerCase().includes(q) ||
        c.cpfMascarado.includes(q);
      return matchesStatus && matchesQuery;
    });

    // Lista retorna CPF já mascarado e localizacaoConsentimento protegido por autorização
    res.json(
      filtered.map(({ cpfCompleto: _cpf, ...safe }) => ({
        ...safe,
        localizacaoConsentimento: resolveSharedLocationConsent(safe.localizacaoConsentimento),
      })),
    );
  });

  app.get('/api/clientes/:id', async (req, res) => {
    await maybeDelay(req);
    if (maybeFail(req, res)) return;
    const found = customers.find((c) => c.id === req.params.id);
    if (!found) {
      res.status(404).json({ error: 'Cliente não encontrado.' });
      return;
    }
    res.json({
      ...found,
      localizacaoConsentimento: resolveSharedLocationConsent(found.localizacaoConsentimento),
    });
  });

  // 5b. Permissão e atualização da última localização ativa do cliente (somente último ponto, sem histórico)
  app.post('/api/clientes/:id/localizacao', async (req, res) => {
    const idempotencyKey = req.header('x-idempotency-key');
    if (idempotencyKey && idempotencyStore.has(idempotencyKey)) {
      const cached = idempotencyStore.get(idempotencyKey)!;
      res.status(cached.status).json(cached.body);
      return;
    }

    const found = customers.find((c) => c.id === req.params.id);
    if (!found) {
      res.status(404).json({ error: 'Cliente não encontrado.' });
      return;
    }

    const body = (req.body ?? {}) as {
      acao?: 'autorizar' | 'atualizar' | 'revogar' | 'negar';
      latitude?: number;
      longitude?: number;
      precisaoMetros?: number;
      origem?: 'gps_navegador' | 'confirmacao_cliente';
    };

    const acao = body.acao ?? 'autorizar';
    const nowIso = new Date().toISOString();
    const finalidade =
      found.localizacaoConsentimento?.finalidade ??
      'Confirmar presença e última localização ativa para validação de cadastro e atendimento.';

    if (acao === 'revogar' || acao === 'negar') {
      found.localizacaoConsentimento = {
        status: acao === 'revogar' ? 'revogada' : 'negada',
        autorizada: false,
        consentidoEm: found.localizacaoConsentimento?.consentidoEm,
        revogadoEm: nowIso,
        finalidade,
        ultimaLocalizacao: null,
      };
      found.historico = [
        {
          id: `evt_${Date.now()}`,
          titulo:
            acao === 'revogar'
              ? 'Autorização de localização revogada pelo cliente'
              : 'Permissão de localização recusada no dispositivo',
          descricao: 'A última localização ativa foi removida da visualização compartilhada.',
          dataIso: nowIso,
          tipo: 'privacidade',
        },
        ...(found.historico ?? []),
      ];
    } else {
      const lat = Number(body.latitude);
      const lng = Number(body.longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        res.status(400).json({ error: 'Coordenadas de localização inválidas.' });
        return;
      }

      const jaAutorizada = found.localizacaoConsentimento?.autorizada;
      found.localizacaoConsentimento = {
        status: 'autorizada',
        autorizada: true,
        consentidoEm: found.localizacaoConsentimento?.consentidoEm ?? nowIso,
        finalidade,
        ultimaLocalizacao: {
          latitude: Math.round(lat * 100000) / 100000,
          longitude: Math.round(lng * 100000) / 100000,
          precisaoMetros: Math.max(5, Math.round(Number(body.precisaoMetros) || 25)),
          cidadeAproximada: found.cidade,
          bairroAproximado: found.bairro,
          atualizadaEm: nowIso,
          origem: body.origem ?? 'gps_navegador',
        },
      };

      found.historico = [
        {
          id: `evt_${Date.now()}`,
          titulo: jaAutorizada
            ? 'Última localização ativa atualizada pelo cliente'
            : 'Localização autorizada pelo cliente',
          descricao: 'Compartilhamento restrito apenas à última localização ativa.',
          dataIso: nowIso,
          tipo: 'privacidade',
        },
        ...(found.historico ?? []),
      ];
    }

    const payload = resolveSharedLocationConsent(found.localizacaoConsentimento);
    if (idempotencyKey) {
      idempotencyStore.set(idempotencyKey, { status: 200, body: payload });
    }
    res.json(payload);
  });

  app.post('/api/clientes', async (req, res) => {
    const idempotencyKey = req.header('x-idempotency-key');
    if (idempotencyKey && idempotencyStore.has(idempotencyKey)) {
      const cached = idempotencyStore.get(idempotencyKey)!;
      res.status(cached.status).json(cached.body);
      return;
    }

    const body = req.body as Partial<Customer> & { cpf?: string };
    if (!body.nome || !body.telefone || !body.cidade) {
      res.status(400).json({ error: 'Preencha nome, telefone e cidade.' });
      return;
    }

    const rawCpf = body.cpf || body.cpfCompleto || '00000000000';
    const created: Customer = {
      id: `cli_${Date.now()}`,
      nome: body.nome.trim(),
      cpfMascarado: maskCpf(rawCpf),
      cpfCompleto: rawCpf.replace(/\D/g, ''),
      telefone: body.telefone.trim(),
      email: (body.email || 'contato@cliente.com.br').trim(),
      cidade: body.cidade.trim(),
      bairro: (body.bairro || 'Centro').trim(),
      score: 740,
      status: 'ativo',
      limiteCredito: Number(body.limiteCredito) || 5000,
      saldoDevedor: 0,
      chavePix: (body.chavePix || body.telefone).trim(),
      avatarUrl: `/assets/avatar-${(customers.length % 3) + 1}.svg`,
      criadoEm: new Date().toISOString(),
      localizacaoConsentimento: {
        status: 'nao_solicitada',
        autorizada: false,
        finalidade: 'Confirmar presença e última localização ativa para validação cadastral.',
        ultimaLocalizacao: null,
      },
      documentos: [],
      historico: [
        {
          id: `evt_${Date.now()}`,
          titulo: 'Cliente cadastrado',
          descricao: 'Cadastro realizado e pronto para análise de crédito.',
          dataIso: new Date().toISOString(),
          tipo: 'cadastro',
        },
      ],
    };

    customers = [created, ...customers];
    if (idempotencyKey) {
      idempotencyStore.set(idempotencyKey, { status: 201, body: created });
    }
    res.status(201).json(created);
  });

  // 6. Empréstimos (O emprestador define todos os detalhes do contrato)
  app.get('/api/emprestimos', async (req, res) => {
    await maybeDelay(req);
    if (maybeFail(req, res)) return;
    const status = String(req.query.status ?? 'todos');
    const clienteId = String(req.query.clienteId ?? '');
    const filtered = loans.filter((l) => {
      const matchStatus = status === 'todos' || l.status === status;
      const matchCliente = !clienteId || l.clienteId === clienteId;
      return matchStatus && matchCliente;
    });
    res.json(filtered);
  });

  app.post('/api/emprestimos', async (req, res) => {
    const idempotencyKey = req.header('x-idempotency-key');
    if (idempotencyKey && idempotencyStore.has(idempotencyKey)) {
      const cached = idempotencyStore.get(idempotencyKey)!;
      res.status(cached.status).json(cached.body);
      return;
    }

    const callerRole = req.header('x-user-role');
    if (callerRole === 'cliente' || callerRole === 'equipe') {
      res.status(403).json({
        error: 'Apenas o emprestador pode definir e liberar contratos de empréstimo.',
      });
      return;
    }

    const {
      clienteId,
      valorPrincipal,
      taxaMensalPct,
      tipoJuros = 'composto',
      periodicidade = 'mensal',
      taxaAbertura = 0,
      multaAtrasoPct = 2,
      jurosMoraDiaPct = 0.33,
      garantiaTipo = 'sem_garantia',
      garantiaDescricao,
      formasPagamentoPermitidas = ['PIX', 'Transferência'],
      observacoes,
      totalParcelas,
      primeiroVencimento,
      chavePixRecebimento,
      decididoPor = 'Ricardo Mendes',
    } = (req.body ?? {}) as {
      clienteId?: string;
      valorPrincipal?: number;
      taxaMensalPct?: number;
      tipoJuros?: LoanInterestModel;
      periodicidade?: LoanFrequency;
      taxaAbertura?: number;
      multaAtrasoPct?: number;
      jurosMoraDiaPct?: number;
      garantiaTipo?: LoanGuaranteeType;
      garantiaDescricao?: string;
      formasPagamentoPermitidas?: Array<'PIX' | 'Dinheiro' | 'Transferência'>;
      observacoes?: string;
      totalParcelas?: number;
      primeiroVencimento?: string;
      chavePixRecebimento?: string;
      decididoPor?: string;
    };

    const cliente = customers.find((c) => c.id === clienteId);
    if (!cliente || !valorPrincipal || valorPrincipal <= 0) {
      res.status(400).json({ error: 'Dados do empréstimo inválidos.' });
      return;
    }

    const parcelasCount = Math.max(1, Math.min(60, Number(totalParcelas) || 6));
    const taxa = Math.max(0, Number(taxaMensalPct ?? 4.5));
    const tac = Math.max(0, Number(taxaAbertura) || 0);
    const terms = calculateLoanTerms({
      principal: Number(valorPrincipal),
      taxaMensalPct: taxa,
      parcelas: parcelasCount,
      tipoJuros,
      periodicidade,
      taxaAbertura: tac,
    });

    const codigo = `EMP-2026-0${loans.length + 51}`;
    const today = new Date();
    const defaultFirstDue = new Date(today.getFullYear(), today.getMonth() + 1, today.getDate())
      .toISOString()
      .slice(0, 10);
    const firstDueIso = primeiroVencimento && /^\d{4}-\d{2}-\d{2}$/.test(primeiroVencimento)
      ? primeiroVencimento
      : defaultFirstDue;

    const dueDates = generateInstallmentDueDates({
      primeiroVencimentoIso: firstDueIso,
      totalParcelas: parcelasCount,
      periodicidade,
    });

    const newLoan: Loan = {
      id: `emp_${Date.now()}`,
      codigo,
      clienteId: cliente.id,
      clienteNome: cliente.nome,
      valorPrincipal: Number(valorPrincipal),
      taxaMensalPct: taxa,
      tipoJuros,
      periodicidade,
      taxaAbertura: tac,
      multaAtrasoPct: Math.max(0, Number(multaAtrasoPct) || 0),
      jurosMoraDiaPct: Math.max(0, Number(jurosMoraDiaPct) || 0),
      garantiaTipo,
      garantiaDescricao: garantiaDescricao?.trim() || undefined,
      formasPagamentoPermitidas:
        formasPagamentoPermitidas.length > 0 ? formasPagamentoPermitidas : ['PIX'],
      observacoes: observacoes?.trim() || undefined,
      totalParcelas: parcelasCount,
      parcelasPagas: 0,
      valorTotal: terms.valorTotal,
      valorParcela: terms.valorParcela,
      status: 'ativo',
      dataContratacao: today.toISOString().slice(0, 10),
      primeiroVencimento: dueDates[0],
      proximoVencimento: dueDates[0],
      chavePixRecebimento:
        chavePixRecebimento?.trim() ||
        `00020126580014BR.GOV.BCB.PIX0136creditoverde-${codigo.toLowerCase()}`,
      decididoPor,
    };

    loans = [newLoan, ...loans];
    cliente.saldoDevedor = Math.round((cliente.saldoDevedor + terms.valorTotal) * 100) / 100;
    cliente.historico = [
      {
        id: `evt_${Date.now()}`,
        titulo: `Contrato ${codigo} liberado (${periodicidade})`,
        descricao: `Principal R$ ${Number(valorPrincipal).toFixed(2)} em ${parcelasCount}x (${tipoJuros}) · Multa ${newLoan.multaAtrasoPct}%.`,
        dataIso: new Date().toISOString(),
        tipo: 'emprestimo',
      },
      ...(cliente.historico ?? []),
    ];

    const newInstallments: Installment[] = dueDates.map((dueIso, idx) => ({
      id: `par_${Date.now()}_${idx + 1}`,
      emprestimoId: newLoan.id,
      emprestimoCodigo: codigo,
      clienteId: cliente.id,
      clienteNome: cliente.nome,
      numero: idx + 1,
      totalParcelas: parcelasCount,
      vencimento: dueIso,
      valor: terms.valorParcela,
      status: 'pendente',
    }));

    installments = [...newInstallments, ...installments];

    if (idempotencyKey) {
      idempotencyStore.set(idempotencyKey, { status: 201, body: newLoan });
    }
    res.status(201).json(newLoan);
  });

  app.patch('/api/emprestimos/:id', async (req, res) => {
    const callerRole = req.header('x-user-role');
    if (callerRole === 'cliente' || callerRole === 'equipe') {
      res.status(403).json({ error: 'Somente o emprestador pode alterar condições contratuais.' });
      return;
    }

    const loan = loans.find((l) => l.id === req.params.id);
    if (!loan) {
      res.status(404).json({ error: 'Contrato não encontrado.' });
      return;
    }

    const body = (req.body ?? {}) as Partial<Loan>;
    if (typeof body.multaAtrasoPct === 'number') loan.multaAtrasoPct = Math.max(0, body.multaAtrasoPct);
    if (typeof body.jurosMoraDiaPct === 'number') loan.jurosMoraDiaPct = Math.max(0, body.jurosMoraDiaPct);
    if (body.garantiaTipo) loan.garantiaTipo = body.garantiaTipo;
    if (body.garantiaDescricao !== undefined) loan.garantiaDescricao = body.garantiaDescricao;
    if (body.observacoes !== undefined) loan.observacoes = body.observacoes;
    if (body.chavePixRecebimento) loan.chavePixRecebimento = body.chavePixRecebimento;
    if (Array.isArray(body.formasPagamentoPermitidas) && body.formasPagamentoPermitidas.length > 0) {
      loan.formasPagamentoPermitidas = body.formasPagamentoPermitidas;
    }

    res.json(loan);
  });

  // 7. Parcelas + confirmação com idempotência
  app.get('/api/parcelas', async (req, res) => {
    await maybeDelay(req);
    if (maybeFail(req, res)) return;
    const status = String(req.query.status ?? 'todas');
    const filtered = installments.filter((i) => status === 'todas' || i.status === status);
    res.json(filtered);
  });

  app.post('/api/parcelas/:id/pagar', async (req, res) => {
    const idempotencyKey = req.header('x-idempotency-key');
    if (idempotencyKey && idempotencyStore.has(idempotencyKey)) {
      const cached = idempotencyStore.get(idempotencyKey)!;
      res.status(cached.status).json(cached.body);
      return;
    }

    await maybeDelay(req);
    if (maybeFail(req, res)) return;

    const target = installments.find((i) => i.id === req.params.id);
    if (!target) {
      res.status(404).json({ error: 'Parcela não encontrada.' });
      return;
    }

    if (target.status !== 'paga') {
      target.status = 'paga';
      target.pagoEm = new Date().toISOString().slice(0, 10);
      target.formaPagamento = ((req.body as { formaPagamento?: Installment['formaPagamento'] })?.formaPagamento) ?? 'PIX';

      const loan = loans.find((l) => l.id === target.emprestimoId);
      if (loan) {
        loan.parcelasPagas = Math.min(loan.totalParcelas, loan.parcelasPagas + 1);
        if (loan.parcelasPagas >= loan.totalParcelas) {
          loan.status = 'quitado';
        } else if (loan.status === 'atraso') {
          const stillLate = installments.some(
            (i) => i.emprestimoId === loan.id && i.status === 'atrasada',
          );
          if (!stillLate) loan.status = 'ativo';
        }
      }

      const customer = customers.find((c) => c.id === target.clienteId);
      if (customer) {
        customer.saldoDevedor = Math.max(0, Math.round((customer.saldoDevedor - target.valor) * 100) / 100);
        if (customer.saldoDevedor === 0) customer.status = 'quitado';
        customer.historico = [
          {
            id: `evt_${Date.now()}`,
            titulo: `Parcela ${target.numero}/${target.totalParcelas} recebida via ${target.formaPagamento}`,
            descricao: `Pagamento confirmado de R$ ${target.valor.toFixed(2)}.`,
            dataIso: new Date().toISOString(),
            tipo: 'pagamento',
          },
          ...(customer.historico ?? []),
        ];
      }
    }

    if (idempotencyKey) {
      idempotencyStore.set(idempotencyKey, { status: 200, body: target });
    }
    res.json(target);
  });

  // 8. Cobranças (com suporte a check-in offline sincronizado)
  app.get('/api/cobrancas', async (req, res) => {
    await maybeDelay(req);
    if (maybeFail(req, res)) return;
    res.json(collectionVisits);
  });

  app.post('/api/cobrancas/:id/checkin', async (req, res) => {
    const idempotencyKey = req.header('x-idempotency-key');
    if (idempotencyKey && idempotencyStore.has(idempotencyKey)) {
      const cached = idempotencyStore.get(idempotencyKey)!;
      res.status(cached.status).json(cached.body);
      return;
    }

    const visit = collectionVisits.find((v) => v.id === req.params.id);
    if (!visit) {
      res.status(404).json({ error: 'Visita não encontrada.' });
      return;
    }

    const { status = 'visitado', observacao } = (req.body ?? {}) as {
      status?: CollectionVisit['status'];
      observacao?: string;
    };

    visit.status = status;
    if (observacao) visit.observacao = observacao;
    visit.registradoOffline = false;

    if (idempotencyKey) {
      idempotencyStore.set(idempotencyKey, { status: 200, body: visit });
    }
    res.json(visit);
  });

  // 9. Relatórios
  app.get('/api/relatorios', async (req, res) => {
    await maybeDelay(req);
    if (maybeFail(req, res)) return;
    res.json(computeReportSummary());
  });

  // 10. Tenants (Super Admin)
  app.get('/api/admin/tenants', async (req, res) => {
    await maybeDelay(req);
    if (maybeFail(req, res)) return;
    const tenants: TenantSummary[] = [
      {
        id: 'ten_1',
        nome: 'Mendes Crédito Regional',
        cidade: 'São Paulo · SP',
        plano: 'Profissional',
        clientesAtivos: customers.filter((c) => c.status !== 'quitado').length,
        volumeCarteira: loans.reduce((acc, l) => acc + l.valorTotal, 0),
        inadimplenciaPct: 4.8,
        mrr: 499,
        status: 'ativo',
      },
      {
        id: 'ten_2',
        nome: 'CrediSul Express',
        cidade: 'Curitiba · PR',
        plano: 'Corporativo',
        clientesAtivos: 142,
        volumeCarteira: 318400,
        inadimplenciaPct: 3.1,
        mrr: 1190,
        status: 'ativo',
      },
      {
        id: 'ten_3',
        nome: 'NorteCapital Microcrédito',
        cidade: 'Manaus · AM',
        plano: 'Essencial',
        clientesAtivos: 38,
        volumeCarteira: 74200,
        inadimplenciaPct: 9.4,
        mrr: 199,
        status: 'atencao',
      },
    ];
    res.json(tenants);
  });

  if (process.env.NODE_ENV === 'production') {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CréditoVerde rodando em http://0.0.0.0:${PORT}`);
  });
}

void startServer();
