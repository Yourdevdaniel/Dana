import { FormEvent, cloneElement, useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import type { ReactElement, ReactNode } from "react";
import {
  AlertTriangle,
  BadgeCheck,
  Banknote,
  Bell,
  CalendarCheck,
  Camera,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  CreditCard,
  HandCoins,
  HelpCircle,
  Landmark,
  LayoutDashboard,
  Link2,
  LineChart,
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
  Send,
  UserRoundPlus,
  UserRoundSearch,
  UserCircle2,
  Users,
  Trash2,
  Upload,
  Wallet as WalletIcon,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
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

type Page = "dashboard" | "wallet" | "transactions" | "categories" | "goals" | "investments" | "debts" | "fixed" | "couple" | "achievements" | "profile" | "social" | "friends";
type DashboardMode = "solo" | "couple";
type InvestmentAssetType = "renda_fixa" | "acoes" | "fundos" | "cripto" | "exterior" | "outros";

type ProfilePrivacySettings = {
  showGroupOnProfile: boolean;
  showMembershipOnOtherProfiles: boolean;
};

type LocalFriend = {
  id: string;
  name: string;
  avatar: string | null;
  total_xp: number;
  status: "pending" | "accepted";
  created_at: string;
};

type ScheduledNudge = {
  id: string;
  to_user_id: string;
  to_name: string;
  message: string;
  deliver_at: string;
  created_at: string;
};

type CreditCardAccount = {
  id: string;
  nickname: string;
  current_debt: string;
  limit_amount: string;
  interest_rate: string;
  closing_day: number;
  due_day: number;
  created_at: string;
};

type Investment = {
  id: string;
  name: string;
  type: InvestmentAssetType;
  institution: string;
  invested_amount: string;
  current_amount: string;
  monthly_contribution: string;
  purchase_date: string;
};

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
  investments: Investment[];
  debts: Debt[];
  fixedExpenses: FixedExpense[];
  creditCards: CreditCardAccount[];
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
  investments: [],
  debts: [],
  fixedExpenses: [],
  creditCards: [],
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
  { id: "investments", label: "Investimentos", icon: LineChart },
  { id: "debts", label: "Dívidas", icon: HandCoins },
  { id: "fixed", label: "Contas fixas", icon: CalendarCheck },
  { id: "couple", label: "Casal", icon: Link2 },
  { id: "achievements", label: "Conquistas", icon: Trophy },
  { id: "profile", label: "Perfil", icon: UserCircle2 },
  { id: "social", label: "Rede", icon: UserRoundSearch },
  { id: "friends", label: "Amizades", icon: Users },
] satisfies Array<{ id: Page; label: string; icon: typeof LayoutDashboard }>;

const navigationSections = [
  { id: "overview", label: "Visão geral", pages: ["dashboard", "wallet"] },
  { id: "money", label: "Movimentações", pages: ["transactions", "categories", "fixed"] },
  { id: "plans", label: "Planos", pages: ["goals", "investments", "debts"] },
  { id: "people", label: "Social", pages: ["couple", "achievements", "profile", "social", "friends"] },
] satisfies Array<{ id: string; label: string; pages: Page[] }>;

const pageHelp: Record<Page, { title: string; body: string; terms: string[] }> = {
  dashboard: {
    title: "Dashboard",
    body: "Mostra um resumo da sua vida financeira: saldo, patrimônio, gastos, reserva recomendada, metas, dívidas e movimentações recentes.",
    terms: ["Saldo: dinheiro disponível agora.", "Patrimônio: o que você tem menos o que deve.", "Reserva ideal: valor sugerido para emergências."],
  },
  wallet: {
    title: "Carteira",
    body: "Centraliza seu dinheiro. Registre salário ou ajuste o saldo real quando a carteira estiver diferente do valor mostrado.",
    terms: ["Salário: renda recorrente registrada no histórico.", "Ajuste de saldo: correção criada como entrada ou saída para bater com o valor real."],
  },
  transactions: {
    title: "Transações",
    body: "Registre entradas e saídas do dia a dia. Essas movimentações alimentam saldo, gráficos e dashboard.",
    terms: ["Receita: dinheiro que entra.", "Despesa: dinheiro que sai.", "Recorrente: algo que costuma se repetir."],
  },
  categories: {
    title: "Categorias",
    body: "Organize transações por assunto, como mercado, transporte, salário ou lazer.",
    terms: ["Sistema: categoria padrão do app.", "Personalizada: categoria criada por você."],
  },
  goals: {
    title: "Metas",
    body: "Acompanhe objetivos financeiros e registre depósitos para ver o progresso até o valor alvo.",
    terms: ["Valor alvo: quanto você quer juntar.", "Valor atual: quanto já foi separado."],
  },
  investments: {
    title: "Investimentos",
    body: "Cadastre onde seu dinheiro está investido e acompanhe total investido, valor atual, resultado e divisão por classe.",
    terms: ["Valor investido: quanto você colocou.", "Valor atual: quanto vale hoje.", "Aporte mensal: quanto pretende adicionar por mês."],
  },
  debts: {
    title: "Dívidas",
    body: "Registre valores que precisa pagar, acompanhe o restante e marque como paga quando quitar.",
    terms: ["Valor pago: quanto já foi abatido.", "Restante: quanto ainda falta pagar."],
  },
  fixed: {
    title: "Contas fixas",
    body: "Cadastre despesas que voltam todo mês, como aluguel, internet ou assinatura, e marque quando forem pagas.",
    terms: ["Dia de vencimento: dia do mês em que a conta vence.", "Pago: conta já resolvida no mês."],
  },
  couple: {
    title: "Casal",
    body: "Crie ou entre em um grupo para acompanhar informações financeiras junto com outra pessoa.",
    terms: ["Código de convite: código para outra pessoa entrar no grupo.", "Integrantes: pessoas vinculadas ao casal ou grupo."],
  },
  achievements: {
    title: "Conquistas",
    body: "Mostra objetivos desbloqueados pelo uso do app e badges recebidas pelo seu progresso.",
    terms: ["Conquistadas: já completas.", "Em andamento: ainda faltam passos.", "Badges: recompensas visuais do perfil."],
  },
  profile: {
    title: "Perfil",
    body: "Edite seus dados, foto, destaques do perfil e configurações da conta.",
    terms: ["Destaques: badges ou conquistas exibidas no perfil.", "XP: pontos ganhos por progresso no app."],
  },
  social: {
    title: "Ranking global",
    body: "Mostra os usuários com mais XP total e sua posição quando você aparece no top 10.",
    terms: ["XP total: soma dos pontos ganhos.", "Ranking: lista ordenada do maior XP para o menor."],
  },
  friends: {
    title: "Amizades",
    body: "Veja amigos, pedidos enviados e envie pequenos incentivos para ajudar alguém a continuar.",
    terms: ["Pedido pendente: convite enviado e ainda não aceito.", "Incentivo: mensagem curta enviada agora ou agendada para depois."],
  },
};

const monthFormatter = new Intl.DateTimeFormat("pt-BR", { month: "short" });

function toNumber(value: string | number | null | undefined) {
  return Number(value ?? 0);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function daysUntilDate(date: string | null | undefined) {
  if (!date) return null;
  const target = new Date(`${date}T00:00:00`);
  const now = new Date();
  const todayOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.ceil((target.getTime() - todayOnly.getTime()) / 86400000);
}

function daysUntilMonthDay(day: number) {
  const now = new Date();
  const todayOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const clampedDay = Math.max(1, Math.min(31, day));
  let target = new Date(now.getFullYear(), now.getMonth(), clampedDay);
  if (target < todayOnly) {
    target = new Date(now.getFullYear(), now.getMonth() + 1, clampedDay);
  }
  return Math.ceil((target.getTime() - todayOnly.getTime()) / 86400000);
}

const quickCategories = [
  { name: "Salário", type: "income", icon: "briefcase", color: "#16A34A" },
  { name: "Depósito", type: "income", icon: "wallet", color: "#0D9488" },
  { name: "Assinatura", type: "expense", icon: "repeat", color: "#8B5CF6" },
  { name: "Entretenimento", type: "expense", icon: "film", color: "#F97316" },
  { name: "Mercado", type: "expense", icon: "shopping-cart", color: "#EC4899" },
  { name: "Transporte", type: "expense", icon: "car", color: "#2563EB" },
] satisfies Array<{ name: string; type: "income" | "expense"; icon: string; color: string }>;

const categoryIconOptions = [
  { value: "tag", label: "Geral" },
  { value: "briefcase", label: "Trabalho e salário" },
  { value: "wallet", label: "Carteira e depósito" },
  { value: "shopping-cart", label: "Mercado e compras" },
  { value: "receipt", label: "Contas e boletos" },
  { value: "home", label: "Casa e moradia" },
  { value: "car", label: "Transporte" },
  { value: "utensils", label: "Alimentação" },
  { value: "heart-pulse", label: "Saúde" },
  { value: "book-open", label: "Educação" },
  { value: "film", label: "Lazer e entretenimento" },
  { value: "repeat", label: "Assinaturas" },
  { value: "plane", label: "Viagens" },
  { value: "gift", label: "Presentes" },
] satisfies Array<{ value: string; label: string }>;

function categoryIconLabel(icon: string) {
  return categoryIconOptions.find((option) => option.value === icon)?.label ?? "Geral";
}

const investmentTypeLabels: Record<InvestmentAssetType, string> = {
  renda_fixa: "Renda fixa",
  acoes: "Ações",
  fundos: "Fundos",
  cripto: "Cripto",
  exterior: "Exterior",
  outros: "Outros",
};

const investmentColors = ["#14B8A6", "#F59E0B", "#38BDF8", "#F43F5E", "#A3E635", "#C084FC"];

function investmentStorageKey(userId: string) {
  return `finance-couple:investments:${userId}`;
}

function readInvestments(userId: string): Investment[] {
  const raw = localStorage.getItem(investmentStorageKey(userId));
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as Investment[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveInvestments(userId: string, investments: Investment[]) {
  localStorage.setItem(investmentStorageKey(userId), JSON.stringify(investments));
}

function coupleAvatarStorageKey(coupleId: string) {
  return `finance-couple:couple-avatar:${coupleId}`;
}

function coupleNameStorageKey(coupleId: string) {
  return `finance-couple:couple-name:${coupleId}`;
}

async function deleteAndRefresh(path: string, refresh: () => Promise<void>, onError: (message: string) => void) {
  onError("");
  try {
    await api.delete(path);
    await refresh();
  } catch (err) {
    onError(apiErrorMessage(err));
  }
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
        "focus-ring h-11 w-full rounded-md border border-white/10 bg-surface px-3 text-sm text-white [color-scheme:dark] [&>option]:bg-surface [&>option]:text-white",
        props.className,
      )}
    />
  );
}

function PageHelp({ page }: { page: Page }) {
  const [open, setOpen] = useState(false);
  const help = pageHelp[page];

  return (
    <div className="relative">
      <Button
        type="button"
        variant="secondary"
        className="h-10 border border-secondary/40 bg-secondary/15 px-3 text-secondary hover:bg-secondary/25 hover:text-white"
        aria-label="Ajuda da página"
        onClick={() => setOpen((current) => !current)}
      >
        <HelpCircle className="h-5 w-5" aria-hidden="true" />
        <span className="hidden sm:inline">Está com dúvida?</span>
      </Button>
      {open && (
        <div className="absolute right-0 top-12 z-30 w-[min(22rem,calc(100vw-2rem))] rounded-md border border-white/10 bg-surface p-4 text-left shadow-soft">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-white">{help.title}</h2>
              <p className="mt-2 text-sm leading-5 text-slate-300">{help.body}</p>
            </div>
            <Button type="button" variant="ghost" className="h-8 px-2" onClick={() => setOpen(false)}>
              Fechar
            </Button>
          </div>
          <div className="mt-3 grid gap-2">
            {help.terms.map((term) => (
              <p key={term} className="rounded-md bg-white/[0.04] px-3 py-2 text-xs leading-5 text-slate-400">
                {term}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function formatCurrencyInput(value: string) {
  if (!value) return "";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(toNumber(value));
}

function currencyInputToDecimal(value: string) {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  return (Number(digits) / 100).toFixed(2);
}

function MoneyInput({
  value,
  onValueChange,
  ...props
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type"> & {
  value: string;
  onValueChange: (value: string) => void;
}) {
  return (
    <Input
      {...props}
      inputMode="numeric"
      value={formatCurrencyInput(value)}
      onChange={(event) => onValueChange(currencyInputToDecimal(event.target.value))}
      placeholder={props.placeholder ?? "R$ 0,00"}
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
    { label: "Patrimônio", value: dashboard?.net_worth, icon: Banknote, tone: "text-sky-300" },
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
            Registrar transação
          </Button>
          <Button className="w-full sm:w-auto" variant="secondary" onClick={() => setPage("couple")}>
            <Link2 className="h-4 w-4" aria-hidden="true" />
            Vincular parceiro
          </Button>
        </div>
      </Card>

      {mode === "solo" ? (
        <>
          <DeadlineAlerts data={data} />
          <MetricGrid dashboard={data.dashboard} />
          <section className="grid gap-6 xl:grid-cols-[1fr_380px]">
            <CashflowChart dashboard={data.dashboard} />
            <div className="grid gap-6">
              <RecentTransactions transactions={data.transactions} />
              <GoalsSummary goals={data.goals} />
              <DebtsSummary debts={data.debts} setPage={setPage} />
              <CreditCardSummary cards={data.creditCards} setPage={setPage} />
            </div>
          </section>
        </>
      ) : (
        <>
          <DeadlineAlerts data={data} />
          <MetricGrid dashboard={activeDashboard} />
          <section className="grid gap-6 xl:grid-cols-[1fr_380px]">
            <CoupleSummaryPanel items={data.coupleDashboard} />
            <div className="grid gap-6">
              <RecentTransactions transactions={data.transactions} />
              <GoalsSummary goals={data.goals} />
              <DebtsSummary debts={data.debts} setPage={setPage} />
              <CreditCardSummary cards={data.creditCards} setPage={setPage} />
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
        <EmptyState title="Nenhuma transação cadastrada." />
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

function DebtsSummary({ debts, setPage }: { debts: Debt[]; setPage: (page: Page) => void }) {
  const totalRemaining = debts.reduce((sum, debt) => sum + toNumber(debt.remaining), 0);
  const openDebts = debts.filter((debt) => debt.status !== "paid" && toNumber(debt.remaining) > 0);

  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">Suas dívidas</h2>
          <p className="text-sm text-slate-400">{formatCurrency(totalRemaining)} em aberto</p>
        </div>
        <Button type="button" variant="ghost" className="h-9 px-3" onClick={() => setPage("debts")}>
          Ver
        </Button>
      </div>
      {openDebts.length ? (
        <div className="space-y-3">
          {openDebts.slice(0, 3).map((debt) => (
            <div key={debt.id} className="rounded-md bg-white/[0.04] p-3">
              <div className="flex justify-between gap-3 text-sm">
                <p className="truncate font-medium text-white">{debt.creditor}</p>
                <strong className="text-pink-200">{formatCurrency(toNumber(debt.remaining))}</strong>
              </div>
              <p className="mt-1 text-xs text-slate-400">
                {debt.due_date ? `Vence em ${debt.due_date}` : "Sem vencimento"}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState title="Nenhuma dívida em aberto." />
      )}
    </Card>
  );
}

function DeadlineAlerts({ data }: { data: AppData }) {
  const balance = toNumber(data.wallet?.balance);
  const upcomingDebts = data.debts
    .filter((debt) => debt.status !== "paid" && toNumber(debt.remaining) > 0)
    .map((debt) => ({ debt, days: daysUntilDate(debt.due_date) }))
    .filter((item): item is { debt: Debt; days: number } => item.days !== null && item.days >= 0 && item.days <= 7);
  const upcomingFixed = data.fixedExpenses
    .filter((item) => !item.is_paid_this_month)
    .map((item) => ({ item, days: daysUntilMonthDay(item.due_day) }))
    .filter((entry) => entry.days <= 7);
  const upcomingCards = data.creditCards
    .map((card) => ({ card, dueDays: daysUntilMonthDay(card.due_day), closeDays: daysUntilMonthDay(card.closing_day) }))
    .filter((entry) => toNumber(entry.card.current_debt) > 0 && (entry.dueDays <= 7 || entry.closeDays <= 7));
  const totalUpcoming = upcomingDebts.reduce((sum, item) => sum + toNumber(item.debt.remaining), 0)
    + upcomingFixed.reduce((sum, item) => sum + toNumber(item.item.amount), 0)
    + upcomingCards.reduce((sum, item) => sum + toNumber(item.card.current_debt), 0);

  if (!upcomingDebts.length && !upcomingFixed.length && !upcomingCards.length) return null;

  return (
    <Card className="border-amber-400/30 bg-amber-400/10 p-5">
      <div className="mb-4 flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" aria-hidden="true" />
        <div>
          <h2 className="text-lg font-semibold text-white">Atenção aos próximos pagamentos</h2>
          <p className="text-sm text-amber-100">
            Existem cobranças próximas. Total aproximado: {formatCurrency(totalUpcoming)}. Seu saldo atual {balance >= totalUpcoming ? "cobre" : "não cobre"} esse valor.
          </p>
        </div>
      </div>
      <div className="grid gap-3 lg:grid-cols-3">
        {upcomingDebts.map(({ debt, days }) => (
          <div key={debt.id} className="rounded-md bg-black/15 p-3">
            <p className="text-sm font-medium text-white">{debt.creditor}</p>
            <p className="text-xs text-amber-100">Dívida vence em {days} dia(s): {formatCurrency(toNumber(debt.remaining))}</p>
          </div>
        ))}
        {upcomingFixed.map(({ item, days }) => (
          <div key={item.id} className="rounded-md bg-black/15 p-3">
            <p className="text-sm font-medium text-white">{item.name}</p>
            <p className="text-xs text-amber-100">Conta fixa vence em {days} dia(s): {formatCurrency(toNumber(item.amount))}</p>
          </div>
        ))}
        {upcomingCards.map(({ card, dueDays, closeDays }) => (
          <div key={card.id} className="rounded-md bg-black/15 p-3">
            <p className="text-sm font-medium text-white">{card.nickname}</p>
            <p className="text-xs text-amber-100">
              Fecha em {closeDays} dia(s), vence em {dueDays} dia(s). Fatura: {formatCurrency(toNumber(card.current_debt))}
            </p>
          </div>
        ))}
      </div>
    </Card>
  );
}

function CreditCardSummary({ cards, setPage }: { cards: CreditCardAccount[]; setPage: (page: Page) => void }) {
  const totalDebt = cards.reduce((sum, card) => sum + toNumber(card.current_debt), 0);
  const totalLimit = cards.reduce((sum, card) => sum + toNumber(card.limit_amount), 0);
  const usage = totalLimit > 0 ? (totalDebt / totalLimit) * 100 : 0;
  const highUsage = usage >= 80;

  return (
    <Card className={cn("p-5", highUsage && "border-pink-400/30 bg-pink-400/10")}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">Cartão de crédito</h2>
          <p className="text-sm text-slate-400">{formatCurrency(totalDebt)} em faturas</p>
        </div>
        <Button type="button" variant="ghost" className="h-9 px-3" onClick={() => setPage("debts")}>Ver</Button>
      </div>
      {cards.length ? (
        <div className="space-y-3">
          <Progress value={Math.min(100, usage)} />
          <p className={cn("text-xs", highUsage ? "text-pink-100" : "text-slate-400")}>
            Uso do limite: {usage.toFixed(0)}%. Evite informar número, CVV ou senha do cartão. O app nunca pede esses dados.
          </p>
          {cards.slice(0, 2).map((card) => (
            <div key={card.id} className="rounded-md bg-white/[0.04] p-3 text-sm">
              <p className="font-medium text-white">{card.nickname}</p>
              <p className="text-xs text-slate-400">Fecha dia {card.closing_day}, vence dia {card.due_day}</p>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState title="Nenhum cartão cadastrado." />
      )}
    </Card>
  );
}

type FormProps = {
  data: AppData;
  refresh: () => Promise<void>;
};

function WalletPage({ data, refresh }: FormProps) {
  const [walletEntryMode, setWalletEntryMode] = useState<"salary" | "balance">("salary");
  const [salary, setSalary] = useState("");
  const [targetBalance, setTargetBalance] = useState("");
  const [date, setDate] = useState(today());
  const [note, setNote] = useState("");
  const [editingSalaryId, setEditingSalaryId] = useState<string | null>(null);
  const [salaryEdit, setSalaryEdit] = useState({ amount: "", effective_date: today(), note: "" });
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

  function startEditSalary(item: Salary) {
    setEditingSalaryId(item.id);
    setSalaryEdit({ amount: item.amount, effective_date: item.effective_date, note: item.note });
    setError("");
  }

  async function updateSalary(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingSalaryId) return;
    setError("");
    try {
      await api.patch(`/wallet/salary/${editingSalaryId}/`, salaryEdit);
      setEditingSalaryId(null);
      setSalaryEdit({ amount: "", effective_date: today(), note: "" });
      await refresh();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  async function deleteSalary(item: Salary) {
    setError("");
    try {
      await api.delete(`/wallet/salary/${item.id}/`);
      if (editingSalaryId === item.id) {
        setEditingSalaryId(null);
        setSalaryEdit({ amount: "", effective_date: today(), note: "" });
      }
      await refresh();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  async function adjustBalance(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!data.wallet) {
      setError("A carteira ainda não foi criada.");
      return;
    }
    const desired = toNumber(targetBalance);
    const current = toNumber(data.wallet.balance);
    const delta = desired - current;
    if (!targetBalance || delta === 0) {
      setError("Informe um saldo diferente do saldo atual.");
      return;
    }
    setError("");
    try {
      await api.post("/transactions/", {
        amount: Math.abs(delta).toFixed(2),
        type: delta > 0 ? "income" : "expense",
        description: "Ajuste de saldo",
        date: today(),
        is_recurring: false,
        category: null,
        wallet: data.wallet.id,
      });
      setTargetBalance("");
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
        <h3 className="mt-8 text-base font-semibold text-white">Salários registrados</h3>
        <div className="mt-3 space-y-2">
          {data.salaries.length ? data.salaries.map((item) => (
            editingSalaryId === item.id ? (
              <form key={item.id} className="grid gap-3 rounded-md bg-white/[0.04] p-3" onSubmit={updateSalary}>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Field label="Valor">
                    <MoneyInput value={salaryEdit.amount} onValueChange={(value) => setSalaryEdit({ ...salaryEdit, amount: value })} required />
                  </Field>
                  <Field label="Data">
                    <Input value={salaryEdit.effective_date} onChange={(event) => setSalaryEdit({ ...salaryEdit, effective_date: event.target.value })} type="date" required />
                  </Field>
                  <Field label="Observação">
                    <Input value={salaryEdit.note} onChange={(event) => setSalaryEdit({ ...salaryEdit, note: event.target.value })} />
                  </Field>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="submit" className="h-9 px-3">Salvar</Button>
                  <Button type="button" variant="ghost" className="h-9 px-3" onClick={() => setEditingSalaryId(null)}>Cancelar</Button>
                </div>
              </form>
            ) : (
              <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-white/[0.04] p-3 text-sm">
                <div className="min-w-0">
                  <p className="font-medium text-white">{formatCurrency(toNumber(item.amount))}</p>
                  <p className="truncate text-xs text-slate-400">{item.effective_date} {item.note && `- ${item.note}`}</p>
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="secondary" className="h-9 px-3" onClick={() => startEditSalary(item)}>Editar</Button>
                  <Button type="button" variant="ghost" className="h-9 px-3 text-pink-200" onClick={() => void deleteSalary(item)}>Apagar</Button>
                </div>
              </div>
            )
          )) : <EmptyState title="Nenhum salário cadastrado." />}
        </div>
      </Card>
      <Card className="p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-white">Entrada da carteira</h2>
        </div>
        <div className="mb-4 grid grid-cols-2 gap-2 rounded-md border border-white/10 bg-white/[0.04] p-1">
          <Button type="button" variant={walletEntryMode === "salary" ? "primary" : "ghost"} className="h-9 px-3" onClick={() => setWalletEntryMode("salary")}>
            Salário
          </Button>
          <Button type="button" variant={walletEntryMode === "balance" ? "primary" : "ghost"} className="h-9 px-3" onClick={() => setWalletEntryMode("balance")}>
            Ajustar saldo
          </Button>
        </div>
        {walletEntryMode === "salary" ? (
          <form className="grid gap-3" onSubmit={submitSalary}>
            <Field label="Valor"><MoneyInput value={salary} onValueChange={setSalary} required /></Field>
            <Field label="Data efetiva"><Input value={date} onChange={(event) => setDate(event.target.value)} type="date" required /></Field>
            <Field label="Observação"><Input value={note} onChange={(event) => setNote(event.target.value)} /></Field>
            {error && <p className="text-sm text-pink-200">{error}</p>}
            <Button type="submit">Salvar salário</Button>
          </form>
        ) : (
          <form className="grid gap-3" onSubmit={adjustBalance}>
            <Field label="Saldo real da carteira">
              <MoneyInput value={targetBalance} onValueChange={setTargetBalance} required />
            </Field>
            <p className="text-xs text-slate-400">
              Cria uma transação de ajuste para o saldo bater com o valor informado.
            </p>
            {error && <p className="text-sm text-pink-200">{error}</p>}
            <Button type="submit">Ajustar saldo</Button>
          </form>
        )}
      </Card>
    </div>
  );
}

function TransactionsPage({ data, refresh }: FormProps) {
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

  async function removeTransaction(transaction: Transaction) {
    await deleteAndRefresh(`/transactions/${transaction.id}/`, refresh, setError);
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
        <Field label="Valor"><MoneyInput value={form.amount} onValueChange={(value) => setForm({ ...form, amount: value })} required /></Field>
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
        <Button type="submit">Salvar transação</Button>
      </form>
      <DataList items={data.transactions} empty="Nenhuma transação cadastrada." render={(item) => (
        <div key={item.id} className="flex items-center justify-between gap-3 rounded-md bg-white/[0.04] p-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-white">{item.description || item.category_detail?.name || item.type}</p>
            <p className="truncate text-xs text-slate-400">{item.date} - {item.category_detail?.name ?? "Sem categoria"}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <strong className="text-sm text-white">{item.type === "expense" ? "-" : ""}{formatCurrency(toNumber(item.amount))}</strong>
            <Button type="button" variant="ghost" className="h-9 w-9 p-0" aria-label="Apagar transação" onClick={() => removeTransaction(item)}>
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      )} />
    </ResourcePage>
  );
}

function CategoriesPage({ data, refresh }: FormProps) {
  const [form, setForm] = useState({ name: "", type: "expense", icon: "tag", color: "#7C3AED" });
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    try {
      await api.post("/categories/", form);
      setForm({ name: "", type: "expense", icon: "tag", color: "#7C3AED" });
      await refresh();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  async function removeCategory(category: Category) {
    if (category.is_system) return;
    await deleteAndRefresh(`/categories/${category.id}/`, refresh, setError);
  }

  async function createQuickCategory(category: (typeof quickCategories)[number]) {
    setError("");
    try {
      await api.post("/categories/", category);
      await refresh();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  return (
    <ResourcePage title="Categorias" formTitle="Nova categoria">
      <form className="grid gap-3" onSubmit={submit}>
        <div className="grid gap-2">
          <p className="text-sm text-slate-300">Categorias rápidas</p>
          <div className="grid grid-cols-2 gap-2">
            {quickCategories.map((category) => (
              <Button
                key={`${category.type}-${category.name}`}
                type="button"
                variant="secondary"
                className="h-auto justify-start px-3 py-2 text-left"
                onClick={() => void createQuickCategory(category)}
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                {category.name}
              </Button>
            ))}
          </div>
        </div>
        <Field label="Nome"><Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></Field>
        <Field label="Tipo">
          <NativeSelect value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })}>
            <option value="expense">Despesa</option>
            <option value="income">Receita</option>
          </NativeSelect>
        </Field>
        <Field label="Ícone">
          <NativeSelect value={form.icon} onChange={(event) => setForm({ ...form, icon: event.target.value })}>
            {categoryIconOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </NativeSelect>
        </Field>
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
          <div className="flex shrink-0 items-center gap-2">
            <span className="text-sm text-slate-300">{categoryIconLabel(category.icon)}</span>
            {!category.is_system && (
              <Button type="button" variant="ghost" className="h-9 w-9 p-0" aria-label="Apagar categoria" onClick={() => removeCategory(category)}>
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </Button>
            )}
          </div>
        </div>
      )} />
    </ResourcePage>
  );
}

function GoalsPage({ data, refresh }: FormProps) {
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

  async function removeGoal(goal: Goal) {
    await deleteAndRefresh(`/goals/${goal.id}/`, refresh, setError);
  }

  return (
    <ResourcePage title="Metas" formTitle="Nova meta">
      <form className="grid gap-3" onSubmit={submit}>
        <Field label="Nome"><Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></Field>
        <Field label="Valor alvo"><MoneyInput value={form.target_amount} onValueChange={(value) => setForm({ ...form, target_amount: value })} required /></Field>
        <Field label="Valor atual"><MoneyInput value={form.current_amount} onValueChange={(value) => setForm({ ...form, current_amount: value })} /></Field>
        <Field label="Prazo"><Input value={form.deadline} onChange={(event) => setForm({ ...form, deadline: event.target.value })} type="date" /></Field>
        {error && <p className="text-sm text-pink-200">{error}</p>}
        <Button type="submit">Salvar meta</Button>
      </form>
      <DataList items={data.goals} empty="Nenhuma meta cadastrada." render={(goal) => (
        <div key={goal.id} className="rounded-md bg-white/[0.04] p-3">
          <div className="flex justify-between gap-3 text-sm">
            <strong className="text-white">{goal.name}</strong>
            <div className="flex items-center gap-2">
              <span>{Math.round(goal.progress_percent)}%</span>
              <Button type="button" variant="ghost" className="h-8 w-8 p-0" aria-label="Apagar meta" onClick={() => removeGoal(goal)}>
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          </div>
          <Progress value={goal.progress_percent} />
          <p className="mt-2 text-xs text-slate-400">{formatCurrency(toNumber(goal.current_amount))} de {formatCurrency(toNumber(goal.target_amount))}</p>
          <div className="mt-3 flex gap-2">
            <MoneyInput value={deposit[goal.id] ?? ""} onValueChange={(value) => setDeposit({ ...deposit, [goal.id]: value })} placeholder="Depósito" />
            <Button type="button" variant="secondary" onClick={() => makeDeposit(goal)}>Adicionar</Button>
          </div>
        </div>
      )} />
    </ResourcePage>
  );
}

function InvestmentsPage({ data, user }: { data: AppData; user: User }) {
  const [items, setItems] = useState<Investment[]>(() => data.investments);
  const [form, setForm] = useState({
    name: "",
    type: "renda_fixa" as InvestmentAssetType,
    institution: "",
    invested_amount: "",
    current_amount: "",
    monthly_contribution: "0",
    purchase_date: today(),
  });
  const [error, setError] = useState("");

  useEffect(() => {
    setItems(data.investments);
  }, [data.investments]);

  function persist(nextItems: Investment[]) {
    setItems(nextItems);
    saveInvestments(user.id, nextItems);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const invested = toNumber(form.invested_amount);
    const current = toNumber(form.current_amount || form.invested_amount);
    const contribution = toNumber(form.monthly_contribution);

    if (invested <= 0 || current < 0 || contribution < 0) {
      setError("Informe valores válidos para o investimento.");
      return;
    }

    setError("");
    const next: Investment = {
      id: crypto.randomUUID(),
      ...form,
      current_amount: form.current_amount || form.invested_amount,
    };
    persist([next, ...items]);
    setForm({
      name: "",
      type: "renda_fixa",
      institution: "",
      invested_amount: "",
      current_amount: "",
      monthly_contribution: "0",
      purchase_date: today(),
    });
  }

  function removeInvestment(id: string) {
    persist(items.filter((item) => item.id !== id));
  }

  const totals = items.reduce(
    (acc, item) => {
      acc.invested += toNumber(item.invested_amount);
      acc.current += toNumber(item.current_amount);
      acc.monthly += toNumber(item.monthly_contribution);
      return acc;
    },
    { invested: 0, current: 0, monthly: 0 },
  );
  const result = totals.current - totals.invested;
  const profitability = totals.invested > 0 ? (result / totals.invested) * 100 : 0;

  const byType = Object.entries(
    items.reduce<Record<string, number>>((acc, item) => {
      const label = investmentTypeLabels[item.type];
      acc[label] = (acc[label] ?? 0) + toNumber(item.current_amount);
      return acc;
    }, {}),
  ).map(([name, value]) => ({ name, value }));

  const evolution = [...items]
    .sort((a, b) => a.purchase_date.localeCompare(b.purchase_date))
    .reduce<Array<{ date: string; aportado: number; atual: number }>>((acc, item) => {
      const previous = acc.at(-1) ?? { aportado: 0, atual: 0 };
      acc.push({
        date: new Date(`${item.purchase_date}T00:00:00`).toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }),
        aportado: previous.aportado + toNumber(item.invested_amount),
        atual: previous.atual + toNumber(item.current_amount),
      });
      return acc;
    }, []);

  return (
    <div className="grid gap-6">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="p-4">
          <p className="text-sm text-slate-400">Valor investido</p>
          <p className="mt-2 text-2xl font-semibold text-white">{formatCurrency(totals.invested)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-slate-400">Valor atual</p>
          <p className="mt-2 text-2xl font-semibold text-white">{formatCurrency(totals.current)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-slate-400">Resultado</p>
          <p className={cn("mt-2 text-2xl font-semibold", result >= 0 ? "text-emerald-300" : "text-pink-300")}>
            {formatCurrency(result)}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-slate-400">Aporte mensal</p>
          <p className="mt-2 text-2xl font-semibold text-white">{formatCurrency(totals.monthly)}</p>
          <p className="mt-1 text-xs text-slate-400">{profitability.toFixed(1)}% acumulado</p>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <Card className="min-h-[340px] p-5">
          <h2 className="text-lg font-semibold text-white">Evolução da carteira</h2>
          <p className="mb-5 text-sm text-slate-400">Compara o total aportado com o valor atual informado.</p>
          {evolution.length ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={evolution} margin={{ left: -18, right: 4, top: 8, bottom: 0 }}>
                  <defs>
                    <linearGradient id="investedValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#38BDF8" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#38BDF8" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="currentValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#14B8A6" stopOpacity={0.45} />
                      <stop offset="95%" stopColor="#14B8A6" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#334155" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" stroke="#94A3B8" tickLine={false} axisLine={false} />
                  <YAxis stroke="#94A3B8" tickLine={false} axisLine={false} tickFormatter={(value) => `${Number(value) / 1000}k`} />
                  <Tooltip
                    contentStyle={{ background: "#111827", border: "1px solid rgba(255,255,255,.12)", borderRadius: 8 }}
                    formatter={(value) => formatCurrency(Number(value))}
                  />
                  <Area type="monotone" dataKey="aportado" stroke="#38BDF8" fill="url(#investedValue)" strokeWidth={3} />
                  <Area type="monotone" dataKey="atual" stroke="#14B8A6" fill="url(#currentValue)" strokeWidth={3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState title="Cadastre investimentos para ver a evolução." />
          )}
        </Card>

        <Card className="p-5">
          <h2 className="text-lg font-semibold text-white">Distribuicao</h2>
          <p className="mb-5 text-sm text-slate-400">Peso por classe de ativo.</p>
          {byType.length ? (
            <div className="grid gap-4">
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={byType} dataKey="value" nameKey="name" innerRadius={46} outerRadius={76} paddingAngle={3}>
                      {byType.map((entry, index) => (
                        <Cell key={entry.name} fill={investmentColors[index % investmentColors.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: "#111827", border: "1px solid rgba(255,255,255,.12)", borderRadius: 8 }}
                      formatter={(value) => formatCurrency(Number(value))}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2">
                {byType.map((entry, index) => (
                  <div key={entry.name} className="flex items-center justify-between gap-3 text-sm">
                    <span className="flex min-w-0 items-center gap-2 text-slate-300">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: investmentColors[index % investmentColors.length] }} />
                      <span className="truncate">{entry.name}</span>
                    </span>
                    <strong className="text-white">{formatCurrency(entry.value)}</strong>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <EmptyState title="Nenhuma classe de ativo cadastrada." />
          )}
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card className="p-5">
          <h2 className="mb-4 text-lg font-semibold text-white">Ativos cadastrados</h2>
          <DataList
            items={items}
            empty="Nenhum investimento cadastrado."
            render={(item) => {
              const itemResult = toNumber(item.current_amount) - toNumber(item.invested_amount);
              return (
                <div key={item.id} className="grid gap-3 rounded-md bg-white/[0.04] p-3 sm:grid-cols-[1fr_auto] sm:items-center">
                  <div className="min-w-0">
                    <div className="flex min-w-0 items-center gap-2">
                      <Landmark className="h-4 w-4 shrink-0 text-teal-300" aria-hidden="true" />
                      <p className="truncate text-sm font-medium text-white">{item.name}</p>
                    </div>
                    <p className="mt-1 truncate text-xs text-slate-400">
                      {investmentTypeLabels[item.type]} - {item.institution || "Sem instituição"} - {item.purchase_date}
                    </p>
                    <p className={cn("mt-2 text-xs", itemResult >= 0 ? "text-emerald-300" : "text-pink-300")}>
                      Resultado: {formatCurrency(itemResult)}
                    </p>
                  </div>
                  <div className="flex items-center justify-between gap-3 sm:justify-end">
                    <div className="text-right">
                      <p className="text-sm font-semibold text-white">{formatCurrency(toNumber(item.current_amount))}</p>
                      <p className="text-xs text-slate-400">de {formatCurrency(toNumber(item.invested_amount))}</p>
                    </div>
                    <Button type="button" variant="ghost" className="h-10 w-10 p-0" aria-label={`Remover ${item.name}`} onClick={() => removeInvestment(item.id)}>
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </div>
                </div>
              );
            }}
          />
        </Card>

        <Card className="p-5">
          <h2 className="mb-4 text-lg font-semibold text-white">Novo investimento</h2>
          <form className="grid gap-3" onSubmit={submit}>
            <Field label="Nome do ativo"><Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></Field>
            <Field label="Classe">
              <NativeSelect value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value as InvestmentAssetType })}>
                {Object.entries(investmentTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </NativeSelect>
            </Field>
            <Field label="Instituicao"><Input value={form.institution} onChange={(event) => setForm({ ...form, institution: event.target.value })} /></Field>
            <Field label="Valor investido"><MoneyInput value={form.invested_amount} onValueChange={(value) => setForm({ ...form, invested_amount: value })} required /></Field>
            <Field label="Valor atual"><MoneyInput value={form.current_amount} onValueChange={(value) => setForm({ ...form, current_amount: value })} placeholder="Se vazio, usa o valor investido" /></Field>
            <Field label="Aporte mensal"><MoneyInput value={form.monthly_contribution} onValueChange={(value) => setForm({ ...form, monthly_contribution: value })} /></Field>
            <Field label="Data da compra"><Input value={form.purchase_date} onChange={(event) => setForm({ ...form, purchase_date: event.target.value })} type="date" required /></Field>
            {error && <p className="text-sm text-pink-200">{error}</p>}
            <Button type="submit">
              <Plus className="h-4 w-4" aria-hidden="true" />
              Salvar investimento
            </Button>
          </form>
        </Card>
      </section>

      <Card className="p-5">
        <h2 className="mb-4 text-lg font-semibold text-white">Valor por classe</h2>
        {byType.length ? (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byType} margin={{ left: -18, right: 4, top: 8, bottom: 0 }}>
                <CartesianGrid stroke="#334155" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" stroke="#94A3B8" tickLine={false} axisLine={false} />
                <YAxis stroke="#94A3B8" tickLine={false} axisLine={false} tickFormatter={(value) => `${Number(value) / 1000}k`} />
                <Tooltip
                  contentStyle={{ background: "#111827", border: "1px solid rgba(255,255,255,.12)", borderRadius: 8 }}
                  formatter={(value) => formatCurrency(Number(value))}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {byType.map((entry, index) => (
                    <Cell key={entry.name} fill={investmentColors[index % investmentColors.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyState title="Cadastre ativos para comparar classes." />
        )}
      </Card>
    </div>
  );
}

function DebtsPage({ data, refresh }: FormProps) {
  const [form, setForm] = useState({ creditor: "", amount: "", paid_amount: "0", due_date: "", description: "" });
  const [cardForm, setCardForm] = useState({ nickname: "", current_debt: "", limit_amount: "", interest_rate: "0", closing_day: "1", due_day: "10" });
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

  async function markDebtPaid(debt: Debt) {
    setError("");
    try {
      await api.patch(`/debts/${debt.id}/`, { paid_amount: debt.amount });
      await refresh();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  async function removeDebt(debt: Debt) {
    await deleteAndRefresh(`/debts/${debt.id}/`, refresh, setError);
  }

  async function submitCreditCard(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    try {
      await api.post("/credit-cards/", {
        ...cardForm,
        closing_day: Number(cardForm.closing_day),
        due_day: Number(cardForm.due_day),
      });
      setCardForm({ nickname: "", current_debt: "", limit_amount: "", interest_rate: "0", closing_day: "1", due_day: "10" });
      await refresh();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  async function removeCreditCard(card: CreditCardAccount) {
    await deleteAndRefresh(`/credit-cards/${card.id}/`, refresh, setError);
  }

  return (
    <div className="grid gap-6">
      <ResourcePage title="Dívidas" formTitle="Nova dívida">
        <form className="grid gap-3" onSubmit={submit}>
          <Field label="Credor"><Input value={form.creditor} onChange={(event) => setForm({ ...form, creditor: event.target.value })} required /></Field>
          <Field label="Valor"><MoneyInput value={form.amount} onValueChange={(value) => setForm({ ...form, amount: value })} required /></Field>
          <Field label="Valor pago"><MoneyInput value={form.paid_amount} onValueChange={(value) => setForm({ ...form, paid_amount: value })} /></Field>
          <Field label="Prazo de pagamento"><Input value={form.due_date} onChange={(event) => setForm({ ...form, due_date: event.target.value })} type="date" /></Field>
          <Field label="Descrição"><Input value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></Field>
          {error && <p className="text-sm text-pink-200">{error}</p>}
          <Button type="submit">Salvar dívida</Button>
        </form>
        <DataList items={data.debts} empty="Nenhuma dívida cadastrada." render={(debt) => {
          const completed = toNumber(debt.remaining) <= 0 || debt.status === "paid";
          const days = daysUntilDate(debt.due_date);
          const urgent = !completed && days !== null && days >= 0 && days <= 7;
          return (
            <div key={debt.id} className={cn("grid gap-3 rounded-md p-3 sm:grid-cols-[1fr_auto] sm:items-center", urgent ? "bg-amber-400/10 ring-1 ring-amber-400/30" : "bg-white/[0.04]")}>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-white">{debt.creditor}</p>
                <p className="truncate text-xs text-slate-400">
                  {completed ? "Completa" : `Restante: ${formatCurrency(toNumber(debt.remaining))}`}
                </p>
                {urgent && <p className="mt-1 text-xs text-amber-100">Aviso: prazo chegando em {days} dia(s).</p>}
              </div>
              <div className="flex items-center justify-between gap-2 sm:justify-end">
                <strong className={cn("text-sm", completed ? "text-emerald-300" : "text-white")}>
                  {formatCurrency(toNumber(debt.amount))}
                </strong>
                {!completed && (
                  <Button type="button" variant="secondary" className="h-9 px-3" onClick={() => markDebtPaid(debt)}>
                    Paga
                  </Button>
                )}
                <Button type="button" variant="ghost" className="h-9 w-9 p-0" aria-label="Apagar dívida" onClick={() => removeDebt(debt)}>
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            </div>
          );
        }} />
      </ResourcePage>

      <Card className="p-5">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-white">Cartão de crédito</h2>
            <p className="mt-1 text-sm text-slate-400">Opcional, para acompanhar fatura, limite, fechamento e vencimento.</p>
          </div>
          <div className="mb-4 rounded-md border border-amber-400/30 bg-amber-400/10 p-3 text-sm text-amber-100">
            Nunca informe número do cartão, CVV, senha ou dados completos.
          </div>
        </div>
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <DataList items={data.creditCards} empty="Nenhum cartão cadastrado." render={(card) => {
            const debt = toNumber(card.current_debt);
            const limit = toNumber(card.limit_amount);
            const usage = limit > 0 ? (debt / limit) * 100 : 0;
            const projected = debt * (1 + toNumber(card.interest_rate) / 100);
            const nearLimit = usage >= 80;
            const dueDays = daysUntilMonthDay(card.due_day);
            const closeDays = daysUntilMonthDay(card.closing_day);
            return (
              <div key={card.id} className={cn("rounded-md p-3", nearLimit || dueDays <= 7 ? "bg-pink-400/10 ring-1 ring-pink-400/30" : "bg-white/[0.04]")}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white">{card.nickname}</p>
                    <p className="text-xs text-slate-400">Fecha dia {card.closing_day}, vence dia {card.due_day}</p>
                  </div>
                  <Button type="button" variant="ghost" className="h-9 w-9 p-0" aria-label="Apagar cartão" onClick={() => removeCreditCard(card)}>
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
                <div className="mt-3 space-y-2">
                  <Progress value={Math.min(100, usage)} />
                  <p className="text-xs text-slate-300">Fatura: {formatCurrency(debt)} de {formatCurrency(limit)} ({usage.toFixed(0)}% do limite)</p>
                  <p className="text-xs text-slate-400">Com juros informado, pode virar {formatCurrency(projected)}.</p>
                  {(nearLimit || dueDays <= 7 || closeDays <= 7) && (
                    <p className="rounded-md bg-black/20 p-2 text-xs text-pink-100">
                      Aviso: cartão perto do limite ou da data. Isso pode reduzir seu saldo livre e aumentar juros se atrasar.
                    </p>
                  )}
                </div>
              </div>
            );
          }} />
          <form className="grid gap-3 rounded-md bg-white/[0.04] p-3" onSubmit={submitCreditCard}>
            <h3 className="text-sm font-semibold text-white">Novo cartão</h3>
            <Field label="Apelido do cartão"><Input value={cardForm.nickname} onChange={(event) => setCardForm({ ...cardForm, nickname: event.target.value })} placeholder="Ex: Cartão principal" required /></Field>
            <Field label="Quanto está devendo"><MoneyInput value={cardForm.current_debt} onValueChange={(value) => setCardForm({ ...cardForm, current_debt: value })} required /></Field>
            <Field label="Limite total"><MoneyInput value={cardForm.limit_amount} onValueChange={(value) => setCardForm({ ...cardForm, limit_amount: value })} required /></Field>
            <Field label="Juros ao mês (%)"><Input value={cardForm.interest_rate} onChange={(event) => setCardForm({ ...cardForm, interest_rate: event.target.value })} inputMode="decimal" /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Fecha dia"><Input value={cardForm.closing_day} onChange={(event) => setCardForm({ ...cardForm, closing_day: event.target.value })} type="number" min="1" max="31" required /></Field>
              <Field label="Vence dia"><Input value={cardForm.due_day} onChange={(event) => setCardForm({ ...cardForm, due_day: event.target.value })} type="number" min="1" max="31" required /></Field>
            </div>
            <Button type="submit">Salvar cartão</Button>
          </form>
        </div>
      </Card>
    </div>
  );
}

function FixedExpensesPage({ data, refresh }: FormProps) {
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

  async function removeFixedExpense(item: FixedExpense) {
    await deleteAndRefresh(`/fixed-expenses/${item.id}/`, refresh, setError);
  }

  return (
    <ResourcePage title="Contas fixas" formTitle="Nova conta fixa">
      <form className="grid gap-3" onSubmit={submit}>
        <Field label="Nome"><Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></Field>
        <Field label="Valor"><MoneyInput value={form.amount} onValueChange={(value) => setForm({ ...form, amount: value })} required /></Field>
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
        <div key={item.id} className={cn("flex items-center justify-between gap-3 rounded-md p-3", !item.is_paid_this_month && daysUntilMonthDay(item.due_day) <= 7 ? "bg-amber-400/10 ring-1 ring-amber-400/30" : "bg-white/[0.04]")}>
          <div>
            <p className="font-medium text-white">{item.name}</p>
            <p className="text-xs text-slate-400">Vence dia {item.due_day} - {item.is_paid_this_month ? "Pago" : "Pendente"}</p>
            {!item.is_paid_this_month && daysUntilMonthDay(item.due_day) <= 7 && (
              <p className="mt-1 text-xs text-amber-100">
                Aviso: vence em {daysUntilMonthDay(item.due_day)} dia(s). Seu saldo {toNumber(data.wallet?.balance) >= toNumber(item.amount) ? "cobre" : "não cobre"} esta conta.
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <strong>{formatCurrency(toNumber(item.amount))}</strong>
            {!item.is_paid_this_month && <Button type="button" variant="secondary" onClick={() => markPaid(item)}>Pagar</Button>}
            <Button type="button" variant="ghost" className="h-9 w-9 p-0" aria-label="Apagar conta fixa" onClick={() => removeFixedExpense(item)}>
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      )} />
    </ResourcePage>
  );
}

function CouplePage({ data, refresh, user, onViewProfile }: FormProps & { user: User; onViewProfile: (userId: string) => void }) {
  const [groupName, setGroupName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [editName, setEditName] = useState(data.couple?.name ?? "");
  const [groupAvatar, setGroupAvatar] = useState<string | null>(data.couple?.avatar ?? null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!data.couple) {
      setEditName("");
      setGroupAvatar(null);
      return;
    }
    setEditName(localStorage.getItem(coupleNameStorageKey(data.couple.id)) ?? data.couple.name);
    setGroupAvatar(localStorage.getItem(coupleAvatarStorageKey(data.couple.id)) ?? data.couple.avatar ?? null);
  }, [data.couple]);

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

  async function selectGroupAvatar(file: File | null) {
    setError("");
    if (!file) {
      setGroupAvatar(null);
      return;
    }
    if (!["image/jpeg", "image/png"].includes(file.type)) {
      setError("Use apenas imagens JPEG ou PNG.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError("A imagem precisa ter no máximo 2 MB.");
      return;
    }
    try {
      setGroupAvatar(await fileToDataUrl(file));
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  async function updateCouple(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!data.couple) return;
    setError("");
    localStorage.setItem(coupleNameStorageKey(data.couple.id), editName);
    if (groupAvatar) {
      localStorage.setItem(coupleAvatarStorageKey(data.couple.id), groupAvatar);
    } else {
      localStorage.removeItem(coupleAvatarStorageKey(data.couple.id));
    }
    try {
      await api.patch("/couples/", { name: editName, avatar: groupAvatar });
      await refresh();
    } catch (err) {
      setError(`${apiErrorMessage(err)} A alteração ficou salva localmente até o backend aceitar edição do casal.`);
    }
  }

  async function leaveCouple() {
    await deleteAndRefresh("/couples/", refresh, setError);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <Card className="p-5">
        <h2 className="text-lg font-semibold text-white">Casal</h2>
        {data.couple ? (
          <div className="mt-4 grid gap-4">
            <div className="flex items-center gap-4">
              <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-md bg-white/5">
                {groupAvatar ? (
                  <img src={groupAvatar} alt={editName || data.couple.name} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-xl font-semibold text-white">{userInitials(editName || data.couple.name)}</span>
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate text-2xl font-semibold text-white">{editName || coupleDisplayName(user, data.couple)}</p>
                <p className="text-sm text-slate-400">Nome do grupo: {editName || data.couple.name}</p>
              </div>
            </div>
            <p className="rounded-md bg-white/[0.04] p-3 text-sm">Código de convite: <strong>{data.couple.invite_code}</strong></p>
            <div className="grid gap-2">
              {data.couple.members.map((member) => (
                <button
                  key={member.id}
                  type="button"
                  className="flex items-center justify-between gap-3 rounded-md bg-white/[0.04] p-3 text-left transition hover:bg-white/[0.07]"
                  onClick={() => onViewProfile(member.id)}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-md bg-white/5">
                      {member.avatar ? (
                        <img src={member.avatar} alt={member.name} className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-sm font-semibold text-white">{userInitials(member.name)}</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-white">{member.name}</p>
                      <p className="truncate text-xs text-slate-400">{member.email}</p>
                    </div>
                  </div>
                  <strong className="shrink-0 text-sm text-white">{member.total_xp} XP</strong>
                </button>
              ))}
            </div>
            <Button type="button" variant="ghost" className="justify-self-start text-pink-200" onClick={leaveCouple}>
              Sair do casal
            </Button>
          </div>
        ) : (
          <EmptyState title="Você ainda não tem grupo de casal. Crie um grupo ou entre com um código de convite." />
        )}
      </Card>
      <div className="grid gap-6">
        {data.couple && (
          <Card className="p-5">
            <h2 className="mb-4 text-lg font-semibold text-white">Editar casal</h2>
            <form className="grid gap-3" onSubmit={updateCouple}>
              <Field label="Nome do casal ou grupo">
                <Input value={editName} onChange={(event) => setEditName(event.target.value)} required />
              </Field>
              <div className="grid gap-2">
                <span className="text-sm text-slate-300">Foto do casal</span>
                <div className="flex flex-wrap items-center gap-3">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground hover:bg-secondary/90">
                    <Upload className="h-4 w-4" aria-hidden="true" />
                    <span>Escolher foto</span>
                    <input className="hidden" type="file" accept="image/jpeg,image/png" onChange={(event) => void selectGroupAvatar(event.target.files?.[0] ?? null)} />
                  </label>
                  <Button type="button" variant="ghost" onClick={() => setGroupAvatar(null)}>Remover</Button>
                </div>
              </div>
              {error && <p className="text-sm text-pink-200">{error}</p>}
              <Button type="submit">Salvar casal</Button>
            </form>
          </Card>
        )}
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
  data,
  refresh,
  user,
  onUserChange,
  onDeleteAccount,
  onPrivacyChange,
}: FormProps & { user: User; onUserChange: (user: User) => void; onDeleteAccount: () => void; onPrivacyChange: (settings: ProfilePrivacySettings) => void }) {
  const profile = data.me ?? user;
  const featuredStorageKey = `finance-couple:featured-badges:${profile.id}`;
  const [tab, setTab] = useState<"overview" | "settings" | "badges">("overview");
  const [name, setName] = useState(profile.name);
  const [dateOfBirth, setDateOfBirth] = useState(profile.date_of_birth ?? "");
  const [avatar, setAvatar] = useState<string | null>(profile.avatar);
  const [avatarLabel, setAvatarLabel] = useState(profile.avatar ? "Imagem atual" : "Nenhum arquivo selecionado");
  const [featuredBadgeIds, setFeaturedBadgeIds] = useState<string[]>([]);
  const [privacySettings, setPrivacySettings] = useState<ProfilePrivacySettings>({
    showGroupOnProfile: true,
    showMembershipOnOtherProfiles: true,
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deletingAccount, setDeletingAccount] = useState(false);

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

  useEffect(() => {
    let cancelled = false;
    void api.get<ApiResponse<{ show_group_on_profile: boolean; show_membership_on_other_profiles: boolean }>>("/users/me/privacy/")
      .then((response) => {
        if (cancelled) return;
        setPrivacySettings({
          showGroupOnProfile: response.data.data.show_group_on_profile,
          showMembershipOnOtherProfiles: response.data.data.show_membership_on_other_profiles,
        });
        onPrivacyChange({
          showGroupOnProfile: response.data.data.show_group_on_profile,
          showMembershipOnOtherProfiles: response.data.data.show_membership_on_other_profiles,
        });
      })
      .catch(() => {
        if (!cancelled) {
          setPrivacySettings({ showGroupOnProfile: true, showMembershipOnOtherProfiles: true });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [onPrivacyChange, profile.id]);

  const profileAchievementStats = useMemo(
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
      profileComplete: isProfileComplete(profile),
      rankingPosition: data.ranking.find((item) => item.user.id === user.id)?.rank ?? null,
    }),
    [data, profile, user],
  );
  const earnedAchievements = useMemo(
    () => buildAchievementStates(profileAchievementStats).filter((achievement) => achievement.unlocked),
    [profileAchievementStats],
  );
  const featuredBadges = data.badges.filter((item) => featuredBadgeIds.includes(item.id));
  const featuredAchievements = earnedAchievements.filter((item) => featuredBadgeIds.includes(`achievement:${item.id}`));
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

  async function updatePrivacySettings(nextSettings: ProfilePrivacySettings) {
    setPrivacySettings(nextSettings);
    onPrivacyChange(nextSettings);
    try {
      await api.patch("/users/me/privacy/", {
        show_group_on_profile: nextSettings.showGroupOnProfile,
        show_membership_on_other_profiles: nextSettings.showMembershipOnOtherProfiles,
      });
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  async function deleteAccount() {
    if (deleteConfirm.trim().toUpperCase() !== "DELETAR") {
      setError("Digite DELETAR para confirmar a exclusão da conta.");
      return;
    }
    setDeletingAccount(true);
    setError("");
    try {
      await api.delete("/users/me/");
      onDeleteAccount();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setDeletingAccount(false);
    }
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
              ["overview", "Visão geral", Trophy],
              ["settings", "Configurações", Settings2],
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
                  {isProfileComplete(profile) ? "Sim" : "Não"}
                </strong>
              </div>
            </div>

            <h3 className="mb-4 mt-8 text-lg font-semibold text-white">Badges em destaque</h3>
            {featuredBadges.length || featuredAchievements.length ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {featuredBadges.map((item) => (
                  <div key={item.id} className="rounded-md bg-white/[0.04] p-3">
                    <p className="text-sm font-medium text-white">{item.badge.name}</p>
                    <p className="text-xs text-slate-400">{item.badge.description}</p>
                  </div>
                ))}
                {featuredAchievements.map((item) => (
                  <div key={item.id} className="rounded-md bg-white/[0.04] p-3">
                    <p className="text-sm font-medium text-white">{item.title}</p>
                    <p className="text-xs text-slate-400">{item.description}</p>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title="Nenhuma badge destacada ainda." />
            )}
          </Card>

          <Card className="p-5">
            <h3 className="mb-4 text-lg font-semibold text-white">Informações</h3>
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
            <div className="mt-6 border-t border-white/10 pt-5">
              <h4 className="text-sm font-semibold text-pink-200">Deletar conta</h4>
              <p className="mt-1 text-xs text-slate-400">Digite DELETAR para confirmar. Esta ação deve remover a conta e seus dados no backend.</p>
              <div className="mt-3 grid gap-2">
                <Input value={deleteConfirm} onChange={(event) => setDeleteConfirm(event.target.value)} placeholder="DELETAR" />
                <Button type="button" variant="ghost" className="justify-start text-pink-200" disabled={deletingAccount} onClick={() => void deleteAccount()}>
                  {deletingAccount ? "Deletando" : "Deletar conta"}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {tab === "settings" && (
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <Card className="p-5">
            <h3 className="mb-4 text-lg font-semibold text-white">Configurações do perfil</h3>
            <form className="grid gap-3" onSubmit={submit}>
              <Field label="Nome">
                <Input value={name} onChange={(event) => setName(event.target.value)} required />
              </Field>
              <Field label="Data de nascimento">
                <Input value={dateOfBirth} onChange={(event) => setDateOfBirth(event.target.value)} type="date" />
              </Field>
              <div className="grid gap-3 rounded-md border border-white/10 bg-white/[0.03] p-4">
                <div>
                  <p className="text-sm font-medium text-white">Privacidade do grupo</p>
                  <p className="mt-1 text-xs text-slate-400">Escolha se outras pessoas podem ver sua ligação com o casal/grupo.</p>
                </div>
                <label className="flex items-start gap-3 text-sm text-slate-300">
                  <input
                    className="mt-1"
                    type="checkbox"
                    checked={privacySettings.showGroupOnProfile}
                    onChange={(event) => void updatePrivacySettings({ ...privacySettings, showGroupOnProfile: event.target.checked })}
                  />
                  <span>Mostrar meu grupo no meu perfil público.</span>
                </label>
                <label className="flex items-start gap-3 text-sm text-slate-300">
                  <input
                    className="mt-1"
                    type="checkbox"
                    checked={privacySettings.showMembershipOnOtherProfiles}
                    onChange={(event) => void updatePrivacySettings({ ...privacySettings, showMembershipOnOtherProfiles: event.target.checked })}
                  />
                  <span>Permitir que eu apareça como integrante nos perfis do meu grupo.</span>
                </label>
              </div>
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
                {saving ? "Salvando" : "Salvar alterações"}
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
                  {isProfileComplete(profile) ? "Sim" : "Não"}
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
            <h3 className="mb-2 mt-6 text-lg font-semibold text-white">Conquistas ganhas</h3>
            <p className="mb-4 text-sm text-slate-400">Também podem ficar em destaque no perfil.</p>
            {earnedAchievements.length ? (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {earnedAchievements.map((item) => {
                  const storageId = `achievement:${item.id}`;
                  const selected = featuredBadgeIds.includes(storageId);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => toggleFeaturedBadge(storageId)}
                      className={cn(
                        "rounded-md border p-3 text-left transition",
                        selected ? "border-emerald-400/60 bg-emerald-400/10" : "border-white/10 bg-white/[0.04] hover:bg-white/[0.06]",
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-white">{item.title}</p>
                          <p className="text-xs text-slate-400">{item.description}</p>
                        </div>
                        <BadgeCheck className={cn("h-5 w-5", selected ? "text-emerald-300" : "text-slate-500")} aria-hidden="true" />
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <EmptyState title="Nenhuma conquista ganha ainda." />
            )}
          </Card>

          <Card className="p-5">
            <h3 className="mb-4 text-lg font-semibold text-white">Destaques atuais</h3>
            {featuredBadges.length || featuredAchievements.length ? (
              <div className="space-y-3">
                {featuredBadges.map((item) => (
                  <div key={item.id} className="rounded-md bg-white/[0.04] p-3">
                    <p className="text-sm font-medium text-white">{item.badge.name}</p>
                    <p className="text-xs text-slate-400">{item.badge.description}</p>
                  </div>
                ))}
                {featuredAchievements.map((item) => (
                  <div key={item.id} className="rounded-md bg-white/[0.04] p-3">
                    <p className="text-sm font-medium text-white">{item.title}</p>
                    <p className="text-xs text-slate-400">{item.description}</p>
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

function PublicProfileModal({
  profileId,
  currentUser,
  localBadges,
  currentGroup,
  currentUserPrivacy,
  onClose,
}: {
  profileId: string | null;
  currentUser: User;
  localBadges: BadgeAward[];
  currentGroup: CoupleGroup | null;
  currentUserPrivacy: ProfilePrivacySettings;
  onClose: () => void;
}) {
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!profileId) {
      setProfile(null);
      setError("");
      return;
    }

    let cancelled = false;
    setLoadingProfile(true);
    setError("");
    void api.get<ApiResponse<PublicProfile>>(`/users/profiles/${profileId}/`).then((response) => {
      if (!cancelled) setProfile(response.data.data);
    }).catch((err) => {
      if (!cancelled) setError(apiErrorMessage(err));
    }).finally(() => {
      if (!cancelled) setLoadingProfile(false);
    });

    return () => {
      cancelled = true;
    };
  }, [profileId]);

  if (!profileId) return null;

  const localFeaturedBadgeIds = (() => {
    try {
      const raw = localStorage.getItem(`finance-couple:featured-badges:${currentUser.id}`);
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  })();
  const badges = profile?.id === currentUser.id
    ? localBadges.filter((item) => localFeaturedBadgeIds.includes(item.id))
    : profile?.featured_badges ?? [];
  const visibleGroup = profile?.id === currentUser.id
    ? currentUserPrivacy.showGroupOnProfile ? profile.public_group ?? currentGroup : null
    : profile?.show_group_on_profile ? profile.public_group : null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 px-4 py-8" role="dialog" aria-modal="true">
      <Card className="w-full max-w-lg p-5">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-slate-400">Perfil público</p>
            <h2 className="text-xl font-semibold text-white">{profile?.name ?? "Carregando perfil"}</h2>
          </div>
          <Button type="button" variant="ghost" className="h-9 px-3" onClick={onClose}>
            Fechar
          </Button>
        </div>

        {loadingProfile && <p className="rounded-md bg-white/[0.04] p-3 text-sm text-slate-300">Carregando perfil...</p>}
        {error && <p className="rounded-md bg-pink-500/10 p-3 text-sm text-pink-200">{error}</p>}

        {profile && (
          <div className="grid gap-5">
            <div className="flex items-center gap-4">
              <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-md bg-white/5">
                {profile.avatar ? (
                  <img src={profile.avatar} alt={profile.name} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-xl font-semibold text-white">{userInitials(profile.name)}</span>
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate text-lg font-semibold text-white">{profile.name}</p>
                <p className="text-sm text-slate-400">{profile.total_xp} XP total</p>
                <p className="text-xs text-slate-500">Criado em {new Date(profile.created_at).toLocaleDateString("pt-BR")}</p>
              </div>
            </div>

            <div>
              <h3 className="mb-3 text-sm font-semibold text-white">Badges em destaque</h3>
              {badges.length ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {badges.map((item) => (
                    <div key={item.id} className="rounded-md bg-white/[0.04] p-3">
                      <p className="text-sm font-medium text-white">{item.badge.name}</p>
                      <p className="text-xs text-slate-400">{item.badge.description}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState title="Nenhuma badge pública em destaque." />
              )}
            </div>
            {visibleGroup && (
              <div>
                <h3 className="mb-3 text-sm font-semibold text-white">Grupo</h3>
                <div className="flex items-center gap-3 rounded-md bg-white/[0.04] p-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-md bg-white/5">
                    {visibleGroup.avatar ? (
                      <img src={visibleGroup.avatar} alt={visibleGroup.name} className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-sm font-semibold text-white">{userInitials(visibleGroup.name)}</span>
                    )}
                  </div>
                  <p className="truncate text-sm font-medium text-white">{visibleGroup.name}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}

function SocialPage({ ranking, user, onViewProfile }: { ranking: RankingItem[]; user: User; onViewProfile: (userId: string) => void }) {
  const currentUserRank = ranking.find((item) => item.user.id === user.id);

  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      <Card className="p-5">
        <h2 className="text-lg font-semibold text-white">Ranking global</h2>
        <p className="mt-1 text-sm text-slate-400">Classificação por XP total acumulado.</p>
        <div className="mt-5 space-y-3 text-sm">
          <div className="flex justify-between gap-3">
            <span className="text-slate-400">Participantes</span>
            <strong className="text-white">{ranking.length}</strong>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-slate-400">Sua posição</span>
            <strong className="text-white">{currentUserRank ? `#${currentUserRank.rank}` : "Fora do top 10"}</strong>
          </div>
        </div>
      </Card>

      <Card className="p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-white">Top XP</h2>
        </div>
        <DataList
          items={ranking}
          empty="Nenhum ranking encontrado."
          render={(item) => (
            <button
              key={item.user.id}
              type="button"
              className={cn(
                "flex w-full items-center justify-between gap-3 rounded-md p-3 text-left transition hover:bg-white/[0.07]",
                item.user.id === user.id ? "bg-secondary/10 ring-1 ring-secondary/30" : "bg-white/[0.04]",
              )}
              onClick={() => onViewProfile(item.user.id)}
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-white/10 text-sm font-semibold text-white">
                  #{item.rank}
                </div>
                <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-md bg-white/5">
                  {item.user.avatar ? (
                    <img src={item.user.avatar} alt={item.user.name} className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-sm font-semibold text-white">{userInitials(item.user.name)}</span>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-white">{item.user.name}</p>
                  <p className="truncate text-xs text-slate-400">{item.user.id === user.id ? "Você" : "Participante global"}</p>
                </div>
              </div>
              <strong className="shrink-0 text-sm text-white">{item.total_xp} XP</strong>
            </button>
          )}
        />
      </Card>
    </div>
  );
}

function FriendsPage({ ranking, user, onViewProfile }: { ranking: RankingItem[]; user: User; onViewProfile: (userId: string) => void }) {
  const [friends, setFriends] = useState<LocalFriend[]>([]);
  const [nudges, setNudges] = useState<ScheduledNudge[]>([]);
  const [selectedFriendId, setSelectedFriendId] = useState("");
  const [message, setMessage] = useState("Continue, você está indo muito bem!");
  const [delayMinutes, setDelayMinutes] = useState("30");
  const [status, setStatus] = useState("");
  const [loadingCommunity, setLoadingCommunity] = useState(false);
  const acceptedFriends = friends.filter((friend) => friend.status === "accepted");
  const pendingFriends = friends.filter((friend) => friend.status === "pending");
  const friendLeaderboard = [...acceptedFriends].sort((a, b) => b.total_xp - a.total_xp);
  const suggestedCheer = friendLeaderboard[0];
  const discoverable = ranking
    .filter((item) => item.user.id !== user.id)
    .filter((item) => !friends.some((friend) => friend.id === item.user.id));

  const loadCommunity = useCallback(async () => {
    setLoadingCommunity(true);
    setStatus("");
    try {
      const [friendsResponse, nudgesResponse] = await Promise.all([
        api.get<ApiResponse<LocalFriend[]>>("/community/friends/").then((response) => response.data),
        api.get<ApiResponse<ScheduledNudge[]>>("/community/nudges/").then((response) => response.data),
      ]);
      setFriends(friendsResponse.data);
      setNudges(nudgesResponse.data);
    } catch (err) {
      setStatus(apiErrorMessage(err));
    } finally {
      setLoadingCommunity(false);
    }
  }, []);

  useEffect(() => {
    void loadCommunity();
  }, [loadCommunity]);

  async function sendFriendRequest(target: User) {
    setStatus("");
    try {
      await api.post("/community/friend-requests/", { to_user_id: target.id });
      setStatus(`Pedido enviado para ${target.name}.`);
      await loadCommunity();
    } catch {
      setStatus(`Não foi possível enviar o pedido para ${target.name}.`);
    }
  }

  async function acceptFriend(friend: LocalFriend) {
    setStatus("");
    try {
      await api.post(`/community/friend-requests/${friend.id}/accept/`);
      setStatus(`${friend.name} agora aparece como amizade.`);
      await loadCommunity();
    } catch (err) {
      setStatus(apiErrorMessage(err));
    }
  }

  async function removeFriend(friend: LocalFriend) {
    setStatus("");
    try {
      await api.delete(`/community/friends/${friend.id}/`);
      setStatus(`${friend.name} removido da lista.`);
      await loadCommunity();
    } catch (err) {
      setStatus(apiErrorMessage(err));
    }
  }

  async function sendNudge(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const friend = friends.find((item) => item.id === selectedFriendId);
    if (!friend || !message.trim()) return;
    const deliverAt = new Date(Date.now() + Number(delayMinutes) * 60 * 1000).toISOString();
    try {
      await api.post("/community/nudges/", {
        to_user_id: friend.id,
        message: message.trim(),
        deliver_at: deliverAt,
      });
      setStatus(`Incentivo agendado para ${friend.name}.`);
      await loadCommunity();
    } catch {
      setStatus("Não foi possível agendar o incentivo.");
    }
  }

  return (
    <div className="grid gap-6">
      {loadingCommunity && <p className="rounded-md bg-white/[0.04] p-3 text-sm text-slate-300">Carregando comunidade...</p>}
      {status && <p className="rounded-md bg-white/[0.04] p-3 text-sm text-slate-300">{status}</p>}
      <section className="grid gap-4 md:grid-cols-3">
        <Card className="p-4">
          <p className="text-sm text-slate-400">Amigos</p>
          <p className="mt-2 text-2xl font-semibold text-white">{acceptedFriends.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-slate-400">Pedidos</p>
          <p className="mt-2 text-2xl font-semibold text-white">{pendingFriends.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-slate-400">Sugestão social</p>
          <p className="mt-2 text-sm font-medium text-white">
            {suggestedCheer ? `Parabenize ${suggestedCheer.name}` : "Adicione amigos para receber sugestões."}
          </p>
        </Card>
      </section>
      <section className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card className="p-5">
          <h2 className="mb-4 text-lg font-semibold text-white">Amigos</h2>
          {acceptedFriends.length ? (
            <div className="grid gap-3 md:grid-cols-2">
              {acceptedFriends.map((friend) => (
                <div key={friend.id} className="rounded-md bg-white/[0.04] p-3">
                  <div className="flex items-center justify-between gap-3">
                    <button type="button" className="flex min-w-0 items-center gap-3 text-left" onClick={() => onViewProfile(friend.id)}>
                      <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-md bg-white/5">
                        {friend.avatar ? <img src={friend.avatar} alt={friend.name} className="h-full w-full object-cover" /> : <span className="text-sm font-semibold text-white">{userInitials(friend.name)}</span>}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-white">{friend.name}</p>
                        <p className="text-xs text-slate-400">{friend.total_xp} XP</p>
                      </div>
                    </button>
                    <Button type="button" variant="ghost" className="h-9 px-2" onClick={() => removeFriend(friend)}>Remover</Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="Nenhuma amizade confirmada ainda." />
          )}

          <h3 className="mb-3 mt-6 text-base font-semibold text-white">Pedidos enviados</h3>
          {pendingFriends.length ? (
            <div className="space-y-3">
              {pendingFriends.map((friend) => (
                <div key={friend.id} className="flex items-center justify-between gap-3 rounded-md bg-white/[0.04] p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-white">{friend.name}</p>
                    <p className="text-xs text-slate-400">Aguardando confirmação</p>
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" variant="secondary" className="h-9 px-3" onClick={() => void acceptFriend(friend)}>Aceitar</Button>
                    <Button type="button" variant="ghost" className="h-9 px-3" onClick={() => removeFriend(friend)}>Cancelar</Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="Nenhum pedido pendente." />
          )}
        </Card>

        <Card className="p-5">
          <h2 className="mb-4 text-lg font-semibold text-white">Enviar incentivo</h2>
          <form className="grid gap-3" onSubmit={sendNudge}>
            <Field label="Amigo">
              <NativeSelect value={selectedFriendId} onChange={(event) => setSelectedFriendId(event.target.value)} required>
                <option value="">Selecione</option>
                {friends.map((friend) => <option key={friend.id} value={friend.id}>{friend.name}</option>)}
              </NativeSelect>
            </Field>
            <Field label="Mensagem">
              <NativeSelect value={message} onChange={(event) => setMessage(event.target.value)}>
                <option value="Continue, você está indo muito bem!">Continue, você está indo muito bem!</option>
                <option value="Mande ver, falta pouco!">Mande ver, falta pouco!</option>
                <option value="Parabéns pelo progresso!">Parabéns pelo progresso!</option>
              </NativeSelect>
            </Field>
            <Field label="Enviar em">
              <NativeSelect value={delayMinutes} onChange={(event) => setDelayMinutes(event.target.value)}>
                <option value="0">Agora</option>
                <option value="30">30 minutos</option>
                <option value="120">2 horas</option>
                <option value="1440">Amanhã</option>
              </NativeSelect>
            </Field>
            <Button type="submit" disabled={!selectedFriendId}>
              <Send className="h-4 w-4" aria-hidden="true" />
              Enviar incentivo
            </Button>
          </form>

          <h3 className="mb-3 mt-6 text-base font-semibold text-white">Agendados</h3>
          {nudges.length ? (
            <div className="space-y-3">
              {nudges.slice(0, 4).map((nudge) => (
                <div key={nudge.id} className="rounded-md bg-white/[0.04] p-3">
                  <p className="text-sm font-medium text-white">{nudge.to_name}</p>
                  <p className="text-xs text-slate-400">{nudge.message}</p>
                  <p className="mt-2 flex items-center gap-1 text-xs text-slate-500">
                    <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
                    {new Date(nudge.deliver_at).toLocaleString("pt-BR")}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="Nenhum incentivo agendado." />
          )}
        </Card>
      </section>

      <Card className="p-5">
        <h2 className="mb-4 text-lg font-semibold text-white">Encontrar pessoas</h2>
        {discoverable.length ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {discoverable.map((item) => (
              <div key={item.user.id} className="rounded-md bg-white/[0.04] p-3">
                <button type="button" className="flex w-full min-w-0 items-center gap-3 text-left" onClick={() => onViewProfile(item.user.id)}>
                  <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-md bg-white/5">
                    {item.user.avatar ? <img src={item.user.avatar} alt={item.user.name} className="h-full w-full object-cover" /> : <span className="text-sm font-semibold text-white">{userInitials(item.user.name)}</span>}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-white">{item.user.name}</p>
                    <p className="text-xs text-slate-400">{item.total_xp} XP</p>
                  </div>
                </button>
                <Button type="button" variant="secondary" className="mt-3 w-full" onClick={() => sendFriendRequest(item.user)}>
                  <UserRoundPlus className="h-4 w-4" aria-hidden="true" />
                  Adicionar amizade
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="Nenhuma nova pessoa encontrada no ranking." />
        )}
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

export function App() {
  const [session, setSession] = useState<Session | null>(() => readSession());
  const [data, setData] = useState<AppData>(emptyData);
  const [page, setPage] = useState<Page>("dashboard");
  const [dashboardMode, setDashboardMode] = useState<DashboardMode>("solo");
  const [authState, setAuthState] = useState<"checking" | "authenticated" | "anonymous">(() => (readSession() ? "checking" : "anonymous"));
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [userPrivacy, setUserPrivacy] = useState<ProfilePrivacySettings>({
    showGroupOnProfile: true,
    showMembershipOnOtherProfiles: true,
  });
  const [openNavSections, setOpenNavSections] = useState<Record<string, boolean>>({
    overview: true,
    money: true,
    plans: true,
    people: true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const token = session?.access ?? "";

  const handleAuth = useCallback((nextSession: Session) => {
    saveSession(nextSession);
    setSession(nextSession);
    setAuthState("authenticated");
  }, []);

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
      const creditCards = await api.get<ApiResponse<CreditCardAccount[]>>("/credit-cards/")
        .then(r => r.data.data)
        .catch(() => [] as CreditCardAccount[]);

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
        investments: readInvestments(me.data.id),
        debts: debts.data,
        fixedExpenses: fixedExpenses.data,
        creditCards,
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
  const navigationById = new Map(navigation.map((item) => [item.id, item]));

  function logout() {
    clearSession();
    setSession(null);
    setData(emptyData);
    setMobileMenuOpen(false);
  }

  function toggleNavSection(sectionId: string) {
    setOpenNavSections((current) => ({ ...current, [sectionId]: !current[sectionId] }));
  }

  return (
    <div className="min-h-screen bg-background text-slate-100">
      {mobileMenuOpen && <button type="button" aria-label="Fechar menu" className="fixed inset-0 z-20 bg-black/50 lg:hidden" onClick={() => setMobileMenuOpen(false)} />}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 w-72 overflow-y-auto border-r border-white/10 bg-surface/95 p-4 transition-all duration-200 lg:translate-x-0",
          sidebarCollapsed ? "lg:w-16" : "lg:w-56",
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        <div className={cn("flex items-center gap-3", sidebarCollapsed && "lg:justify-center")}>
          <div className="grid h-9 w-9 place-items-center rounded-md bg-primary">
            <WalletIcon className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className={cn("min-w-0", sidebarCollapsed && "lg:hidden")}>
            <p className="truncate font-semibold text-white">Finance Couple</p>
            <p className="truncate text-xs text-slate-400">{data.wallet?.name ?? "Carteira"}</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            className={cn("ml-auto hidden h-9 w-9 p-0 lg:inline-flex", sidebarCollapsed && "lg:hidden")}
            aria-label="Recolher menu"
            onClick={() => setSidebarCollapsed(true)}
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
        {data.couple?.members?.length ? (
          <div className={cn("mt-4 flex items-center gap-2", sidebarCollapsed && "lg:flex-col")}>
            {data.couple.members.slice(0, 4).map((member) => (
              <button
                key={member.id}
                type="button"
                className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-md bg-white/5 transition hover:bg-white/10"
                title={member.name}
                aria-label={`Abrir perfil de ${member.name}`}
                onClick={() => setSelectedProfileId(member.id)}
              >
                {member.avatar ? (
                  <img src={member.avatar} alt={member.name} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-xs font-semibold text-white">{userInitials(member.name)}</span>
                )}
              </button>
            ))}
          </div>
        ) : null}
        {sidebarCollapsed && (
          <Button
            type="button"
            variant="ghost"
            className="mt-4 hidden h-9 w-full p-0 lg:inline-flex"
            aria-label="Expandir menu"
            onClick={() => setSidebarCollapsed(false)}
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        )}
        <nav className="mt-6 space-y-3" aria-label="Principal">
          {navigationSections.map((section) => {
            const isOpen = openNavSections[section.id] ?? true;
            return (
              <div key={section.id} className="space-y-1">
                <button
                  type="button"
                  className={cn(
                    "focus-ring flex h-8 w-full items-center justify-between rounded-md px-2 text-xs font-medium uppercase tracking-wide text-slate-500 transition hover:bg-white/5 hover:text-slate-300",
                    sidebarCollapsed && "lg:justify-center lg:px-0",
                  )}
                  onClick={() => toggleNavSection(section.id)}
                >
                  <span className={cn(sidebarCollapsed && "lg:hidden")}>{section.label}</span>
                  <ChevronRight className={cn("h-3.5 w-3.5 transition", isOpen && "rotate-90", sidebarCollapsed && "lg:hidden")} aria-hidden="true" />
                </button>
                {(isOpen || sidebarCollapsed) && (
                  <div className="space-y-1">
                    {section.pages.map((pageId) => {
                      const item = navigationById.get(pageId);
                      if (!item) return null;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          className={cn(
                            "focus-ring flex h-10 w-full items-center gap-3 rounded-md px-2 text-left text-sm transition",
                            sidebarCollapsed && "lg:justify-center lg:px-0",
                            page === item.id ? "bg-white/10 text-white" : "text-slate-400 hover:bg-white/5 hover:text-white",
                          )}
                          onClick={() => {
                            setPage(item.id);
                            setMobileMenuOpen(false);
                          }}
                        >
                          <item.icon className="h-4 w-4" aria-hidden="true" />
                          <span className={cn(sidebarCollapsed && "lg:hidden")}>{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </aside>

      <main className={cn("transition-all duration-200", sidebarCollapsed ? "lg:pl-16" : "lg:pl-56")}>
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
              <PageHelp page={page} />
              <Button type="button" variant="secondary" className="hidden md:inline-flex" onClick={() => setPage("couple")}>
                <Link2 className="h-4 w-4" aria-hidden="true" />
                Vincular parceiro
              </Button>
              <Button type="button" variant="ghost" className="h-10 w-10 p-0" aria-label="Notificações">
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
          {page === "wallet" && <WalletPage data={data} refresh={loadData} />}
          {page === "transactions" && <TransactionsPage data={data} refresh={loadData} />}
          {page === "categories" && <CategoriesPage data={data} refresh={loadData} />}
          {page === "goals" && <GoalsPage data={data} refresh={loadData} />}
          {page === "investments" && <InvestmentsPage data={data} user={session.user} />}
          {page === "debts" && <DebtsPage data={data} refresh={loadData} />}
          {page === "fixed" && <FixedExpensesPage data={data} refresh={loadData} />}
          {page === "couple" && <CouplePage data={data} refresh={loadData} user={session.user} onViewProfile={setSelectedProfileId} />}
          {page === "achievements" && <AchievementsPage data={data} user={session.user} />}
          {page === "profile" && <ProfilePage data={data} refresh={loadData} user={session.user} onUserChange={(updated) => setSession((current) => (current ? { ...current, user: updated } : current))} onDeleteAccount={logout} onPrivacyChange={setUserPrivacy} />}
          {page === "social" && <SocialPage ranking={data.ranking} user={session.user} onViewProfile={setSelectedProfileId} />}
          {page === "friends" && <FriendsPage ranking={data.ranking} user={session.user} onViewProfile={setSelectedProfileId} />}
          <footer className="mt-10 border-t border-white/10 py-5 text-center text-xs text-slate-500">
            Todos os direitos reservados a{" "}
            <a
              className="font-medium text-slate-300 underline-offset-4 hover:text-white hover:underline"
              href="https://github.com/Yourdevdaniel"
              target="_blank"
              rel="noreferrer"
            >
              Yourdevdaniel
            </a>
            .
          </footer>
        </div>
      </main>
      <PublicProfileModal
        profileId={selectedProfileId}
        currentUser={session.user}
        localBadges={data.badges}
        currentGroup={data.couple}
        currentUserPrivacy={userPrivacy}
        onClose={() => setSelectedProfileId(null)}
      />
    </div>
  );
}
