import { createRouter, createWebHistory, type RouteRecordRaw } from "vue-router";
import {
  Archive,
  BarChart3,
  Bot,
  CalendarClock,
  ChartPie,
  CircleDollarSign,
  CopyCheck,
  Flag,
  Heart,
  Home,
  Landmark,
  LayoutDashboard,
  MessageCircle,
  PiggyBank,
  ReceiptText,
  Settings,
  Tags,
  User,
  WalletCards
} from "@lucide/vue";
import { useAuthStore } from "@/stores/auth";
import AuthView from "@/views/AuthView.vue";
import AccountsView from "@/views/AccountsView.vue";
import DuplicatesView from "@/views/DuplicatesView.vue";
import FeatureView from "@/views/FeatureView.vue";
import HomeView from "@/views/HomeView.vue";
import LedgerView from "@/views/LedgerView.vue";

export const mainTabs = [
  { path: "/home", label: "首页", icon: Home },
  { path: "/ledger", label: "账本", icon: ReceiptText },
  { path: "/couple", label: "空间", icon: Heart },
  { path: "/pet", label: "果冻", icon: Bot },
  { path: "/mine", label: "我的", icon: User }
] as const;

const feature = (
  title: string,
  subtitle: string,
  panels: string[],
  icon = LayoutDashboard,
  actions: { label: string; to?: string }[] = []
) => ({
  title,
  feature: {
    title,
    subtitle,
    icon,
    actions,
    panels: panels.map((label) => ({ label, value: "待接入", detail: "Round 017+ 逐页迁移" }))
  }
});

const routes: RouteRecordRaw[] = [
  { path: "/", redirect: "/home" },
  {
    path: "/login",
    component: AuthView,
    props: { mode: "login" },
    meta: { public: true, title: "登录" }
  },
  {
    path: "/register",
    component: AuthView,
    props: { mode: "register" },
    meta: { public: true, title: "注册" }
  },
  {
    path: "/reset-password",
    component: FeatureView,
    meta: {
      public: true,
      ...feature("重置密码", "通过邮箱找回账户访问权限。", ["邮箱验证", "新密码"], Settings)
    }
  },
  {
    path: "/legal",
    component: FeatureView,
    meta: {
      public: true,
      ...feature("隐私与条款", "账户、数据与情侣空间的边界说明。", ["隐私政策", "服务条款"], Flag)
    }
  },
  {
    path: "/home",
    component: HomeView,
    meta: { mainTab: true, title: "首页" }
  },
  {
    path: "/ledger",
    component: LedgerView,
    meta: {
      mainTab: true,
      ...feature("账本", "收入、支出、转账与分账在同一处处理。", ["今日流水", "快速记账", "批量录入"], ReceiptText, [
        { label: "查重复", to: "/duplicates" }
      ])
    }
  },
  {
    path: "/duplicates",
    component: DuplicatesView,
    meta: feature("重复账单", "找出导入或批量记账后可能重复的流水。", ["重复组", "多余笔数", "人工确认"], CopyCheck)
  },
  {
    path: "/stats",
    component: FeatureView,
    meta: feature("统计", "把月度现金流、分类趋势和净资产放到可对比视图。", ["本月结余", "分类占比", "净资产走势"], BarChart3)
  },
  {
    path: "/chat",
    component: FeatureView,
    meta: feature("聊天", "伴侣消息与 @果冻 的账本问答。", ["未读消息", "AI 回复", "图片消息"], MessageCircle)
  },
  {
    path: "/mine",
    component: FeatureView,
    meta: {
      mainTab: true,
      ...feature("我的", "账户资料、偏好、导入导出和安全设置。", ["个人资料", "数据总览", "登录设备"], User)
    }
  },
  {
    path: "/accounts",
    component: AccountsView,
    meta: feature("账户", "现金、银行卡、支付宝、微信和信用账户余额。", ["总资产", "账户列表", "转账"], WalletCards)
  },
  {
    path: "/budgets",
    component: FeatureView,
    meta: feature("预算", "总预算和分类预算的月度跟踪。", ["月预算", "分类预算", "超支提醒"], ChartPie)
  },
  {
    path: "/categories",
    component: FeatureView,
    meta: feature("分类", "收入支出分类、图标和排序。", ["支出分类", "收入分类", "排序"], Tags)
  },
  {
    path: "/couple",
    component: FeatureView,
    meta: {
      mainTab: true,
      ...feature("情侣空间", "共同目标、纪念日、愿望清单和共享便签。", ["情侣状态", "共同目标", "纪念日"], Heart)
    }
  },
  {
    path: "/pet",
    component: FeatureView,
    meta: {
      mainTab: true,
      ...feature("爱情养成", "果冻仔状态、互动与成长任务。", ["心情", "饱食", "任务"], Bot)
    }
  },
  {
    path: "/savings",
    component: FeatureView,
    meta: feature("存钱计划", "固定储蓄、月度目标和储备金底线。", ["目标金额", "本月建议", "安全垫"], PiggyBank)
  },
  {
    path: "/archives",
    component: FeatureView,
    meta: feature("历史账本", "分手或解绑后的旧情侣账本归档。", ["归档列表", "历史摘要", "交易查询"], Archive)
  },
  {
    path: "/recurring",
    component: FeatureView,
    meta: feature("周期账单", "房租、订阅、工资等固定周期收支。", ["即将到期", "自动生成", "暂停规则"], CalendarClock)
  },
  {
    path: "/jelly",
    component: FeatureView,
    meta: feature("Jelly AI", "记账解析、账本问答和行动建议。", ["自然语言记账", "批量解析", "月报建议"], CircleDollarSign)
  },
  {
    path: "/feedback",
    component: FeatureView,
    meta: feature("意见反馈", "问题、截图和处理状态。", ["我的反馈", "截图上传", "处理进度"], MessageCircle)
  },
  {
    path: "/admin",
    component: FeatureView,
    meta: {
      admin: true,
      ...feature("管理", "用户、公告、反馈和功能开关。", ["运营看板", "公告管理", "功能开关"], Landmark)
    }
  },
  { path: "/:pathMatch(.*)*", redirect: "/home" }
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 };
  }
});

router.beforeEach((to) => {
  const auth = useAuthStore();
  if (!to.meta.public && !auth.isAuthed) {
    return { path: "/login", query: { next: to.fullPath } };
  }
  if (to.meta.public && auth.isAuthed && !["/reset-password", "/legal"].includes(to.path)) {
    return "/home";
  }
  if (to.meta.admin && !auth.isAdmin) {
    return "/home";
  }
  return true;
});
