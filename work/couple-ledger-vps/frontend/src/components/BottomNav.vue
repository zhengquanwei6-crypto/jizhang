<template>
  <nav class="bottom-nav" aria-label="主导航">
    <button
      v-for="item in mainTabs"
      :key="item.path"
      type="button"
      :class="{ active: isActive(item.path) }"
      @click="go(item.path)"
    >
      <component :is="item.icon" :size="20" :stroke-width="2.1" />
      <span>{{ item.label }}</span>
    </button>
  </nav>
</template>

<script setup lang="ts">
import { useRoute, useRouter } from "vue-router";
import { mainTabs } from "@/router";

const route = useRoute();
const router = useRouter();

function isActive(path: string) {
  return path === "/pet" ? route.path === "/pet" || route.path === "/jelly" : route.path === path;
}

function go(path: string) {
  if (route.path !== path) {
    router.push(path);
  }
}
</script>
