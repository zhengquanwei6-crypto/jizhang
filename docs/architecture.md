# CoupleSpaceAI 架构文档

## 1. 架构概述

本项目采用 **Clean Architecture** 与 **MVVM** 结合的分层架构：

```
┌─────────────────────────────────────────┐
│            Presentation Layer            │
│  (Screens / ViewModels / UI State)      │
├─────────────────────────────────────────┤
│              Domain Layer               │
│  (Use Cases / Repository Interfaces)     │
├─────────────────────────────────────────┤
│               Data Layer                │
│  (Room / DataStore / Retrofit / Mock)   │
└─────────────────────────────────────────┘
```

## 2. 模块职责

### app
- `CoupleSpaceApp`: Hilt Application
- `MainActivity`: 主 Activity，导航入口
- `SplashActivity`: 启动页
- `OnboardingActivity`: 首次引导
- `di/AppModule`: Hilt 依赖注入配置

### core:common
通用工具模块，提供：
- 扩展函数 (Context, String, Date)
- 工具类 (DateUtils, ToastUtils)
- 常量定义 (AppConstants)

### core:design
设计系统模块，包含：
- `theme/`: Color, Typography, Shape, Theme
- `components/`: 可复用 UI 组件库

### core:animation
动画工具模块：
- `Animations.kt`: 通用动画 Composable

### data:local
本地数据模块：
- `database/`: Room 数据库、Entity、DAO
- `datastore/`: DataStore 用户偏好
- `mock/`: Mock 数据生成器
- `repository/`: 各功能 Repository (Home, Account, Chat, Goal, Relationship, Mine)

### feature:*
各功能模块，独立且只依赖 core 和 data:local：
- 每个 feature 独立 namespace
- 对外暴露 Screen composable 函数
- ViewModel 通过 Hilt 注入 Repository

## 3. 导航架构

使用 Navigation Compose：

- `Screen.kt`: 定义所有路由
- `MainNavHost.kt`: NavHost 装配 + 底部导航

路由列表：
- `home` - 首页
- `account` - 记账
- `chat` - 聊天
- `relationship` - 养成
- `ai` - AI 助手
- `location` - 地图足迹
- `goal` - 目标打卡
- `mine` - 我的

## 4. 状态管理

- ViewModel + StateFlow 管理 UI 状态
- Repository 层返回 Flow，由 ViewModel 收集
- Mock 数据通过 `MockRepository` 注入

## 5. 依赖注入

使用 Hilt：
- `@HiltAndroidApp` on Application
- `@AndroidEntryPoint` on Activity
- `@HiltViewModel` on ViewModel
- `@Inject constructor` on Repository
- `@Singleton` on Repository 实现

## 6. 数据库设计

Room 数据库 `AppDatabase`，包含以下表：

- `users`: 用户信息
- `accounts`: 账单记录
- `chat_messages`: 聊天消息
- `goals`: 打卡目标
- `check_ins`: 打卡记录
- `intimacy_logs`: 亲密度积分日志
- `achievements`: 成就定义

## 7. 亲密度算法

亲密度积分规则：
- 每日打卡: +10 分
- 每发送一条消息: +1 分
- 每记录一笔账单: +2 分
- 纪念日加成: +50 分

等级公式: `level = (totalPoints / 100) + 1` (上限 10)

## 8. 后续演进

### 阶段 2 (本地数据库)
- 替换 Mock 为真实 Room 数据
- 实现账单 CRUD、打卡、聊天本地存储

### 阶段 3 (云端 + AI)
- 接入 Supabase 实现数据同步
- 接入 OpenAI 兼容 API
- 接入高德地图 SDK
- 接入极光推送

### 阶段 4 (商业化)
- 会员字段预留
- 隐私合规完善
- 多 flavor 构建
- 应用市场上架

## 9. 注意事项

1. feature 模块之间**禁止**互相依赖
2. AI API Key **必须**通过 EncryptedSharedPreferences 存储
3. 位置共享需双方**主动授权**，不可隐蔽定位
4. 第一版**仅虚拟积分**，不做真钱保证金
5. 所有页面需通过 `./gradlew assembleDebug` 验证
