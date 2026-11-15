/**
 * Supabase Edge Function: ping
 * Chamada leve executada na etapa 3 do BootScreen ("Conectando ao banco de dados…")
 * para confirmar disponibilidade do banco antes de liberar o acesso às telas.
 *
 * SQL complementar para RPC direta (caso prefira via supabase.rpc('ping')):
 *   CREATE OR REPLACE FUNCTION public.ping()
 *   RETURNS jsonb
 *   LANGUAGE sql
 *   STABLE
 *   AS $$
 *     SELECT jsonb_build_object('ok', true, 'ts', now());
 *   $$;
 */

interface RequestLike {
  method: string;
}

export async function handlePing(req: RequestLike): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  return new Response(
    JSON.stringify({
      ok: true,
      service: 'database-ping',
      timestamp: new Date().toISOString(),
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
        'Access-Control-Allow-Origin': '*',
      },
    },
  );
}

// Compatível com Deno.serve no runtime Supabase Edge Functions
const denoGlobal = (
  globalThis as unknown as {
    Deno?: { serve?: (fn: (req: Request) => Promise<Response>) => void };
  }
).Deno;

if (typeof denoGlobal?.serve === 'function') {
  denoGlobal.serve(handlePing);
}
