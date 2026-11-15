import type {
  Customer,
  CustomerLocationConsent,
  Loan,
  LoanFrequency,
  LoanInterestModel,
} from './types';

export function formatCurrencyBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatDateBR(isoDate: string): string {
  if (!isoDate) return '—';
  const parsed = new Date(isoDate);
  if (Number.isNaN(parsed.getTime())) return isoDate;
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(parsed);
}

export function formatDateTimeBR(isoDate: string): string {
  if (!isoDate) return '—';
  const parsed = new Date(isoDate);
  if (Number.isNaN(parsed.getTime())) return isoDate;
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(parsed);
}

export function maskCpf(rawCpf: string): string {
  const digits = rawCpf.replace(/\D/g, '');
  if (digits.length !== 11) {
    return '***.***.***-**';
  }
  return `***.${digits.slice(3, 6)}.${digits.slice(6, 9)}-**`;
}

function getPeriodsPerMonth(periodicidade: LoanFrequency): number {
  switch (periodicidade) {
    case 'quinzenal':
      return 2;
    case 'semanal':
      return 4;
    case 'diario':
      return 30;
    case 'mensal':
    default:
      return 1;
  }
}

export function calculateLoanTerms(params: {
  principal: number;
  taxaMensalPct: number;
  parcelas: number;
  tipoJuros?: LoanInterestModel;
  periodicidade?: LoanFrequency;
  taxaAbertura?: number;
}): {
  valorParcela: number;
  valorTotal: number;
  jurosTotais: number;
} {
  const principal = Math.max(0, Number(params.principal) || 0);
  const parcelas = Math.max(1, Math.round(Number(params.parcelas) || 1));
  const taxaMensal = Math.max(0, Number(params.taxaMensalPct) || 0) / 100;
  const tipoJuros = params.tipoJuros ?? 'composto';
  const periodicidade = params.periodicidade ?? 'mensal';
  const taxaAbertura = Math.max(0, Number(params.taxaAbertura) || 0);

  if (principal === 0) {
    return { valorParcela: 0, valorTotal: 0, jurosTotais: 0 };
  }

  const baseFinanciada = principal + taxaAbertura;
  const periodosNoMes = getPeriodsPerMonth(periodicidade);
  const taxaPeriodo = taxaMensal / periodosNoMes;
  const mesesEquivalentes = parcelas / periodosNoMes;

  let valorParcela: number;
  if (taxaPeriodo === 0) {
    valorParcela = baseFinanciada / parcelas;
  } else if (tipoJuros === 'simples') {
    const totalComJurosSimples = baseFinanciada * (1 + taxaMensal * mesesEquivalentes);
    valorParcela = totalComJurosSimples / parcelas;
  } else if (tipoJuros === 'fixo') {
    const totalComTaxaFixa = baseFinanciada * (1 + taxaMensal);
    valorParcela = totalComTaxaFixa / parcelas;
  } else {
    const fator = Math.pow(1 + taxaPeriodo, parcelas);
    valorParcela = (baseFinanciada * (taxaPeriodo * fator)) / (fator - 1);
  }

  const roundedParcela = Math.round(valorParcela * 100) / 100;
  const valorTotal = Math.round(roundedParcela * parcelas * 100) / 100;
  const jurosTotais = Math.round((valorTotal - principal) * 100) / 100;

  return {
    valorParcela: roundedParcela,
    valorTotal,
    jurosTotais,
  };
}

export function generateInstallmentDueDates(params: {
  primeiroVencimentoIso: string;
  totalParcelas: number;
  periodicidade: LoanFrequency;
}): string[] {
  const count = Math.max(1, Math.round(params.totalParcelas));
  const base = params.primeiroVencimentoIso
    ? new Date(`${params.primeiroVencimentoIso.slice(0, 10)}T12:00:00Z`)
    : new Date();

  return Array.from({ length: count }).map((_, idx) => {
    const next = new Date(base.getTime());
    if (params.periodicidade === 'mensal') {
      next.setUTCMonth(next.getUTCMonth() + idx);
    } else if (params.periodicidade === 'quinzenal') {
      next.setUTCDate(next.getUTCDate() + idx * 15);
    } else if (params.periodicidade === 'semanal') {
      next.setUTCDate(next.getUTCDate() + idx * 7);
    } else {
      next.setUTCDate(next.getUTCDate() + idx);
    }
    return next.toISOString().slice(0, 10);
  });
}

export function generateIdempotencyKey(prefix = 'op'): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function formatMinutesAgo(updatedAtMs: number, nowMs = Date.now()): string {
  const diffMin = Math.max(0, Math.floor((nowMs - updatedAtMs) / 60000));
  if (diffMin < 1) return 'Atualizado agora';
  if (diffMin === 1) return 'Atualizado há 1 min';
  return `Atualizado há ${diffMin} min`;
}

/**
 * Regra de minimização (Briefing Tópico 14 e 33 - LGPD):
 * Se a autorização não estiver ativa, nenhuma coordenada é exposta ao admin.
 */
export function resolveSharedLocationConsent(
  consent?: CustomerLocationConsent,
): CustomerLocationConsent {
  if (!consent) {
    return {
      status: 'nao_solicitada',
      autorizada: false,
      finalidade: 'Confirmar presença e última localização ativa para análise e atendimento.',
      ultimaLocalizacao: null,
    };
  }
  if (!consent.autorizada || consent.status !== 'autorizada') {
    return {
      status: consent.status,
      autorizada: false,
      consentidoEm: consent.consentidoEm,
      revogadoEm: consent.revogadoEm,
      finalidade: consent.finalidade,
      ultimaLocalizacao: null,
    };
  }
  return consent;
}

/**
 * Seção 7: Dados sensíveis (CPF completo, documentos e coordenadas GPS exatas)
 * NÃO ficam no cache local persistente.
 */
export function sanitizeCustomerForCache(customer: Customer): Customer {
  const { cpfCompleto: _cpf, documentos: _docs, ...safeRest } = customer;
  const safeConsent = customer.localizacaoConsentimento
    ? {
        ...customer.localizacaoConsentimento,
        ultimaLocalizacao: null,
      }
    : undefined;

  return {
    ...safeRest,
    localizacaoConsentimento: safeConsent,
    cpfMascarado: customer.cpfMascarado || maskCpf(customer.cpfCompleto || ''),
  };
}

export function sanitizeCachePayload(queryKey: readonly unknown[], data: unknown): unknown {
  const rootKey = String(queryKey[0] ?? '');
  if (rootKey === 'clientes' && Array.isArray(data)) {
    return (data as Customer[]).map(sanitizeCustomerForCache);
  }
  if (rootKey === 'cliente' && data && typeof data === 'object') {
    return sanitizeCustomerForCache(data as Customer);
  }
  return data;
}

export function computeLoanProgressPct(loan: Pick<Loan, 'parcelasPagas' | 'totalParcelas'>): number {
  if (!loan.totalParcelas || loan.totalParcelas <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((loan.parcelasPagas / loan.totalParcelas) * 100)));
}

