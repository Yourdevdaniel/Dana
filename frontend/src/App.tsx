import { FormEvent, cloneElement, useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import type { ReactElement, ReactNode } from "react";
import {
  BadgeCheck,
  Banknote,
  Bell,
  CalendarCheck,
  Camera,
  CircleDollarSign,
  CreditCard,
  HandCoins,
  LayoutDashboard,
  Link2,
  LogIn,
  LogOut,
  Menu,
  Lock,
  Plus,
  ReceiptText,
  ShieldCheck,
  Settings2,
  Target,
  Trophy,
  UserRoundPlus,
  UserRoundSearch,
  UserCircle2,
  Upload,
  Wallet as WalletIcon,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "./components/ui/button";
import { Card } from "./components/ui/card";
import { Input } from "./components/ui/input";
import { Progress } from "./components/ui/progress";
import {
  api,
  apiErrorMessage,
  ApiAuthError,
  ApiResponse,
  AuthPayload,
  BadgeAward,
  Category,
  clearSession,
  CoupleGroup,
  Dashboard,
  Debt,
  FixedExpense,
  Goal,
  RankingItem,
  PublicProfile,
  readSession,
  Salary,
  saveSession,
  Session,
  Transaction,
  User,
  Wallet,
  XPHistory,
  updateSessionUser,
} from "./lib/api";
import { cn, formatCurrency } from "./lib/utils";
import { buildAchievementStates } from "./data/achievements";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: { client_id: string; callback: (response: { credential: string }) => void }) => void;
          renderButton: (parent: HTMLDivElement, options: Record<string, string | number>) => void;
          prompt: () => void;
        };
      };
    };
  }
}

type Page = "dashboard" | "wallet" | "transactions" | "categories" | "goals" | "debts" | "fixed" | "couple" | "achievements" | "profile" | "social";
type DashboardMode = "solo" | "couple";

type AppData = {
  me: User | null;
  dashboard: Dashboard | null;
  couple: CoupleGroup | null;
  coupleDashboard: Array<{
    user_id: string;
    name: string;
    balance: string;
    net_worth: string;
    monthly_average_expense: string;
    recommended_reserve: string;
    monthly_trend: Array<{ year: number; month: number; income: string; expense: string }>;
    financial_risk: string;
  }>;
  wallet: Wallet | null;
  salaries: Salary[];
  categories: Category[];
  transactions: Transaction[];
  goals: Goal[];
  debts: Debt[];
  fixedExpenses: FixedExpense[];
  badges: BadgeAward[];
  xpHistory: XPHistory[];
  ranking: RankingItem[];
};

const emptyData: AppData = {
  me: null,
  dashboard: null,
  couple: null,
  coupleDashboard: [],
  wallet: null,
  salaries: [],
  categories: [],
  transactions: [],
  goals: [],
  debts: [],
  fixedExpenses: [],
  badges: [],
  xpHistory: [],
  ranking: [],
};

const navigation = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "wallet", label: "Carteira", icon: WalletIcon },
  { id: "transactions", label: "Transações", icon: ReceiptText },
  { id: "categories", label: "Categorias", icon: BadgeCheck },
  { id: "goals", label: "Metas", icon: Target },
  { id: "debts", label: "Dividas", icon: HandCoins },
  { id: "fixed", label: "Contas fixas", icon: CalendarCheck },
  { id: "couple", label: "Casal", icon: Link2 },
  { id: "achievements", label: "Conquistas", icon: Trophy },
  { id: "profile", label: "Perfil", icon: UserCircle2 },
  { id: "social", label: "Rede", icon: UserRoundSearch },
] satisfies Array<{ id: Page; label: string; icon: typeof LayoutDashboard }>;

const monthFormatter = new Intl.DateTimeFormat("pt-BR", { month: "short" });

function toNumber(value: string | number | null | undefined) {
  return Number(value ?? 0);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function coupleDisplayName(user: User, couple: CoupleGroup | null) {
  if (couple?.members?.length) {
    return couple.members.map((member) => member.name).join(" & ");
  }
  return couple?.name || user.name;
}

function isCoupleGroup(value: CoupleGroup | Record<string, never>): value is CoupleGroup {
  return "id" in value && "name" in value && "members" in value;
}

function isProfileComplete(user: User | null) {
  if (!user) return false;
  return Boolean(user.name && user.avatar && user.date_of_birth);
}

function validateStrongPassword(value: string) {
  const issues: string[] = [];
  if (value.length < 8) issues.push("ao menos 8 caracteres");
  if (!/[A-Z]/.test(value)) issues.push("ao menos uma letra maiuscula");
  if (!/[a-z]/.test(value)) issues.push("ao menos uma letra minuscula");
  if (!/\d/.test(value)) issues.push("ao menos um numero");
  if (!/[!@#$%^&*\-_=+?]/.test(value)) issues.push("ao menos um caractere especial");
  return issues;
}

function passwordHelpText(value: string) {
  const issues = validateStrongPassword(value);
  if (!issues.length) return "";
  return `A senha precisa ter ${issues.join(", ")}.`;
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Não foi possível ler a imagem selecionada."));
    reader.readAsDataURL(file);
  });
}

function userInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function EmptyState({ title }: { title: string }) {
  return <p className="rounded-md border border-dashed border-white/10 p-4 text-sm text-slate-400">{title}</p>;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  const id = useId();
  return (
    <label htmlFor={id} className="grid gap-1 text-sm text-slate-300">
      <span>{label}</span>
      {cloneElement(children as ReactElement<{ id?: string }>, { id })}
    </label>
  );
}

function NativeSelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn(
        "focus-ring h-11 w-full rounded-md border border-white/10 bg-white/5 px-3 text-sm text-white",
        props.className,
      )}
    />
  );
}

function AuthScreen({
  onAuth,
}: {
  onAuth: (session: Session) => void;
}) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const googleButtonRef = useRef<HTMLDivElement | null>(null);
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
  const passwordIssues = mode === "register" ? validateStrongPassword(password) : [];
  const passwordHint = mode === "register" ? passwordHelpText(password) : "";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (mode === "register" && passwordIssues.length) {
      setError(passwordHint);
      return;
    }
    setLoading(true);
    try {
      const payload = mode === "login" ? { email, password } : { name, email, password };
      const response = await api.post<ApiResponse<AuthPayload>>(`/auth/${mode === "login" ? "login" : "register"}/`, payload).then(r => r.data);
      onAuth(response.data);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (mode !== "login" || !googleClientId || !googleButtonRef.current) return;
    const clientId = googleClientId;

    let cancelled = false;
    const scriptId = "google-gis-script";

    function handleCredentialResponse(response: { credential: string }) {
      void (async () => {
        setLoading(true);
        setError("");
        try {
          const googleResponse = await api.post<ApiResponse<AuthPayload>>("/auth/google/", { id_token: response.credential }).then(r => r.data);
          onAuth(googleResponse.data);
        } catch (err) {
          if (!cancelled) {
            setError(apiErrorMessage(err));
          }
        } finally {
          if (!cancelled) {
            setLoading(false);
          }
        }
      })();
    }

    function initGoogleButton() {
      if (!window.google || !googleButtonRef.current) return;
      googleButtonRef.current.innerHTML = "";
      const buttonWidth = Math.max(240, Math.floor(googleButtonRef.current.getBoundingClientRect().width || 320));
      window.google.accounts.id.initialize({ client_id: clientId, callback: handleCredentialResponse });
      window.google.accounts.id.renderButton(googleButtonRef.current, {
        theme: "outline",
        size: "large",
        width: buttonWidth,
        text: "signin_with",
        shape: "rectangular",
      });
    }

    const existingScript = document.getElementById(scriptId);
    if (!existingScript) {
      const script = document.createElement("script");
      script.id = scriptId;
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.onload = initGoogleButton;
      document.head.appendChild(script);
    } else if (window.google) {
      initGoogleButton();
    } else {
      existingScript.addEventListener("load", initGoogleButton, { once: true });
    }

    return () => {
      cancelled = true;
    };
  }, [googleClientId, mode, onAuth]);

  return (
    <main className="grid min-h-screen place-items-center bg-background px-4 py-10 text-slate-100">
      <Card className="w-full max-w-md p-5 sm:p-6">
        <div className="mb-6 flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-md bg-primary">
            <WalletIcon className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-white">Finance Couple</h1>
            <p className="text-sm text-slate-400">Entre para carregar seus dados reais.</p>
          </div>
        </div>
        <div className="mb-4 grid grid-cols-2 gap-2">
          <Button type="button" variant={mode === "login" ? "primary" : "secondary"} onClick={() => setMode("login")}>
            <LogIn className="h-4 w-4" aria-hidden="true" />
            Login
          </Button>
          <Button type="button" variant={mode === "register" ? "primary" : "secondary"} onClick={() => setMode("register")}>
            <UserRoundPlus className="h-4 w-4" aria-hidden="true" />
            Cadastro
          </Button>
        </div>
        <form className="grid gap-3" onSubmit={submit}>
          {mode === "register" && (
            <Field label="Nome">
              <Input value={name} onChange={(event) => setName(event.target.value)} required />
            </Field>
          )}
          <Field label="Email">
            <Input value={email} onChange={(event) => setEmail(event.target.value)} type="email" required />
          </Field>
          <Field label="Senha">
            <Input value={password} onChange={(event) => setPassword(event.target.value)} type="password" minLength={8} required />
          </Field>
          {mode === "register" && passwordIssues.length > 0 && (
            <div className="rounded-md border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-100">
              <p className="font-medium">Senha fraca</p>
              <ul className="mt-2 space-y-1">
                {passwordIssues.map((item) => (
                  <li key={item}>- {item}</li>
                ))}
              </ul>
            </div>
          )}
          {error && <p className="rounded-md bg-pink-500/10 p-3 text-sm text-pink-200">{error}</p>}
          <Button className="w-full" disabled={loading || (mode === "register" && passwordIssues.length > 0)} type="submit">
            {loading ? "Aguarde" : mode === "login" ? "Entrar" : "Criar conta"}
          </Button>
        </form>
        {mode === "login" && (
          <>
            <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-wide text-slate-500">
              <span className="h-px flex-1 bg-white/10" />
              <span>ou</span>
              <span className="h-px flex-1 bg-white/10" />
            </div>
            {googleClientId && <div ref={googleButtonRef} className="w-full" />}
          </>
        )}
      </Card>
    </main>
  );
}


function MetricGrid({ dashboard }: { dashboard: Dashboard | null }) {
  const metrics = [
    { label: "Saldo", value: dashboard?.balance, icon: CircleDollarSign, tone: "text-emerald-300" },
    { label: "Patrimonio", value: dashboard?.net_worth, icon: Banknote, tone: "text-sky-300" },
    { label: "Gasto médio", value: dashboard?.monthly_average_expense, icon: CreditCard, tone: "text-pink-300" },
    { label: "Reserva ideal", value: dashboard?.recommended_reserve, icon: ShieldCheck, tone: "text-violet-300" },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric) => (
        <Card key={metric.label} className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm text-slate-400">{metric.label}</p>
              <p className="mt-2 text-2xl font-semibold text-white">{formatCurrency(toNumber(metric.value))}</p>
            </div>
            <metric.icon className={cn("h-6 w-6", metric.tone)} aria-hidden="true" />
          </div>
        </Card>
      ))}
    </div>
  );
}

function CashflowChart({ dashboard }: { dashboard: Dashboard | null }) {
  const chartData = (dashboard?.monthly_trend ?? []).map((item) => ({
    month: monthFormatter.format(new Date(item.year, item.month - 1, 1)),
    receitas: toNumber(item.income),
    gastos: toNumber(item.expense),
  }));

  return (
    <Card className="min-h-[340px] p-5">
      <h2 className="text-lg font-semibold text-white">Evolução mensal</h2>
      <p className="mb-5 text-sm text-slate-400">Valores calculados pelo motor financeiro.</p>
      {chartData.length ? (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ left: -18, right: 4, top: 8, bottom: 0 }}>
              <defs>
                <linearGradient id="income" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563EB" stopOpacity={0.45} />
                  <stop offset="95%" stopColor="#2563EB" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="expense" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#EC4899" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#EC4899" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#334155" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" stroke="#94A3B8" tickLine={false} axisLine={false} />
              <YAxis stroke="#94A3B8" tickLine={false} axisLine={false} tickFormatter={(value) => `${Number(value) / 1000}k`} />
              <Tooltip
                contentStyle={{ background: "#111827", border: "1px solid rgba(255,255,255,.12)", borderRadius: 8 }}
                formatter={(value) => formatCurrency(Number(value))}
              />
              <Area type="monotone" dataKey="receitas" stroke="#2563EB" fill="url(#income)" strokeWidth={3} />
              <Area type="monotone" dataKey="gastos" stroke="#EC4899" fill="url(#expense)" strokeWidth={3} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <EmptyState title="Nenhum movimento mensal registrado ainda." />
      )}
    </Card>
  );
}

function DashboardPage({
  data,
  setPage,
  mode,
  setMode,
}: {
  data: AppData;
  setPage: (page: Page) => void;
  mode: DashboardMode;
  setMode: (mode: DashboardMode) => void;
}) {
  const coupleSummary = summarizeCouple(data.coupleDashboard);
  const activeDashboard = mode === "solo" ? data.dashboard : coupleSummary ?? data.dashboard;

  return (
    <div className="grid gap-6">
      <Card className="bg-[radial-gradient(circle_at_top_left,rgba(124,58,237,.35),transparent_34%),linear-gradient(135deg,rgba(37,99,235,.2),rgba(236,72,153,.08))] p-6 md:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-sky-200">
              {mode === "solo" ? "Dashboard pessoal" : "Dashboard do casal"}
            </p>
            <h2 className="mt-3 max-w-2xl text-3xl font-semibold text-white md:text-4xl">
              {mode === "solo"
                ? "Seu retrato financeiro individual aparece aqui."
                : "Os indicadores combinados do casal aparecem aqui."}
            </h2>
          </div>
          <div className="flex rounded-md border border-white/10 bg-white/[0.05] p-1">
            <Button
              type="button"
              variant={mode === "solo" ? "primary" : "ghost"}
              className="h-9 px-3"
              onClick={() => setMode("solo")}
            >
              Sozinho
            </Button>
            <Button
              type="button"
              variant={mode === "couple" ? "primary" : "ghost"}
              className="h-9 px-3"
              onClick={() => setMode("couple")}
            >
              Casal
            </Button>
          </div>
        </div>
        <div className="mt-6 grid gap-3 sm:flex">
          <Button className="w-full sm:w-auto" onClick={() => setPage("transactions")}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Registrar transacao
          </Button>
          <Button className="w-full sm:w-auto" variant="secondary" onClick={() => setPage("couple")}>
            <Link2 className="h-4 w-4" aria-hidden="true" />
            Vincular parceiro
          </Button>
        </div>
      </Card>

      {mode === "solo" ? (
        <>
          <MetricGrid dashboard={data.dashboard} />
          <section className="grid gap-6 xl:grid-cols-[1fr_380px]">
            <CashflowChart dashboard={data.dashboard} />
            <div className="grid gap-6">
              <RecentTransactions transactions={data.transactions} />
              <GoalsSummary goals={data.goals} />
            </div>
          </section>
        </>
      ) : (
        <>
          <MetricGrid dashboard={activeDashboard} />
          <section className="grid gap-6 xl:grid-cols-[1fr_380px]">
            <CoupleSummaryPanel items={data.coupleDashboard} />
            <div className="grid gap-6">
              <RecentTransactions transactions={data.transactions} />
              <GoalsSummary goals={data.goals} />
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function summarizeCouple(items: AppData["coupleDashboard"]): Dashboard | null {
  if (!items.length) return null;
  const combined = items.reduce(
    (acc, item) => {
      acc.balance += toNumber(item.balance);
      acc.net_worth += toNumber(item.net_worth);
      acc.monthly_average_expense += toNumber(item.monthly_average_expense);
      acc.recommended_reserve += toNumber(item.recommended_reserve);
      acc.financial_risk = acc.financial_risk === "critical" || item.financial_risk === "critical"
        ? "critical"
        : acc.financial_risk;
      return acc;
    },
    {
      balance: 0,
      net_worth: 0,
      monthly_average_expense: 0,
      recommended_reserve: 0,
      financial_risk: "low",
    },
  );
  const firstTrend = items[0]?.monthly_trend ?? [];
  return {
    balance: String(combined.balance),
    net_worth: String(combined.net_worth),
    monthly_average_expense: String(combined.monthly_average_expense / items.length),
    recommended_reserve: String(combined.recommended_reserve / items.length),
    monthly_trend: firstTrend,
    financial_risk: combined.financial_risk,
  };
}

function CoupleSummaryPanel({ items }: { items: AppData["coupleDashboard"] }) {
  return (
    <Card className="p-5">
      <h2 className="mb-4 text-lg font-semibold text-white">Resumo do casal</h2>
      {items.length ? (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.user_id} className="rounded-md bg-white/[0.04] p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-white">{item.name}</p>
                <span className="text-xs text-slate-400">{item.financial_risk}</span>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-3 text-sm">
                <span>Saldo: {formatCurrency(toNumber(item.balance))}</span>
                <span>XP financeiro: {formatCurrency(toNumber(item.net_worth))}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState title="O casal ainda não tem segundo membro para consolidar o dashboard." />
      )}
    </Card>
  );
}

function RecentTransactions({ transactions }: { transactions: Transaction[] }) {
  return (
    <Card className="p-5">
      <h2 className="mb-4 text-lg font-semibold text-white">Transações recentes</h2>
      {transactions.length ? (
        <div className="space-y-3">
          {transactions.slice(0, 5).map((transaction) => (
            <div key={transaction.id} className="flex items-center justify-between gap-3 rounded-md bg-white/[0.04] p-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-white">{transaction.description || transaction.category_detail?.name || transaction.type}</p>
                <p className="text-xs text-slate-400">{transaction.date}</p>
              </div>
              <p className={cn("text-sm font-semibold", transaction.type === "income" ? "text-emerald-300" : "text-slate-200")}>
                {transaction.type === "expense" ? "-" : ""}{formatCurrency(toNumber(transaction.amount))}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState title="Nenhuma transacao cadastrada." />
      )}
    </Card>
  );
}

function GoalsSummary({ goals }: { goals: Goal[] }) {
  return (
    <Card className="p-5">
      <h2 className="mb-4 text-lg font-semibold text-white">Metas</h2>
      {goals.length ? (
        <div className="space-y-4">
          {goals.slice(0, 4).map((goal) => (
            <div key={goal.id} className="space-y-2">
              <div className="flex justify-between gap-3">
                <p className="truncate text-sm font-medium text-white">{goal.name}</p>
                <span className="text-xs text-slate-400">{Math.round(goal.progress_percent)}%</span>
              </div>
              <Progress value={goal.progress_percent} />
            </div>
          ))}
        </div>
      ) : (
        <EmptyState title="Nenhuma meta criada." />
      )}
    </Card>
  );
}

type FormProps = {
  token: string;
  data: AppData;
  refresh: () => Promise<void>;
};

function WalletPage({ token, data, refresh }: FormProps) {
  const [salary, setSalary] = useState("");
  const [date, setDate] = useState(today());
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  async function submitSalary(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    try {
      await api.post("/wallet/salary/", { amount: salary, effective_date: date, note });
      setSalary("");
      setNote("");
      await refresh();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <Card className="p-5">
        <h2 className="text-lg font-semibold text-white">Carteira</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <div>
            <p className="text-sm text-slate-400">Nome</p>
            <p className="mt-1 font-semibold text-white">{data.wallet?.name ?? "Carteira não criada"}</p>
          </div>
          <div>
            <p className="text-sm text-slate-400">Moeda</p>
            <p className="mt-1 font-semibold text-white">{data.wallet?.currency ?? "BRL"}</p>
          </div>
          <div>
            <p className="text-sm text-slate-400">Saldo</p>
            <p className="mt-1 font-semibold text-white">{formatCurrency(toNumber(data.wallet?.balance))}</p>
          </div>
        </div>
        <h3 className="mt-8 text-base font-semibold text-white">Salarios registrados</h3>
        <div className="mt-3 space-y-2">
          {data.salaries.length ? data.salaries.map((item) => (
            <div key={item.id} className="flex justify-between rounded-md bg-white/[0.04] p-3 text-sm">
              <span>{item.effective_date} {item.note && `- ${item.note}`}</span>
              <strong>{formatCurrency(toNumber(item.amount))}</strong>
            </div>
          )) : <EmptyState title="Nenhum salario cadastrado." />}
        </div>
      </Card>
      <Card className="p-5">
        <h2 className="mb-4 text-lg font-semibold text-white">Registrar salario</h2>
        <form className="grid gap-3" onSubmit={submitSalary}>
          <Field label="Valor"><Input value={salary} onChange={(event) => setSalary(event.target.value)} type="number" min="0.01" step="0.01" required /></Field>
          <Field label="Data efetiva"><Input value={date} onChange={(event) => setDate(event.target.value)} type="date" required /></Field>
          <Field label="Observacao"><Input value={note} onChange={(event) => setNote(event.target.value)} /></Field>
          {error && <p className="text-sm text-pink-200">{error}</p>}
          <Button type="submit">Salvar salario</Button>
        </form>
      </Card>
    </div>
  );
}

function TransactionsPage({ token, data, refresh }: FormProps) {
  const [form, setForm] = useState({ amount: "", type: "expense", description: "", date: today(), category: "", is_recurring: false });
  const [error, setError] = useState("");
  const categories = data.categories.filter((category) => category.type === form.type);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!data.wallet) {
      setError("A carteira ainda não foi criada.");
      return;
    }
    setError("");
    try {
      await api.post("/transactions/", {
        amount: form.amount,
        type: form.type,
        description: form.description,
        date: form.date,
        is_recurring: form.is_recurring,
        category: form.category || null,
        wallet: data.wallet.id,
      });
      setForm({ amount: "", type: "expense", description: "", date: today(), category: "", is_recurring: false });
      await refresh();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  return (
    <ResourcePage title="Transações" formTitle="Nova transação">
      <form className="grid gap-3" onSubmit={submit}>
        <Field label="Tipo">
          <NativeSelect value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value, category: "" })}>
            <option value="expense">Despesa</option>
            <option value="income">Receita</option>
          </NativeSelect>
        </Field>
        <Field label="Valor"><Input value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} type="number" min="0.01" step="0.01" required /></Field>
        <Field label="Descrição"><Input value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></Field>
        <Field label="Data"><Input value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} type="date" required /></Field>
        <Field label="Categoria">
          <NativeSelect value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>
            <option value="">Sem categoria</option>
            {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
          </NativeSelect>
        </Field>
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input checked={form.is_recurring} onChange={(event) => setForm({ ...form, is_recurring: event.target.checked })} type="checkbox" />
          Recorrente
        </label>
        {error && <p className="text-sm text-pink-200">{error}</p>}
        <Button type="submit">Salvar transacao</Button>
      </form>
      <DataList items={data.transactions} empty="Nenhuma transacao cadastrada." render={(item) => (
        <ListRow
          key={item.id}
          title={item.description || item.category_detail?.name || item.type}
          meta={`${item.date} - ${item.category_detail?.name ?? "Sem categoria"}`}
          value={`${item.type === "expense" ? "-" : ""}${formatCurrency(toNumber(item.amount))}`}
        />
      )} />
    </ResourcePage>
  );
}

function CategoriesPage({ token, data, refresh }: FormProps) {
  const [form, setForm] = useState({ name: "", type: "expense", icon: "", color: "#7C3AED" });
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    try {
      await api.post("/categories/", form);
      setForm({ name: "", type: "expense", icon: "", color: "#7C3AED" });
      await refresh();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  return (
    <ResourcePage title="Categorias" formTitle="Nova categoria">
      <form className="grid gap-3" onSubmit={submit}>
        <Field label="Nome"><Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></Field>
        <Field label="Tipo">
          <NativeSelect value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })}>
            <option value="expense">Despesa</option>
            <option value="income">Receita</option>
          </NativeSelect>
        </Field>
        <Field label="Icone"><Input value={form.icon} onChange={(event) => setForm({ ...form, icon: event.target.value })} /></Field>
        <Field label="Cor"><Input value={form.color} onChange={(event) => setForm({ ...form, color: event.target.value })} type="color" /></Field>
        {error && <p className="text-sm text-pink-200">{error}</p>}
        <Button type="submit">Salvar categoria</Button>
      </form>
      <DataList items={data.categories} empty="Nenhuma categoria cadastrada." render={(category) => (
        <div key={category.id} className="flex items-center justify-between gap-3 rounded-md bg-white/[0.04] p-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="h-4 w-4 rounded-full" style={{ backgroundColor: category.color }} />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-white">{category.name}</p>
              <p className="text-xs text-slate-400">{category.type === "income" ? "Receita" : "Despesa"} {category.is_system ? "- Sistema" : "- Personalizada"}</p>
            </div>
          </div>
          <span className="text-sm text-slate-300">{category.icon}</span>
        </div>
      )} />
    </ResourcePage>
  );
}

function GoalsPage({ token, data, refresh }: FormProps) {
  const [form, setForm] = useState({ name: "", target_amount: "", current_amount: "0", deadline: "" });
  const [deposit, setDeposit] = useState<Record<string, string>>({});
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    try {
      await api.post("/goals/", { ...form, deadline: form.deadline || null, couple_group: data.couple?.id ?? null });
      setForm({ name: "", target_amount: "", current_amount: "0", deadline: "" });
      await refresh();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  async function makeDeposit(goal: Goal) {
    const amount = deposit[goal.id];
    if (!amount) return;
    await api.post(`/goals/${goal.id}/deposit/`, { amount });
    setDeposit({ ...deposit, [goal.id]: "" });
    await refresh();
  }

  return (
    <ResourcePage title="Metas" formTitle="Nova meta">
      <form className="grid gap-3" onSubmit={submit}>
        <Field label="Nome"><Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></Field>
        <Field label="Valor alvo"><Input value={form.target_amount} onChange={(event) => setForm({ ...form, target_amount: event.target.value })} type="number" min="0.01" step="0.01" required /></Field>
        <Field label="Valor atual"><Input value={form.current_amount} onChange={(event) => setForm({ ...form, current_amount: event.target.value })} type="number" min="0" step="0.01" /></Field>
        <Field label="Prazo"><Input value={form.deadline} onChange={(event) => setForm({ ...form, deadline: event.target.value })} type="date" /></Field>
        {error && <p className="text-sm text-pink-200">{error}</p>}
        <Button type="submit">Salvar meta</Button>
      </form>
      <DataList items={data.goals} empty="Nenhuma meta cadastrada." render={(goal) => (
        <div key={goal.id} className="rounded-md bg-white/[0.04] p-3">
          <div className="flex justify-between gap-3 text-sm">
            <strong className="text-white">{goal.name}</strong>
            <span>{Math.round(goal.progress_percent)}%</span>
          </div>
          <Progress value={goal.progress_percent} />
          <p className="mt-2 text-xs text-slate-400">{formatCurrency(toNumber(goal.current_amount))} de {formatCurrency(toNumber(goal.target_amount))}</p>
          <div className="mt-3 flex gap-2">
            <Input value={deposit[goal.id] ?? ""} onChange={(event) => setDeposit({ ...deposit, [goal.id]: event.target.value })} type="number" min="0.01" step="0.01" placeholder="Deposito" />
            <Button type="button" variant="secondary" onClick={() => makeDeposit(goal)}>Adicionar</Button>
          </div>
        </div>
      )} />
    </ResourcePage>
  );
}

function DebtsPage({ token, data, refresh }: FormProps) {
  const [form, setForm] = useState({ creditor: "", amount: "", paid_amount: "0", due_date: "", description: "" });
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    try {
      await api.post("/debts/", { ...form, due_date: form.due_date || null });
      setForm({ creditor: "", amount: "", paid_amount: "0", due_date: "", description: "" });
      await refresh();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  return (
    <ResourcePage title="Dívidas" formTitle="Nova dívida">
      <form className="grid gap-3" onSubmit={submit}>
        <Field label="Credor"><Input value={form.creditor} onChange={(event) => setForm({ ...form, creditor: event.target.value })} required /></Field>
        <Field label="Valor"><Input value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} type="number" min="0.01" step="0.01" required /></Field>
        <Field label="Valor pago"><Input value={form.paid_amount} onChange={(event) => setForm({ ...form, paid_amount: event.target.value })} type="number" min="0" step="0.01" /></Field>
        <Field label="Vencimento"><Input value={form.due_date} onChange={(event) => setForm({ ...form, due_date: event.target.value })} type="date" /></Field>
        <Field label="Descrição"><Input value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></Field>
        {error && <p className="text-sm text-pink-200">{error}</p>}
        <Button type="submit">Salvar dívida</Button>
      </form>
      <DataList items={data.debts} empty="Nenhuma dívida cadastrada." render={(debt) => (
        <ListRow key={debt.id} title={debt.creditor} meta={`Restante: ${formatCurrency(toNumber(debt.remaining))}`} value={formatCurrency(toNumber(debt.amount))} />
      )} />
    </ResourcePage>
  );
}

function FixedExpensesPage({ token, data, refresh }: FormProps) {
  const [form, setForm] = useState({ name: "", amount: "", due_day: "1", category: "" });
  const [error, setError] = useState("");
  const categories = data.categories.filter((category) => category.type === "expense");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    try {
      await api.post("/fixed-expenses/", { ...form, category: form.category || null });
      setForm({ name: "", amount: "", due_day: "1", category: "" });
      await refresh();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  async function markPaid(item: FixedExpense) {
    await api.post(`/fixed-expenses/${item.id}/pay/`);
    await refresh();
  }

  return (
    <ResourcePage title="Contas fixas" formTitle="Nova conta fixa">
      <form className="grid gap-3" onSubmit={submit}>
        <Field label="Nome"><Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></Field>
        <Field label="Valor"><Input value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} type="number" min="0.01" step="0.01" required /></Field>
        <Field label="Dia de vencimento"><Input value={form.due_day} onChange={(event) => setForm({ ...form, due_day: event.target.value })} type="number" min="1" max="31" required /></Field>
        <Field label="Categoria">
          <NativeSelect value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>
            <option value="">Sem categoria</option>
            {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
          </NativeSelect>
        </Field>
        {error && <p className="text-sm text-pink-200">{error}</p>}
        <Button type="submit">Salvar conta</Button>
      </form>
      <DataList items={data.fixedExpenses} empty="Nenhuma conta fixa cadastrada." render={(item) => (
        <div key={item.id} className="flex items-center justify-between gap-3 rounded-md bg-white/[0.04] p-3">
          <div>
            <p className="font-medium text-white">{item.name}</p>
            <p className="text-xs text-slate-400">Vence dia {item.due_day} - {item.is_paid_this_month ? "Pago" : "Pendente"}</p>
          </div>
          <div className="flex items-center gap-3">
            <strong>{formatCurrency(toNumber(item.amount))}</strong>
            {!item.is_paid_this_month && <Button type="button" variant="secondary" onClick={() => markPaid(item)}>Pagar</Button>}
          </div>
        </div>
      )} />
    </ResourcePage>
  );
}

function CouplePage({ token, data, refresh, user }: FormProps & { user: User }) {
  const [groupName, setGroupName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState("");

  async function createGroup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    try {
      await api.post("/couples/", { name: groupName });
      setGroupName("");
      await refresh();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  async function joinGroup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    try {
      await api.post("/couples/join/", { invite_code: inviteCode });
      setInviteCode("");
      await refresh();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <Card className="p-5">
        <h2 className="text-lg font-semibold text-white">Casal</h2>
        {data.couple ? (
          <div className="mt-4 grid gap-4">
            <p className="text-2xl font-semibold text-white">{coupleDisplayName(user, data.couple)}</p>
            <p className="text-sm text-slate-400">Nome do grupo: {data.couple.name}</p>
            <p className="rounded-md bg-white/[0.04] p-3 text-sm">Código de convite: <strong>{data.couple.invite_code}</strong></p>
            <div className="grid gap-2">
              {data.couple.members.map((member) => <ListRow key={member.id} title={member.name} meta={member.email} value={`${member.total_xp} XP`} />)}
            </div>
          </div>
        ) : (
          <EmptyState title="Você ainda não tem grupo de casal. Crie um grupo ou entre com um código de convite." />
        )}
      </Card>
      <div className="grid gap-6">
        <Card className="p-5">
          <h2 className="mb-4 text-lg font-semibold text-white">Criar grupo</h2>
          <form className="grid gap-3" onSubmit={createGroup}>
            <Field label="Nome do casal ou grupo"><Input value={groupName} onChange={(event) => setGroupName(event.target.value)} required /></Field>
            <Button type="submit">Criar casal</Button>
          </form>
        </Card>
        <Card className="p-5">
          <h2 className="mb-4 text-lg font-semibold text-white">Entrar com convite</h2>
          <form className="grid gap-3" onSubmit={joinGroup}>
            <Field label="Código"><Input value={inviteCode} onChange={(event) => setInviteCode(event.target.value.toUpperCase())} maxLength={12} required /></Field>
            {error && <p className="text-sm text-pink-200">{error}</p>}
            <Button type="submit">Vincular parceiro</Button>
          </form>
        </Card>
      </div>
    </div>
  );
}

function AchievementsPage({ data, user }: { data: AppData; user: User }) {
  const stats = useMemo(
    () => ({
      user,
      dashboard: data.dashboard,
      couple: data.couple,
      coupleDashboard: data.coupleDashboard,
      wallet: data.wallet,
      salaries: data.salaries,
      categories: data.categories,
      transactions: data.transactions,
      goals: data.goals,
      debts: data.debts,
      fixedExpenses: data.fixedExpenses,
      badges: data.badges,
      ranking: data.ranking,
      profileComplete: isProfileComplete(data.me ?? user),
      rankingPosition: data.ranking.find((item) => item.user.id === user.id)?.rank ?? null,
    }),
    [data, user],
  );

  const achievements = useMemo(() => buildAchievementStates(stats), [stats]);
  const [tab, setTab] = useState<"earned" | "progress" | "locked">("earned");

  const filtered = achievements.filter((achievement) => {
    if (tab === "earned") return achievement.unlocked;
    if (tab === "progress") return !achievement.unlocked && achievement.progress > 0;
    return !achievement.unlocked && achievement.progress === 0;
  });

  const counts = {
    earned: achievements.filter((achievement) => achievement.unlocked).length,
    progress: achievements.filter((achievement) => !achievement.unlocked && achievement.progress > 0).length,
    locked: achievements.filter((achievement) => !achievement.unlocked && achievement.progress === 0).length,
  };

  return (
    <div className="grid gap-6">
      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Conquistas</h2>
            <p className="mt-1 text-sm text-slate-400">30 objetivos reais acompanhados pelos dados da conta.</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            {([
              ["earned", "Conquistadas", counts.earned],
              ["progress", "Em andamento", counts.progress],
              ["locked", "Ainda não desbloqueáveis", counts.locked],
            ] as const).map(([key, label, count]) => (
              <Button key={key} type="button" variant={tab === key ? "primary" : "secondary"} className="justify-between px-3" onClick={() => setTab(key)}>
                <span>{label}</span>
                <strong>{count}</strong>
              </Button>
            ))}
          </div>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((achievement) => (
          <Card key={achievement.id} className={cn("p-5", achievement.unlocked ? "border-emerald-400/25 bg-emerald-400/5" : "border-white/10")}>
            <div className="flex items-start justify-between gap-4">
              <div className={cn("grid h-11 w-11 place-items-center rounded-md", achievement.unlocked ? "bg-emerald-500/15 text-emerald-300" : "bg-white/5 text-slate-300")}>
                <achievement.icon className="h-5 w-5" aria-hidden="true" />
              </div>
              {achievement.unlocked ? <BadgeCheck className="h-5 w-5 text-emerald-300" aria-hidden="true" /> : <Lock className="h-5 w-5 text-slate-500" aria-hidden="true" />}
            </div>
            <p className="mt-4 text-base font-semibold text-white">{achievement.title}</p>
            <p className="mt-1 text-sm text-slate-400">{achievement.description}</p>
            <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
              <span>{achievement.category}</span>
              <span>{achievement.tier}</span>
            </div>
            <Progress className="mt-3" value={achievement.progress} />
            <p className="mt-2 text-xs text-slate-500">{achievement.unlocked ? "Conquista concluída." : `${achievement.progress}% concluído.`}</p>
          </Card>
        ))}
      </div>

      {!filtered.length && <EmptyState title="Nenhuma conquista nesta aba ainda." />}

      <Card className="p-5">
        <h2 className="mb-4 text-lg font-semibold text-white">Badges reais</h2>
        {data.badges.length ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {data.badges.map((item) => (
              <div key={item.id} className="rounded-md border border-secondary/40 bg-secondary/10 p-3">
                <BadgeCheck className="h-5 w-5 text-secondary" aria-hidden="true" />
                <p className="mt-2 text-sm font-medium text-white">{item.badge.name}</p>
                <p className="text-xs text-slate-400">{item.badge.description}</p>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="Nenhum badge conquistado ainda." />
        )}
      </Card>
    </div>
  );
}

function ProfilePage({
  token,
  data,
  refresh,
  user,
  onUserChange,
}: FormProps & { user: User; onUserChange: (user: User) => void }) {
  const profile = data.me ?? user;
  const featuredStorageKey = `finance-couple:featured-badges:${profile.id}`;
  const [tab, setTab] = useState<"overview" | "settings" | "badges">("overview");
  const [name, setName] = useState(profile.name);
  const [dateOfBirth, setDateOfBirth] = useState(profile.date_of_birth ?? "");
  const [avatar, setAvatar] = useState<string | null>(profile.avatar);
  const [avatarLabel, setAvatarLabel] = useState(profile.avatar ? "Imagem atual" : "Nenhum arquivo selecionado");
  const [featuredBadgeIds, setFeaturedBadgeIds] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(profile.name);
    setDateOfBirth(profile.date_of_birth ?? "");
    setAvatar(profile.avatar);
    setAvatarLabel(profile.avatar ? "Imagem atual" : "Nenhum arquivo selecionado");
    setTab("overview");
  }, [profile.id, profile.name, profile.avatar, profile.date_of_birth]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(featuredStorageKey);
      setFeaturedBadgeIds(raw ? (JSON.parse(raw) as string[]) : []);
    } catch {
      setFeaturedBadgeIds([]);
    }
  }, [featuredStorageKey]);

  useEffect(() => {
    try {
      localStorage.setItem(featuredStorageKey, JSON.stringify(featuredBadgeIds));
    } catch {
      // keep local-only state best-effort
    }
  }, [featuredBadgeIds, featuredStorageKey]);

  const featuredBadges = data.badges.filter((item) => featuredBadgeIds.includes(item.id));
  const allBadges = data.badges;

  async function selectAvatar(file: File | null) {
    setError("");
    if (!file) {
      setAvatar(null);
      setAvatarLabel("Nenhum arquivo selecionado");
      return;
    }
    if (!["image/jpeg", "image/png"].includes(file.type)) {
      setError("Use apenas imagens JPEG ou PNG.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError("A imagem precisa ter no maximo 2 MB.");
      return;
    }
    try {
      const dataUrl = await fileToDataUrl(file);
      setAvatar(dataUrl);
      setAvatarLabel(file.name);
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const response = await api.patch<ApiResponse<User>>("/users/me/", { name, date_of_birth: dateOfBirth || null, avatar }).then(r => r.data);
      updateSessionUser(response.data);
      onUserChange(response.data);
      await refresh();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  function toggleFeaturedBadge(badgeId: string) {
    setFeaturedBadgeIds((current) =>
      current.includes(badgeId) ? current.filter((id) => id !== badgeId) : [...current, badgeId],
    );
  }

  return (
    <div className="grid gap-6">
      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="grid h-20 w-20 place-items-center overflow-hidden rounded-md bg-white/5">
                {avatar ? (
                  <img src={avatar} alt={profile.name} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-xl font-semibold text-white">{userInitials(profile.name)}</span>
                )}
              </div>
              <div>
                <p className="text-sm text-slate-400">Perfil</p>
                <h2 className="text-2xl font-semibold text-white">{profile.name}</h2>
                <p className="text-sm text-slate-400">{profile.email}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {([
              ["overview", "Visao geral", Trophy],
              ["settings", "Configuracoes", Settings2],
              ["badges", "Badges", BadgeCheck],
            ] as const).map(([key, label, Icon]) => (
              <Button key={key} type="button" variant={tab === key ? "primary" : "secondary"} className="px-3" onClick={() => setTab(key)}>
                <Icon className="h-4 w-4" aria-hidden="true" />
                {label}
              </Button>
            ))}
          </div>
        </div>
      </Card>

      {tab === "overview" && (
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <Card className="p-5">
            <h3 className="mb-4 text-lg font-semibold text-white">Resumo do perfil</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between gap-3">
                <span className="text-slate-400">XP total</span>
                <strong className="text-white">{profile.total_xp} XP</strong>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-slate-400">Nascimento</span>
                <strong className="text-white">{profile.date_of_birth || "Não informado"}</strong>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-slate-400">Perfil completo</span>
                <strong className={isProfileComplete(profile) ? "text-emerald-300" : "text-slate-300"}>
                  {isProfileComplete(profile) ? "Sim" : "Nao"}
                </strong>
              </div>
            </div>

            <h3 className="mb-4 mt-8 text-lg font-semibold text-white">Badges em destaque</h3>
            {featuredBadges.length ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {featuredBadges.map((item) => (
                  <div key={item.id} className="rounded-md bg-white/[0.04] p-3">
                    <p className="text-sm font-medium text-white">{item.badge.name}</p>
                    <p className="text-xs text-slate-400">{item.badge.description}</p>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title="Nenhuma badge destacada ainda." />
            )}
          </Card>

          <Card className="p-5">
            <h3 className="mb-4 text-lg font-semibold text-white">Informacoes</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between gap-3">
                <span className="text-slate-400">Criado em</span>
                <strong className="text-white">{new Date(profile.created_at).toLocaleDateString("pt-BR")}</strong>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-slate-400">Foto</span>
                <strong className="text-white">{avatar ? "Carregada" : "Não enviada"}</strong>
              </div>
            </div>
          </Card>
        </div>
      )}

      {tab === "settings" && (
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <Card className="p-5">
            <h3 className="mb-4 text-lg font-semibold text-white">Configuracoes do perfil</h3>
            <form className="grid gap-3" onSubmit={submit}>
              <Field label="Nome">
                <Input value={name} onChange={(event) => setName(event.target.value)} required />
              </Field>
              <Field label="Data de nascimento">
                <Input value={dateOfBirth} onChange={(event) => setDateOfBirth(event.target.value)} type="date" />
              </Field>
              <div className="grid gap-2">
                <span className="text-sm text-slate-300">Foto de perfil</span>
                <div className="grid gap-3 rounded-md border border-dashed border-white/10 bg-white/[0.03] p-4">
                  <div className="flex items-center gap-3">
                    <div className="grid h-14 w-14 place-items-center overflow-hidden rounded-md bg-white/5">
                      {avatar ? (
                        <img src={avatar} alt={profile.name} className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-lg font-semibold text-white">{userInitials(profile.name)}</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-white">{avatarLabel}</p>
                      <p className="text-xs text-slate-400">JPEG ou PNG, maximo de 2 MB.</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground hover:bg-secondary/90">
                      <Upload className="h-4 w-4" aria-hidden="true" />
                      <span>Escolher foto</span>
                      <input
                        className="hidden"
                        type="file"
                        accept="image/jpeg,image/png"
                        onChange={(event) => void selectAvatar(event.target.files?.[0] ?? null)}
                      />
                    </label>
                    <Button type="button" variant="ghost" onClick={() => {
                      setAvatar(null);
                      setAvatarLabel("Nenhum arquivo selecionado");
                    }}>
                      Remover
                    </Button>
                  </div>
                </div>
              </div>
              {error && <p className="text-sm text-pink-200">{error}</p>}
              <Button type="submit" disabled={saving}>
                <Camera className="h-4 w-4" aria-hidden="true" />
                {saving ? "Salvando" : "Salvar alteracoes"}
              </Button>
            </form>
          </Card>

          <Card className="p-5">
            <h3 className="mb-4 text-lg font-semibold text-white">Conta</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between gap-3">
                <span className="text-slate-400">Email</span>
                <strong className="truncate text-right text-white">{profile.email}</strong>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-slate-400">Perfil completo</span>
                <strong className={isProfileComplete(profile) ? "text-emerald-300" : "text-slate-300"}>
                  {isProfileComplete(profile) ? "Sim" : "Nao"}
                </strong>
              </div>
            </div>
          </Card>
        </div>
      )}

      {tab === "badges" && (
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <Card className="p-5">
            <h3 className="mb-2 text-lg font-semibold text-white">Badges do perfil</h3>
            <p className="mb-4 text-sm text-slate-400">Selecione quais badges ficam em destaque no perfil.</p>
            {allBadges.length ? (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {allBadges.map((item) => {
                  const selected = featuredBadgeIds.includes(item.id);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => toggleFeaturedBadge(item.id)}
                      className={cn(
                        "rounded-md border p-3 text-left transition",
                        selected ? "border-secondary/60 bg-secondary/10" : "border-white/10 bg-white/[0.04] hover:bg-white/[0.06]",
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-white">{item.badge.name}</p>
                          <p className="text-xs text-slate-400">{item.badge.description}</p>
                        </div>
                        <BadgeCheck className={cn("h-5 w-5", selected ? "text-secondary" : "text-slate-500")} aria-hidden="true" />
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <EmptyState title="Nenhuma badge encontrada." />
            )}
          </Card>

          <Card className="p-5">
            <h3 className="mb-4 text-lg font-semibold text-white">Destaques atuais</h3>
            {featuredBadges.length ? (
              <div className="space-y-3">
                {featuredBadges.map((item) => (
                  <div key={item.id} className="rounded-md bg-white/[0.04] p-3">
                    <p className="text-sm font-medium text-white">{item.badge.name}</p>
                    <p className="text-xs text-slate-400">{item.badge.description}</p>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title="Nenhuma badge destacada." />
            )}
          </Card>
        </div>
      )}
    </div>
  );
}

function SocialPage({ token, user }: { token: string; user: User }) {
  const [query, setQuery] = useState("");
  const [profiles, setProfiles] = useState<PublicProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    const handle = window.setTimeout(() => {
      void (async () => {
        setLoading(true);
        setError("");
        try {
          const search = query.trim();
          const path = search ? `/users/profiles/?search=${encodeURIComponent(search)}` : "/users/profiles/";
          const response = await api.get<ApiResponse<PublicProfile[]>>(path).then(r => r.data);
          if (cancelled) return;
          setProfiles(response.data);
        } catch (err) {
          if (!cancelled) setError(apiErrorMessage(err));
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [query, token]);

  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      <Card className="p-5">
        <h2 className="text-lg font-semibold text-white">Buscar perfis</h2>
        <p className="mt-1 text-sm text-slate-400">Encontre pessoas pelo nome. A busca vem do servidor.</p>
        <div className="mt-4">
          <Field label="Nome">
            <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Pesquisar" />
          </Field>
        </div>
        <div className="mt-5 space-y-3 text-sm">
          <div className="flex justify-between gap-3">
            <span className="text-slate-400">Perfis encontrados</span>
            <strong className="text-white">{profiles.length}</strong>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-slate-400">Sua conta</span>
            <strong className="text-white">{user.name}</strong>
          </div>
        </div>
      </Card>

      <Card className="p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-white">Pessoas</h2>
          {loading && <span className="text-xs text-slate-400">Carregando</span>}
        </div>
        {error && <p className="mb-4 rounded-md bg-pink-500/10 p-3 text-sm text-pink-200">{error}</p>}
        <DataList
          items={profiles}
          empty="Nenhum perfil encontrado."
          render={(item) => (
            <div key={item.id} className="flex items-center justify-between gap-3 rounded-md bg-white/[0.04] p-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-md bg-white/5">
                  {item.avatar ? (
                    <img src={item.avatar} alt={item.name} className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-sm font-semibold text-white">{userInitials(item.name)}</span>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-white">{item.name}</p>
                  <p className="truncate text-xs text-slate-400">
                    XP {item.total_xp} • {new Date(item.created_at).toLocaleDateString("pt-BR")}
                  </p>
                </div>
              </div>
            </div>
          )}
        />
      </Card>
    </div>
  );
}

function ResourcePage({ title, formTitle, children }: { title: string; formTitle: string; children: [ReactNode, ReactNode] }) {
  const [form, list] = children;
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <Card className="p-5">
        <h2 className="mb-4 text-lg font-semibold text-white">{title}</h2>
        {list}
      </Card>
      <Card className="p-5">
        <h2 className="mb-4 text-lg font-semibold text-white">{formTitle}</h2>
        {form}
      </Card>
    </div>
  );
}

function DataList<T>({ items, empty, render }: { items: T[]; empty: string; render: (item: T) => ReactNode }) {
  return items.length ? <div className="space-y-3">{items.map(render)}</div> : <EmptyState title={empty} />;
}

function ListRow({ title, meta, value }: { title: string; meta: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md bg-white/[0.04] p-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-white">{title}</p>
        <p className="truncate text-xs text-slate-400">{meta}</p>
      </div>
      <strong className="shrink-0 text-sm text-white">{value}</strong>
    </div>
  );
}

export function App() {
  const [session, setSession] = useState<Session | null>(() => readSession());
  const [data, setData] = useState<AppData>(emptyData);
  const [page, setPage] = useState<Page>("dashboard");
  const [dashboardMode, setDashboardMode] = useState<DashboardMode>("solo");
  const [authState, setAuthState] = useState<"checking" | "authenticated" | "anonymous">(() => (readSession() ? "checking" : "anonymous"));
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const token = session?.access ?? "";

  const handleAuth = useCallback((nextSession: Session) => {
    saveSession(nextSession);
    setSession(nextSession);
    setAuthState("authenticated");
  }, []);

  const refreshCurrentUser = useCallback(async () => {
    if (!session) return null;
    const response = await api.get<ApiResponse<User>>("/users/me/").then(r => r.data);
    updateSessionUser(response.data);
    setSession((current) => (current ? { ...current, user: response.data } : current));
    return response.data;
  }, [session]);

  useEffect(() => {
    if (!session) {
      setAuthState("anonymous");
      return;
    }

    if (authState !== "checking") {
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const me = await api.get<ApiResponse<User>>("/users/me/").then(r => r.data);
        if (cancelled) return;
        updateSessionUser(me.data);
        setSession((current) => (current ? { ...current, user: me.data } : current));
        setAuthState("authenticated");
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiAuthError) {
          clearSession();
          setSession(null);
          setData(emptyData);
          setAuthState("anonymous");
          return;
        }
        setError(apiErrorMessage(err));
        setAuthState("anonymous");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [session, authState]);

  const loadData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const me = await api.get<ApiResponse<User>>("/users/me/").then(r => r.data);
      const [
        dashboard,
        couple,
        coupleDashboard,
        wallet,
        salaries,
        categories,
        transactions,
        goals,
        debts,
        fixedExpenses,
        badges,
        xpHistory,
        ranking,
      ] = await Promise.all([
        api.get<ApiResponse<Dashboard>>("/dashboard/").then(r => r.data),
        api.get<ApiResponse<CoupleGroup | Record<string, never>>>("/couples/").then(r => r.data),
        api.get<ApiResponse<AppData["coupleDashboard"]>>("/dashboard/couple/").then(r => r.data),
        api.get<ApiResponse<Wallet>>("/wallet/").then(r => r.data),
        api.get<ApiResponse<Salary[]>>("/wallet/salary/").then(r => r.data),
        api.get<ApiResponse<Category[]>>("/categories/").then(r => r.data),
        api.get<ApiResponse<Transaction[]>>("/transactions/").then(r => r.data),
        api.get<ApiResponse<Goal[]>>("/goals/").then(r => r.data),
        api.get<ApiResponse<Debt[]>>("/debts/").then(r => r.data),
        api.get<ApiResponse<FixedExpense[]>>("/fixed-expenses/").then(r => r.data),
        api.get<ApiResponse<BadgeAward[]>>("/gamification/badges/").then(r => r.data),
        api.get<ApiResponse<XPHistory[]>>("/gamification/xp/").then(r => r.data),
        api.get<ApiResponse<RankingItem[]>>("/gamification/ranking/").then(r => r.data),
      ]);

      const group = isCoupleGroup(couple.data) ? couple.data : null;
      updateSessionUser(me.data);
      setSession((current) => (current ? { ...current, user: me.data } : current));
      setData({
        me: me.data,
        dashboard: dashboard.data,
        couple: group,
        coupleDashboard: coupleDashboard.data,
        wallet: wallet.data,
        salaries: salaries.data,
        categories: categories.data,
        transactions: transactions.data,
        goals: goals.data,
        debts: debts.data,
        fixedExpenses: fixedExpenses.data,
        badges: badges.data,
        xpHistory: xpHistory.data,
        ranking: ranking.data,
      });
    } catch (err) {
      if (err instanceof ApiAuthError) {
        clearSession();
        setSession(null);
        setData(emptyData);
        return;
      }
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (authState !== "authenticated") return;
    void loadData();
  }, [authState, loadData]);

  const title = useMemo(() => navigation.find((item) => item.id === page)?.label ?? "Dashboard", [page]);

  if (!session) {
    return (
      <AuthScreen
        onAuth={handleAuth}
      />
    );
  }

  if (authState === "checking") {
    return (
      <main className="grid min-h-screen place-items-center bg-background px-4 py-10 text-slate-100">
        <Card className="w-full max-w-md p-6">
          <p className="text-sm text-slate-300">Validando a conta...</p>
        </Card>
      </main>
    );
  }

  const displayName = coupleDisplayName(session.user, data.couple);

  function logout() {
    clearSession();
    setSession(null);
    setData(emptyData);
    setMobileMenuOpen(false);
  }

  return (
    <div className="min-h-screen bg-background text-slate-100">
      {mobileMenuOpen && <button type="button" aria-label="Fechar menu" className="fixed inset-0 z-20 bg-black/50 lg:hidden" onClick={() => setMobileMenuOpen(false)} />}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 w-72 border-r border-white/10 bg-surface/95 p-5 transition-transform duration-200 lg:w-64 lg:translate-x-0",
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-md bg-primary">
            <WalletIcon className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="truncate font-semibold text-white">Finance Couple</p>
            <p className="truncate text-xs text-slate-400">{data.wallet?.name ?? "Carteira"}</p>
          </div>
        </div>
        <nav className="mt-8 space-y-1" aria-label="Principal">
          {navigation.map((item) => (
            <button
              key={item.id}
              type="button"
              className={cn(
                "focus-ring flex h-11 w-full items-center gap-3 rounded-md px-3 text-left text-sm transition",
                page === item.id ? "bg-white/10 text-white" : "text-slate-400 hover:bg-white/5 hover:text-white",
              )}
              onClick={() => {
                setPage(item.id);
                setMobileMenuOpen(false);
              }}
            >
              <item.icon className="h-4 w-4" aria-hidden="true" />
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      <main className="lg:pl-64">
        <header className="sticky top-0 z-10 border-b border-white/10 bg-background/90 px-4 py-4 backdrop-blur md:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <Button type="button" variant="ghost" className="h-10 w-10 p-0 lg:hidden" aria-label="Abrir menu" onClick={() => setMobileMenuOpen(true)}>
                <Menu className="h-5 w-5" />
              </Button>
              <div className="min-w-0">
                <p className="truncate text-sm text-slate-400">{displayName}</p>
                <h1 className="truncate text-xl font-semibold text-white md:text-2xl">{title}</h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" variant="secondary" className="hidden md:inline-flex" onClick={() => setPage("couple")}>
                <Link2 className="h-4 w-4" aria-hidden="true" />
                Vincular parceiro
              </Button>
              <Button type="button" variant="ghost" className="h-10 w-10 p-0" aria-label="Notificacoes">
                <Bell className="h-5 w-5" />
              </Button>
              <Button type="button" variant="ghost" className="h-10 w-10 p-0" aria-label="Sair" onClick={logout}>
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-7xl px-4 py-5 md:px-6 lg:px-8">
          {loading && <p className="mb-4 rounded-md bg-white/[0.04] p-3 text-sm text-slate-300">Carregando dados...</p>}
          {error && <p className="mb-4 rounded-md bg-pink-500/10 p-3 text-sm text-pink-200">{error}</p>}
          {page === "dashboard" && <DashboardPage data={data} setPage={setPage} mode={dashboardMode} setMode={setDashboardMode} />}
          {page === "wallet" && <WalletPage token={token} data={data} refresh={loadData} />}
          {page === "transactions" && <TransactionsPage token={token} data={data} refresh={loadData} />}
          {page === "categories" && <CategoriesPage token={token} data={data} refresh={loadData} />}
          {page === "goals" && <GoalsPage token={token} data={data} refresh={loadData} />}
          {page === "debts" && <DebtsPage token={token} data={data} refresh={loadData} />}
          {page === "fixed" && <FixedExpensesPage token={token} data={data} refresh={loadData} />}
          {page === "couple" && <CouplePage token={token} data={data} refresh={loadData} user={session.user} />}
          {page === "achievements" && <AchievementsPage data={data} user={session.user} />}
          {page === "profile" && <ProfilePage token={token} data={data} refresh={loadData} user={session.user} onUserChange={(updated) => setSession((current) => (current ? { ...current, user: updated } : current))} />}
          {page === "social" && <SocialPage token={token} user={session.user} />}
        </div>
      </main>
    </div>
  );
}
