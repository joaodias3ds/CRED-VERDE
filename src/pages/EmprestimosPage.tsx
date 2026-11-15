import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AlertCircle,
  Calculator,
  CheckCircle2,
  FileText,
  Plus,
  QrCode,
  Shield,
} from 'lucide-react';
import {
  DataState,
  EmptyState,
  SkeletonList,
  strings,
  type DataViewStatus,
} from '@emprestimo/ui';
import {
  STALE_TIMES,
  calculateLoanTerms,
  computeLoanProgressPct,
  formatCurrencyBRL,
  formatDateBR,
  type Loan,
  type LoanFrequency,
  type LoanInterestModel,
  type LoanStatus,
} from '@emprestimo/api-client';
import { PixCopyBox } from '../components/PixCopyBox';
import { LoanDetailsModal, type LoanDraftPreset } from '../components/Modals';

export interface EmprestimosPageProps {
  isOffline: boolean;
  filterClienteId?: string;
  canManageLoans?: boolean;
  userRole?: string;
  onAbrirNovoEmprestimo: (preset?: LoanDraftPreset) => void;
  onSelecionarCliente: (clienteId: string) => void;
}

const filtros: Array<{ id: 'todos' | LoanStatus; label: string }> = [
  { id: 'todos', label: 'Todos' },
  { id: 'ativo', label: 'Ativos' },
  { id: 'atraso', label: 'Em atraso' },
  { id: 'quitado', label: 'Quitados' },
];

const valoresRapidos = [1500, 3000, 5000, 10000];
const taxasRapidas = [3.5, 4.5, 6.0, 8.5];
const prazosRapidos = [3, 6, 10, 12];

const periodicidadeLabels: Record<LoanFrequency, string> = {
  mensal: 'Mensal',
  quinzenal: 'Quinzenal',
  semanal: 'Semanal',
  diario: 'Diário',
};

const jurosLabels: Record<LoanInterestModel, string> = {
  composto: 'Composto',
  simples: 'Simples',
  fixo: 'Taxa fixa',
};

const garantiaLabels: Record<string, string> = {
  sem_garantia: 'Sem garantia real',
  avalista: 'Avalista',
  veiculo: 'Veículo alienado',
  imovel: 'Imóvel em garantia',
  cheque_nota: 'Nota promissória',
};

export function EmprestimosPage({
  isOffline,
  filterClienteId,
  canManageLoans = true,
  userRole = 'emprestador',
  onAbrirNovoEmprestimo,
  onSelecionarCliente,
}: EmprestimosPageProps) {
  const [statusFiltro, setStatusFiltro] = useState<'todos' | LoanStatus>('todos');
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [detailLoan, setDetailLoan] = useState<Loan | null>(null);

  const [simValor, setSimValor] = useState(3000);
  const [simTaxa, setSimTaxa] = useState(4.5);
  const [simParcelas, setSimParcelas] = useState(6);
  const [simTipoJuros, setSimTipoJuros] = useState<LoanInterestModel>('composto');
  const [simPeriodicidade, setSimPeriodicidade] = useState<LoanFrequency>('mensal');

  const simulacao = calculateLoanTerms({
    principal: simValor,
    taxaMensalPct: simTaxa,
    parcelas: simParcelas,
    tipoJuros: simTipoJuros,
    periodicidade: simPeriodicidade,
  });

  const query = useQuery<Loan[]>({
    queryKey: ['emprestimos', statusFiltro, filterClienteId ?? ''],
    staleTime: STALE_TIMES.emprestimos,
    placeholderData: (prev) => prev,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFiltro !== 'todos') params.set('status', statusFiltro);
      if (filterClienteId) params.set('clienteId', filterClienteId);
      const res = await fetch(`/api/emprestimos?${params.toString()}`);
      if (!res.ok) throw new Error('emprestimos_error');
      return res.json();
    },
  });

  const lista = query.data ?? [];
  const viewStatus: DataViewStatus = query.isPending
    ? 'carregando'
    : query.isError
      ? 'erro'
      : lista.length === 0
        ? 'vazio'
        : 'sucesso';

  const currentPreset: LoanDraftPreset = {
    valorPrincipal: simValor,
    taxaMensalPct: simTaxa,
    totalParcelas: simParcelas,
    tipoJuros: simTipoJuros,
    periodicidade: simPeriodicidade,
  };

  return (
    <div className="space-y-6">
      {/* Simulador completo do emprestador (decisão integral sobre todas as regras) */}
      {!filterClienteId && canManageLoans && (
        <section
          aria-label="Simulador e configurador de regras do emprestador"
          className="rounded-2xl border border-[#DCE3DF] bg-white p-5 dark:border-[#192D23] dark:bg-[#0D1A14]"
        >
          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-[#111C16] dark:text-[#ECF3EE]">
                <Calculator className="h-4 w-4 text-[#0F9D58]" aria-hidden="true" />
                <span>Configurador rápido do emprestador</span>
                <span className="text-xs font-normal text-[#64786D] dark:text-[#869D90]">
                  · Você define taxa, modelo de juros e periodicidade
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {valoresRapidos.map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setSimValor(v)}
                    className={`rounded-lg px-3 py-1.5 font-mono text-xs font-semibold transition-colors ${
                      simValor === v
                        ? 'bg-[#0E1E16] text-white dark:bg-[#0F9D58]'
                        : 'bg-[#F3F7F5] text-[#4B5D53] hover:text-[#111C16] dark:bg-[#13261D] dark:text-[#96ACA0]'
                    }`}
                  >
                    {formatCurrencyBRL(v)}
                  </button>
                ))}
                <span className="mx-1 text-[#CBD7D0] dark:text-[#243D31]" aria-hidden="true">|</span>
                {prazosRapidos.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setSimParcelas(p)}
                    className={`rounded-lg px-2.5 py-1.5 font-mono text-xs font-semibold transition-colors ${
                      simParcelas === p
                        ? 'bg-[#0B7A45] text-white'
                        : 'bg-[#F3F7F5] text-[#4B5D53] hover:text-[#111C16] dark:bg-[#13261D] dark:text-[#96ACA0]'
                    }`}
                  >
                    {p}x
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {(['composto', 'simples', 'fixo'] as const).map((modelo) => (
                  <button
                    key={modelo}
                    type="button"
                    onClick={() => setSimTipoJuros(modelo)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                      simTipoJuros === modelo
                        ? 'bg-[#EAF5EF] text-[#0B7A45] ring-1 ring-[#0F9D58] dark:bg-[#173024] dark:text-[#34D399]'
                        : 'bg-[#F3F7F5] text-[#54665C] dark:bg-[#13261D] dark:text-[#96ACA0]'
                    }`}
                  >
                    {jurosLabels[modelo]}
                  </button>
                ))}
                <span className="mx-1 text-[#CBD7D0] dark:text-[#243D31]" aria-hidden="true">|</span>
                {(['mensal', 'quinzenal', 'semanal', 'diario'] as const).map((per) => (
                  <button
                    key={per}
                    type="button"
                    onClick={() => setSimPeriodicidade(per)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                      simPeriodicidade === per
                        ? 'bg-[#EAF5EF] text-[#0B7A45] ring-1 ring-[#0F9D58] dark:bg-[#173024] dark:text-[#34D399]'
                        : 'bg-[#F3F7F5] text-[#54665C] dark:bg-[#13261D] dark:text-[#96ACA0]'
                    }`}
                  >
                    {periodicidadeLabels[per]}
                  </button>
                ))}
                <span className="mx-1 text-[#CBD7D0] dark:text-[#243D31]" aria-hidden="true">|</span>
                {taxasRapidas.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setSimTaxa(t)}
                    className={`rounded-lg px-2.5 py-1 font-mono text-xs font-medium transition-colors ${
                      simTaxa === t
                        ? 'bg-[#0E1E16] text-white dark:bg-[#0F9D58]'
                        : 'bg-[#F3F7F5] text-[#54665C] dark:bg-[#13261D] dark:text-[#96ACA0]'
                    }`}
                  >
                    {t.toFixed(1).replace('.', ',')}%
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-5 rounded-xl bg-[#F4F7F5] px-5 py-3.5 dark:bg-[#13241B]">
              <div>
                <span className="text-[11px] font-medium text-[#64786D] dark:text-[#869D90]">
                  Parcela ({periodicidadeLabels[simPeriodicidade]} · {jurosLabels[simTipoJuros]})
                </span>
                <p className="font-mono text-xl font-bold tabular-nums text-[#0B7A45] dark:text-[#34D399]">
                  {simParcelas}x {formatCurrencyBRL(simulacao.valorParcela)}
                </p>
                <span className="font-mono text-[11px] text-[#64786D] dark:text-[#869D90]">
                  Total {formatCurrencyBRL(simulacao.valorTotal)} · Juros {formatCurrencyBRL(simulacao.jurosTotais)}
                </span>
              </div>

              <button
                type="button"
                disabled={isOffline}
                onClick={() => onAbrirNovoEmprestimo(currentPreset)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#0B7A45] px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-[#096438] disabled:cursor-not-allowed disabled:opacity-50 whitespace-nowrap"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                <span>Criar contrato com estas regras</span>
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Filtros de situação */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 rounded-xl bg-[#EAF0EC] p-1 dark:bg-[#13261D]">
          {filtros.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setStatusFiltro(f.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                statusFiltro === f.id
                  ? 'bg-white text-[#111C16] shadow-sm dark:bg-[#0D1A14] dark:text-[#ECF3EE]'
                  : 'text-[#54665C] hover:text-[#111C16] dark:text-[#96ACA0] dark:hover:text-white'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <span className="text-xs text-[#64786D] dark:text-[#869D90]">
          {query.isPending ? strings.lista.carregando : `${lista.length} contratos`}
        </span>
      </div>

      {selectedLoan && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-[#54665C] dark:text-[#96ACA0]">
            <span>
              Cobrança PIX do contrato <strong className="font-mono">{selectedLoan.codigo}</strong> · {selectedLoan.clienteNome}
            </span>
            <button
              type="button"
              onClick={() => setSelectedLoan(null)}
              className="font-semibold text-[#0B7A45] hover:underline dark:text-[#34D399]"
            >
              Ocultar PIX
            </button>
          </div>
          <PixCopyBox
            titulo="Código PIX Copia e Cola"
            chavePix={selectedLoan.chavePixRecebimento}
            loading={false}
          />
        </div>
      )}

      <DataState
        status={viewStatus}
        skeleton={<SkeletonList count={4} />}
        vazio={
          <EmptyState
            titulo="Nenhum empréstimo nesta categoria"
            descricao="Altere o filtro ou crie um novo contrato de empréstimo."
            acaoLabel={!filterClienteId && canManageLoans ? strings.acao.novoEmprestimo : undefined}
            onAcao={!filterClienteId && canManageLoans ? () => onAbrirNovoEmprestimo() : undefined}
          />
        }
        onTentarNovamente={() => void query.refetch()}
      >
        {/* Grid de cards de contrato com barra de amortização e regras do emprestador */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {lista.map((loan) => {
            const pct = computeLoanProgressPct(loan);
            return (
              <div
                key={loan.id}
                className="flex flex-col justify-between rounded-2xl border border-[#DCE3DF] bg-white p-5 transition-colors hover:border-[#B6C7BD] dark:border-[#192D23] dark:bg-[#0D1A14] dark:hover:border-[#2C4A3B]"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="font-mono text-xs font-semibold text-[#54665C] dark:text-[#96ACA0]">
                        {loan.codigo} · {loan.taxaMensalPct}% ({jurosLabels[loan.tipoJuros]}) · {periodicidadeLabels[loan.periodicidade]}
                      </span>
                      <h3 className="mt-0.5 text-base font-bold text-[#111C16] dark:text-[#ECF3EE]">
                        {filterClienteId ? (
                          loan.clienteNome
                        ) : (
                          <button
                            type="button"
                            onClick={() => onSelecionarCliente(loan.clienteId)}
                            className="text-left hover:text-[#0B7A45] hover:underline dark:hover:text-[#34D399]"
                          >
                            {loan.clienteNome}
                          </button>
                        )}
                      </h3>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1 text-xs font-semibold ${
                        loan.status === 'atraso'
                          ? 'text-red-600 dark:text-red-400'
                          : loan.status === 'quitado'
                            ? 'text-[#0B7A45] dark:text-[#34D399]'
                            : 'text-[#54665C] dark:text-[#96ACA0]'
                      }`}
                    >
                      {loan.status === 'atraso' && <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />}
                      {loan.status === 'quitado' && <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />}
                      {loan.status === 'atraso'
                        ? 'Em atraso'
                        : loan.status === 'quitado'
                          ? 'Quitado'
                          : 'Ativo'}
                    </span>
                  </div>

                  {/* Métricas do contrato */}
                  <div className="mt-4 grid grid-cols-3 gap-3 rounded-xl bg-[#F6F9F7] p-3 text-xs dark:bg-[#122219]">
                    <div>
                      <span className="text-[#64786D] dark:text-[#869D90]">Principal</span>
                      <p className="mt-0.5 font-mono font-semibold text-[#111C16] dark:text-[#ECF3EE]">
                        {formatCurrencyBRL(loan.valorPrincipal)}
                      </p>
                    </div>
                    <div>
                      <span className="text-[#64786D] dark:text-[#869D90]">Parcela</span>
                      <p className="mt-0.5 font-mono font-semibold text-[#111C16] dark:text-[#ECF3EE]">
                        {formatCurrencyBRL(loan.valorParcela)}
                      </p>
                    </div>
                    <div>
                      <span className="text-[#64786D] dark:text-[#869D90]">Total</span>
                      <p className="mt-0.5 font-mono font-semibold text-[#0B7A45] dark:text-[#34D399]">
                        {formatCurrencyBRL(loan.valorTotal)}
                      </p>
                    </div>
                  </div>

                  {/* Condições definidas pelo emprestador */}
                  <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[#64786D] dark:text-[#869D90]">
                    <span className="inline-flex items-center gap-1">
                      <Shield className="h-3 w-3 text-[#0F9D58]" aria-hidden="true" />
                      {garantiaLabels[loan.garantiaTipo] ?? loan.garantiaTipo}
                    </span>
                    <span>· Multa {loan.multaAtrasoPct}% / Mora {loan.jurosMoraDiaPct}% dia</span>
                    {loan.taxaAbertura > 0 && (
                      <span>· TAC {formatCurrencyBRL(loan.taxaAbertura)}</span>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-[#EDF2EF] dark:border-[#192D23]">
                  <div className="flex items-center justify-between text-xs text-[#64786D] dark:text-[#869D90]">
                    <span>
                      Amortização: <strong className="font-mono text-[#111C16] dark:text-[#ECF3EE]">{loan.parcelasPagas}/{loan.totalParcelas}</strong>
                    </span>
                    <span className="font-mono">Venc. {formatDateBR(loan.proximoVencimento)}</span>
                  </div>

                  <div className="mt-2 flex items-center gap-3">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#E5EAE7] dark:bg-[#1B2E25]">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#0B7A45] to-[#22C55E]"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setDetailLoan(loan)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-[#54665C] hover:text-[#111C16] hover:underline dark:text-[#96ACA0] dark:hover:text-white whitespace-nowrap"
                    >
                      <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Regras / Detalhes</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedLoan(loan)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-[#0B7A45] hover:underline dark:text-[#34D399] whitespace-nowrap"
                    >
                      <QrCode className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Ver PIX</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </DataState>

      <LoanDetailsModal
        loan={detailLoan}
        canEdit={Boolean(canManageLoans)}
        userRole={userRole}
        onClose={() => setDetailLoan(null)}
      />
    </div>
  );
}
