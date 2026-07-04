package com.coupleai.core.design.theme

import androidx.compose.animation.core.CubicBezierEasing
import androidx.compose.animation.core.Easing
import androidx.compose.animation.core.FiniteAnimationSpec
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.spring
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Shapes
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

/**
 * CoupleSpaceAI 设计系统 - 形状与间距规范
 *
 * 圆角: sm=8 / md=12 / lg=16 / xl=24 / pill=50 (dp)
 * 间距: xs=4 / sm=8 / md=16 / lg=24 / xl=32 / xxl=48 (dp)
 */
val CoupleSpaceShapes = Shapes(
    extraSmall = RoundedCornerShape(4.dp),
    small = RoundedCornerShape(8.dp),
    medium = RoundedCornerShape(12.dp),
    large = RoundedCornerShape(16.dp),
    extraLarge = RoundedCornerShape(24.dp)
)

object Spacing {
    val xs = 4.dp
    val sm = 8.dp
    val md = 16.dp
    val lg = 24.dp
    val xl = 32.dp
    val xxl = 48.dp
}

object Radius {
    val sm = 8.dp
    val md = 12.dp
    val lg = 16.dp
    val xl = 24.dp
    val pill = 50.dp
    val full = 100.dp
}

/**
 * 阴影/高度规范，对应后端 PWA 的 box-shadow 体系。
 * 使用 tonalElevation（M3 推荐）+ shadowElevation 双轨。
 */
object Elevation {
    val none = 0.dp
    val sm = 2.dp      // 卡片静态
    val md = 4.dp      // 卡片悬浮/按下抬升
    val lg = 8.dp      // 头部/强调卡片
    val xl = 12.dp     // FAB / Modal
    val xxl = 24.dp    // 弹窗
}

/**
 * 动画时长规范，对应 README 动画规范：
 * - 微交互 150ms fast
 * - 页面切换 300ms normal
 * - 大型动画 500ms slow
 */
object MotionDuration {
    const val fast = 150
    const val normal = 300
    const val slow = 500
}

/**
 * 动画曲线：emphasized = CubicBezier(0.2, 0, 0, 1)
 * 对应 README 规范，与后端 PWA CSS transition 一致。
 */
object MotionEasing {
    val Emphasized: Easing = CubicBezierEasing(0.2f, 0f, 0f, 1f)
    val EmphasizedDecelerate: Easing = CubicBezierEasing(0.05f, 0.7f, 0.1f, 1f)
    val EmphasizedAccelerate: Easing = CubicBezierEasing(0.3f, 0f, 0.8f, 0.15f)
    val Standard: Easing = CubicBezierEasing(0.2f, 0f, 0f, 1f)
}

/**
 * Spring 规范预设，统一全项目弹性动画手感。
 */
object MotionSpring {
    fun <T> bouncy(): FiniteAnimationSpec<T> = spring(
        dampingRatio = Spring.DampingRatioMediumBouncy,
        stiffness = Spring.StiffnessMedium
    )

    fun <T> snappy(): FiniteAnimationSpec<T> = spring(
        dampingRatio = Spring.DampingRatioNoBouncy,
        stiffness = Spring.StiffnessHigh
    )

    fun <T> gentle(): FiniteAnimationSpec<T> = spring(
        dampingRatio = Spring.DampingRatioLowBouncy,
        stiffness = Spring.StiffnessLow
    )
}
