<template>
  <PageScaffold title="账本" subtitle="快速解析、复核、入账。" :icon="ReceiptText" :with-nav="true">
    <template #actions>
      <ScopeSwitch />
      <RouterLink class="btn btn-secondary" to="/duplicates">
        <CopyCheck :size="17" :stroke-width="2.1" />
        查重复
      </RouterLink>
    </template>

    <div class="grid">
      <MetricCard class="span-3" label="草稿" :value="String(items.length)" detail="本次解析" :icon="FileText" />
      <MetricCard class="span-3" label="可入账" :value="String(readyCount)" detail="金额完整" :icon="CheckCircle2" tone="good" />
      <MetricCard class="span-3" label="需复核" :value="String(reviewCount)" detail="保存前确认" :icon="CircleAlert" :tone="reviewCount ? 'warn' : 'neutral'" />
      <MetricCard class="span-3" label="净额" :value="money(incomeTotal - expenseTotal)" detail="收入减支出" :icon="CircleDollarSign" />

      <section class="card panel span-5">
        <div class="row between" style="margin-bottom: 12px">
          <div class="segmented" role="group" aria-label="记账模式">
            <button type="button" :class="{ active: mode === 'single' }" @click="mode = 'single'">单笔</button>
            <button type="button" :class="{ active: mode === 'batch' }" @click="mode = 'batch'">批量</button>
          </div>
          <label class="row muted" style="font-size: 13px">
            <input v-model="aiEnabled" type="checkbox" />
            AI
          </label>
        </div>

        <label class="field">
          <span>{{ mode === "single" ? "一句话记账" : "批量内容" }}</span>
          <textarea
            v-model="inputText"
            class="textarea"
            :placeholder="mode === 'single' ? '午餐28' : '午餐28\n打车36\n工资8000到账'"
          />
        </label>

        <div v-if="error" class="form-error">{{ error }}</div>

        <div class="row" style="justify-content: flex-end">
          <button class="btn btn-secondary" type="button" @click="clearDrafts">清空</button>
          <button class="btn btn-primary" type="button" :disabled="parsing || !inputText.trim()" @click="parseInput">
            <Sparkles :size="17" :stroke-width="2.1" />
            {{ parsing ? "解析中" : "解析" }}
          </button>
        </div>
      </section>

      <section class="card panel span-7">
        <div class="row between" style="margin-bottom: 12px">
          <div>
            <h2 class="panel-title">记账草稿</h2>
            <span class="muted">收入 {{ money(incomeTotal) }} · 支出 {{ money(expenseTotal) }}</span>
          </div>
          <button class="btn btn-secondary" type="button" :disabled="savingAll || readyCount === 0" @click="saveAll">
            <Save :size="17" :stroke-width="2.1" />
            {{ savingAll ? "保存中" : "保存可入账" }}
          </button>
        </div>

        <div v-if="items.length === 0" class="empty-state">
          <ReceiptText :size="30" />
          <strong>暂无草稿</strong>
          <span>解析后会在这里复核。</span>
        </div>

        <div v-else class="draft-list">
          <article v-for="(item, index) in items" :key="item.localId" class="draft-card">
            <header class="draft-head">
              <div>
                <p class="list-title">{{ item.source || `草稿 ${index + 1}` }}</p>
                <p class="list-subtitle">{{ item.reason || item.mode }}</p>
              </div>
              <span v-if="item.saved" class="status-pill good">已入账</span>
              <span v-else-if="item.needs_review" class="status-pill warn">需复核</span>
              <span v-else class="status-pill good">可入账</span>
            </header>

            <div class="form-grid">
              <label class="field">
                <span>类型</span>
                <select v-model="item.draft.type" class="input" :disabled="item.saved">
                  <option value="expense">支出</option>
                  <option value="income">收入</option>
                </select>
              </label>
              <label class="field">
                <span>金额</span>
                <input v-model.number="item.draft.amount" class="input" min="0" step="0.01" type="number" :disabled="item.saved" />
              </label>
              <label class="field">
                <span>分类</span>
                <input v-model.trim="item.draft.category" class="input" :disabled="item.saved" />
              </label>
              <label class="field">
                <span>日期</span>
                <input v-model="item.draft.tx_date" class="input" type="date" :disabled="item.saved" />
              </label>
            </div>

            <label class="field">
              <span>备注</span>
              <input v-model.trim="item.draft.note" class="input" :disabled="item.saved" />
            </label>

            <div v-if="item.error" class="form-error">{{ item.error }}</div>

            <div class="row" style="justify-content: flex-end">
              <button class="btn btn-secondary" type="button" :disabled="item.saved" @click="removeItem(index)">移除</button>
              <button class="btn btn-primary" type="button" :disabled="item.saved || item.saving || !canSave(item)" @click="saveItem(item)">
                <Save :size="17" :stroke-width="2.1" />
                {{ item.saving ? "保存中" : item.saved ? "已保存" : "入账" }}
              </button>
            </div>
          </article>
        </div>
      </section>
    </div>
  </PageScaffold>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { CheckCircle2, CircleAlert, CircleDollarSign, CopyCheck, FileText, ReceiptText, Save, Sparkles } from "@lucide/vue";
import MetricCard from "@/components/MetricCard.vue";
import PageScaffold from "@/components/PageScaffold.vue";
import ScopeSwitch from "@/components/ScopeSwitch.vue";
import { api } from "@/lib/api";
import { money } from "@/lib/format";
import { useUiStore } from "@/stores/ui";
import type { QuickDraft, QuickTransactionBatchResponse, QuickTransactionResult, Transaction } from "@/types/api";

type LedgerDraftItem = QuickTransactionResult & {
  localId: string;
  saved?: boolean;
  saving?: boolean;
  error?: string;
  transaction_id?: string;
};

const ui = useUiStore();
const mode = ref<"single" | "batch">("single");
const aiEnabled = ref(true);
const inputText = ref("");
const parsing = ref(false);
const savingAll = ref(false);
const error = ref("");
const items = ref<LedgerDraftItem[]>([]);

const readyItems = computed(() => items.value.filter((item) => !item.saved && canSave(item)));
const readyCount = computed(() => readyItems.value.length);
const reviewCount = computed(() => items.value.filter((item) => !item.saved && item.needs_review).length);
const incomeTotal = computed(() => items.value.reduce((sum, item) => sum + (item.draft.type === "income" ? Number(item.draft.amount || 0) : 0), 0));
const expenseTotal = computed(() => items.value.reduce((sum, item) => sum + (item.draft.type === "expense" ? Number(item.draft.amount || 0) : 0), 0));

function makeItem(result: QuickTransactionResult, fallbackSource: string): LedgerDraftItem {
  const draft = normalizeDraft(result.draft, fallbackSource);
  return {
    ...result,
    draft,
    localId: `${Date.now()}-${Math.random().toString(16).slice(2)}`
  };
}

function normalizeDraft(draft: QuickDraft, fallback: string): QuickDraft {
  return {
    amount: Number(draft?.amount || 0),
    category: String(draft?.category || "其他"),
    type: draft?.type === "income" ? "income" : "expense",
    note: String(draft?.note || fallback || "").slice(0, 60),
    tx_date: String(draft?.tx_date || new Date().toISOString().slice(0, 10)).slice(0, 10)
  };
}

function canSave(item: LedgerDraftItem) {
  return Number(item.draft.amount) > 0 && Boolean(item.draft.category) && Boolean(item.draft.tx_date);
}

async function parseInput() {
  parsing.value = true;
  error.value = "";
  try {
    if (mode.value === "single") {
      const result = await api.post<QuickTransactionResult>("/ai/quick-transaction", {
        text: inputText.value,
        scope: ui.scope,
        ai_enabled: aiEnabled.value
      });
      items.value = [makeItem(result, inputText.value)];
    } else {
      const result = await api.post<QuickTransactionBatchResponse>("/ai/quick-transactions", {
        text: inputText.value,
        scope: ui.scope,
        ai_enabled: aiEnabled.value
      });
      items.value = result.items.map((item) => makeItem(item, item.source || ""));
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : "解析失败";
  } finally {
    parsing.value = false;
  }
}

async function saveItem(item: LedgerDraftItem) {
  item.saving = true;
  item.error = "";
  try {
    const tx = await api.post<Transaction>("/transactions", {
      scope: ui.scope,
      amount: Number(item.draft.amount),
      category: item.draft.category,
      type: item.draft.type,
      note: item.draft.note,
      tx_date: item.draft.tx_date
    });
    item.saved = true;
    item.transaction_id = tx.id;
  } catch (err) {
    item.error = err instanceof Error ? err.message : "保存失败";
  } finally {
    item.saving = false;
  }
}

async function saveAll() {
  savingAll.value = true;
  try {
    for (const item of readyItems.value) {
      if (!item.saved) {
        await saveItem(item);
      }
    }
  } finally {
    savingAll.value = false;
  }
}

function removeItem(index: number) {
  items.value.splice(index, 1);
}

function clearDrafts() {
  inputText.value = "";
  items.value = [];
  error.value = "";
}
</script>
