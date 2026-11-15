import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle2,
  Copy,
  ExternalLink,
  LocateFixed,
  Lock,
  MapPin,
  ShieldAlert,
  ShieldCheck,
  ShieldOff,
} from 'lucide-react';
import { LoadingButton, Skeleton, SkeletonText, useToast } from '@emprestimo/ui';
import {
  formatDateTimeBR,
  resolveSharedLocationConsent,
  type CustomerLocationConsent,
} from '@emprestimo/api-client';

export interface LocationConsentCardProps {
  mode: 'cliente' | 'admin';
  clienteId: string;
  clienteCidade?: string;
  clienteBairro?: string;
  consentimento?: CustomerLocationConsent;
  loading?: boolean;
  isOffline?: boolean;
  compact?: boolean;
}

const CITY_ANCHOR_COORDS: Record<string, { lat: number; lng: number }> = {
  'São Paulo': { lat: -23.5882, lng: -46.6388 },
  'Santo André': { lat: -23.6528, lng: -46.5391 },
  Guarulhos: { lat: -23.4543, lng: -46.5337 },
  'São Bernardo': { lat: -23.6914, lng: -46.5646 },
};

function requestBrowserPosition(): Promise<{
  latitude: number;
  longitude: number;
  precisaoMetros: number;
}> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new Error('geolocation_unavailable'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          precisaoMetros: Math.round(pos.coords.accuracy || 20),
        });
      },
      (err) => {
        reject(err);
      },
      {
        enableHighAccuracy: true,
        timeout: 7000,
        maximumAge: 0,
      },
    );
  });
}

export function LocationConsentCard({
  mode,
  clienteId,
  clienteCidade = 'São Paulo',
  clienteBairro = 'Centro',
  consentimento,
  loading = false,
  isOffline = false,
  compact = false,
}: LocationConsentCardProps) {
  const qc = useQueryClient();
  const { mostrarToast } = useToast();
  const [browserBlocked, setBrowserBlocked] = useState(false);
  const [gpsBusy, setGpsBusy] = useState(false);

  if (loading) {
    return (
      <div
        aria-busy="true"
        className="rounded-2xl border border-[#DCE3DF] bg-white p-5 dark:border-[#192D23] dark:bg-[#0D1A14]"
      >
        <div className="flex items-center gap-3">
          <Skeleton width={36} height={36} rounded="lg" />
          <Skeleton width="55%" height={16} rounded="sm" />
        </div>
        <div className="mt-4">
          <SkeletonText lines={2} widths={['80%', '60%']} />
        </div>
      </div>
    );
  }

  const safeConsent = resolveSharedLocationConsent(consentimento);
  const loc = safeConsent.ultimaLocalizacao;

  const enviarLocalizacao = async (
    payload: {
      acao: 'autorizar' | 'atualizar' | 'revogar' | 'negar';
      latitude?: number;
      longitude?: number;
      precisaoMetros?: number;
      origem?: 'gps_navegador' | 'confirmacao_cliente';
    },
    idempotencyKey: string,
  ) => {
    const res = await fetch(`/api/clientes/${clienteId}/localizacao`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('location_update_failed');
    await qc.invalidateQueries({ queryKey: ['cliente', clienteId] });
    await qc.invalidateQueries({ queryKey: ['clientes'] });
  };

  const handleAuthorizeWithBrowser = async () => {
    if (gpsBusy || isOffline) return;
    setGpsBusy(true);
    setBrowserBlocked(false);
    const idempotencyKey = `loc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    try {
      const coords = await requestBrowserPosition();
      await enviarLocalizacao(
        {
          acao: safeConsent.autorizada ? 'atualizar' : 'autorizar',
          latitude: coords.latitude,
          longitude: coords.longitude,
          precisaoMetros: coords.precisaoMetros,
          origem: 'gps_navegador',
        },
        idempotencyKey,
      );
      mostrarToast({
        variante: 'sucesso',
        mensagem: 'Última localização ativa compartilhada com o administrador.',
      });
    } catch {
      setBrowserBlocked(true);
      await enviarLocalizacao({ acao: 'negar' }, `${idempotencyKey}_neg`).catch(() => undefined);
    } finally {
      setGpsBusy(false);
    }
  };

  const handleConfirmManualAddressCoords = async (idempotencyKey: string) => {
    const base = CITY_ANCHOR_COORDS[clienteCidade] ?? { lat: -23.5505, lng: -46.6333 };
    setBrowserBlocked(false);
    await enviarLocalizacao(
      {
        acao: safeConsent.autorizada ? 'atualizar' : 'autorizar',
        latitude: base.lat,
        longitude: base.lng,
        precisaoMetros: 45,
        origem: 'confirmacao_cliente',
      },
      idempotencyKey,
    );
  };

  const handleRevoke = async (idempotencyKey: string) => {
    setBrowserBlocked(false);
    await enviarLocalizacao({ acao: 'revogar' }, idempotencyKey);
  };

  const handleCopyCoords = async () => {
    if (!loc) return;
    const text = `${loc.latitude.toFixed(5)}, ${loc.longitude.toFixed(5)}`;
    try {
      await navigator.clipboard.writeText(text);
      mostrarToast({
        variante: 'sucesso',
        mensagem: 'Coordenadas copiadas para a área de transferência.',
      });
    } catch {
      mostrarToast({
        variante: 'erro',
        mensagem: 'Não foi possível copiar as coordenadas.',
      });
    }
  };

  /* ============================================================
   * VISÃO DO CLIENTE (Privado: Conceder, atualizar ou revogar)
   * ============================================================ */
  if (mode === 'cliente') {
    return (
      <section
        aria-label="Autorização de localização"
        className="rounded-2xl border border-[#DCE3DF] bg-white p-5 dark:border-[#192D23] dark:bg-[#0D1A14]"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                safeConsent.autorizada
                  ? 'bg-[#EAF5EF] text-[#0B7A45] dark:bg-[#173024] dark:text-[#34D399]'
                  : 'bg-[#F3F7F5] text-[#54665C] dark:bg-[#13241B] dark:text-[#96ACA0]'
              }`}
            >
              <LocateFixed className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-semibold text-[#111C16] dark:text-[#ECF3EE]">
                  Autorização de localização
                </h2>
                <span
                  className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                    safeConsent.autorizada
                      ? 'bg-[#EAF5EF] text-[#0B7A45] dark:bg-[#173024] dark:text-[#34D399]'
                      : safeConsent.status === 'revogada'
                        ? 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                        : 'bg-[#F3F7F5] text-[#54665C] dark:bg-[#13241B] dark:text-[#96ACA0]'
                  }`}
                >
                  {safeConsent.autorizada ? (
                    <>
                      <ShieldCheck className="h-3 w-3" aria-hidden="true" />
                      Autorizada
                    </>
                  ) : safeConsent.status === 'revogada' ? (
                    <>
                      <ShieldOff className="h-3 w-3" aria-hidden="true" />
                      Revogada
                    </>
                  ) : safeConsent.status === 'negada' ? (
                    <>
                      <ShieldAlert className="h-3 w-3" aria-hidden="true" />
                      Bloqueada no navegador
                    </>
                  ) : (
                    <>
                      <Lock className="h-3 w-3" aria-hidden="true" />
                      Não autorizada
                    </>
                  )}
                </span>
              </div>
              <p className="mt-1 text-xs text-[#54665C] dark:text-[#96ACA0]">
                {safeConsent.finalidade}
              </p>
              <p className="mt-1 text-[11px] text-[#64786D] dark:text-[#869D90]">
                Privacidade (LGPD): o administrador visualiza <strong>somente sua última localização ativa</strong> — sem histórico de rotas e com revogação imediata.
              </p>
            </div>
          </div>
        </div>

        {safeConsent.autorizada && loc && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#D4E6DC] bg-[#F4FAF6] px-4 py-3 text-xs dark:border-[#1E3B2C] dark:bg-[#11231A]">
            <div className="space-y-0.5">
              <p className="font-semibold text-[#0B7A45] dark:text-[#34D399]">
                Última localização ativa enviada ao administrador
              </p>
              <p className="font-mono text-[#111C16] dark:text-[#ECF3EE]">
                {loc.latitude.toFixed(5)}, {loc.longitude.toFixed(5)} · precisão ±{loc.precisaoMetros} m
              </p>
            </div>
            <span className="font-mono text-[11px] text-[#54665C] dark:text-[#96ACA0]">
              Atualizada em {formatDateTimeBR(loc.atualizadaEm)}
            </span>
          </div>
        )}

        {browserBlocked && (
          <div
            role="alert"
            className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200"
          >
            <p className="font-semibold">
              O navegador bloqueou ou não retornou o GPS automático.
            </p>
            <p className="mt-1">
              Libere a permissão de localização no cadeado do navegador ou confirme manualmente sua posição cadastral de {clienteBairro}, {clienteCidade}.
            </p>
            <div className="mt-2.5">
              <LoadingButton
                disabled={isOffline}
                loadingLabel="Registrando…"
                successToastMessage="Última localização ativa confirmada."
                onAction={handleConfirmManualAddressCoords}
                className="px-3 py-1.5 text-xs"
              >
                Confirmar localização cadastral ({clienteBairro})
              </LoadingButton>
            </div>
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            disabled={isOffline || gpsBusy}
            aria-busy={gpsBusy}
            onClick={() => void handleAuthorizeWithBrowser()}
            className="inline-flex min-h-[40px] items-center justify-center gap-2 rounded-xl bg-[#0B7A45] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#096438] disabled:cursor-not-allowed disabled:opacity-55"
          >
            <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
            <span>
              {gpsBusy
                ? 'Obtendo GPS…'
                : safeConsent.autorizada
                  ? 'Atualizar última localização ativa'
                  : 'Autorizar e enviar localização'}
            </span>
          </button>

          {safeConsent.autorizada && (
            <LoadingButton
              variant="secondary"
              disabled={isOffline}
              loadingLabel="Revogando…"
              successToastMessage="Autorização revogada. Sua localização foi ocultada do painel."
              onAction={handleRevoke}
            >
              <ShieldOff className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Revogar autorização</span>
            </LoadingButton>
          )}
        </div>
      </section>
    );
  }

  /* ============================================================
   * VISÃO DO ADMIN / EMPRESTADOR (Compartilhado: somente última ativa)
   * ============================================================ */
  return (
    <section
      aria-label="Autorização e última localização ativa do cliente"
      className="rounded-2xl border border-[#DCE3DF] bg-white p-5 dark:border-[#192D23] dark:bg-[#0D1A14]"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-[#0F9D58]" aria-hidden="true" />
          <h3 className="text-sm font-semibold text-[#111C16] dark:text-[#ECF3EE]">
            Última localização ativa (consentimento do cliente)
          </h3>
        </div>

        <span
          className={`inline-flex items-center gap-1 rounded-md px-2.5 py-0.5 text-[11px] font-semibold ${
            safeConsent.autorizada
              ? 'bg-[#EAF5EF] text-[#0B7A45] dark:bg-[#173024] dark:text-[#34D399]'
              : safeConsent.status === 'revogada'
                ? 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                : 'bg-[#F3F7F5] text-[#54665C] dark:bg-[#13241B] dark:text-[#96ACA0]'
          }`}
        >
          {safeConsent.autorizada ? (
            <>
              <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
              Autorizada pelo cliente
            </>
          ) : safeConsent.status === 'revogada' ? (
            <>
              <ShieldOff className="h-3 w-3" aria-hidden="true" />
              Revogada pelo cliente
            </>
          ) : safeConsent.status === 'negada' ? (
            <>
              <ShieldAlert className="h-3 w-3" aria-hidden="true" />
              Recusada no dispositivo
            </>
          ) : (
            <>
              <Lock className="h-3 w-3" aria-hidden="true" />
              Não autorizada ainda
            </>
          )}
        </span>
      </div>

      {safeConsent.autorizada && loc ? (
        <div className="mt-4 space-y-3">
          <div className={`grid grid-cols-1 gap-3 ${compact ? '' : 'sm:grid-cols-12 items-center'}`}>
            {/* Radar esquemático da última posição ativa */}
            <div className={`${compact ? '' : 'sm:col-span-5'} overflow-hidden rounded-xl border border-[#DCE3DF] bg-[#0D1913] p-3 text-white dark:border-[#1E3329]`}>
              <svg
                viewBox="0 0 240 120"
                className="h-24 w-full"
                aria-label={`Marcador da última localização ativa em ${loc.bairroAproximado ?? clienteBairro}`}
              >
                <defs>
                  <pattern id={`grid-${clienteId}`} width="24" height="24" patternUnits="userSpaceOnUse">
                    <path d="M 24 0 L 0 0 0 24" fill="none" stroke="#1B3227" strokeWidth="1" />
                  </pattern>
                </defs>
                <rect width="240" height="120" fill={`url(#grid-${clienteId})`} />
                <circle cx="120" cy="60" r="34" fill="#0F9D58" fillOpacity="0.16" stroke="#0F9D58" strokeOpacity="0.45" strokeDasharray="4 3" />
                <circle cx="120" cy="60" r="14" fill="#0F9D58" fillOpacity="0.32" />
                <circle cx="120" cy="60" r="6" fill="#4ADE80" stroke="#FFFFFF" strokeWidth="2" />
              </svg>
              <p className="mt-1 text-center font-mono text-[10px] text-[#8AA396]">
                Ponto único ativo · sem histórico de deslocamento
              </p>
            </div>

            {/* Dados da última localização ativa */}
            <div className={`${compact ? '' : 'sm:col-span-7'} space-y-2 text-xs`}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[#64786D] dark:text-[#869D90]">Coordenadas ativas</span>
                <span className="font-mono font-semibold text-[#111C16] dark:text-[#ECF3EE]">
                  {loc.latitude.toFixed(5)}, {loc.longitude.toFixed(5)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[#64786D] dark:text-[#869D90]">Região aproximada</span>
                <span className="font-medium text-[#111C16] dark:text-[#ECF3EE]">
                  {loc.bairroAproximado ?? clienteBairro} · {loc.cidadeAproximada ?? clienteCidade}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[#64786D] dark:text-[#869D90]">Precisão / Origem</span>
                <span className="font-mono text-[#54665C] dark:text-[#96ACA0]">
                  ±{loc.precisaoMetros} m ({loc.origem === 'gps_navegador' ? 'GPS' : 'Confirmado'})
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[#64786D] dark:text-[#869D90]">Última atualização</span>
                <span className="font-mono text-[#0B7A45] dark:text-[#34D399]">
                  {formatDateTimeBR(loc.atualizadaEm)}
                </span>
              </div>
              {safeConsent.consentidoEm && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[#64786D] dark:text-[#869D90]">Autorizado em</span>
                  <span className="font-mono text-[#54665C] dark:text-[#96ACA0]">
                    {formatDateTimeBR(safeConsent.consentidoEm)}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => void handleCopyCoords()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#CBD7D0] bg-white px-3 py-1.5 text-xs font-medium text-[#111C16] hover:bg-[#F3F7F5] dark:border-[#243D31] dark:bg-[#13261D] dark:text-[#ECF3EE]"
            >
              <Copy className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Copiar coordenadas</span>
            </button>

            <a
              href={`https://www.openstreetmap.org/?mlat=${loc.latitude}&mlon=${loc.longitude}#map=16/${loc.latitude}/${loc.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#CBD7D0] bg-white px-3 py-1.5 text-xs font-medium text-[#0B7A45] hover:bg-[#F3F7F5] dark:border-[#243D31] dark:bg-[#13261D] dark:text-[#34D399]"
            >
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Abrir ponto no mapa</span>
            </a>
          </div>
        </div>
      ) : (
        <div className="mt-3 rounded-xl border border-dashed border-[#CBD7D0] bg-[#F8FAF9] p-4 text-xs text-[#54665C] dark:border-[#243D31] dark:bg-[#112019] dark:text-[#96ACA0]">
          <p className="font-medium text-[#111C16] dark:text-[#ECF3EE]">
            {safeConsent.status === 'revogada'
              ? 'O cliente revogou a autorização de compartilhamento.'
              : 'Nenhuma localização compartilhada até o momento.'}
          </p>
          <p className="mt-1">
            Por privacidade (LGPD), o painel administrativo exibe somente a última localização ativa após consentimento explícito do cliente no Portal do Cliente.
          </p>
          {safeConsent.revogadoEm && (
            <p className="mt-1.5 font-mono text-[11px]">
              Revogada em {formatDateTimeBR(safeConsent.revogadoEm)}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
