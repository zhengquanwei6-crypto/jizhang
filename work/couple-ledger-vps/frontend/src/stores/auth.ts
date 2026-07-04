import { defineStore } from "pinia";
import { api } from "@/lib/api";
import { clearAuthSession, readAuthSession, writeAuthSession } from "@/lib/storage";
import type { TokenResponse, User } from "@/types/api";

type AuthState = {
  accessToken: string;
  refreshToken: string;
  user: User | null;
};

export const useAuthStore = defineStore("auth", {
  state: (): AuthState => {
    const session = readAuthSession();
    return {
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      user: session.user
    };
  },
  getters: {
    isAuthed: (state) => Boolean(state.accessToken),
    hasCouple: (state) => Boolean(state.user?.couple_id),
    isAdmin: (state) => Boolean(state.user?.is_admin)
  },
  actions: {
    persist() {
      writeAuthSession({
        accessToken: this.accessToken,
        refreshToken: this.refreshToken,
        user: this.user
      });
    },
    setSession(session: TokenResponse) {
      this.accessToken = session.access_token;
      this.refreshToken = session.refresh_token || "";
      this.user = session.user;
      this.persist();
    },
    setUser(user: User) {
      this.user = user;
      this.persist();
    },
    async login(email: string, password: string) {
      const session = await api.post<TokenResponse>(
        "/auth/login",
        { email, password, device_name: "Vue Source Preview" },
        { auth: false }
      );
      this.setSession(session);
    },
    async register(email: string, password: string, nickname: string) {
      const session = await api.post<TokenResponse>(
        "/auth/register",
        { email, password, nickname },
        { auth: false }
      );
      this.setSession(session);
    },
    async loadMe() {
      if (!this.accessToken) {
        return;
      }
      const user = await api.get<User>("/auth/me");
      this.setUser(user);
    },
    logout() {
      this.accessToken = "";
      this.refreshToken = "";
      this.user = null;
      clearAuthSession();
    }
  }
});
