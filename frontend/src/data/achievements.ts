import {
  BadgeCheck,
  BarChart3,
  BriefcaseBusiness,
  CalendarCheck2,
  CircleDollarSign,
  Coins,
  CreditCard,
  Gem,
  HeartHandshake,
  Medal,
  PiggyBank,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  Trophy,
  UserRoundCheck,
  Wallet,
  Users,
} from "lucide-react";
import type {
  BadgeAward,
  Category,
  CoupleGroup,
  Dashboard,
  Debt,
  FixedExpense,
  Goal,
  RankingItem,
  Salary,
  Transaction,
  User,
  Wallet as WalletAccount,
} from "../lib/api";

export type AchievementState = {
  id: string;
  title: string;
  description: string;
  category: string;
  icon: typeof Trophy;
  unlocked: boolean;
  progress: number;
  tier: "bronze" | "silver" | "gold" | "platinum";
};

export type AchievementStats = {
  user: User;
  dashboard: Dashboard | null;
  couple: CoupleGroup | null;
  coupleDashboard: Array<{ user_id: string; name: string } & Dashboard>;
  wallet: WalletAccount | null;
  salaries: Salary[];
  categories: Category[];
  transactions: Transaction[];
  goals: Goal[];
  debts: Debt[];
  fixedExpenses: FixedExpense[];
  badges: BadgeAward[];
  ranking: RankingItem[];
  profileComplete: boolean;
  rankingPosition: number | null;
};

type AchievementRule = {
  id: string;
  title: string;
  description: string;
  category: string;
  icon: typeof Trophy;
  tier: AchievementState["tier"];
  getProgress: (stats: AchievementStats) => number;
  isUnlocked: (stats: AchievementStats) => boolean;
};

const completedGoals = (stats: AchievementStats) =>
  stats.goals.filter((goal) => goal.status === "completed" || goal.progress_percent >= 100).length;

const paidDebts = (stats: AchievementStats) =>
  stats.debts.filter((debt) => Number(debt.remaining) <= 0).length;

const paidFixedExpenses = (stats: AchievementStats) =>
  stats.fixedExpenses.filter((expense) => expense.is_paid_this_month).length;

const customCategories = (stats: AchievementStats) => stats.categories.filter((category) => !category.is_system).length;

const unlockedBadgeCount = (stats: AchievementStats) => stats.badges.length;

const rankingProgress = (stats: AchievementStats) => {
  if (!stats.rankingPosition) return 0;
  if (stats.rankingPosition <= 10) return 100;
  return Math.max(0, 100 - (stats.rankingPosition - 10) * 10);
};

const rules: AchievementRule[] = [
  {
    id: "primeiro-login",
    title: "Primeiro Login",
    description: "Entrou na plataforma pela primeira vez.",
    category: "Base",
    icon: Sparkles,
    tier: "bronze",
    getProgress: (stats) => (stats.user ? 100 : 0),
    isUnlocked: (stats) => Boolean(stats.user),
  },
  {
    id: "perfil-completo",
    title: "Perfil Completo",
    description: "Preencheu nome, foto e data de nascimento.",
    category: "Perfil",
    icon: UserRoundCheck,
    tier: "bronze",
    getProgress: (stats) => (stats.profileComplete ? 100 : 0),
    isUnlocked: (stats) => stats.profileComplete,
  },
  {
    id: "carteira-ativa",
    title: "Carteira Ativa",
    description: "Criou a carteira principal do casal.",
    category: "Fluxo",
    icon: Wallet,
    tier: "bronze",
    getProgress: (stats) => (stats.wallet ? 100 : 0),
    isUnlocked: (stats) => Boolean(stats.wallet),
  },
  {
    id: "primeiro-salario",
    title: "Primeiro Salário",
    description: "Registrou o primeiro salário.",
    category: "Fluxo",
    icon: BriefcaseBusiness,
    tier: "bronze",
    getProgress: (stats) => Math.min(100, stats.salaries.length * 100),
    isUnlocked: (stats) => stats.salaries.length >= 1,
  },
  {
    id: "salarios-3",
    title: "Ritmo de Renda",
    description: "Registrou 3 salários.",
    category: "Fluxo",
    icon: Coins,
    tier: "silver",
    getProgress: (stats) => Math.min(100, (stats.salaries.length / 3) * 100),
    isUnlocked: (stats) => stats.salaries.length >= 3,
  },
  {
    id: "primeira-categoria",
    title: "Categoria Inicial",
    description: "Criou a primeira categoria.",
    category: "Fluxo",
    icon: BadgeCheck,
    tier: "bronze",
    getProgress: (stats) => Math.min(100, stats.categories.length * 100),
    isUnlocked: (stats) => stats.categories.length >= 1,
  },
  {
    id: "categorias-personalizadas-3",
    title: "Organização Própria",
    description: "Criou 3 categorias personalizadas.",
    category: "Fluxo",
    icon: BadgeCheck,
    tier: "silver",
    getProgress: (stats) => Math.min(100, (customCategories(stats) / 3) * 100),
    isUnlocked: (stats) => customCategories(stats) >= 3,
  },
  {
    id: "primeira-transacao",
    title: "Primeira Transação",
    description: "Registrou a primeira movimentação.",
    category: "Fluxo",
    icon: CreditCard,
    tier: "bronze",
    getProgress: (stats) => Math.min(100, stats.transactions.length * 100),
    isUnlocked: (stats) => stats.transactions.length >= 1,
  },
  {
    id: "10-transacoes",
    title: "Movimento Constante",
    description: "Registrou 10 transações.",
    category: "Fluxo",
    icon: CreditCard,
    tier: "silver",
    getProgress: (stats) => Math.min(100, (stats.transactions.length / 10) * 100),
    isUnlocked: (stats) => stats.transactions.length >= 10,
  },
  {
    id: "primeira-meta",
    title: "Meta Definida",
    description: "Criou a primeira meta.",
    category: "Metas",
    icon: Target,
    tier: "bronze",
    getProgress: (stats) => Math.min(100, stats.goals.length * 100),
    isUnlocked: (stats) => stats.goals.length >= 1,
  },
  {
    id: "meta-50",
    title: "Metade do Caminho",
    description: "Alcançou 50% em qualquer meta.",
    category: "Metas",
    icon: Target,
    tier: "silver",
    getProgress: (stats) => Math.max(0, ...stats.goals.map((goal) => goal.progress_percent)),
    isUnlocked: (stats) => stats.goals.some((goal) => goal.progress_percent >= 50),
  },
  {
    id: "meta-concluida",
    title: "Meta Concluída",
    description: "Concluiu a primeira meta.",
    category: "Metas",
    icon: Gem,
    tier: "gold",
    getProgress: (stats) => Math.min(100, completedGoals(stats) * 100),
    isUnlocked: (stats) => completedGoals(stats) >= 1,
  },
  {
    id: "3-metas-concluidas",
    title: "Mestre das Metas",
    description: "Concluiu 3 metas.",
    category: "Metas",
    icon: Trophy,
    tier: "gold",
    getProgress: (stats) => Math.min(100, (completedGoals(stats) / 3) * 100),
    isUnlocked: (stats) => completedGoals(stats) >= 3,
  },
  {
    id: "primeira-divida",
    title: "Frente a Frente",
    description: "Registrou a primeira dívida.",
    category: "Dívidas",
    icon: HeartHandshake,
    tier: "bronze",
    getProgress: (stats) => Math.min(100, stats.debts.length * 100),
    isUnlocked: (stats) => stats.debts.length >= 1,
  },
  {
    id: "divida-quitada",
    title: "Dívida Zerada",
    description: "Quitou a primeira dívida.",
    category: "Dívidas",
    icon: ShieldCheck,
    tier: "silver",
    getProgress: (stats) => Math.min(100, paidDebts(stats) * 100),
    isUnlocked: (stats) => paidDebts(stats) >= 1,
  },
  {
    id: "primeira-conta-fixa",
    title: "Conta em Dia",
    description: "Criou a primeira conta fixa.",
    category: "Contas fixas",
    icon: CalendarCheck2,
    tier: "bronze",
    getProgress: (stats) => Math.min(100, stats.fixedExpenses.length * 100),
    isUnlocked: (stats) => stats.fixedExpenses.length >= 1,
  },
  {
    id: "3-contas-fixas",
    title: "Rotina Travada",
    description: "Criou 3 contas fixas.",
    category: "Contas fixas",
    icon: CalendarCheck2,
    tier: "silver",
    getProgress: (stats) => Math.min(100, (stats.fixedExpenses.length / 3) * 100),
    isUnlocked: (stats) => stats.fixedExpenses.length >= 3,
  },
  {
    id: "contas-pagas",
    title: "Mês em Ordem",
    description: "Marcou pelo menos uma conta fixa como paga.",
    category: "Contas fixas",
    icon: ShieldCheck,
    tier: "silver",
    getProgress: (stats) => Math.min(100, paidFixedExpenses(stats) * 100),
    isUnlocked: (stats) => paidFixedExpenses(stats) >= 1,
  },
  {
    id: "grupo-criado",
    title: "Casal Vinculado",
    description: "Criou um grupo de casal.",
    category: "Casal",
    icon: HeartHandshake,
    tier: "bronze",
    getProgress: (stats) => (stats.couple ? 100 : 0),
    isUnlocked: (stats) => Boolean(stats.couple),
  },
  {
    id: "parceiro-vinculado",
    title: "Dupla Completa",
    description: "Vinculou os dois membros no grupo.",
    category: "Casal",
    icon: Users,
    tier: "silver",
    getProgress: (stats) => Math.min(100, ((stats.couple?.members.length ?? 0) / 2) * 100),
    isUnlocked: (stats) => (stats.couple?.members.length ?? 0) >= 2,
  },
  {
    id: "saldo-positivo",
    title: "Saldo Positivo",
    description: "Manteve o saldo acima de zero.",
    category: "Patrimônio",
    icon: CircleDollarSign,
    tier: "bronze",
    getProgress: (stats) => (stats.dashboard && Number(stats.dashboard.balance) > 0 ? 100 : 0),
    isUnlocked: (stats) => Boolean(stats.dashboard && Number(stats.dashboard.balance) > 0),
  },
  {
    id: "reserva-ideal",
    title: "Reserva Ideal",
    description: "Atingiu a reserva recomendada.",
    category: "Patrimônio",
    icon: PiggyBank,
    tier: "gold",
    getProgress: (stats) => {
      if (!stats.dashboard) return 0;
      const balance = Number(stats.dashboard.balance);
      const reserve = Number(stats.dashboard.recommended_reserve);
      return reserve > 0 ? Math.min(100, (balance / reserve) * 100) : 0;
    },
    isUnlocked: (stats) => {
      if (!stats.dashboard) return false;
      return Number(stats.dashboard.balance) >= Number(stats.dashboard.recommended_reserve);
    },
  },
  {
    id: "patrimonio-saudavel",
    title: "Patrimônio Saudável",
    description: "Teve patrimônio líquido positivo.",
    category: "Patrimônio",
    icon: ShieldCheck,
    tier: "silver",
    getProgress: (stats) => (stats.dashboard && Number(stats.dashboard.net_worth) > 0 ? 100 : 0),
    isUnlocked: (stats) => Boolean(stats.dashboard && Number(stats.dashboard.net_worth) > 0),
  },
  {
    id: "100-xp",
    title: "XP Inicial",
    description: "Alcançou 100 XP.",
    category: "XP",
    icon: Medal,
    tier: "bronze",
    getProgress: (stats) => Math.min(100, (stats.user.total_xp / 100) * 100),
    isUnlocked: (stats) => stats.user.total_xp >= 100,
  },
  {
    id: "500-xp",
    title: "Economista",
    description: "Alcançou 500 XP.",
    category: "XP",
    icon: Medal,
    tier: "silver",
    getProgress: (stats) => Math.min(100, (stats.user.total_xp / 500) * 100),
    isUnlocked: (stats) => stats.user.total_xp >= 500,
  },
  {
    id: "1000-xp",
    title: "Casal Exemplar",
    description: "Alcançou 1000 XP.",
    category: "XP",
    icon: Trophy,
    tier: "gold",
    getProgress: (stats) => Math.min(100, (stats.user.total_xp / 1000) * 100),
    isUnlocked: (stats) => stats.user.total_xp >= 1000,
  },
  {
    id: "ranking-top-10",
    title: "Top 10 Social",
    description: "Entrou no top 10 do ranking geral.",
    category: "Rede",
    icon: Search,
    tier: "silver",
    getProgress: rankingProgress,
    isUnlocked: (stats) => Boolean(stats.rankingPosition && stats.rankingPosition <= 10),
  },
  {
    id: "social-ativa",
    title: "Rede Ativa",
    description: "Encontrou outros perfis no ranking.",
    category: "Rede",
    icon: Users,
    tier: "bronze",
    getProgress: (stats) => Math.min(100, stats.ranking.length * 10),
    isUnlocked: (stats) => stats.ranking.length >= 1,
  },
  {
    id: "perfil-atualizado",
    title: "Perfil Atualizado",
    description: "Atualizou as informações de perfil.",
    category: "Perfil",
    icon: Sparkles,
    tier: "silver",
    getProgress: (stats) => (stats.profileComplete ? 100 : 40),
    isUnlocked: (stats) => stats.profileComplete,
  },
  {
    id: "badges-colecionados",
    title: "Colecionador",
    description: "Conquistou 4 badges reais.",
    category: "Badges",
    icon: BadgeCheck,
    tier: "gold",
    getProgress: (stats) => Math.min(100, (unlockedBadgeCount(stats) / 4) * 100),
    isUnlocked: (stats) => unlockedBadgeCount(stats) >= 4,
  },
  {
    id: "dashboard-ativo",
    title: "Visão Geral",
    description: "Acompanhou o painel financeiro.",
    category: "Dashboard",
    icon: BarChart3,
    tier: "bronze",
    getProgress: (stats) => (stats.dashboard ? 100 : 0),
    isUnlocked: (stats) => Boolean(stats.dashboard),
  },
];

export const ACHIEVEMENT_TARGET = 30;

export function buildAchievementStates(stats: AchievementStats): AchievementState[] {
  return rules.slice(0, ACHIEVEMENT_TARGET).map((rule) => ({
    id: rule.id,
    title: rule.title,
    description: rule.description,
    category: rule.category,
    icon: rule.icon,
    tier: rule.tier,
    unlocked: rule.isUnlocked(stats),
    progress: Math.max(0, Math.min(100, Math.round(rule.getProgress(stats)))),
  }));
}
