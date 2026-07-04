<template>
  <div class="app-shell">
    <RouterView />
    <BottomNav v-if="showBottomNav" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from "vue";
import { useRoute } from "vue-router";
import BottomNav from "@/components/BottomNav.vue";
import { useAuthStore } from "@/stores/auth";

const route = useRoute();
const auth = useAuthStore();

const showBottomNav = computed(() => auth.isAuthed && Boolean(route.meta.mainTab));

onMounted(() => {
  if (auth.isAuthed) {
    auth.loadMe().catch(() => auth.logout());
  }
});
</script>
