<template>
  <main class="auth-page">
    <section class="card auth-card">
      <div class="auth-brand">
        <span class="auth-mark">
          <Heart :size="22" :stroke-width="2.3" />
        </span>
        <div>
          <h1>{{ isRegister ? "创建账户" : "欢迎回来" }}</h1>
          <p class="muted">{{ isRegister ? "开启新的情侣账本" : "继续打理你们的日常收支" }}</p>
        </div>
      </div>

      <form class="stack" @submit.prevent="submit">
        <label v-if="isRegister" class="field">
          <span>昵称</span>
          <input v-model.trim="nickname" class="input" autocomplete="nickname" required />
        </label>
        <label class="field">
          <span>邮箱</span>
          <input v-model.trim="email" class="input" autocomplete="email" inputmode="email" required />
        </label>
        <label class="field">
          <span>密码</span>
          <input v-model="password" class="input" autocomplete="current-password" type="password" required minlength="6" />
        </label>
        <p v-if="error" class="form-error">{{ error }}</p>
        <button class="btn btn-primary" type="submit" :disabled="loading">
          <LogIn :size="18" :stroke-width="2.2" />
          {{ loading ? "处理中" : isRegister ? "注册" : "登录" }}
        </button>
      </form>

      <p class="muted" style="margin: 16px 0 0">
        <RouterLink :to="isRegister ? '/login' : '/register'">
          {{ isRegister ? "已有账户，去登录" : "没有账户，去注册" }}
        </RouterLink>
      </p>
    </section>
  </main>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { Heart, LogIn } from "@lucide/vue";
import { useAuthStore } from "@/stores/auth";

const props = defineProps<{ mode: "login" | "register" }>();

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const email = ref("");
const password = ref("");
const nickname = ref("");
const loading = ref(false);
const error = ref("");

const isRegister = computed(() => props.mode === "register");

async function submit() {
  loading.value = true;
  error.value = "";
  try {
    if (isRegister.value) {
      await auth.register(email.value, password.value, nickname.value);
    } else {
      await auth.login(email.value, password.value);
    }
    const next = typeof route.query.next === "string" ? route.query.next : "/home";
    await router.replace(next);
  } catch (err) {
    error.value = err instanceof Error ? err.message : "请求失败";
  } finally {
    loading.value = false;
  }
}
</script>
