<template>
  <article class="card metric-card">
    <div class="metric-label">
      <span>{{ label }}</span>
      <component v-if="icon" :is="icon" :size="18" :stroke-width="2" />
    </div>
    <p class="metric-value" :class="toneClass">{{ value }}</p>
    <span v-if="detail" class="metric-detail">{{ detail }}</span>
  </article>
</template>

<script setup lang="ts">
import { computed, type Component } from "vue";

const props = defineProps<{
  label: string;
  value: string;
  detail?: string;
  icon?: Component;
  tone?: "neutral" | "good" | "warn" | "danger";
}>();

const toneClass = computed(() => (props.tone && props.tone !== "neutral" ? `tone-${props.tone}` : ""));
</script>
