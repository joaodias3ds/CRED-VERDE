export type UserRole = 'emprestador' | 'equipe' | 'cliente' | 'super_admin';

export interface UserSession {
  id: string;
  nome: string;
  email: string;
  role: UserRole;
  tenantNome: string;
  plano: 'Essencial' | 'Profissional' | 'Corporativo';
  permissoes: string[];
  notificacoesNaoLidas: number;
  expiraEm: string;
}

export type CustomerStatus = 'ativo' | 'atraso' | 'quitado' | 'em_analise';

export interface CustomerDocument {
  id: string;
  tipo: 'RG / CNH' | 'Comprovante de Residência' | 'Comprovante de Renda';
  nomeArquivo: string;
  enviadoEm: string;
  verificado: boolean;
  previewUrl: string;
}

export interface TimelineEvent {
  id: string;
  titulo: string;
  descricao: string;
  dataIso: string;
  tipo: 'pagamento' | 'emprestimo' | 'cobranca' | 'cadastro' | 'privacidade';
}

export type LocationAuthorizationStatus =
  | 'nao_solicitada'
  | 'autorizada'
  | 'revogada'
  | 'negada';

export interface CustomerLocationSnapshot {
  latitude: number;
  longitude: number;
  precisaoMetros: number;
  cidadeAproximada?: string;
  bairroAproximado?: string;
  atualizadaEm: string;
  origem: 'gps_navegador' | 'confirmacao_cliente';
}

export interface CustomerLocationConsent {
  status: LocationAuthorizationStatus;
  autorizada: boolean;
  consentidoEm?: string;
  revogadoEm?: string;
  finalidade: string;
  /** Somente a última localização ativa; nenhum histórico de deslocamento é retido */
  ultimaLocalizacao?: CustomerLocationSnapshot | null;
}

export interface Customer {
  id: string;
  nome: string;
  cpfMascarado: string;
  /** Campo sensível: nunca é persistido no cache offline local */
  cpfCompleto?: string;
  telefone: string;
  email: string;
  cidade: string;
  bairro: string;
  score: number;
  status: CustomerStatus;
  limiteCredito: number;
  saldoDevedor: number;
  chavePix: string;
  avatarUrl: string;
  criadoEm: string;
  localizacaoConsentimento?: CustomerLocationConsent;
  documentos?: CustomerDocument[];
  historico?: TimelineEvent[];
}

export type LoanStatus = 'ativo' | 'atraso' | 'quitado';
export type LoanInterestModel = 'composto' | 'simples' | 'fixo';
export type LoanFrequency = 'mensal' | 'quinzenal' | 'semanal' | 'diario';
export type LoanGuaranteeType =
  | 'sem_garantia'
  | 'avalista'
  | 'veiculo'
  | 'imovel'
  | 'cheque_nota';

export interface Loan {
  id: string;
  codigo: string;
  clienteId: string;
  clienteNome: string;
  valorPrincipal: number;
  taxaMensalPct: number;
  tipoJuros: LoanInterestModel;
  periodicidade: LoanFrequency;
  taxaAbertura: number;
  multaAtrasoPct: number;
  jurosMoraDiaPct: number;
  garantiaTipo: LoanGuaranteeType;
  garantiaDescricao?: string;
  formasPagamentoPermitidas: Array<'PIX' | 'Dinheiro' | 'Transferência'>;
  observacoes?: string;
  totalParcelas: number;
  parcelasPagas: number;
  valorTotal: number;
  valorParcela: number;
  status: LoanStatus;
  dataContratacao: string;
  primeiroVencimento: string;
  proximoVencimento: string;
  chavePixRecebimento: string;
  decididoPor?: string;
}

export type InstallmentStatus = 'pendente' | 'paga' | 'atrasada';

export interface Installment {
  id: string;
  emprestimoId: string;
  emprestimoCodigo: string;
  clienteId: string;
  clienteNome: string;
  numero: number;
  totalParcelas: number;
  vencimento: string;
  valor: number;
  status: InstallmentStatus;
  pagoEm?: string;
  formaPagamento?: 'PIX' | 'Dinheiro' | 'Transferência';
}

export type CollectionStatus = 'pendente' | 'visitado' | 'promessa' | 'pago';

export interface CollectionVisit {
  id: string;
  clienteId: string;
  clienteNome: string;
  endereco: string;
  bairro: string;
  valorEmAberto: number;
  diasAtraso: number;
  horarioPrevisto: string;
  status: CollectionStatus;
  observacao?: string;
  registradoOffline?: boolean;
}

export interface CashflowPoint {
  mes: string;
  emprestado: number;
  recebido: number;
  inadimplenciaPct: number;
}

export interface DashboardSummary {
  totalEmprestado: number;
  totalRecebidoMes: number;
  aReceber30Dias: number;
  taxaInadimplenciaPct: number;
  clientesAtivos: number;
  parcelasHoje: number;
  fluxoMensal: CashflowPoint[];
  atualizadoEm: string;
}

export interface ReportSummary {
  carteiraTotal: number;
  jurosProjetados: number;
  taxaRecuperacaoPct: number;
  ticketMedio: number;
  distribuicaoStatus: Array<{
    categoria: string;
    valor: number;
    percentual: number;
  }>;
  fluxoMensal: CashflowPoint[];
  atualizadoEm: string;
}

export type BootStage =
  | 'iniciando'
  | 'conexao'
  | 'banco'
  | 'sessao'
  | 'dados'
  | 'pronto';

export type BootStatus =
  | 'iniciando'
  | 'carregando'
  | 'lento'
  | 'erro'
  | 'pronto';

export type BootErrorKind =
  | 'sem_conexao'
  | 'servidor_indisponivel'
  | 'sessao_expirada'
  | 'timeout';

export interface OfflineQueuedAction {
  id: string;
  tipo: 'confirmar_pagamento' | 'registrar_checkin';
  endpoint: string;
  payload: Record<string, unknown>;
  idempotencyKey: string;
  criadoEm: string;
}

export interface TenantSummary {
  id: string;
  nome: string;
  cidade: string;
  plano: 'Essencial' | 'Profissional' | 'Corporativo';
  clientesAtivos: number;
  volumeCarteira: number;
  inadimplenciaPct: number;
  mrr: number;
  status: 'ativo' | 'atencao';
}

