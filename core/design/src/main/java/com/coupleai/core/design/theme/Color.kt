package com.coupleai.core.design.theme

import androidx.compose.ui.graphics.Color

/**
 * CoupleSpaceAI 设计系统 - 色彩规范
 *
 * 品牌主色: RosePink #FF6B9D (统一两端，后端 PWA 已对齐)
 * 设计原则: 暖色为主、语义清晰、明暗双色完整覆盖
 */

// ===== Brand Primary =====
val RosePink = Color(0xFFFF6B9D)
val RosePinkLight = Color(0xFFFFB6C1)
val RosePinkDeep = Color(0xFFE91E63)
val RosePinkContainer = Color(0xFFFBEAF0)

// ===== Accent =====
val CoralOrange = Color(0xFFFFA07A)
val WarmYellow = Color(0xFFFFD89B)
val MintGreen = Color(0xFF98D8C8)
val LavenderPurple = Color(0xFFB39DDB)

// ===== Semantic (浅色主题) =====
val Success = Color(0xFF1D9E75)
val SuccessContainer = Color(0xFFE1F5EE)
val Warning = Color(0xFFEF9F27)
val WarningContainer = Color(0xFFFAEEDA)
val Error = Color(0xFFE24B4A)
val ErrorContainer = Color(0xFFFCEBEB)
val Info = Color(0xFF378ADD)
val InfoContainer = Color(0xFFE6F1FB)

// ===== Neutral (浅色) =====
val ChampagneGold = Color(0xFFC4A574)
val PearlBackground = Color(0xFFF5F2EB)
val InkBlack = Color(0xFF1A1A1A)

val Background = Color(0xFFF5F2EB)
val SurfaceColor = Color(0xFFFFFFFF)
val SurfaceVariant = Color(0xFFF1EFE8)
val OnSurface = Color(0xFF2C2C2A)
val SecondaryText = Color(0xFF888780)
val Outline = Color(0xFFD3D1C7)
val Divider = Color(0xFFEEEEEE)

// ===== Neutral (深色) =====
val BackgroundDark = Color(0xFF1A1A2E)
val SurfaceDark = Color(0xFF16213E)
val SurfaceVariantDark = Color(0xFF2A2A28)
val OnSurfaceDark = Color(0xFFF5F5F5)
val SecondaryTextDark = Color(0xFFB0B0B0)
val OutlineDark = Color(0xFF3A3A38)
val DividerDark = Color(0xFF2D2D2E)

// ===== Gradients =====
val PrimaryGradient = listOf(RosePink, CoralOrange)
val SoftGradient = listOf(RosePinkLight, WarmYellow)
val MintGradient = listOf(MintGreen, RosePinkLight)
val DeepGradient = listOf(RosePinkDeep, CoralOrange)
val CalmGradient = listOf(LavenderPurple, RosePinkLight)
val LoveHeaderGradient = listOf(RosePink, RosePinkDeep)

// ===== Chat Bubble 专用色 =====
val ChatBubbleMe = RosePink
val ChatBubbleOther = Color(0xFFFFFFFF)
val ChatBubbleAi = SuccessContainer
val ChatBubbleMeText = Color.White
val ChatBubbleOtherText = OnSurface
val ChatBubbleAiText = OnSurface

// ===== Skeleton 骨架屏色阶 =====
val SkeletonBase = Color(0xFFF1EFE8)
val SkeletonHighlight = Color(0xFFFAFAF8)
val SkeletonBaseDark = Color(0xFF2A2A28)
val SkeletonHighlightDark = Color(0xFF3A3A38)
