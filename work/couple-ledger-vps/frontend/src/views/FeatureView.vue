<template>
  <PageScaffold
    :title="data.title"
    :subtitle="data.subtitle"
    :eyebrow="data.eyebrow"
    :icon="data.icon"
    :with-nav="Boolean(route.meta.mainTab)"
  >
    <template #actions>
      <ScopeSwitch v-if="!route.meta.public" />
      <RouterLink v-for="action in data.actions || []" :key="action.label" class="btn btn-secondary" :to="action.to || '/home'">
        {{ action.label }}
      </RouterLink>
    </template>

    <div class="grid">
      <MetricCard
        v-for="panel in panels"
        :key="panel.label"
        class="span-4"
        :label="panel.label"
        :value="panel.value"
        :detail="panel.detail"
        :tone="panel.tone"
      />

      <section class="card panel span-12">
        <h2 class="panel-title">{{ data.title }}工作台</h2>
        <div class="grid">
          <div class="span-4 stack">
            <strong>数据源</strong>
            <span class="muted">沿用当前 `/api`、`cl_auth` 和 Vue 路由。</span>
          </div>
          <div class="span-4 stack">
            <strong>迁移顺序</strong>
            <span class="muted">先补真实数据，再替换交互，最后接入线上构建。</span>
          </div>
          <div class="span-4 stack">
            <strong>验证标准</strong>
            <span class="muted">构建、静态检查、后端测试和公网健康检查全部通过。</span>
          </div>
        </div>
      </section>
    </div>
  </PageScaffold>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import MetricCard from "@/components/MetricCard.vue";
import PageScaffold from "@/components/PageScaffold.vue";
import ScopeSwitch from "@/components/ScopeSwitch.vue";
import type { FeatureMeta } from "@/types/router";

const route = useRoute();

const data = computed<FeatureMeta>(() => {
  const feature = route.meta.feature;
  return {
    title: feature?.title || route.meta.title || "情侣记账",
    subtitle: feature?.subtitle || "",
    eyebrow: feature?.eyebrow,
    icon: feature?.icon,
    panels: feature?.panels || [],
    actions: feature?.actions || []
  };
});

const panels = computed(() =>
  data.value.panels?.length
    ? data.value.panels
    : [
        { label: "状态", value: "待接入", detail: "保持当前线上功能可用" },
        { label: "范围", value: "个人/情侣", detail: "沿用现有权限模型" },
        { label: "节奏", value: "小步迭代", detail: "每轮可验证可回滚" }
      ]
);
</script>
