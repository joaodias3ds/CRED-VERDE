import { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { LoadingButton, strings } from '@emprestimo/ui';
import type { UserRole, UserSession } from '@emprestimo/api-client';

export interface LoginPageProps {
  sessaoExpirada?: boolean;
  onLoginSuccess: (token: string, session: UserSession) => void;
}

const perfis: Array<{ id: UserRole; label: string; email: string }> = [
  { id: 'emprestador', label: 'Emprestador', email: 'ricardo@creditoverde.com.br' },
  { id: 'equipe', label: 'Equipe', email: 'camila@creditoverde.com.br' },
  { id: 'cliente', label: 'Cliente', email: 'mariana.costa@email.com.br' },
  { id: 'super_admin', label: 'Super Admin', email: 'diretoria@creditoverde.com.br' },
];

export function LoginPage({ sessaoExpirada = false, onLoginSuccess }: LoginPageProps) {
  const [role, setRole] = useState<UserRole>('emprestador');
  const [email, setEmail] = useState('ricardo@creditoverde.com.br');
  const [senha, setSenha] = useState('••••••••');
  const [erroForm, setErroForm] = useState('');

  const handleSelectRole = (novoRole: UserRole) => {
    setRole(novoRole);
    const preset = perfis.find((p) => p.id === novoRole);
    if (preset) setEmail(preset.email);
  };

  const handleSubmit = async () => {
    if (!email.trim() || !email.includes('@') || !senha.trim()) {
      setErroForm('Informe seu e-mail e senha para entrar.');
      throw new Error('validation');
    }
    setErroForm('');

    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim(), role }),
    });
    if (!res.ok) {
      throw new Error('login_failed');
    }
    const data = (await res.json()) as { token: string; session: UserSession };
    onLoginSuccess(data.token, data.session);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#F6F8F7] px-4 py-10 dark:bg-[#09120E]">
      <div className="w-full max-w-md rounded-2xl border border-[#DCE3DF] bg-white p-7 shadow-sm dark:border-[#1E3329] dark:bg-[#0F1E17]">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0F9D58] font-display text-base font-bold text-white">
            R$
          </div>
          <div>
            <h1 className="font-display text-xl font-bold text-[#111C16] dark:text-[#ECF3EE]">
              {strings.app.nome}
            </h1>
            <p className="text-xs text-[#54665C] dark:text-[#96ACA0]">
              {strings.app.lema}
            </p>
          </div>
        </div>

        {sessaoExpirada && (
          <div
            role="alert"
            className="mt-5 flex items-center gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs font-medium text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200"
          >
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{strings.erro.sessaoExpirada}</span>
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
          }}
          className="mt-6 flex flex-col gap-4"
        >
          <div>
            <span className="block text-xs font-medium text-[#54665C] dark:text-[#96ACA0]">
              Perfil de acesso
            </span>
            <div className="mt-1.5 grid grid-cols-2 gap-1.5 rounded-xl bg-[#F3F7F5] p-1 dark:bg-[#13261D]">
              {perfis.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleSelectRole(p.id)}
                  className={`rounded-lg px-2.5 py-2 text-xs font-semibold transition-colors ${
                    role === p.id
                      ? 'bg-white text-[#0B7A45] shadow-sm dark:bg-[#0F1E17] dark:text-[#34D399]'
                      : 'text-[#54665C] hover:text-[#111C16] dark:text-[#96ACA0] dark:hover:text-white'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label
              htmlFor="login-email"
              className="block text-xs font-medium text-[#54665C] dark:text-[#96ACA0]"
            >
              E-mail
            </label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-[#CBD7D0] bg-white px-3.5 py-2.5 text-sm text-[#111C16] focus:border-[#0F9D58] focus:outline-none dark:border-[#243D31] dark:bg-[#13261D] dark:text-[#ECF3EE]"
              required
            />
          </div>

          <div>
            <label
              htmlFor="login-senha"
              className="block text-xs font-medium text-[#54665C] dark:text-[#96ACA0]"
            >
              Senha
            </label>
            <input
              id="login-senha"
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="mt-1 w-full rounded-lg border border-[#CBD7D0] bg-white px-3.5 py-2.5 text-sm text-[#111C16] focus:border-[#0F9D58] focus:outline-none dark:border-[#243D31] dark:bg-[#13261D] dark:text-[#ECF3EE]"
              required
            />
          </div>

          {erroForm && (
            <p role="alert" className="text-xs font-medium text-red-600 dark:text-red-400">
              {erroForm}
            </p>
          )}

          <LoadingButton
            type="submit"
            onAction={handleSubmit}
            loadingLabel="Entrando…"
            className="mt-1 w-full py-2.5"
          >
            {strings.acao.entrar}
          </LoadingButton>
        </form>
      </div>
    </div>
  );
}
