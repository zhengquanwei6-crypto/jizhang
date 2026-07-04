package com.coupleai.core.design.components

import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.coupleai.core.design.theme.Elevation
import com.coupleai.core.design.theme.RosePink
import com.coupleai.core.design.theme.RosePinkDeep

/**
 * 悬浮动作按钮，对应后端 PWA 的 .fab
 *
 * - 56dp 圆形，pink 渐变，右下角悬浮
 * - 按下 0.9x 弹性缩放
 * - 可选扩展模式（带文字 label，未来扩展）
 *
 * 用法：
 *   FloatingActionButton(onClick = { showAddDialog() }) {
 *       Icon(Icons.Filled.Add, "新增")
 *   }
 *   // 或简化
 *   CoupleFab(icon = Icons.Filled.Add, onClick = { ... })
 */
@Composable
fun CoupleFab(
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    icon: ImageVector = Icons.Filled.Add,
    size: Dp = 56.dp,
    contentDescription: String = "操作"
) {
    val interactionSource = remember { MutableInteractionSource() }
    val isPressed by interactionSource.collectIsPressedAsState()

    val scale by animateFloatAsState(
        targetValue = if (isPressed) 0.9f else 1f,
        animationSpec = spring(
            dampingRatio = Spring.DampingRatioMediumBouncy,
            stiffness = Spring.StiffnessHigh
        ),
        label = "fab_scale"
    )

    Box(
        modifier = modifier
            .size(size)
            .scale(scale)
            .shadow(Elevation.xl, CircleShape)
            .clip(CircleShape)
            .background(
                androidx.compose.ui.graphics.Brush.linearGradient(
                    listOf(RosePink, RosePinkDeep)
                )
            )
            .clickable(
                interactionSource = interactionSource,
                indication = null,
                onClick = onClick
            ),
        contentAlignment = Alignment.Center
    ) {
        Icon(
            imageVector = icon,
            contentDescription = contentDescription,
            tint = Color.White,
            modifier = Modifier.size(size * 0.5f)
        )
    }
}
