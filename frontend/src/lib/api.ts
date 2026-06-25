const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api";

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

export type Session = AuthPayload;

export class ApiAuthError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiAuthError";
    this.status = status;
  }
}

export type ProfileUpdatePayload = {
  name?: string;
  avatar?: string | null;
  date_of_birth?: string | null;
};

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

export function apiErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Nao foi possivel concluir a operacao.";
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  accessToken?: string,
): Promise<ApiResponse<T>> {
  const hasFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...(!hasFormData ? { "Content-Type": "application/json" } : {}),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...options.headers,
    },
  });

  const payload = (await response.json().catch(() => ({
    success: false,
    data: {},
    message: "Nao foi possivel concluir a operacao.",
    errors: [],
  }))) as ApiResponse<T>;

  if (!response.ok || !payload.success) {
    let message = payload.message || "Nao foi possivel concluir a operacao.";
    const errors = payload.errors;
    if (Array.isArray(errors) && errors.length > 0) {
      const first = errors[0] as Record<string, unknown>;
      if (first && typeof first.message === "string") {
        message = first.message;
      }
    } else if (typeof errors === "string") {
      message = errors;
    }
    if (response.status === 401 && accessToken) {
      throw new ApiAuthError(message, response.status);
    }
    throw new Error(message);
  }

  return payload;
}

export function body(data: Record<string, unknown>): RequestInit {
  return { method: "POST", body: JSON.stringify(data) };
}

export function patchBody(data: Record<string, unknown>): RequestInit {
  return { method: "PATCH", body: JSON.stringify(data) };
}
