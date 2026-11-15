import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { LoadingButton, strings } from '@emprestimo/ui';
import {
  calculateLoanTerms,
  formatCurrencyBRL,
  type Customer,
} from '@emprestimo/api-client';

export function NewCustomerModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [nome, setNome] = useState('');
  const [cpf, setCpf] = useState('');
  const [telefone, setTelefone] = useState('');
  const [cidade, setCidade] = useState('');
  const [limiteCredito, setLimiteCredito] = useState('5000');
  const [erroForm, setErroForm] = useState('');

  if (!open) return null;

  const handleSave = async (idempotencyKey: string) => {
    if (!nome.trim() || !telefone.trim() || !cidade.trim()) {
      setErroForm('Preencha nome, telefone e cidade.');
      throw new Error('validation');
    }
    setErroForm('');

    const res = await fetch('/api/clientes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify({
        nome: nome.trim(),
        cpf: cpf.trim(),
        telefone: telefone.trim(),
        cidade: cidade.trim(),
        limiteCredito: Number(limiteCredito) || 5000,
      }),
    });

    if (!res.ok) {
      throw new Error('request_failed');
    }

    await qc.invalidateQueries({ queryKey: ['clientes'] });
    await qc.invalidateQueries({ queryKey: ['dashboard'] });
    setNome('');
    setCpf('');
    setTelefone('');
    setCidade('');
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-novo-cliente"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <div className="w-full max-w-md rounded-2xl border border-[#DCE3DF] bg-white p-6 shadow-xl dark:border-[#1E3329] dark:bg-[#0F1E17]">
        <div className="flex items-center justify-between gap-4">
          <h2 id="modal-novo-cliente" className="text-lg font-bold text-[#111C16] dark:text-[#ECF3EE]">
            {strings.acao.cadastrarCliente}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar janela"
            className="rounded-lg p-1.5 text-[#54665C] hover:bg-[#EDF5F0] dark:text-[#96ACA0] dark:hover:bg-[#173024]"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-4 flex flex-col gap-3.5">
          <div>
            <label htmlFor="cli-nome" className="block text-xs font-medium text-[#54665C] dark:text-[#96ACA0]">
              Nome completo
            </label>
            <input
              id="cli-nome"
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex.: Ana Beatriz Martins"
              className="mt-1 w-full rounded-lg border border-[#CBD7D0] bg-white px-3 py-2 text-sm text-[#111C16] focus:border-[#0F9D58] focus:outline-none dark:border-[#243D31] dark:bg-[#13261D] dark:text-[#ECF3EE]"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="cli-cpf" className="block text-xs font-medium text-[#54665C] dark:text-[#96ACA0]">
                CPF
              </label>
              <input
                id="cli-cpf"
                type="text"
                value={cpf}
                onChange={(e) => setCpf(e.target.value)}
                placeholder="000.000.000-00"
                className="mt-1 w-full rounded-lg border border-[#CBD7D0] bg-white px-3 py-2 font-mono text-sm text-[#111C16] focus:border-[#0F9D58] focus:outline-none dark:border-[#243D31] dark:bg-[#13261D] dark:text-[#ECF3EE]"
              />
            </div>
            <div>
              <label htmlFor="cli-tel" className="block text-xs font-medium text-[#54665C] dark:text-[#96ACA0]">
                Telefone / WhatsApp
              </label>
              <input
                id="cli-tel"
                type="text"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                placeholder="(11) 99999-0000"
                className="mt-1 w-full rounded-lg border border-[#CBD7D0] bg-white px-3 py-2 text-sm text-[#111C16] focus:border-[#0F9D58] focus:outline-none dark:border-[#243D31] dark:bg-[#13261D] dark:text-[#ECF3EE]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="cli-cidade" className="block text-xs font-medium text-[#54665C] dark:text-[#96ACA0]">
                Cidade
              </label>
              <input
                id="cli-cidade"
                type="text"
                value={cidade}
                onChange={(e) => setCidade(e.target.value)}
                placeholder="São Paulo"
                className="mt-1 w-full rounded-lg border border-[#CBD7D0] bg-white px-3 py-2 text-sm text-[#111C16] focus:border-[#0F9D58] focus:outline-none dark:border-[#243D31] dark:bg-[#13261D] dark:text-[#ECF3EE]"
              />
            </div>
            <div>
              <label htmlFor="cli-limite" className="block text-xs font-medium text-[#54665C] dark:text-[#96ACA0]">
                Limite sugerido (R$)
              </label>
              <input
                id="cli-limite"
                type="number"
                value={limiteCredito}
                onChange={(e) => setLimiteCredito(e.target.value)}
                className="mt-1 w-full rounded-lg border border-[#CBD7D0] bg-white px-3 py-2 font-mono text-sm text-[#111C16] focus:border-[#0F9D58] focus:outline-none dark:border-[#243D31] dark:bg-[#13261D] dark:text-[#ECF3EE]"
              />
            </div>
          </div>

          {erroForm && (
            <p role="alert" className="text-xs font-medium text-red-600 dark:text-red-400">
              {erroForm}
            </p>
          )}
        </div>

        <div className="mt-6 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[#CBD7D0] px-4 py-2 text-sm font-medium text-[#111C16] hover:bg-[#F3F7F5] dark:border-[#243D31] dark:text-[#ECF3EE] dark:hover:bg-[#173024]"
          >
            Cancelar
          </button>
          <LoadingButton
            onAction={handleSave}
            loadingLabel={strings.acao.salvando}
            successToastMessage="Cliente cadastrado com sucesso."
            errorToastMessage="Não foi possível cadastrar o cliente."
          >
            Salvar cliente
          </LoadingButton>
        </div>
      </div>
    </div>
  );
}

export interface LoanDraftPreset {
  valorPrincipal?: number;
  taxaMensalPct?: number;
  totalParcelas?: number;
  tipoJuros?: 'composto' | 'simples' | 'fixo';
  periodicidade?: 'mensal' | 'quinzenal' | 'semanal' | 'diario';
}

const garantiaLabels: Record<
  'sem_garantia' | 'avalista' | 'veiculo' | 'imovel' | 'cheque_nota',
  string
> = {
  sem_garantia: 'Sem garantia real',
  avalista: 'Avalista / Fiador',
  veiculo: 'Veículo alienado',
  imovel: 'Imóvel em garantia',
  cheque_nota: 'Nota promissória / Cheque',
};

const periodicidadeLabels: Record<'mensal' | 'quinzenal' | 'semanal' | 'diario', string> = {
  mensal: 'Mensal',
  quinzenal: 'Quinzenal',
  semanal: 'Semanal',
  diario: 'Diário',
};

const jurosLabels: Record<'composto' | 'simples' | 'fixo', string> = {
  composto: 'Composto (Price)',
  simples: 'Juros simples',
  fixo: 'Taxa fixa total',
};

export function NewLoanModal({
  open,
  clientes,
  preset,
  decididoPor = 'Ricardo Mendes',
  userRole = 'emprestador',
  onClose,
}: {
  open: boolean;
  clientes: Customer[];
  preset?: LoanDraftPreset;
  decididoPor?: string;
  userRole?: string;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const defaultDue = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const [clienteId, setClienteId] = useState(clientes[0]?.id ?? '');
  const [valorPrincipal, setValorPrincipal] = useState(String(preset?.valorPrincipal ?? 2500));
  const [taxaMensalPct, setTaxaMensalPct] = useState(String(preset?.taxaMensalPct ?? 4.5));
  const [tipoJuros, setTipoJuros] = useState<'composto' | 'simples' | 'fixo'>(
    preset?.tipoJuros ?? 'composto',
  );
  const [periodicidade, setPeriodicidade] = useState<'mensal' | 'quinzenal' | 'semanal' | 'diario'>(
    preset?.periodicidade ?? 'mensal',
  );
  const [totalParcelas, setTotalParcelas] = useState(String(preset?.totalParcelas ?? 6));
  const [primeiroVencimento, setPrimeiroVencimento] = useState(defaultDue);
  const [taxaAbertura, setTaxaAbertura] = useState('0');
  const [multaAtrasoPct, setMultaAtrasoPct] = useState('2');
  const [jurosMoraDiaPct, setJurosMoraDiaPct] = useState('0.33');
  const [garantiaTipo, setGarantiaTipo] = useState<
    'sem_garantia' | 'avalista' | 'veiculo' | 'imovel' | 'cheque_nota'
  >('sem_garantia');
  const [garantiaDescricao, setGarantiaDescricao] = useState('');
  const [formasPagamento, setFormasPagamento] = useState<Array<'PIX' | 'Dinheiro' | 'Transferência'>>([
    'PIX',
    'Transferência',
  ]);
  const [chavePixRecebimento, setChavePixRecebimento] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [erroForm, setErroForm] = useState('');

  React.useEffect(() => {
    if (!clienteId && clientes.length > 0) {
      setClienteId(clientes[0].id);
    }
  }, [clientes, clienteId]);

  React.useEffect(() => {
    if (open && preset) {
      if (preset.valorPrincipal !== undefined) setValorPrincipal(String(preset.valorPrincipal));
      if (preset.taxaMensalPct !== undefined) setTaxaMensalPct(String(preset.taxaMensalPct));
      if (preset.totalParcelas !== undefined) setTotalParcelas(String(preset.totalParcelas));
      if (preset.tipoJuros) setTipoJuros(preset.tipoJuros);
      if (preset.periodicidade) setPeriodicidade(preset.periodicidade);
    }
  }, [open, preset]);

  if (!open) return null;

  const simulacao = calculateLoanTerms({
    principal: Number(valorPrincipal) || 0,
    taxaMensalPct: Number(taxaMensalPct) || 0,
    parcelas: Number(totalParcelas) || 1,
    tipoJuros,
    periodicidade,
    taxaAbertura: Number(taxaAbertura) || 0,
  });

  const toggleForma = (forma: 'PIX' | 'Dinheiro' | 'Transferência') => {
    setFormasPagamento((prev) => {
      if (prev.includes(forma)) {
        return prev.length > 1 ? prev.filter((f) => f !== forma) : prev;
      }
      return [...prev, forma];
    });
  };

  const handleSave = async (idempotencyKey: string) => {
    const selectedId = clienteId || clientes[0]?.id;
    const principal = Number(valorPrincipal);
    if (!selectedId || !Number.isFinite(principal) || principal <= 0) {
      setErroForm('Selecione um cliente e informe um valor principal válido.');
      throw new Error('validation');
    }
    if (garantiaTipo !== 'sem_garantia' && !garantiaDescricao.trim()) {
      setErroForm('Descreva a garantia definida para este empréstimo.');
      throw new Error('validation');
    }
    setErroForm('');

    const res = await fetch('/api/emprestimos', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Idempotency-Key': idempotencyKey,
        'X-User-Role': userRole,
      },
      body: JSON.stringify({
        clienteId: selectedId,
        valorPrincipal: principal,
        taxaMensalPct: Number(taxaMensalPct) || 0,
        tipoJuros,
        periodicidade,
        taxaAbertura: Number(taxaAbertura) || 0,
        multaAtrasoPct: Number(multaAtrasoPct) || 0,
        jurosMoraDiaPct: Number(jurosMoraDiaPct) || 0,
        garantiaTipo,
        garantiaDescricao: garantiaDescricao.trim() || undefined,
        formasPagamentoPermitidas: formasPagamento,
        observacoes: observacoes.trim() || undefined,
        totalParcelas: Number(totalParcelas) || 6,
        primeiroVencimento,
        chavePixRecebimento: chavePixRecebimento.trim() || undefined,
        decididoPor,
      }),
    });

    if (!res.ok) {
      throw new Error('request_failed');
    }

    await qc.invalidateQueries({ queryKey: ['emprestimos'] });
    await qc.invalidateQueries({ queryKey: ['parcelas'] });
    await qc.invalidateQueries({ queryKey: ['dashboard'] });
    await qc.invalidateQueries({ queryKey: ['clientes'] });
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-novo-emprestimo"
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/55 p-4"
    >
      <div className="my-6 max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[#DCE3DF] bg-white p-6 shadow-xl dark:border-[#1E3329] dark:bg-[#0F1E17]">
        <div className="flex items-start justify-between gap-4 border-b border-[#EDF2EF] pb-4 dark:border-[#192D23]">
          <div>
            <h2 id="modal-novo-emprestimo" className="text-lg font-bold text-[#111C16] dark:text-[#ECF3EE]">
              {strings.acao.novoEmprestimo} · Regras do emprestador
            </h2>
            <p className="mt-0.5 text-xs text-[#64786D] dark:text-[#869D90]">
              Você define taxa, modelo de juros, periodicidade, encargos, garantia e condições do contrato.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar janela"
            className="rounded-lg p-1.5 text-[#54665C] hover:bg-[#EDF5F0] dark:text-[#96ACA0] dark:hover:bg-[#173024]"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-4 flex flex-col gap-4">
          {/* Cliente e Valor */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="emp-cliente" className="block text-xs font-medium text-[#54665C] dark:text-[#96ACA0]">
                Cliente tomador
              </label>
              <select
                id="emp-cliente"
                value={clienteId}
                onChange={(e) => setClienteId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-[#CBD7D0] bg-white px-3 py-2 text-sm text-[#111C16] focus:border-[#0F9D58] focus:outline-none dark:border-[#243D31] dark:bg-[#13261D] dark:text-[#ECF3EE]"
              >
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome} (Score {c.score})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="emp-valor" className="block text-xs font-medium text-[#54665C] dark:text-[#96ACA0]">
                Valor principal liberado (R$)
              </label>
              <input
                id="emp-valor"
                type="number"
                value={valorPrincipal}
                onChange={(e) => setValorPrincipal(e.target.value)}
                className="mt-1 w-full rounded-lg border border-[#CBD7D0] bg-white px-3 py-2 font-mono text-sm text-[#111C16] focus:border-[#0F9D58] focus:outline-none dark:border-[#243D31] dark:bg-[#13261D] dark:text-[#ECF3EE]"
              />
            </div>
          </div>

          {/* Modelo de Juros, Taxa, Periodicidade e Parcelas */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <div>
              <label htmlFor="emp-modelo-juros" className="block text-xs font-medium text-[#54665C] dark:text-[#96ACA0]">
                Modelo de juros
              </label>
              <select
                id="emp-modelo-juros"
                value={tipoJuros}
                onChange={(e) => setTipoJuros(e.target.value as 'composto' | 'simples' | 'fixo')}
                className="mt-1 w-full rounded-lg border border-[#CBD7D0] bg-white px-3 py-2 text-sm text-[#111C16] focus:border-[#0F9D58] focus:outline-none dark:border-[#243D31] dark:bg-[#13261D] dark:text-[#ECF3EE]"
              >
                {Object.entries(jurosLabels).map(([val, label]) => (
                  <option key={val} value={val}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="emp-taxa" className="block text-xs font-medium text-[#54665C] dark:text-[#96ACA0]">
                {tipoJuros === 'fixo' ? 'Taxa total (%)' : 'Taxa (% a.m.)'}
              </label>
              <input
                id="emp-taxa"
                type="number"
                step="0.1"
                min={0}
                value={taxaMensalPct}
                onChange={(e) => setTaxaMensalPct(e.target.value)}
                className="mt-1 w-full rounded-lg border border-[#CBD7D0] bg-white px-3 py-2 font-mono text-sm text-[#111C16] focus:border-[#0F9D58] focus:outline-none dark:border-[#243D31] dark:bg-[#13261D] dark:text-[#ECF3EE]"
              />
            </div>

            <div>
              <label htmlFor="emp-periodicidade" className="block text-xs font-medium text-[#54665C] dark:text-[#96ACA0]">
                Periodicidade
              </label>
              <select
                id="emp-periodicidade"
                value={periodicidade}
                onChange={(e) =>
                  setPeriodicidade(e.target.value as 'mensal' | 'quinzenal' | 'semanal' | 'diario')
                }
                className="mt-1 w-full rounded-lg border border-[#CBD7D0] bg-white px-3 py-2 text-sm text-[#111C16] focus:border-[#0F9D58] focus:outline-none dark:border-[#243D31] dark:bg-[#13261D] dark:text-[#ECF3EE]"
              >
                {Object.entries(periodicidadeLabels).map(([val, label]) => (
                  <option key={val} value={val}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="emp-parcelas" className="block text-xs font-medium text-[#54665C] dark:text-[#96ACA0]">
                Nº de parcelas
              </label>
              <input
                id="emp-parcelas"
                type="number"
                min={1}
                max={60}
                value={totalParcelas}
                onChange={(e) => setTotalParcelas(e.target.value)}
                className="mt-1 w-full rounded-lg border border-[#CBD7D0] bg-white px-3 py-2 font-mono text-sm text-[#111C16] focus:border-[#0F9D58] focus:outline-none dark:border-[#243D31] dark:bg-[#13261D] dark:text-[#ECF3EE]"
              />
            </div>
          </div>

          {/* 1º Vencimento, TAC, Multa e Mora */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <div>
              <label htmlFor="emp-vencimento" className="block text-xs font-medium text-[#54665C] dark:text-[#96ACA0]">
                1º vencimento
              </label>
              <input
                id="emp-vencimento"
                type="date"
                value={primeiroVencimento}
                onChange={(e) => setPrimeiroVencimento(e.target.value)}
                className="mt-1 w-full rounded-lg border border-[#CBD7D0] bg-white px-3 py-2 font-mono text-sm text-[#111C16] focus:border-[#0F9D58] focus:outline-none dark:border-[#243D31] dark:bg-[#13261D] dark:text-[#ECF3EE]"
              />
            </div>

            <div>
              <label htmlFor="emp-tac" className="block text-xs font-medium text-[#54665C] dark:text-[#96ACA0]">
                Taxa abertura (R$)
              </label>
              <input
                id="emp-tac"
                type="number"
                min={0}
                value={taxaAbertura}
                onChange={(e) => setTaxaAbertura(e.target.value)}
                className="mt-1 w-full rounded-lg border border-[#CBD7D0] bg-white px-3 py-2 font-mono text-sm text-[#111C16] focus:border-[#0F9D58] focus:outline-none dark:border-[#243D31] dark:bg-[#13261D] dark:text-[#ECF3EE]"
              />
            </div>

            <div>
              <label htmlFor="emp-multa" className="block text-xs font-medium text-[#54665C] dark:text-[#96ACA0]">
                Multa atraso (%)
              </label>
              <input
                id="emp-multa"
                type="number"
                step="0.5"
                min={0}
                value={multaAtrasoPct}
                onChange={(e) => setMultaAtrasoPct(e.target.value)}
                className="mt-1 w-full rounded-lg border border-[#CBD7D0] bg-white px-3 py-2 font-mono text-sm text-[#111C16] focus:border-[#0F9D58] focus:outline-none dark:border-[#243D31] dark:bg-[#13261D] dark:text-[#ECF3EE]"
              />
            </div>

            <div>
              <label htmlFor="emp-mora" className="block text-xs font-medium text-[#54665C] dark:text-[#96ACA0]">
                Mora diária (% dia)
              </label>
              <input
                id="emp-mora"
                type="number"
                step="0.05"
                min={0}
                value={jurosMoraDiaPct}
                onChange={(e) => setJurosMoraDiaPct(e.target.value)}
                className="mt-1 w-full rounded-lg border border-[#CBD7D0] bg-white px-3 py-2 font-mono text-sm text-[#111C16] focus:border-[#0F9D58] focus:outline-none dark:border-[#243D31] dark:bg-[#13261D] dark:text-[#ECF3EE]"
              />
            </div>
          </div>

          {/* Garantia e Formas de Pagamento */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="emp-garantia" className="block text-xs font-medium text-[#54665C] dark:text-[#96ACA0]">
                Garantia exigida
              </label>
              <select
                id="emp-garantia"
                value={garantiaTipo}
                onChange={(e) =>
                  setGarantiaTipo(
                    e.target.value as 'sem_garantia' | 'avalista' | 'veiculo' | 'imovel' | 'cheque_nota',
                  )
                }
                className="mt-1 w-full rounded-lg border border-[#CBD7D0] bg-white px-3 py-2 text-sm text-[#111C16] focus:border-[#0F9D58] focus:outline-none dark:border-[#243D31] dark:bg-[#13261D] dark:text-[#ECF3EE]"
              >
                {Object.entries(garantiaLabels).map(([val, label]) => (
                  <option key={val} value={val}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <span className="block text-xs font-medium text-[#54665C] dark:text-[#96ACA0]">
                Meios de recebimento aceitos
              </span>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {(['PIX', 'Dinheiro', 'Transferência'] as const).map((forma) => {
                  const ativo = formasPagamento.includes(forma);
                  return (
                    <button
                      key={forma}
                      type="button"
                      onClick={() => toggleForma(forma)}
                      aria-pressed={ativo}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                        ativo
                          ? 'border-[#0F9D58] bg-[#EAF5EF] text-[#0B7A45] dark:bg-[#173024] dark:text-[#34D399]'
                          : 'border-[#CBD7D0] bg-white text-[#54665C] dark:border-[#243D31] dark:bg-[#13261D] dark:text-[#96ACA0]'
                      }`}
                    >
                      {forma}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {garantiaTipo !== 'sem_garantia' && (
            <div>
              <label htmlFor="emp-garantia-desc" className="block text-xs font-medium text-[#54665C] dark:text-[#96ACA0]">
                Detalhe da garantia
              </label>
              <input
                id="emp-garantia-desc"
                type="text"
                value={garantiaDescricao}
                onChange={(e) => setGarantiaDescricao(e.target.value)}
                placeholder="Ex.: Avalista João Silva (CPF validado) ou placa do veículo"
                className="mt-1 w-full rounded-lg border border-[#CBD7D0] bg-white px-3 py-2 text-sm text-[#111C16] focus:border-[#0F9D58] focus:outline-none dark:border-[#243D31] dark:bg-[#13261D] dark:text-[#ECF3EE]"
              />
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="emp-pix-receb" className="block text-xs font-medium text-[#54665C] dark:text-[#96ACA0]">
                Chave PIX para recebimento (opcional)
              </label>
              <input
                id="emp-pix-receb"
                type="text"
                value={chavePixRecebimento}
                onChange={(e) => setChavePixRecebimento(e.target.value)}
                placeholder="Gerada automaticamente se vazio"
                className="mt-1 w-full rounded-lg border border-[#CBD7D0] bg-white px-3 py-2 font-mono text-xs text-[#111C16] focus:border-[#0F9D58] focus:outline-none dark:border-[#243D31] dark:bg-[#13261D] dark:text-[#ECF3EE]"
              />
            </div>

            <div>
              <label htmlFor="emp-obs" className="block text-xs font-medium text-[#54665C] dark:text-[#96ACA0]">
                Cláusulas e observações combinadas
              </label>
              <input
                id="emp-obs"
                type="text"
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Ex.: Desconto de 5% para quitação antecipada"
                className="mt-1 w-full rounded-lg border border-[#CBD7D0] bg-white px-3 py-2 text-sm text-[#111C16] focus:border-[#0F9D58] focus:outline-none dark:border-[#243D31] dark:bg-[#13261D] dark:text-[#ECF3EE]"
              />
            </div>
          </div>

          {/* Resumo calculado das decisões do emprestador */}
          <div className="rounded-xl border border-[#D4E6DC] bg-[#F4FAF6] p-4 dark:border-[#1E3B2C] dark:bg-[#11231A]">
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-[#54665C] dark:text-[#96ACA0]">
                  Parcela ({periodicidadeLabels[periodicidade]})
                </span>
                <p className="mt-0.5 font-mono text-base font-bold text-[#0B7A45] dark:text-[#34D399]">
                  {totalParcelas}x {formatCurrencyBRL(simulacao.valorParcela)}
                </p>
              </div>
              <div>
                <span className="text-[#54665C] dark:text-[#96ACA0]">Total a receber</span>
                <p className="mt-0.5 font-mono text-base font-bold text-[#111C16] dark:text-[#ECF3EE]">
                  {formatCurrencyBRL(simulacao.valorTotal)}
                </p>
              </div>
              <div>
                <span className="text-[#54665C] dark:text-[#96ACA0]">Encargos/Juros totais</span>
                <p className="mt-0.5 font-mono text-base font-semibold text-[#111C16] dark:text-[#ECF3EE]">
                  {formatCurrencyBRL(simulacao.jurosTotais)}
                </p>
              </div>
            </div>
            <p className="mt-2 border-t border-[#DCEAE2] pt-2 text-[11px] text-[#54665C] dark:border-[#1E3B2C] dark:text-[#96ACA0]">
              Atraso configurado: multa de <strong>{multaAtrasoPct}%</strong> + mora de{' '}
              <strong>{jurosMoraDiaPct}%/dia</strong> · Garantia:{' '}
              <strong>{garantiaLabels[garantiaTipo]}</strong>
            </p>
          </div>

          {erroForm && (
            <p role="alert" className="text-xs font-medium text-red-600 dark:text-red-400">
              {erroForm}
            </p>
          )}
        </div>

        <div className="mt-6 flex items-center justify-end gap-2.5 border-t border-[#EDF2EF] pt-4 dark:border-[#192D23]">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[#CBD7D0] px-4 py-2 text-sm font-medium text-[#111C16] hover:bg-[#F3F7F5] dark:border-[#243D31] dark:text-[#ECF3EE] dark:hover:bg-[#173024]"
          >
            Cancelar
          </button>
          <LoadingButton
            onAction={handleSave}
            loadingLabel={strings.acao.salvando}
            successToastMessage="Contrato liberado com as condições definidas."
            errorToastMessage="Não foi possível criar o empréstimo."
          >
            Liberar contrato personalizado
          </LoadingButton>
        </div>
      </div>
    </div>
  );
}

export function LoanDetailsModal({
  loan,
  canEdit,
  userRole = 'emprestador',
  onClose,
}: {
  loan: import('@emprestimo/api-client').Loan | null;
  canEdit: boolean;
  userRole?: string;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [multa, setMulta] = useState(String(loan?.multaAtrasoPct ?? 2));
  const [mora, setMora] = useState(String(loan?.jurosMoraDiaPct ?? 0.33));
  const [obs, setObs] = useState(loan?.observacoes ?? '');

  React.useEffect(() => {
    if (loan) {
      setMulta(String(loan.multaAtrasoPct));
      setMora(String(loan.jurosMoraDiaPct));
      setObs(loan.observacoes ?? '');
    }
  }, [loan]);

  if (!loan) return null;

  const handleUpdateRules = async () => {
    const res = await fetch(`/api/emprestimos/${loan.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Role': userRole,
      },
      body: JSON.stringify({
        multaAtrasoPct: Number(multa) || 0,
        jurosMoraDiaPct: Number(mora) || 0,
        observacoes: obs.trim(),
      }),
    });
    if (!res.ok) throw new Error('patch_loan_failed');
    await qc.invalidateQueries({ queryKey: ['emprestimos'] });
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-detalhe-emprestimo"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4"
    >
      <div className="w-full max-w-lg rounded-2xl border border-[#DCE3DF] bg-white p-6 shadow-xl dark:border-[#1E3329] dark:bg-[#0F1E17]">
        <div className="flex items-start justify-between gap-4 border-b border-[#EDF2EF] pb-3 dark:border-[#192D23]">
          <div>
            <span className="font-mono text-xs font-semibold text-[#0B7A45] dark:text-[#34D399]">
              {loan.codigo} · Decisão do emprestador
            </span>
            <h2 id="modal-detalhe-emprestimo" className="text-lg font-bold text-[#111C16] dark:text-[#ECF3EE]">
              {loan.clienteNome}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar detalhes do contrato"
            className="rounded-lg p-1.5 text-[#54665C] hover:bg-[#EDF5F0] dark:text-[#96ACA0] dark:hover:bg-[#173024]"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-[#F6F9F7] p-4 text-xs dark:bg-[#13241B]">
          <div>
            <dt className="text-[#64786D] dark:text-[#869D90]">Modelo & Taxa</dt>
            <dd className="mt-0.5 font-semibold text-[#111C16] dark:text-[#ECF3EE]">
              {jurosLabels[loan.tipoJuros]} · {loan.taxaMensalPct}%
            </dd>
          </div>
          <div>
            <dt className="text-[#64786D] dark:text-[#869D90]">Periodicidade</dt>
            <dd className="mt-0.5 font-semibold text-[#111C16] dark:text-[#ECF3EE]">
              {periodicidadeLabels[loan.periodicidade]} ({loan.totalParcelas}x)
            </dd>
          </div>
          <div>
            <dt className="text-[#64786D] dark:text-[#869D90]">Taxa de abertura (TAC)</dt>
            <dd className="mt-0.5 font-mono font-semibold text-[#111C16] dark:text-[#ECF3EE]">
              {formatCurrencyBRL(loan.taxaAbertura)}
            </dd>
          </div>
          <div>
            <dt className="text-[#64786D] dark:text-[#869D90]">Garantia definida</dt>
            <dd className="mt-0.5 font-semibold text-[#111C16] dark:text-[#ECF3EE]">
              {garantiaLabels[loan.garantiaTipo]}
            </dd>
          </div>
          <div className="col-span-2">
            <dt className="text-[#64786D] dark:text-[#869D90]">Formas de pagamento aceitas</dt>
            <dd className="mt-0.5 font-medium text-[#111C16] dark:text-[#ECF3EE]">
              {loan.formasPagamentoPermitidas.join(' · ')}
            </dd>
          </div>
          {loan.garantiaDescricao && (
            <div className="col-span-2">
              <dt className="text-[#64786D] dark:text-[#869D90]">Descrição da garantia</dt>
              <dd className="mt-0.5 text-[#111C16] dark:text-[#ECF3EE]">{loan.garantiaDescricao}</dd>
            </div>
          )}
        </dl>

        {canEdit ? (
          <div className="mt-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="det-multa" className="block text-xs font-medium text-[#54665C] dark:text-[#96ACA0]">
                  Multa por atraso (%)
                </label>
                <input
                  id="det-multa"
                  type="number"
                  step="0.5"
                  value={multa}
                  onChange={(e) => setMulta(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#CBD7D0] bg-white px-3 py-1.5 font-mono text-sm text-[#111C16] dark:border-[#243D31] dark:bg-[#13261D] dark:text-[#ECF3EE]"
                />
              </div>
              <div>
                <label htmlFor="det-mora" className="block text-xs font-medium text-[#54665C] dark:text-[#96ACA0]">
                  Mora diária (% dia)
                </label>
                <input
                  id="det-mora"
                  type="number"
                  step="0.05"
                  value={mora}
                  onChange={(e) => setMora(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#CBD7D0] bg-white px-3 py-1.5 font-mono text-sm text-[#111C16] dark:border-[#243D31] dark:bg-[#13261D] dark:text-[#ECF3EE]"
                />
              </div>
            </div>
            <div>
              <label htmlFor="det-obs" className="block text-xs font-medium text-[#54665C] dark:text-[#96ACA0]">
                Cláusulas e observações
              </label>
              <input
                id="det-obs"
                type="text"
                value={obs}
                onChange={(e) => setObs(e.target.value)}
                className="mt-1 w-full rounded-lg border border-[#CBD7D0] bg-white px-3 py-1.5 text-sm text-[#111C16] dark:border-[#243D31] dark:bg-[#13261D] dark:text-[#ECF3EE]"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-[#CBD7D0] px-4 py-2 text-xs font-medium text-[#111C16] dark:border-[#243D31] dark:text-[#ECF3EE]"
              >
                Fechar
              </button>
              <LoadingButton
                onAction={handleUpdateRules}
                loadingLabel={strings.acao.salvando}
                successToastMessage="Condições do contrato atualizadas."
              >
                Salvar condições
              </LoadingButton>
            </div>
          </div>
        ) : (
          <div className="mt-4 space-y-2 text-xs text-[#54665C] dark:text-[#96ACA0]">
            <p>
              Encargos por atraso: multa de <strong>{loan.multaAtrasoPct}%</strong> + mora de{' '}
              <strong>{loan.jurosMoraDiaPct}% ao dia</strong>.
            </p>
            {loan.observacoes && <p>Observações: {loan.observacoes}</p>}
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg bg-[#0E1E16] px-4 py-2 text-xs font-semibold text-white dark:bg-[#0F9D58]"
              >
                Entendi
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
