# 💚 DESIGN SYSTEM — ANIMAÇÃO DE ABERTURA E ESTADOS DE CARREGAMENTO (v1.0)

> Complemento do arquivo `app-emprestimo-especificacao.md` (seção 18, Design System).
> Este documento define **como o app se comporta enquanto o banco de dados (Supabase) ainda não está pronto**: a animação de abertura (splash) e o carregamento de cada elemento da tela.
> Vale para **web (Next.js)** e **mobile (Expo / React Native)**, usando os mesmos tokens e componentes de `packages/ui`.

---

## 0. REGRAS PARA O CLAUDE CODE

1. Leia este arquivo e a seção 18 do arquivo principal antes de criar qualquer tela.
2. **Nenhuma tela pode aparecer "vazia" ou "quebrada" enquanto o banco carrega.** Sempre existe um estado de carregamento visível.
3. **Nunca mostrar dado falso ou antigo como se fosse atual.** Se o banco não respondeu, mostrar carregamento, não valor.
4. Todo componente de dados deve implementar os **4 estados**: `carregando`, `sucesso`, `vazio`, `erro` (seção 6).
5. Toda a lógica de carregamento fica em **hooks e componentes compartilhados** (`packages/ui` e `packages/api-client`). Não duplicar por tela.
6. Respeitar **"reduzir movimento"** do sistema (acessibilidade): trocar animações por fade simples.
7. Animações leves: 60 fps, sem travar celular simples. Preferir **Lottie** ou **Reanimated** (mobile) e **CSS/Framer Motion** (web). Evitar vídeos pesados.
8. Todos os textos em português do Brasil.

---

## 1. VISÃO GERAL DO FLUXO DE ABERTURA

```
Abrir o app
   │
   ▼
[1] Splash nativa (logo estática, fundo verde)       ← instantânea, sem esperar JS
   │
   ▼
[2] Tela de Carregamento Animada (BootScreen)        ← animação da marca + etapas
   │   verifica em ordem: rede → banco (Supabase) → sessão → dados iniciais
   │
   ├── tudo OK ───────────────► [3] Transição suave ► Login ou Início
   │
   ├── demorou (> 8s) ────────► mensagem "Está demorando mais que o normal…"
   │
   └── falhou ────────────────► [4] Tela de Erro de Conexão (tentar novamente)
```

---

## 2. SPLASH NATIVA (primeiro contato)

- **Mobile:** configurar `expo-splash-screen` com fundo `#0F9D58` (primary-600) e a **logo branca centralizada**.
- **Web:** tela inicial leve (HTML/CSS puro, sem esperar o React) com o mesmo fundo e a logo, para não haver "tela branca" ao abrir.
- Mantida visível **até o BootScreen estar pronto para animar** (usar `SplashScreen.preventAutoHideAsync()` e `hideAsync()` quando o layout estiver montado).
- Duração típica: menos de 1 segundo. Não é nela que ficam as etapas.

---

## 3. TELA DE CARREGAMENTO ANIMADA (`BootScreen`)

### 3.1 Aparência
- Fundo: gradiente suave de `#0B7A45` (primary-700) para `#0F9D58` (primary-600). Modo escuro: de `#0B1F17` para `#0B7A45`.
- No centro: **logo do app animada** (Lottie ou SVG animado), com tema de dinheiro:
  - Sugestão de animação: uma **moeda dourada (`#D4A017`) que gira** e, ao terminar, vira o **ícone da logo**; ou um **cifrão que "enche" como uma barra de progresso**.
  - Ciclo de 1,6 s em loop suave.
- Abaixo da logo: nome do app com fade-in.
- Abaixo: **barra de progresso fina** (4px, cantos arredondados) + **texto da etapa atual**.
- Rodapé pequeno: "Seu dinheiro organizado." (frase curta e discreta) e a versão do app.

### 3.2 Etapas verificadas (nesta ordem)

| # | Texto exibido | O que o app faz | Progresso |
|---|---|---|---|
| 1 | "Iniciando…" | Carrega fontes, tema e configurações locais | 0–15% |
| 2 | "Verificando sua conexão…" | Testa rede (`NetInfo` no mobile, `navigator.onLine` no web) | 15–30% |
| 3 | "Conectando ao banco de dados…" | Faz uma chamada leve ao Supabase (ex.: função `ping` ou `select 1` via RPC) | 30–60% |
| 4 | "Verificando sua sessão…" | `supabase.auth.getSession()` e renovação do token, se preciso | 60–80% |
| 5 | "Carregando seus dados…" | Busca o essencial: perfil, tenant, plano, permissões, contagem de notificações | 80–95% |
| 6 | "Tudo pronto!" | Finaliza animação e navega | 100% |

- O progresso **avança de verdade** conforme cada etapa termina (não é uma barra falsa).
- **Tempo mínimo de exibição:** 900 ms (para a animação não "piscar" quando tudo carrega muito rápido).
- Se o app já tem sessão salva e dados em cache, a etapa 5 usa o cache e atualiza em segundo plano (ver seção 7).

### 3.3 Regras de tempo e falha
| Situação | Comportamento |
|---|---|
| Tudo ok em < 3 s | Segue direto, respeitando o mínimo de 900 ms |
| Passa de **8 s** | Aparece o texto: "Está demorando mais que o normal…" (a animação continua) |
| Passa de **20 s** ou há erro | Mostra a **Tela de Erro de Conexão** |
| Sem internet | Mostra imediatamente: "Sem conexão. Verifique sua internet." + botão **Tentar novamente** |
| Banco fora do ar | "Nosso servidor está indisponível no momento. Tente novamente em instantes." + **Tentar novamente** |
| Sessão expirada | Leva para o Login com aviso "Sua sessão expirou. Entre novamente." |

### 3.4 Tela de Erro de Conexão
- Ícone de nuvem/wifi desconectado, título curto, explicação simples e dois botões: **"Tentar novamente"** (principal) e **"Usar modo offline"** (secundário, só se houver cache e o usuário já tiver logado antes).
- Tentar novamente refaz as etapas a partir da que falhou, com **backoff** (2 s, 4 s, 8 s) e limite de 3 tentativas automáticas.
- Nunca mostrar mensagem técnica ao usuário. Detalhes vão para o Sentry.

### 3.5 Transição de saída
- Ao chegar em 100%: a moeda/logo **encolhe e sobe**, o fundo verde faz **fade-out** e a tela de destino aparece com **fade-in + leve subida (8px)**. Duração: 400 ms.
- Destino: **Login** (sem sessão) ou **Início** do perfil (emprestador, equipe, cliente ou super admin).

---

## 4. COMPONENTE `BootGate` (porteiro do app)

Criar em `packages/ui` e `packages/api-client`:

- `useAppBoot()` → hook que executa as etapas da seção 3.2 e expõe:
  `{ etapa, progresso, status: 'iniciando' | 'carregando' | 'lento' | 'erro' | 'pronto', erro, tentarNovamente }`
- `<BootGate>` → envolve o app inteiro. Enquanto `status !== 'pronto'`, renderiza o `BootScreen`. Quando `pronto`, renderiza os filhos.
- `useConexao()` → monitora a conexão **durante o uso** (não só na abertura) e mostra banner (seção 8).
- O `BootGate` guarda em memória que o boot já terminou, para **não repetir a animação** ao trocar de tela. Ela só reaparece em abertura a frio do app (ou após o app ficar mais de 30 min em segundo plano com sessão expirada).

---

## 5. SKELETON: CARREGAMENTO DE CADA ELEMENTO

> **Regra de ouro:** cada bloco da tela mostra o **próprio carregamento**, no formato do conteúdo final (skeleton), até o dado chegar. A tela nunca espera tudo ficar pronto para aparecer: a **estrutura (cabeçalho, menu, títulos) aparece na hora** e os **dados** vão preenchendo.

### 5.1 Estilo do skeleton
- Cor base: `#E5EAE7` (claro) / `#1B2E25` (escuro).
- Efeito **shimmer**: faixa de brilho suave que passa da esquerda para a direita, ciclo de 1,4 s.
- Mesmo **tamanho e raio** do elemento real, para a tela **não "pular"** quando o dado chegar (evitar *layout shift*).
- Textos: barras de largura variada (ex.: 60%, 80%, 45%).
- Números/valores em dinheiro: barra curta com o formato do valor.
- Acessibilidade: `aria-busy="true"` e `accessibilityState={{ busy: true }}`; leitor de tela anuncia "Carregando…".

### 5.2 Mapa de carregamento por componente

| Componente | Como carrega |
|---|---|
| `StatCard` (cards do dashboard) | Título real + valor em skeleton + mini ícone cinza |
| `ChartCard` (gráficos) | Moldura do gráfico + linhas/barras fantasma pulsando + eixo em skeleton |
| `LoanCard` / `CustomerCard` | Avatar circular cinza + 3 linhas de texto em skeleton + selo de status cinza |
| `InstallmentRow` | Número da parcela real (se já souber) + data e valor em skeleton + badge cinza |
| `DataTable` (web) | Cabeçalho real + 6 linhas de skeleton |
| Listas (clientes, empréstimos, parcelas) | 5 a 8 itens de skeleton, na altura da tela |
| `ScoreGauge` | Arco cinza girando + número em skeleton |
| Ficha do cliente | Foto, nome, status e blocos de dados em skeleton, abas já visíveis |
| `Timeline` | Pontos e linhas em skeleton |
| Imagens e documentos | Placeholder cinza com ícone de imagem + fade-in ao carregar |
| Gráficos de rota/mapa | Fundo de mapa neutro com ícone e texto "Carregando mapa…" |
| Contadores do menu (ex.: notificações) | Não mostrar número até chegar (evita "0" falso) |
| `PixCopyBox` | Campo em skeleton; botão **Copiar** desabilitado até a chave carregar |
| Botões de ação que dependem de dados | **Desabilitados** com leve transparência até o dado existir |

### 5.3 Carregamento por ação (botões)
- Ao clicar em **Salvar, Confirmar pagamento, Aprovar, Assinar** etc.: o botão entra em estado **"processando"** (spinner + texto "Salvando…"), **fica desabilitado** (evita duplo clique) e o resto da tela continua visível.
- Se demorar mais de 10 s: toast "Ainda processando… não feche o app."
- Sucesso: ícone de ✔ por 600 ms e toast verde. Erro: toast vermelho com opção **Tentar novamente**.
- Ações financeiras usam **chave de idempotência** (seção 16 do arquivo principal) para não duplicar se o usuário tentar de novo.

### 5.4 Carregamento de listas longas
- **Paginação/infinite scroll:** ao chegar ao fim, mostra 2 itens de skeleton no rodapé até chegar a próxima página.
- **Puxar para atualizar** (mobile): indicador verde nativo; os dados atuais continuam visíveis enquanto atualiza.
- Troca de filtro/busca: lista atual fica com opacidade reduzida e uma barra fina de progresso no topo, sem trocar por skeleton completo (evita piscar).

---

## 6. OS 4 ESTADOS OBRIGATÓRIOS DE QUALQUER ELEMENTO DE DADOS

| Estado | Quando | O que mostrar |
|---|---|---|
| **Carregando** | Esperando o banco | Skeleton (seção 5) |
| **Sucesso** | Dado chegou | Conteúdo com **fade-in de 200 ms** |
| **Vazio** | Banco respondeu, mas não há dados | Ilustração simples + frase útil + botão de ação (ex.: "Nenhum cliente ainda. **Cadastrar cliente**") |
| **Erro** | Falha ao buscar | Ícone + "Não foi possível carregar." + botão **Tentar novamente** (só aquele bloco, não a tela inteira) |

- **Erro isolado:** se só o gráfico falhar, o resto da tela continua funcionando.
- O componente base `<DataState>` recebe `{ status, skeleton, vazio, erro, children }` e cuida disso, para ninguém reescrever essa lógica.

---

## 7. CACHE E "STALE-WHILE-REVALIDATE"

- Usar **TanStack Query** com `staleTime` por tipo de dado:
  - Dashboard e parcelas: 30 s
  - Clientes e empréstimos: 60 s
  - Configurações e planos: 5 min
- **Persistir o cache** (AsyncStorage no mobile / IndexedDB no web) para abrir **instantaneamente** com os últimos dados, mostrando um selo discreto "Atualizando…" enquanto busca os novos.
- **Dados financeiros em cache** exibem um aviso quando estiverem velhos: "Atualizado há 12 min".
- **Dados sensíveis** (CPF completo, documentos) **não** ficam no cache local persistente.
- Se estiver **offline** com cache: mostrar os dados com um banner "Você está offline. Mostrando os últimos dados salvos." e **desabilitar** ações que exigem servidor.

---

## 8. BANNERS DE CONEXÃO DURANTE O USO

Faixa fina fixa no topo (abaixo do cabeçalho), com animação de entrada/saída:

| Situação | Cor | Texto |
|---|---|---|
| Perdeu conexão | Amarelo (`warning`) | "Sem conexão. Tentando reconectar…" |
| Conexão lenta | Cinza | "Conexão lenta…" |
| Voltou a conexão | Verde (`success`) | "Conexão restabelecida" (some em 2 s) |
| Servidor indisponível | Vermelho (`danger`) | "Servidor indisponível. Tentaremos novamente." |

- Ao voltar a conexão, o app **refaz automaticamente** as consultas que falharam e sincroniza a fila de ações offline (pagamentos registrados, check-ins de cobrança).

---

## 9. TOKENS DE ANIMAÇÃO

Criar em `packages/config/motion.ts`:

```ts
export const motion = {
  duration: {
    instant: 100,
    fast: 200,
    normal: 300,
    slow: 400,
    shimmer: 1400,
    boot: 1600,
  },
  easing: {
    standard: 'cubic-bezier(0.4, 0, 0.2, 1)',
    entrar: 'cubic-bezier(0, 0, 0.2, 1)',
    sair: 'cubic-bezier(0.4, 0, 1, 1)',
  },
  boot: {
    tempoMinimoMs: 900,
    avisoLentoMs: 8000,
    limiteErroMs: 20000,
    tentativasAutomaticas: 3,
    backoffMs: [2000, 4000, 8000],
  },
};
```

- **Reduzir movimento:** se o sistema pedir, `shimmer` vira um pulso de opacidade lento (sem deslocamento), a moeda da splash fica parada e as transições viram fade de 150 ms.

---

## 10. TEXTOS PADRÃO (central em `packages/ui/strings.ts`)

| Chave | Texto |
|---|---|
| `boot.iniciando` | Iniciando… |
| `boot.conexao` | Verificando sua conexão… |
| `boot.banco` | Conectando ao banco de dados… |
| `boot.sessao` | Verificando sua sessão… |
| `boot.dados` | Carregando seus dados… |
| `boot.pronto` | Tudo pronto! |
| `boot.lento` | Está demorando mais que o normal… |
| `erro.semConexao` | Sem conexão. Verifique sua internet. |
| `erro.servidor` | Nosso servidor está indisponível no momento. Tente novamente em instantes. |
| `erro.carregar` | Não foi possível carregar. |
| `acao.tentarNovamente` | Tentar novamente |
| `acao.salvando` | Salvando… |
| `acao.processando` | Processando… |
| `lista.carregando` | Carregando… |
| `offline.aviso` | Você está offline. Mostrando os últimos dados salvos. |

---

## 11. ESTRUTURA DE ARQUIVOS

```
packages/
├── ui/
│   ├── boot/
│   │   ├── BootScreen.tsx          # tela animada de abertura
│   │   ├── BootGate.tsx            # porteiro do app
│   │   ├── BootLogoAnimation.tsx   # moeda/logo animada (Lottie/SVG)
│   │   ├── BootProgress.tsx        # barra + texto da etapa
│   │   └── ConnectionErrorScreen.tsx
│   ├── feedback/
│   │   ├── Skeleton.tsx            # base com shimmer
│   │   ├── SkeletonText.tsx
│   │   ├── SkeletonCard.tsx
│   │   ├── SkeletonList.tsx
│   │   ├── DataState.tsx           # 4 estados
│   │   ├── ConnectionBanner.tsx
│   │   ├── LoadingButton.tsx
│   │   └── EmptyState.tsx
│   └── strings.ts
├── api-client/
│   ├── useAppBoot.ts
│   ├── useConexao.ts
│   └── queryClient.ts              # TanStack Query + persistência
└── config/
    └── motion.ts
supabase/
└── functions/ping/                 # função leve para testar o banco no boot
```

---

## 12. TESTES E CRITÉRIOS DE ACEITE

- [ ] Ao abrir o app, **nunca** aparece tela branca nem tela vazia.
- [ ] A animação de abertura roda no mínimo 900 ms e a barra avança conforme as etapas reais.
- [ ] Desligando a internet na abertura, aparece a tela de erro com **Tentar novamente**.
- [ ] Simulando o Supabase lento (atraso de 10 s), aparece "Está demorando mais que o normal…".
- [ ] Cada tela (Início, Clientes, Empréstimos, Parcelas, Cobrança, Relatórios, Cliente) mostra **skeleton** no formato correto e **sem pular** ao carregar (sem layout shift).
- [ ] Gráfico com erro mostra erro **só no gráfico**, e o resto funciona.
- [ ] Listas vazias mostram o estado vazio com ação, não skeleton eterno.
- [ ] Botões de ação ficam desabilitados e mostram "Salvando…" durante o envio, sem duplicar a ação.
- [ ] Com "reduzir movimento" ativado, não há animações de deslocamento.
- [ ] Ao ficar offline durante o uso, aparece o banner amarelo; ao voltar, o verde, e os dados atualizam sozinhos.
- [ ] Nenhum valor financeiro aparece como "R$ 0,00" enquanto ainda está carregando.
- [ ] Testes de componente (Vitest + Testing Library) para `DataState`, `Skeleton` e `useAppBoot`.

---

## 13. INSTRUÇÃO FINAL PARA O CLAUDE CODE

> Leia este arquivo e a seção 18 do `app-emprestimo-especificacao.md`. Implemente nesta ordem:
> 1. `motion.ts` e `strings.ts`
> 2. Componentes `Skeleton*` e `DataState`
> 3. `useAppBoot`, `BootScreen` e `BootGate` (com a função `ping` no Supabase)
> 4. `ConnectionBanner`, `useConexao` e `LoadingButton`
> 5. Aplicar `DataState` em todas as telas já existentes
> 6. Rodar os testes da seção 12 e me mostrar o resultado
>
> Se faltar alguma definição (ex.: arquivo Lottie da moeda), crie uma versão simples em SVG animado e me avise para eu trocar depois.
