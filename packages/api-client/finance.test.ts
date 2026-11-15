import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateLoanTerms,
  computeLoanProgressPct,
  formatCurrencyBRL,
  formatMinutesAgo,
  generateIdempotencyKey,
  generateInstallmentDueDates,
  maskCpf,
  resolveSharedLocationConsent,
  sanitizeCustomerForCache,
} from './finance';
import { handlePing } from '../../supabase/functions/ping/index';

test('calculateLoanTerms computes monthly installment and total with interest', () => {
  const res = calculateLoanTerms({
    principal: 1000,
    taxaMensalPct: 5,
    parcelas: 4,
  });
  assert.equal(res.valorParcela, 282.01);
  assert.equal(res.valorTotal, 1128.04);
  assert.equal(res.jurosTotais, 128.04);
});

test('calculateLoanTerms handles zero interest rate', () => {
  const res = calculateLoanTerms({
    principal: 1200,
    taxaMensalPct: 0,
    parcelas: 6,
  });
  assert.equal(res.valorParcela, 200);
  assert.equal(res.valorTotal, 1200);
  assert.equal(res.jurosTotais, 0);
});

test('calculateLoanTerms supports simple interest, fixed fee, opening fee, and biweekly periodicity', () => {
  const simples = calculateLoanTerms({
    principal: 2000,
    taxaMensalPct: 5,
    parcelas: 4,
    tipoJuros: 'simples',
    periodicidade: 'quinzenal', // 4 parcelas quinzenais = 2 meses => 10% total
    taxaAbertura: 100,
  });
  // base = 2100 * (1 + 0.05 * 2) = 2310 / 4 = 577.50
  assert.equal(simples.valorParcela, 577.5);
  assert.equal(simples.valorTotal, 2310);

  const fixo = calculateLoanTerms({
    principal: 1000,
    taxaMensalPct: 20,
    parcelas: 5,
    tipoJuros: 'fixo',
  });
  assert.equal(fixo.valorParcela, 240);
  assert.equal(fixo.valorTotal, 1200);
});

test('generateInstallmentDueDates generates schedules according to periodicity', () => {
  const weekly = generateInstallmentDueDates({
    primeiroVencimentoIso: '2026-12-01',
    totalParcelas: 3,
    periodicidade: 'semanal',
  });
  assert.deepEqual(weekly, ['2026-12-01', '2026-12-08', '2026-12-15']);

  const monthly = generateInstallmentDueDates({
    primeiroVencimentoIso: '2026-12-10',
    totalParcelas: 3,
    periodicidade: 'mensal',
  });
  assert.deepEqual(monthly, ['2026-12-10', '2027-01-10', '2027-02-10']);
});

test('maskCpf masks sensitive digits properly', () => {
  assert.equal(maskCpf('123.456.789-01'), '***.456.789-**');
  assert.equal(maskCpf('invalid'), '***.***.***-**');
});

test('resolveSharedLocationConsent exposes ultimaLocalizacao ONLY when authorized', () => {
  const snapshot = {
    latitude: -23.588,
    longitude: -46.638,
    precisaoMetros: 18,
    atualizadaEm: '2026-11-14T10:00:00.000Z',
    origem: 'gps_navegador' as const,
  };

  const revoked = resolveSharedLocationConsent({
    status: 'revogada',
    autorizada: false,
    revogadoEm: '2026-11-14T10:05:00.000Z',
    finalidade: 'Validação',
    ultimaLocalizacao: snapshot,
  });
  assert.equal(revoked.autorizada, false);
  assert.equal(revoked.ultimaLocalizacao, null);

  const authorized = resolveSharedLocationConsent({
    status: 'autorizada',
    autorizada: true,
    consentidoEm: '2026-11-14T10:00:00.000Z',
    finalidade: 'Validação',
    ultimaLocalizacao: snapshot,
  });
  assert.equal(authorized.autorizada, true);
  assert.deepEqual(authorized.ultimaLocalizacao, snapshot);
});

test('sanitizeCustomerForCache strips cpfCompleto, documentos, and exact GPS coordinates', () => {
  const sanitized = sanitizeCustomerForCache({
    id: 'cli_1',
    nome: 'Maria',
    cpfMascarado: '***.456.789-**',
    cpfCompleto: '12345678901',
    telefone: '11999999999',
    email: 'maria@teste.com',
    cidade: 'São Paulo',
    bairro: 'Centro',
    score: 800,
    status: 'ativo',
    limiteCredito: 5000,
    saldoDevedor: 1200,
    chavePix: 'maria@pix',
    avatarUrl: '/assets/avatar-1.svg',
    criadoEm: '2026-01-01T00:00:00.000Z',
    localizacaoConsentimento: {
      status: 'autorizada',
      autorizada: true,
      consentidoEm: '2026-11-14T10:00:00.000Z',
      finalidade: 'Validação',
      ultimaLocalizacao: {
        latitude: -23.588,
        longitude: -46.638,
        precisaoMetros: 15,
        atualizadaEm: '2026-11-14T10:00:00.000Z',
        origem: 'gps_navegador',
      },
    },
    documentos: [
      {
        id: 'd1',
        tipo: 'RG / CNH',
        nomeArquivo: 'rg.png',
        enviadoEm: '2026-01-01',
        verificado: true,
        previewUrl: '/assets/doc-preview.svg',
      },
    ],
  });

  assert.equal('cpfCompleto' in sanitized, false);
  assert.equal('documentos' in sanitized, false);
  assert.equal(sanitized.localizacaoConsentimento?.ultimaLocalizacao, null);
  assert.equal(sanitized.cpfMascarado, '***.456.789-**');
});

test('formatCurrencyBRL formats Brazilian Real with comma separator', () => {
  const formatted = formatCurrencyBRL(1250.5);
  assert.match(formatted, /R\$\s*1\.250,50/);
});

test('formatMinutesAgo returns readable relative pt-BR labels', () => {
  const now = 1000 * 60 * 100;
  assert.equal(formatMinutesAgo(now - 20_000, now), 'Atualizado agora');
  assert.equal(formatMinutesAgo(now - 60_000, now), 'Atualizado há 1 min');
  assert.equal(formatMinutesAgo(now - 12 * 60_000, now), 'Atualizado há 12 min');
});

test('generateIdempotencyKey produces distinct keys', () => {
  const k1 = generateIdempotencyKey('pag');
  const k2 = generateIdempotencyKey('pag');
  assert.notEqual(k1, k2);
  assert.ok(k1.startsWith('pag_'));
});

test('computeLoanProgressPct clamps between 0 and 100', () => {
  assert.equal(computeLoanProgressPct({ parcelasPagas: 3, totalParcelas: 6 }), 50);
  assert.equal(computeLoanProgressPct({ parcelasPagas: 0, totalParcelas: 0 }), 0);
});

test('supabase ping handler responds ok=true', async () => {
  const res = await handlePing({ method: 'GET' });
  assert.equal(res.status, 200);
  const body = (await res.json()) as { ok: boolean; service: string };
  assert.equal(body.ok, true);
  assert.equal(body.service, 'database-ping');
});
