export type Scope = "personal" | "couple";
export type TransactionType = "income" | "expense";
export type AccountKind = "cash" | "debit_card" | "credit_card" | "alipay" | "wechat" | "other";

export interface User {
  id: string;
  email?: string;
  nickname: string;
  avatar_url?: string | null;
  couple_id?: string | null;
  is_admin?: boolean;
}

export interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  token_type: "bearer";
  user: User;
}

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  user: User | null;
}

export interface Account {
  id: string;
  name: string;
  kind: AccountKind;
  balance: number;
  opening_balance?: number;
  currency: string;
  scope: Scope;
  is_archived?: boolean;
  created_at?: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  type: TransactionType;
  sort_order?: number;
}

export interface Transaction {
  id: string;
  scope: Scope;
  amount: number;
  category: string;
  type: TransactionType;
  note?: string;
  tx_date: string;
  account_id?: string | null;
  tx_kind?: "normal" | "transfer";
  paid_by?: string | null;
  split_type?: "none" | "aa" | "payer" | "partner";
  attributed_to?: string | null;
  created_at?: string;
}

export interface QuickDraft {
  amount: number;
  category: string;
  type: TransactionType;
  note: string;
  tx_date: string;
}

export interface QuickTransactionResult {
  mode: string;
  complex?: boolean;
  reason?: string;
  needs_review: boolean;
  source?: string;
  index?: number;
  draft: QuickDraft;
}

export interface QuickTransactionBatchResponse {
  scope: Scope;
  count: number;
  ready: number;
  needs_review: number;
  income: number;
  expense: number;
  items: QuickTransactionResult[];
}

export interface DuplicateGroup {
  key: {
    tx_date: string;
    type: TransactionType;
    amount: number;
    note: string;
  };
  count: number;
  duplicate_count: number;
  duplicate_amount: number;
  categories: string[];
  confidence: "high" | "medium" | string;
  reason: string;
  recommended_keep_id: string;
  removable_ids: string[];
  transactions: Transaction[];
}

export interface DuplicateResponse {
  scope: Scope;
  month: string | null;
  total_groups: number;
  total_duplicates: number;
  groups: DuplicateGroup[];
}

export interface HealthResponse {
  status: "ok" | string;
}

export interface StatsSummary {
  income?: number;
  expense?: number;
  balance?: number;
  net_worth?: number;
  transaction_count?: number;
  [key: string]: unknown;
}
