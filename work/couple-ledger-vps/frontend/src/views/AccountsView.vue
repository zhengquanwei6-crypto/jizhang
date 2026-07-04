<template>
  <PageScaffold
    title="账户"
    subtitle="把现金、银行卡、支付宝、微信和信用账户放在同一张表里看。"
    :icon="WalletCards"
  >
    <template #actions>
      <ScopeSwitch />
      <button class="icon-btn" type="button" aria-label="刷新账户" :disabled="loading" @click="loadAccounts()">
        <RefreshCw :size="18" :stroke-width="2.1" />
      </button>
      <button class="btn btn-secondary" type="button" :disabled="loading || recomputing" @click="recompute">
        <Calculator :size="17" :stroke-width="2.1" />
        {{ recomputing ? "校准中" : "校准余额" }}
      </button>
    </template>

    <div class="grid">
      <MetricCard class="span-3" label="账户净值" :value="money(totalBalance)" detail="当前范围账户余额" :icon="Landmark" />
      <MetricCard class="span-3" label="账户数量" :value="String(activeAccounts.length)" :detail="archivedDetail" :icon="ListChecks" />
      <MetricCard class="span-3" label="最高余额" :value="money(topAccount?.balance || 0, topAccount?.currency)" :detail="topAccount?.name || '暂无账户'" :icon="TrendingUp" tone="good" />
      <MetricCard class="span-3" label="待关注" :value="String(attentionCount)" detail="负数或已归档账户" :icon="CircleAlert" :tone="attentionCount ? 'warn' : 'neutral'" />

      <section class="card panel span-8">
        <div class="row between" style="margin-bottom: 12px">
          <div>
            <h2 class="panel-title">账户列表</h2>
            <span class="muted">{{ scopeLabel }} · {{ displayAccounts.length }} 个账户</span>
          </div>
          <label class="row muted" style="font-size: 13px">
            <input v-model="includeArchived" type="checkbox" />
            显示归档
          </label>
        </div>

        <div v-if="error" class="form-error">{{ error }}</div>
        <div v-else-if="loading" class="empty-state">
          <RefreshCw :size="24" />
          <strong>正在加载账户</strong>
        </div>
        <div v-else-if="displayAccounts.length === 0" class="empty-state">
          <WalletCards :size="30" />
          <strong>还没有账户</strong>
          <span>后续轮次会接入新增账户和转账表单。</span>
        </div>
        <div v-else class="list">
          <article v-for="account in displayAccounts" :key="account.id" class="list-row">
            <div class="list-main">
              <span class="list-icon">
                <component :is="kindIcon(account.kind)" :size="19" :stroke-width="2.1" />
              </span>
              <div style="min-width: 0">
                <p class="list-title">{{ account.name }}</p>
                <p class="list-subtitle">
                  {{ kindLabel(account.kind) }} · {{ account.currency }}
                  <span v-if="account.opening_balance !== undefined"> · 初始 {{ money(account.opening_balance, account.currency) }}</span>
                </p>
              </div>
              <span v-if="account.is_archived" class="status-pill warn">已归档</span>
            </div>
            <strong class="list-amount" :class="{ 'tone-danger': account.balance < 0, 'tone-good': account.balance > 0 }">
              {{ money(account.balance, account.currency) }}
            </strong>
          </article>
        </div>
      </section>

      <aside class="card panel span-4">
        <h2 class="panel-title">账户结构</h2>
        <div class="stack">
          <div v-for="item in kindGroups" :key="item.kind" class="row between">
            <span>{{ item.label }}</span>
            <strong>{{ money(item.total) }}</strong>
          </div>
          <div v-if="kindGroups.length === 0" class="muted">暂无可汇总数据</div>
        </div>
      </aside>
    </div>
  </PageScaffold>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import {
  Calculator,
  CircleAlert,
  CreditCard,
  Landmark,
  ListChecks,
  RefreshCw,
  Smartphone,
  TrendingUp,
  Wallet,
  WalletCards
} from "@lucide/vue";
import MetricCard from "@/components/MetricCard.vue";
import PageScaffold from "@/components/PageScaffold.vue";
import ScopeSwitch from "@/components/ScopeSwitch.vue";
import { api } from "@/lib/api";
import { money } from "@/lib/format";
import { useUiStore } from "@/stores/ui";
import type { Account, AccountKind } from "@/types/api";

const ui = useUiStore();
const accounts = ref<Account[]>([]);
const loading = ref(false);
const recomputing = ref(false);
const includeArchived = ref(false);
const error = ref("");

const kindLabels: Record<AccountKind, string> = {
  cash: "现金",
  debit_card: "储蓄卡",
  credit_card: "信用卡",
  alipay: "支付宝",
  wechat: "微信",
  other: "其他"
};

function kindLabel(kind: AccountKind) {
  return kindLabels[kind] || "其他";
}

function kindIcon(kind: AccountKind) {
  if (kind === "cash") return Wallet;
  if (kind === "alipay" || kind === "wechat") return Smartphone;
  if (kind === "credit_card" || kind === "debit_card") return CreditCard;
  return WalletCards;
}

const scopeLabel = computed(() => (ui.scope === "couple" ? "情侣账本" : "个人账本"));
const activeAccounts = computed(() => accounts.value.filter((account) => !account.is_archived));
const displayAccounts = computed(() => (includeArchived.value ? accounts.value : activeAccounts.value));
const archivedCount = computed(() => accounts.value.filter((account) => account.is_archived).length);
const archivedDetail = computed(() => (archivedCount.value ? `${archivedCount.value} 个已归档` : "不含归档账户"));
const totalBalance = computed(() => activeAccounts.value.reduce((sum, account) => sum + account.balance, 0));
const attentionCount = computed(() => accounts.value.filter((account) => account.balance < 0 || account.is_archived).length);
const topAccount = computed(() => [...activeAccounts.value].sort((a, b) => b.balance - a.balance)[0]);

const kindGroups = computed(() => {
  const groups = new Map<AccountKind, number>();
  for (const account of activeAccounts.value) {
    groups.set(account.kind, (groups.get(account.kind) || 0) + account.balance);
  }
  return [...groups.entries()]
    .map(([kind, total]) => ({ kind, label: kindLabel(kind), total }))
    .sort((a, b) => Math.abs(b.total) - Math.abs(a.total));
});

async function loadAccounts() {
  loading.value = true;
  error.value = "";
  try {
    const include = includeArchived.value ? "&include_archived=true" : "";
    accounts.value = await api.get<Account[]>(`/accounts?scope=${ui.scope}${include}`);
  } catch (err) {
    error.value = err instanceof Error ? err.message : "账户加载失败";
    accounts.value = [];
  } finally {
    loading.value = false;
  }
}

async function recompute() {
  recomputing.value = true;
  error.value = "";
  try {
    accounts.value = await api.post<Account[]>(`/accounts/recompute?scope=${ui.scope}`);
  } catch (err) {
    error.value = err instanceof Error ? err.message : "余额校准失败";
  } finally {
    recomputing.value = false;
  }
}

onMounted(loadAccounts);
watch(() => ui.scope, loadAccounts);
watch(includeArchived, loadAccounts);
</script>
