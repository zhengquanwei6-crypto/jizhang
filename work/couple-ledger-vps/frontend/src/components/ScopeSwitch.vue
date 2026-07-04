<template>
  <div class="scope-switch" role="group" aria-label="账本范围">
    <button :class="{ active: ui.scope === 'personal' }" type="button" @click="ui.setScope('personal')">个人</button>
    <button
      :class="{ active: ui.scope === 'couple' }"
      :disabled="!auth.hasCouple"
      type="button"
      @click="ui.setScope('couple')"
    >
      情侣
    </button>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from "@/stores/auth";
import { useUiStore } from "@/stores/ui";

const auth = useAuthStore();
const ui = useUiStore();
</script>
