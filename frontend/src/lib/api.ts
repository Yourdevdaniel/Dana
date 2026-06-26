import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "https://dana-8kpu.onrender.com/api",
});

// ── Types ────────────────────────────────────────────────────────────────────

export type ApiError = { field: string; message: string };

export type ApiResponse<T> = {
  success: boolean;
  data: T;
  message: string;
  errors: ApiError[] | string[] | string;
};

export type User = {
  id: string;
  email: string;
  name: string;
  avatar: string | null;
  date_of_birth: string | null;
  total_xp: number;
  is_email_verified: boolean;
  created_at: string;
};

export type AuthPayload = {
  user: User;
  access: string;
  refresh: string;
};

export type Session = AuthPayload;

export type CoupleGroup = {
  id: string;
  name: string;
  invite_code: string;
  members: User[];
  created_at: string;
};

export type CoupleDashboardItem = {
  user_id: string;
  name: string;
  balance: string;
  net_worth: string;
  monthly_average_expense: string;
  recommended_reserve: string;
  monthly_trend: Array<{ year: number; month: number; income: string; expense: string }>;
  financial_risk: string;
};

export type Wallet = {
  id: string;
  name: string;
  currency: string;
  balance: string;
  created_at: string;
};

export type Salary = {
  id: string;
  amount: string;
  effective_date: string;
  note: string;
  created_at: string;
};

export type Category = {
  id: string;
  name: string;
  type: "income" | "expense";
  icon: string;
  color: string;
  is_system: boolean;
  created_at: string;
};

export type Transaction = {
  id: string;
  amount: string;
  type: "income" | "expense";
  description: string;
  date: string;
  is_recurring: boolean;
  category: string | null;
  category_detail: Category | null;
  wallet: string;
  created_at: string;
};

export type Goal = {
  id: string;
  name: string;
  target_amount: string;
  current_amount: string;
  deadline: string | null;
  status: string;
  progress_percent: number;
  couple_group: string | null;
  created_at: string;
};

export type Debt = {
  id: string;
  creditor: string;
  amount: string;
  paid_amount: string;
  remaining: string;
  due_date: string | null;
  status: string;
  description: string;
  created_at: string;
};

export type FixedExpense = {
  id: string;
  name: string;
  amount: string;
  due_day: number;
  category: string | null;
  is_paid_this_month: boolean;
  last_paid_at: string | null;
  created_at: string;
};

export type Dashboard = {
  balance: string;
  net_worth: string;
  monthly_average_expense: string;
  recommended_reserve: string;
  monthly_trend: Array<{ year: number; month: number; income: string; expense: string }>;
  financial_risk: string;
};

export type BadgeAward = {
  id: string;
  badge: {
    id: string;
    name: string;
    description: string;
    icon: string;
    xp_reward: number;
    condition_type: string;
  };
  awarded_at: string;
};

export type XPHistory = {
  id: string;
  amount: number;
  reason: string;
  reference_id: string;
  created_at: string;
};

export type RankingItem = {
  rank: number;
  user: User;
  total_xp: number;
};

export type PublicProfile = {
  id: string;
  name: string;
  avatar: string | null;
  total_xp: number;
  created_at: string;
};

export type ProfileUpdatePayload = {
  name?: string;
  avatar?: string | null;
  date_of_birth?: string | null;
};

// ── Session helpers ───────────────────────────────────────────────────────────

const ACCESS_KEY = "finance-couple:access";
const REFRESH_KEY = "finance-couple:refresh";
const USER_KEY = "finance-couple:user";

export function saveSession(session: Session) {
  localStorage.setItem(ACCESS_KEY, session.access);
  localStorage.setItem(REFRESH_KEY, session.refresh);
  localStorage.setItem(USER_KEY, JSON.stringify(session.user));
}

export function updateSessionUser(user: User) {
  const session = readSession();
  if (!session) return;
  saveSession({ ...session, user });
}

export function readSession(): Session | null {
  const access = localStorage.getItem(ACCESS_KEY);
  const refresh = localStorage.getItem(REFRESH_KEY);
  const rawUser = localStorage.getItem(USER_KEY);
  if (!access || !refresh || !rawUser) return null;
  return { access, refresh, user: JSON.parse(rawUser) as User };
}

export function clearSession() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_KEY);
}

// ── Error helpers ─────────────────────────────────────────────────────────────

export class ApiAuthError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiAuthError";
    this.status = status;
  }
}

export function apiErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Não foi possível concluir a operação.";
}

function extractMessage(payload: ApiResponse<unknown>): string {
  let message = payload.message || "Não foi possível concluir a operação.";
  const errors = payload.errors;
  if (Array.isArray(errors) && errors.length > 0) {
    const first = errors[0] as Record<string, unknown>;
    if (first && typeof first.message === "string") message = first.message;
  } else if (typeof errors === "string" && errors) {
    message = errors;
  }
  return message;
}

// ── Interceptors ──────────────────────────────────────────────────────────────

api.interceptors.request.use((config) => {
  const session = readSession();
  if (session?.access) {
    config.headers.Authorization = `Bearer ${session.access}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => {
    const payload = response.data as ApiResponse<unknown>;
    if (payload && !payload.success) {
      return Promise.reject(new Error(extractMessage(payload)));
    }
    return response;
  },
  (error) => {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const payload = error.response?.data as ApiResponse<unknown> | undefined;

      if (status === 401) {
        clearSession();
        return Promise.reject(new ApiAuthError(
          payload ? extractMessage(payload) : "Sessão expirada.",
          401,
        ));
      }

      if (payload) {
        return Promise.reject(new Error(extractMessage(payload)));
      }
    }
    return Promise.reject(error instanceof Error ? error : new Error("Não foi possível concluir a operação."));
  },
);
