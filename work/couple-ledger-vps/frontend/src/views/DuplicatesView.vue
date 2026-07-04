<template>
  <PageScaffold
    title="重复账单"
    subtitle="按导入去重规则查找日期、类型、金额、备注一致的流水，删除前必须人工确认。"
    :icon="CopyCheck"
  >
    <template #actions>
      <ScopeSwitch />
      <input v-model="month" class="input" style="width: 150px" type="month" aria-label="筛选月份" />
      <button class="icon-btn" type="button" aria-label="刷新重复账单" :disabled="loading" @click="loadDuplicates()">
        <RefreshCw :size="18" :stroke-width="2.1" />
      </button>
    </template>

    <div class="grid">
      <MetricCard class="span-3" label="重复组" :value="String(response.total_groups)" detail="需要人工确认" :icon="CopyCheck" :tone="response.total_groups ? 'warn' : 'good'" />
      <MetricCard class="span-3" label="多余笔数" :value="String(response.total_duplicates)" detail="建议删除前复核" :icon="ReceiptText" :tone="response.total_duplicates ? 'warn' : 'good'" />
      <MetricCard class="span-3" label="疑似重复金额" :value="money(duplicateAmount)" detail="按多余笔数估算" :icon="CircleDollarSign" :tone="duplicateAmount ? 'warn' : 'neutral'" />
      <MetricCard class="span-3" label="处理方式" value="人工确认" detail="不会自动删账" :icon="ShieldCheck" tone="good" />

      <section class="card panel span-12">
        <div class="row between" style="margin-bottom: 12px">
          <div>
            <h2 class="panel-title">候选列表</h2>
            <span class="muted">{{ scopeLabel }} · {{ month || "全部月份" }}</span>
          </div>
          <RouterLink class="btn btn-secondary" to="/ledger">返回账本</RouterLink>
        </div>

        <div v-if="error" class="form-error">{{ error }}</div>
        <div v-else-if="loading" class="empty-state">
          <RefreshCw :size="24" />
          <strong>正在检查重复账单</strong>
        </div>
        <div v-else-if="response.groups.length === 0" class="empty-state">
          <ShieldCheck :size="30" />
          <strong>没有发现疑似重复</strong>
          <span>当前范围和月份下没有日期、类型、金额、备注完全一致的流水。</span>
        </div>
        <div v-else class="duplicate-list">
          <article v-for="group in response.groups" :key="groupKey(group)" class="duplicate-group">
            <header class="duplicate-head">
              <div>
                <p class="list-title">
                  {{ shortDate(group.key.tx_date) }} · {{ group.key.type === "income" ? "收入" : "支出" }} · {{ money(group.key.amount) }}
                </p>
                <p class="list-subtitle">
                  {{ group.key.note || "无备注" }} · {{ group.categories.join(" / ") || "未分类" }}
                </p>
              </div>
              <span class="status-pill" :class="group.confidence === 'high' ? 'warn' : ''">{{ group.reason }}</span>
            </header>

            <div class="list">
              <article v-for="tx in group.transactions" :key="tx.id" class="tx-row">
                <div class="list-main">
                  <span class="list-icon">
                    <ReceiptText :size="18" :stroke-width="2.1" />
                  </span>
                  <div style="min-width: 0">
                    <p class="list-title">{{ tx.category }} · {{ money(tx.amount) }}</p>
                    <p class="list-subtitle">{{ tx.tx_date }} · {{ tx.note || "无备注" }}</p>
                  </div>
                  <span v-if="tx.id === group.recommended_keep_id" class="status-pill good">建议保留</span>
                </div>
                <button
                  v-if="group.removable_ids.includes(tx.id)"
                  class="btn btn-danger"
                  type="button"
                  :disabled="deletingId === tx.id"
                  @click="deleteDuplicate(tx)"
                >
                  <Trash2 :size="16" :stroke-width="2.2" />
                  {{ deletingId === tx.id ? "删除中" : "删除这笔" }}
                </button>
              </article>
            </div>
          </article>
        </div>
      </section>
    </div>
  </PageScaffold>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { CircleDollarSign, CopyCheck, ReceiptText, RefreshCw, ShieldCheck, Trash2 } from "@lucide/vue";
import MetricCard from "@/components/MetricCard.vue";
import PageScaffold from "@/components/PageScaffold.vue";
import ScopeSwitch from "@/components/ScopeSwitch.vue";
import { api } from "@/lib/api";
import { money, monthKey, shortDate } from "@/lib/format";
import { useUiStore } from "@/stores/ui";
import type { DuplicateGroup, DuplicateResponse, Transaction } from "@/types/api";

const ui = useUiStore();
const month = ref(monthKey());
const loading = ref(false);
const deletingId = ref("");
const error = ref("");
const response = ref<DuplicateResponse>({
  scope: ui.scope,
  month: month.value,
  total_groups: 0,
  total_duplicates: 0,
  groups: []
});

const scopeLabel = computed(() => (ui.scope === "couple" ? "情侣账本" : "个人账本"));
const duplicateAmount = computed(() => response.value.groups.reduce((sum, group) => sum + group.duplicate_amount, 0));

function groupKey(group: DuplicateGroup) {
  return `${group.key.tx_date}-${group.key.type}-${group.key.amount}-${group.key.note}`;
}

async function loadDuplicates() {
  loading.value = true;
  error.value = "";
  try {
    const query = new URLSearchParams({ scope: ui.scope });
    if (month.value) {
      query.set("month", month.value);
    }
    response.value = await api.get<DuplicateResponse>(`/transactions/duplicates?${query.toString()}`);
  } catch (err) {
    error.value = err instanceof Error ? err.message : "重复账单检查失败";
    response.value = { scope: ui.scope, month: month.value, total_groups: 0, total_duplicates: 0, groups: [] };
  } finally {
    loading.value = false;
  }
}

async function deleteDuplicate(tx: Transaction) {
  const ok = window.confirm(`确认删除「${tx.category} ${money(tx.amount)}」这笔疑似重复账单？`);
  if (!ok) {
    return;
  }
  deletingId.value = tx.id;
  error.value = "";
  try {
    await api.del(`/transactions/${tx.id}`);
    await loadDuplicates();
  } catch (err) {
    error.value = err instanceof Error ? err.message : "删除失败";
  } finally {
    deletingId.value = "";
  }
}

onMounted(loadDuplicates);
watch(() => ui.scope, loadDuplicates);
watch(month, loadDuplicates);
</script>
