<template>
  <PageScaffold
    title="情侣记账"
    subtitle="今日现金流、账户状态和常用入口。"
    :icon="Home"
    :with-nav="true"
  >
    <template #actions>
      <ScopeSwitch />
      <button class="icon-btn" type="button" aria-label="切换主题" @click="ui.toggleTheme()">
        <Moon :size="18" :stroke-width="2.1" />
      </button>
    </template>

    <div class="grid">
      <MetricCard class="span-3" label="服务状态" :value="healthLabel" :detail="healthDetail" :icon="Activity" :tone="healthTone" />
      <MetricCard class="span-3" label="本月收入" :value="money(summary.income || 0)" detail="当前范围" :icon="TrendingUp" tone="good" />
      <MetricCard class="span-3" label="本月支出" :value="money(summary.expense || 0)" detail="不含转账" :icon="TrendingDown" tone="danger" />
      <MetricCard class="span-3" label="账户净值" :value="money(summary.net_worth || 0)" detail="账户余额合计" :icon="Landmark" />

      <section class="card panel span-8">
        <div class="row between">
          <h2 class="panel-title">快速入口</h2>
          <RouterLink class="btn btn-secondary" to="/ledger">
            <Plus :size="17" :stroke-width="2.2" />
            记一笔
          </RouterLink>
        </div>
        <div class="grid">
          <RouterLink v-for="item in shortcuts" :key="item.to" class="card metric-card span-4" :to="item.to">
            <span class="metric-label">
              <span>{{ item.label }}</span>
              <component :is="item.icon" :size="18" />
            </span>
            <strong class="metric-value">{{ item.value }}</strong>
            <span class="metric-detail">{{ item.detail }}</span>
          </RouterLink>
        </div>
      </section>

      <section class="card panel span-4">
        <h2 class="panel-title">账户</h2>
        <div class="stack">
          <div v-if="accounts.length === 0" class="muted">暂无账户数据</div>
          <div v-for="account in accounts.slice(0, 5)" :key="account.id" class="row between">
            <span>{{ account.name }}</span>
            <strong>{{ money(account.balance, account.currency) }}</strong>
          </div>
        </div>
      </section>
    </div>
  </PageScaffold>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { Activity, BarChart3, Bot, Heart, Home, Landmark, Moon, Plus, ReceiptText, TrendingDown, TrendingUp } from "@lucide/vue";
import MetricCard from "@/components/MetricCard.vue";
import PageScaffold from "@/components/PageScaffold.vue";
import ScopeSwitch from "@/components/ScopeSwitch.vue";
import { api } from "@/lib/api";
import { money, monthKey } from "@/lib/format";
import { useAuthStore } from "@/stores/auth";
import { useUiStore } from "@/stores/ui";
import type { Account, HealthResponse, StatsSummary } from "@/types/api";

const auth = useAuthStore();
const ui = useUiStore();
const health = ref<"checking" | "ok" | "down">("checking");
const healthError = ref("");
const summary = ref<StatsSummary>({});
const accounts = ref<Account[]>([]);

const shortcuts = [
  { to: "/ledger", label: "账本", value: "流水", detail: "收入支出", icon: ReceiptText },
  { to: "/stats", label: "统计", value: "趋势", detail: "预算对比", icon: BarChart3 },
  { to: "/couple", label: "空间", value: "共同", detail: "目标纪念日", icon: Heart },
  { to: "/jelly", label: "Jelly AI", value: "解析", detail: "批量记账", icon: Bot }
];

const healthLabel = computed(() => (health.value === "ok" ? "正常" : health.value === "down" ? "异常" : "检查中"));
const healthTone = computed(() => (health.value === "ok" ? "good" : health.value === "down" ? "danger" : "warn"));
const healthDetail = computed(() => healthError.value || "/api/health");

async function loadHealth() {
  try {
    await api.get<HealthResponse>("/health", { auth: false });
    health.value = "ok";
    healthError.value = "";
  } catch (err) {
    health.value = "down";
    healthError.value = err instanceof Error ? err.message : "健康检查失败";
  }
}

async function loadDashboard() {
  if (!auth.isAuthed) {
    summary.value = {};
    accounts.value = [];
    return;
  }
  const scope = ui.scope;
  try {
    const [summaryData, accountData] = await Promise.all([
      api.get<StatsSummary>(`/stats/summary?scope=${scope}&month=${monthKey()}`),
      api.get<Account[]>(`/accounts?scope=${scope}`)
    ]);
    summary.value = summaryData;
    accounts.value = accountData;
  } catch {
    summary.value = {};
    accounts.value = [];
  }
}

onMounted(() => {
  loadHealth();
  loadDashboard();
});

watch(() => ui.scope, loadDashboard);
</script>
