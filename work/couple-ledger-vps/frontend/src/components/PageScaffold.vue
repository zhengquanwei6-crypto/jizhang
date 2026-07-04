<template>
  <section class="page" :class="{ 'with-nav': withNav }">
    <header class="page-header">
      <div>
        <p v-if="eyebrow" class="eyebrow">{{ eyebrow }}</p>
        <div class="page-title-row">
          <span v-if="icon" class="page-icon">
            <component :is="icon" :size="20" :stroke-width="2.2" />
          </span>
          <h1>{{ title }}</h1>
        </div>
        <p v-if="subtitle" class="page-subtitle">{{ subtitle }}</p>
      </div>
      <div v-if="$slots.actions" class="toolbar">
        <slot name="actions" />
      </div>
    </header>
    <slot />
  </section>
</template>

<script setup lang="ts">
import type { Component } from "vue";

defineProps<{
  title: string;
  subtitle?: string;
  eyebrow?: string;
  icon?: Component;
  withNav?: boolean;
}>();
</script>
