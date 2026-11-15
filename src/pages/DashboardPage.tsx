import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  ArrowUpRight,
  Building2,
  CalendarClock,
  CheckCircle2,
  Clock,
  CreditCard,
  MapPin,
  Plus,
  QrCode,
  ShieldCheck,
  TrendingUp,
  UserPlus,
  Wallet,
} from 'lucide-react';
import {
  DataState,
  EmptyState,
  LoadingButton,
  Skeleton,
  SkeletonList,
  strings,
  type DataViewStatus,
} from '@emprestimo/ui';
import {
  STALE_TIMES,
  formatCurrencyBRL,
  formatDateBR,
  formatMinutesAgo,
  type CollectionVisit,
  type Customer,
  type DashboardSummary,
  type Installment,
  type Loan,
  type TenantSummary,
  type UserRole,
} from '@emprestimo/api-client';
import { StatCard } from '../components/StatCard';
import { ChartCard } from '../components/ChartCard';
import { ScoreGauge } from '../components/ScoreGauge';
import { PixCopyBox } from '../components/PixCopyBox';
import { LocationConsentCard } from '../components/LocationConsentCard';
import type { AppRoute } from '../components/AppShell';

export interface DashboardPageProps {
  role: UserRole;
  userId: string;
  isOffline: boolean;
  onNavegar: (rota: AppRoute) => void;
  onAbrirNovoEmprestimo: () => void;
  onAbrirNovoCliente: () => void;
}

function splitBRLParts(value: number): { inteiro: string; centavos: string } {
  const formatted = formatCurrencyBRL(value);
  const idx = formatted.lastIndexOf(',');
  if (idx === -1) return { inteiro: formatted, centavos: '' };
  return {
    inteiro: formatted.slice(0, idx),
    centavos: formatted.slice(idx),
  };
}

export function DashboardPage({
  role,
  userId,
  isOffline,
  onNavegar,
  onAbrirNovoEmprestimo,
  onAbrirNovoCliente,
}: DashboardPageProps) {
  const qc = useQueryClient();

  const dashQuery = useQuery<DashboardSummary>({
    queryKey: ['dashboard'],
    staleTime: STALE_TIMES.dashboard,
    enabled: role !== 'cliente',
    queryFn: async () => {
      const res = await fetch('/api/dashboard');
      if (!res.ok) throw new Error('dashboard_error');
      return res.json();
    },
  });

  const parcelasQuery = useQuery<Installment[]>({
    queryKey: ['parcelas', 'todas'],
    staleTime: STALE_TIMES.parcelas,
    queryFn: async () => {
      const res = await fetch('/api/parcelas');
      if (!res.ok) throw new Error('parcelas_error');
      return res.json();
    },
  });

  const loansQuery = useQuery<Loan[]>({
    queryKey: ['emprestimos', 'todos'],
    staleTime: STALE_TIMES.emprestimos,
    queryFn: async () => {
      const res = await fetch('/api/emprestimos');
      if (!res.ok) throw new Error('emprestimos_error');
      return res.json();
    },
  });

  const cobrancasQuery = useQuery<CollectionVisit[]>({
    queryKey: ['cobrancas'],
    staleTime: STALE_TIMES.cobranca,
    enabled: role === 'equipe',
    queryFn: async () => {
      const res = await fetch('/api/cobrancas');
      if (!res.ok) throw new Error('cobrancas_error');
      return res.json();
    },
  });

  const clienteSelfQuery = useQuery<Customer>({
    queryKey: ['cliente', userId || 'cli_1'],
    staleTime: STALE_TIMES.clientes,
    enabled: role === 'cliente',
    queryFn: async () => {
      const res = await fetch(`/api/clientes/${userId || 'cli_1'}`);
      if (!res.ok) throw new Error('cliente_self_error');
      return res.json();
    },
  });

  const tenantsQuery = useQuery<TenantSummary[]>({
    queryKey: ['admin', 'tenants'],
    staleTime: STALE_TIMES.relatorios,
    enabled: role === 'super_admin',
    queryFn: async () => {
      const res = await fetch('/api/admin/tenants');
      if (!res.ok) throw new Error('tenants_error');
      return res.json();
    },
  });

  const confirmarPagamento = async (parcelaId: string, idempotencyKey: string) => {
    const res = await fetch(`/api/parcelas/${parcelaId}/pagar`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify({ formaPagamento: 'PIX' }),
    });
    if (!res.ok) throw new Error('payment_failed');
    await qc.invalidateQueries({ queryKey: ['parcelas'] });
    await qc.invalidateQueries({ queryKey: ['dashboard'] });
    await qc.invalidateQueries({ queryKey: ['emprestimos'] });
    await qc.invalidateQueries({ queryKey: ['cliente'] });
  };

  /* ============================================================
   * VISÃO 1: PORTAL DO CLIENTE (inspirado na referência Monex)
   * ============================================================ */
  if (role === 'cliente') {
    const c = clienteSelfQuery.data;
    const loadingCliente = clienteSelfQuery.isPending;
    const meusEmprestimos = (loansQuery.data ?? []).filter(
      (l) => l.clienteId === (userId || 'cli_1'),
    );
    const minhasParcelas = (parcelasQuery.data ?? []).filter(
      (p) => p.clienteId === (userId || 'cli_1') && p.status !== 'paga',
    );
    const proximaParcela = minhasParcelas[0];
    const pixContrato = meusEmprestimos[0]?.chavePixRecebimento;
    const saldoSplit = c ? splitBRLParts(c.saldoDevedor) : null;
    const periodoSuffix: Record<string, string> = {
      mensal: '/mês',
      quinzenal: '/quinzena',
      semanal: '/semana',
      diario: '/dia',
    };

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 items-stretch">
          {/* Cartão pessoal em gradiente verde-esmeralda */}
          <div className="lg:col-span-7">
            <DataState
              status={
                loadingCliente
                  ? 'carregando'
                  : clienteSelfQuery.isError
                    ? 'erro'
                    : !c
                      ? 'vazio'
                      : 'sucesso'
              }
              skeleton={
                <div className="h-full min-h-[240px] rounded-2xl border border-[#DCE3DF] bg-white p-6 dark:border-[#192D23] dark:bg-[#0D1A14]">
                  <Skeleton width="40%" height={14} rounded="sm" />
                  <Skeleton width="55%" height={40} rounded="md" className="mt-4" />
                  <Skeleton width="80%" height={14} rounded="sm" className="mt-6" />
                </div>
              }
              vazio={null}
              onTentarNovamente={() => void clienteSelfQuery.refetch()}
            >
              {c && saldoSplit && (
                <div className="relative flex h-full flex-col justify-between overflow-hidden rounded-2xl bg-gradient-to-br from-[#0B5D35] via-[#0F9D58] to-[#65A30D] p-6 text-white shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-medium text-white/80">
                        Meu saldo devedor atual
                      </p>
                      <p className="mt-2 font-mono text-3xl font-bold tracking-tight tabular-nums sm:text-4xl">
                        {saldoSplit.inteiro}
                        <span className="text-xl text-white/75">{saldoSplit.centavos}</span>
                      </p>
                    </div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15">
                      <CreditCard className="h-5 w-5 text-white" aria-hidden="true" />
                    </div>
                  </div>

                  <div className="mt-6 grid grid-cols-2 gap-4 border-t border-white/20 pt-4 text-xs">
                    <div>
                      <span className="text-white/75">Limite pré-aprovado</span>
                      <p className="mt-0.5 font-mono text-base font-semibold tabular-nums">
                        {formatCurrencyBRL(c.limiteCredito)}
                      </p>
                    </div>
                    <div>
                      <span className="text-white/75">Contratos ativos</span>
                      <p className="mt-0.5 font-mono text-base font-semibold tabular-nums">
                        {(() => {
                          const ativos = meusEmprestimos.filter((l) => l.status !== 'quitado').length;
                          return `${ativos} ${ativos === 1 ? 'ativo' : 'ativos'}`;
                        })()}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </DataState>
          </div>

          <div className="lg:col-span-5">
            <ScoreGauge score={c?.score} loading={loadingCliente} />
          </div>
        </div>

        {/* Próxima parcela + PIX instantâneo */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <PixCopyBox
              titulo="PIX para pagamento da próxima parcela"
              chavePix={pixContrato ?? c?.chavePix}
              loading={loadingCliente || loansQuery.isPending}
            />
          </div>

          <div className="lg:col-span-5">
            <div className="flex h-full flex-col justify-between rounded-2xl border border-[#DCE3DF] bg-white p-5 dark:border-[#192D23] dark:bg-[#0D1A14]">
              {parcelasQuery.isPending ? (
                <div className="space-y-3" aria-busy="true">
                  <Skeleton width="50%" height={14} rounded="sm" />
                  <Skeleton width="70%" height={26} rounded="sm" />
                </div>
              ) : proximaParcela ? (
                <>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-[#54665C] dark:text-[#96ACA0]">
                      Próximo vencimento · Parcela {proximaParcela.numero}/{proximaParcela.totalParcelas}
                    </span>
                    <span className="font-mono text-xs text-[#64786D] dark:text-[#869D90]">
                      {formatDateBR(proximaParcela.vencimento)}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <span className="font-mono text-2xl font-bold tabular-nums text-[#111C16] dark:text-[#ECF3EE]">
                      {formatCurrencyBRL(proximaParcela.valor)}
                    </span>
                    <LoadingButton
                      disabled={isOffline}
                      loadingLabel={strings.acao.processando}
                      successToastMessage="Pagamento registrado! Obrigado."
                      onAction={(key) => confirmarPagamento(proximaParcela.id, key)}
                    >
                      Pagar agora
                    </LoadingButton>
                  </div>
                </>
              ) : (
                <p className="text-sm font-medium text-[#0B7A45] dark:text-[#34D399]">
                  Você não possui parcelas pendentes no momento.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Autorização explícita de localização do cliente (LGPD - ponto único ativo) */}
        <LocationConsentCard
          mode="cliente"
          clienteId={userId || 'cli_1'}
          clienteCidade={c?.cidade}
          clienteBairro={c?.bairro}
          consentimento={c?.localizacaoConsentimento}
          loading={loadingCliente}
          isOffline={isOffline}
        />

        {/* Resumo dos contratos ativos do cliente */}
        {meusEmprestimos.length > 0 && (
          <section className="rounded-2xl border border-[#DCE3DF] bg-white p-5 dark:border-[#192D23] dark:bg-[#0D1A14]">
            <div className="mb-4 flex items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-semibold text-[#111C16] dark:text-[#ECF3EE]">
                  Meus contratos ativos
                </h2>
                <p className="text-xs text-[#64786D] dark:text-[#869D90]">
                  Condições definidas pelo emprestador · acompanhe suas parcelas
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavegar('emprestimos')}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#0B7A45] hover:underline dark:text-[#34D399]"
              >
                <span>Ver contratos</span>
                <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {meusEmprestimos.map((emp) => {
                const pct = Math.min(
                  100,
                  Math.round((emp.parcelasPagas / Math.max(1, emp.totalParcelas)) * 100),
                );
                return (
                  <div
                    key={emp.id}
                    className="rounded-xl border border-[#E5ECE8] bg-[#F7FAF8] p-4 dark:border-[#1A2F24] dark:bg-[#112019]"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-semibold text-[#0B7A45] dark:text-[#34D399]">
                        {emp.codigo}
                      </span>
                      <span className="font-mono text-xs text-[#64786D] dark:text-[#869D90]">
                        {emp.parcelasPagas}/{emp.totalParcelas} pagas
                      </span>
                    </div>
                    <p className="mt-2 font-mono text-lg font-bold tabular-nums text-[#111C16] dark:text-[#ECF3EE]">
                      {formatCurrencyBRL(emp.valorParcela)}
                      <span className="ml-1 text-xs font-normal text-[#64786D] dark:text-[#869D90]">
                        {periodoSuffix[emp.periodicidade] ?? '/mês'}
                      </span>
                    </p>
                    <p className="mt-1 text-[11px] text-[#64786D] dark:text-[#869D90]">
                      Taxa {emp.taxaMensalPct}% · Multa {emp.multaAtrasoPct}% · {emp.formasPagamentoPermitidas.join(', ')}
                    </p>
                    <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-[#DCE5E0] dark:bg-[#1D3529]">
                      <div
                        className="h-full rounded-full bg-[#0F9D58]"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>
    );
  }

  /* ============================================================
   * VISÃO 2: EQUIPE DE COBRANÇA (Bancada Operacional do Dia)
   * ============================================================ */
  if (role === 'equipe') {
    const visitas = cobrancasQuery.data ?? [];
    const visitasConcluidas = visitas.filter((v) => v.status === 'visitado' || v.status === 'pago').length;
    const atrasadas = (parcelasQuery.data ?? []).filter((p) => p.status === 'atrasada');

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            titulo="Meta de visitas do dia"
            valorFormatado={cobrancasQuery.isPending ? undefined : `${visitasConcluidas}/${visitas.length}`}
            subtitulo="Roteiro de cobrança em campo"
            icone={<MapPin className="h-4 w-4" aria-hidden="true" />}
            status={cobrancasQuery.isPending ? 'carregando' : cobrancasQuery.isError ? 'erro' : 'sucesso'}
            microGrafico="progress"
            progressoPct={visitas.length > 0 ? Math.round((visitasConcluidas / visitas.length) * 100) : 0}
          />
          <StatCard
            titulo="Parcelas em atraso"
            valorFormatado={parcelasQuery.isPending ? undefined : `${atrasadas.length} em aberto`}
            subtitulo="Prioridade de contato hoje"
            icone={<AlertCircle className="h-4 w-4" aria-hidden="true" />}
            status={parcelasQuery.isPending ? 'carregando' : parcelasQuery.isError ? 'erro' : 'sucesso'}
            destaque="atencao"
            microGrafico="bars"
            serie={[5, 4, 6, 3, 2, Math.max(1, atrasadas.length)]}
          />
          <StatCard
            titulo="A receber (30 dias)"
            valorFormatado={dashQuery.data ? formatCurrencyBRL(dashQuery.data.aReceber30Dias) : undefined}
            subtitulo="Previsão de liquidação"
            icone={<CalendarClock className="h-4 w-4" aria-hidden="true" />}
            status={dashQuery.isPending ? 'carregando' : dashQuery.isError ? 'erro' : 'sucesso'}
            destaque="positivo"
            microGrafico="sparkline"
          />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="lg:col-span-6 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-[#111C16] dark:text-[#ECF3EE]">
                Roteiro prioritário de campo
              </h2>
              <button
                type="button"
                onClick={() => onNavegar('cobranca')}
                className="text-xs font-semibold text-[#0B7A45] hover:underline dark:text-[#34D399]"
              >
                Abrir mapa completo
              </button>
            </div>
            <DataState
              status={cobrancasQuery.isPending ? 'carregando' : cobrancasQuery.isError ? 'erro' : visitas.length === 0 ? 'vazio' : 'sucesso'}
              skeleton={<SkeletonList count={3} />}
              vazio={<EmptyState titulo="Sem visitas pendentes" />}
              onTentarNovamente={() => void cobrancasQuery.refetch()}
            >
              <div className="space-y-3">
                {visitas.map((v, idx) => (
                  <div
                    key={v.id}
                    className="flex items-center justify-between gap-4 rounded-2xl border border-[#DCE3DF] bg-white p-4 dark:border-[#192D23] dark:bg-[#0D1A14]"
                  >
                    <div className="min-w-0">
                      <p className="font-mono text-xs font-semibold text-[#0B7A45] dark:text-[#34D399]">
                        Parada #{idx + 1} · {v.horarioPrevisto}
                      </p>
                      <p className="mt-0.5 truncate text-sm font-semibold text-[#111C16] dark:text-[#ECF3EE]">
                        {v.clienteNome}
                      </p>
                      <p className="truncate text-xs text-[#64786D] dark:text-[#869D90]">
                        {v.endereco}
                      </p>
                    </div>
                    <span className="font-mono text-sm font-semibold tabular-nums text-[#111C16] dark:text-[#ECF3EE] shrink-0">
                      {formatCurrencyBRL(v.valorEmAberto)}
                    </span>
                  </div>
                ))}
              </div>
            </DataState>
          </div>

          <div className="lg:col-span-6 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-[#111C16] dark:text-[#ECF3EE]">
                Baixa rápida de parcelas
              </h2>
              <button
                type="button"
                onClick={() => onNavegar('parcelas')}
                className="text-xs font-semibold text-[#0B7A45] hover:underline dark:text-[#34D399]"
              >
                Todas as parcelas
              </button>
            </div>
            <DataState
              status={parcelasQuery.isPending ? 'carregando' : parcelasQuery.isError ? 'erro' : 'sucesso'}
              skeleton={<SkeletonList count={3} />}
              vazio={<EmptyState titulo="Tudo em dia" />}
              onTentarNovamente={() => void parcelasQuery.refetch()}
            >
              <div className="space-y-3">
                {(parcelasQuery.data ?? []).filter((p) => p.status !== 'paga').slice(0, 3).map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-[#DCE3DF] bg-white p-4 dark:border-[#192D23] dark:bg-[#0D1A14]"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-mono text-[#54665C] dark:text-[#96ACA0]">
                        Parcela {p.numero}/{p.totalParcelas} · Venc. {formatDateBR(p.vencimento)}
                      </p>
                      <p className="mt-0.5 truncate text-sm font-semibold text-[#111C16] dark:text-[#ECF3EE]">
                        {p.clienteNome}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="font-mono text-sm font-semibold tabular-nums text-[#111C16] dark:text-[#ECF3EE]">
                        {formatCurrencyBRL(p.valor)}
                      </span>
                      <LoadingButton
                        disabled={isOffline}
                        loadingLabel={strings.acao.salvando}
                        successToastMessage="Baixa confirmada."
                        onAction={(key) => confirmarPagamento(p.id, key)}
                        className="px-3 py-1.5 text-xs"
                      >
                        Receber
                      </LoadingButton>
                    </div>
                  </div>
                ))}
              </div>
            </DataState>
          </div>
        </div>
      </div>
    );
  }

  /* ============================================================
   * VISÃO 3: SUPER ADMIN (Conselho Multi-Tenant da Plataforma)
   * ============================================================ */
  if (role === 'super_admin') {
    const tenants = tenantsQuery.data ?? [];
    const totalMrr = tenants.reduce((acc, t) => acc + t.mrr, 0);
    const totalVolume = tenants.reduce((acc, t) => acc + t.volumeCarteira, 0);

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            titulo="Receita recorrente (MRR)"
            valorFormatado={tenantsQuery.data ? formatCurrencyBRL(totalMrr) : undefined}
            subtitulo={`${tenants.length} operadoras ativas`}
            icone={<TrendingUp className="h-4 w-4" aria-hidden="true" />}
            status={tenantsQuery.isPending ? 'carregando' : tenantsQuery.isError ? 'erro' : 'sucesso'}
            destaque="positivo"
            microGrafico="bars"
            serie={[1400, 1520, 1680, 1740, 1810, Math.max(1888, totalMrr)]}
          />
          <StatCard
            titulo="Volume sob gestão global"
            valorFormatado={tenantsQuery.data ? formatCurrencyBRL(totalVolume) : undefined}
            subtitulo="Soma das carteiras multi-tenant"
            icone={<Building2 className="h-4 w-4" aria-hidden="true" />}
            status={tenantsQuery.isPending ? 'carregando' : tenantsQuery.isError ? 'erro' : 'sucesso'}
            microGrafico="sparkline"
          />
          <StatCard
            titulo="Disponibilidade dos serviços"
            valorFormatado="99,98%"
            subtitulo="Banco Supabase & API operando"
            icone={<ShieldCheck className="h-4 w-4" aria-hidden="true" />}
            status="sucesso"
            microGrafico="progress"
            progressoPct={99}
          />
        </div>

        <DataState
          status={tenantsQuery.isPending ? 'carregando' : tenantsQuery.isError ? 'erro' : tenants.length === 0 ? 'vazio' : 'sucesso'}
          skeleton={<SkeletonList count={3} />}
          vazio={<EmptyState titulo="Nenhuma operadora cadastrada" />}
          onTentarNovamente={() => void tenantsQuery.refetch()}
        >
          <div className="overflow-hidden rounded-2xl border border-[#DCE3DF] bg-white dark:border-[#192D23] dark:bg-[#0D1A14]">
            <div className="border-b border-[#DCE3DF] px-5 py-4 dark:border-[#192D23]">
              <h2 className="text-base font-semibold text-[#111C16] dark:text-[#ECF3EE]">
                Operadoras de crédito (Tenants)
              </h2>
            </div>
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-[#DCE3DF] bg-[#F7FAF8] text-xs font-semibold text-[#54665C] dark:border-[#192D23] dark:bg-[#112019] dark:text-[#96ACA0]">
                  <th className="px-5 py-3">Operadora</th>
                  <th className="px-5 py-3">Plano</th>
                  <th className="px-5 py-3 text-right">Clientes</th>
                  <th className="px-5 py-3 text-right">Volume carteira</th>
                  <th className="px-5 py-3 text-right">Inadimplência</th>
                  <th className="px-5 py-3 text-right">MRR</th>
                </tr>
              </thead>
              <tbody>
                {tenants.map((t) => (
                  <tr
                    key={t.id}
                    className="border-b border-[#EDF2EF] last:border-b-0 dark:border-[#172B21]"
                  >
                    <td className="px-5 py-3.5">
                      <p className="font-semibold text-[#111C16] dark:text-[#ECF3EE]">{t.nome}</p>
                      <p className="text-xs text-[#64786D] dark:text-[#869D90]">{t.cidade}</p>
                    </td>
                    <td className="px-5 py-3.5 text-xs font-medium text-[#54665C] dark:text-[#96ACA0]">
                      {t.plano}
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono tabular-nums">{t.clientesAtivos}</td>
                    <td className="px-5 py-3.5 text-right font-mono font-semibold tabular-nums">
                      {formatCurrencyBRL(t.volumeCarteira)}
                    </td>
                    <td
                      className={`px-5 py-3.5 text-right font-mono tabular-nums ${
                        t.inadimplenciaPct > 7
                          ? 'text-amber-700 dark:text-amber-400'
                          : 'text-[#0B7A45] dark:text-[#34D399]'
                      }`}
                    >
                      {t.inadimplenciaPct.toFixed(1).replace('.', ',')}%
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono font-semibold tabular-nums">
                      {formatCurrencyBRL(t.mrr)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DataState>
      </div>
    );
  }

  /* ============================================================
   * VISÃO 4: EMPRESTADOR (Cockpit Principal Bento + Contraste Escuro)
   * ============================================================ */
  const dashStatus: DataViewStatus = dashQuery.isPending
    ? 'carregando'
    : dashQuery.isError
      ? 'erro'
      : !dashQuery.data
        ? 'vazio'
        : 'sucesso';

  const parcelasPendentes = (parcelasQuery.data ?? []).filter((p) => p.status !== 'paga').slice(0, 4);
  const parcelasStatus: DataViewStatus = parcelasQuery.isPending
    ? 'carregando'
    : parcelasQuery.isError
      ? 'erro'
      : parcelasPendentes.length === 0
        ? 'vazio'
        : 'sucesso';

  const data = dashQuery.data;
  const updatedLabel =
    dashQuery.dataUpdatedAt > 0 ? formatMinutesAgo(dashQuery.dataUpdatedAt) : undefined;
  const heroSplit = data ? splitBRLParts(data.totalEmprestado) : null;

  return (
    <div className="space-y-6">
      {updatedLabel && (
        <div className="flex items-center justify-between text-xs text-[#64786D] dark:text-[#869D90]">
          <span>Carteira operacional · Mendes Crédito Regional</span>
          <span>
            {dashQuery.isFetching ? strings.offline.atualizando : updatedLabel}
          </span>
        </div>
      )}

      {/* Topo assimétrico inspirado em Monex + Finnova */}
      <section aria-label="Indicadores financeiros" className="grid grid-cols-1 gap-4 lg:grid-cols-12 items-stretch">
        {/* Hero Card Esmeralda-Lima (5 cols) */}
        <div className="lg:col-span-5">
          <DataState
            status={dashStatus}
            skeleton={
              <div className="h-full min-h-[208px] rounded-2xl border border-[#DCE3DF] bg-white p-6 dark:border-[#192D23] dark:bg-[#0D1A14]">
                <Skeleton width="52%" height={14} rounded="sm" />
                <Skeleton width="65%" height={36} rounded="md" className="mt-4" />
                <div className="mt-6 flex gap-2">
                  <Skeleton width={96} height={36} rounded="lg" />
                  <Skeleton width={96} height={36} rounded="lg" />
                </div>
              </div>
            }
            vazio={null}
            onTentarNovamente={() => void dashQuery.refetch()}
          >
            {data && heroSplit && (
              <div className="relative flex h-full flex-col justify-between overflow-hidden rounded-2xl bg-gradient-to-br from-[#0B5D35] via-[#0F9D58] to-[#65A30D] p-6 text-white shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-xs font-medium text-white/85">
                      Capital emprestado ativo
                    </span>
                    <p className="mt-2 font-mono text-3xl font-bold tracking-tight tabular-nums sm:text-4xl">
                      {heroSplit.inteiro}
                      <span className="text-xl text-white/75">{heroSplit.centavos}</span>
                    </p>
                    <p className="mt-1 text-xs text-white/85">
                      {data.clientesAtivos} clientes ativos · {data.parcelasHoje} parcelas previstas
                    </p>
                  </div>
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15">
                    <Wallet className="h-5 w-5" aria-hidden="true" />
                  </div>
                </div>

                {/* Ações rápidas (inspiradas nos botões circulares da referência Monex) */}
                <div className="mt-6 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={isOffline}
                    onClick={onAbrirNovoEmprestimo}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-2 text-xs font-semibold text-[#0B5D35] transition-colors hover:bg-white/90 disabled:opacity-50"
                  >
                    <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Novo contrato</span>
                  </button>
                  <button
                    type="button"
                    disabled={isOffline}
                    onClick={onAbrirNovoCliente}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-black/20 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-black/30 disabled:opacity-50"
                  >
                    <UserPlus className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Cadastrar cliente</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onNavegar('parcelas')}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-black/20 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-black/30"
                  >
                    <QrCode className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Receber PIX</span>
                  </button>
                </div>
              </div>
            )}
          </DataState>
        </div>

        {/* 3 KPIs com micro-gráficos (7 cols) */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:col-span-7">
          <StatCard
            titulo="Recebido no mês"
            valorFormatado={data ? formatCurrencyBRL(data.totalRecebidoMes) : undefined}
            subtitulo="Entradas confirmadas"
            icone={<TrendingUp className="h-4 w-4" aria-hidden="true" />}
            status={dashStatus}
            destaque="positivo"
            microGrafico="bars"
            serie={data?.fluxoMensal.map((f) => f.recebido)}
            onTentarNovamente={() => void dashQuery.refetch()}
          />
          <StatCard
            titulo="A receber (30d)"
            valorFormatado={data ? formatCurrencyBRL(data.aReceber30Dias) : undefined}
            subtitulo={data ? `${data.parcelasHoje} parcelas em aberto` : undefined}
            icone={<CalendarClock className="h-4 w-4" aria-hidden="true" />}
            status={dashStatus}
            microGrafico="sparkline"
            onTentarNovamente={() => void dashQuery.refetch()}
          />
          <StatCard
            titulo="Adimplência"
            valorFormatado={
              data ? `${(100 - data.taxaInadimplenciaPct).toFixed(1).replace('.', ',')}%` : undefined
            }
            subtitulo={
              data ? `Inadimplência de ${data.taxaInadimplenciaPct.toFixed(1).replace('.', ',')}%` : undefined
            }
            icone={<CheckCircle2 className="h-4 w-4" aria-hidden="true" />}
            status={dashStatus}
            microGrafico="progress"
            progressoPct={data ? Math.round(100 - data.taxaInadimplenciaPct) : 85}
            onTentarNovamente={() => void dashQuery.refetch()}
          />
        </div>
      </section>

      {/* Corpo inferior: Gráfico (7 cols) + Painel Escuro de Parcelas em Foco (5 cols, inspirado em Finnova) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-stretch">
        <section aria-label="Fluxo financeiro mensal" className="lg:col-span-7">
          <ChartCard
            titulo="Fluxo de caixa mensal"
            subtitulo="Comparativo entre valores emprestados e recebidos"
            dados={data?.fluxoMensal}
            status={dashStatus}
            onTentarNovamente={() => void dashQuery.refetch()}
          />
        </section>

        <section
          aria-label="Próximas parcelas"
          className="flex flex-col rounded-2xl border border-[#1E3329] bg-[#0D1913] p-5 text-[#ECF3EE] lg:col-span-5"
        >
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-white">
                Parcelas em foco
              </h2>
              <p className="text-xs text-[#8AA396]">
                Baixa instantânea com idempotência
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavegar('parcelas')}
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#4ADE80] hover:underline"
            >
              <span>Ver todas</span>
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>

          <DataState
            status={parcelasStatus}
            skeleton={<SkeletonList count={3} />}
            vazio={
              <EmptyState
                titulo="Nenhuma parcela em aberto"
                descricao="Todas as parcelas vencidas ou próximas já foram quitadas."
              />
            }
            onTentarNovamente={() => void parcelasQuery.refetch()}
          >
            <div className="flex flex-col gap-2.5">
              {parcelasPendentes.map((p) => {
                const atrasada = p.status === 'atrasada';
                return (
                  <div
                    key={p.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-[#1E3329] bg-[#13241B] p-3.5 transition-colors hover:border-[#2C4A3B]"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-[11px] text-[#8AA396]">
                        <span className="font-mono font-semibold text-white">
                          Parcela {p.numero}/{p.totalParcelas}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono">{formatDateBR(p.vencimento)}</span>
                      </div>
                      <p className="mt-0.5 truncate text-sm font-semibold text-white">
                        {p.clienteNome}
                      </p>
                      <span
                        className={`mt-0.5 inline-flex items-center gap-1 text-[11px] font-medium ${
                          atrasada ? 'text-red-400' : 'text-amber-300'
                        }`}
                      >
                        {atrasada ? (
                          <AlertCircle className="h-3 w-3" aria-hidden="true" />
                        ) : (
                          <Clock className="h-3 w-3" aria-hidden="true" />
                        )}
                        {atrasada ? 'Em atraso' : 'Pendente'}
                      </span>
                    </div>

                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <span className="font-mono text-sm font-semibold tabular-nums text-white">
                        {formatCurrencyBRL(p.valor)}
                      </span>
                      <LoadingButton
                        disabled={isOffline}
                        loadingLabel={strings.acao.processando}
                        successToastMessage={`Pagamento da parcela ${p.numero}/${p.totalParcelas} confirmado.`}
                        onAction={(key) => confirmarPagamento(p.id, key)}
                        className="px-3 py-1.5 text-xs"
                      >
                        {strings.acao.confirmarPagamento}
                      </LoadingButton>
                    </div>
                  </div>
                );
              })}
            </div>
          </DataState>
        </section>
      </div>
    </div>
  );
}
