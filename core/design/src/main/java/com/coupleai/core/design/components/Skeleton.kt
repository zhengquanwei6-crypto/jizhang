package com.coupleai.core.design.components

import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.coupleai.core.design.theme.Radius
import com.coupleai.core.design.theme.SkeletonBase
import com.coupleai.core.design.theme.SkeletonHighlight
import com.coupleai.core.design.theme.Spacing

/**
 * 骨架屏组件，对应后端 PWA 的 .skeleton / .skeleton-card / .skeleton-line
 *
 * shimmer 动画：左→右流光，1.2s 循环
 *
 * 用法：
 *   if (loading) {
 *       SkeletonList()
 *   } else {
 *       // 真实列表
 *   }
 *
 *   SkeletonCard()              // 模拟整张卡片
 *   SkeletonLine(width = 120.dp) // 单行文字
 *   SkeletonCircle(size = 48.dp) // 头像占位
 */

@Composable
fun SkeletonBox(
    modifier: Modifier = Modifier,
    cornerRadius: Dp = Radius.sm
) {
    val transition = rememberInfiniteTransition(label = "skeleton")
    val progress by transition.animateFloat(
        initialValue = 0f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(1200, easing = LinearEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "skeleton_progress"
    )

    val shift = progress * 2f - 1f
    val colors = listOf(
        SkeletonBase,
        SkeletonHighlight,
        SkeletonBase
    )

    Box(
        modifier = modifier
            .clip(RoundedCornerShape(cornerRadius))
            .background(
                Brush.linearGradient(
                    colors = colors,
                    start = androidx.compose.ui.geometry.Offset(shift * 300f, 0f),
                    end = androidx.compose.ui.geometry.Offset(shift * 300f + 300f, 0f)
                )
            )
    )
}

@Composable
fun SkeletonLine(
    modifier: Modifier = Modifier,
    width: Dp? = null,
    height: Dp = 16.dp
) {
    SkeletonBox(
        modifier = modifier
            .then(if (width != null) Modifier.size(width, height) else Modifier.fillMaxWidth().height(height)),
        cornerRadius = Radius.sm
    )
}

@Composable
fun SkeletonCircle(
    modifier: Modifier = Modifier,
    size: Dp = 48.dp
) {
    SkeletonBox(
        modifier = modifier.size(size),
        cornerRadius = Dp.Unspecified
    )
    Box(
        modifier = modifier
            .size(size)
            .clip(CircleShape)
            .background(SkeletonBase)
    )
}

@Composable
fun SkeletonCard(
    modifier: Modifier = Modifier,
    height: Dp = 100.dp
) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .padding(Spacing.md)
    ) {
        SkeletonLine(width = 80.dp, height = 14.dp)
        Spacer(modifier = Modifier.height(Spacing.sm))
        SkeletonLine(height = 20.dp)
        Spacer(modifier = Modifier.height(Spacing.sm))
        SkeletonLine(width = 140.dp, height = 12.dp)
    }
}

/**
 * 列表骨架屏，模拟首页/账单列表加载态。
 */
@Composable
fun SkeletonList(
    modifier: Modifier = Modifier,
    itemCount: Int = 3
) {
    Column(modifier = modifier.fillMaxWidth()) {
        repeat(itemCount) {
            SkeletonCard()
        }
    }
}
