package com.coupleai.core.design.components

import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.coupleai.core.design.theme.Elevation
import com.coupleai.core.design.theme.PrimaryGradient
import com.coupleai.core.design.theme.Radius
import com.coupleai.core.design.theme.RosePink
import com.coupleai.core.design.theme.SecondaryText

/**
 * 按钮组件族，对应后端 PWA 的 .btn-primary / .btn-green / .btn-outline / .btn-ghost / .btn-sm
 *
 * 四种变体：
 * - GradientButton:  渐变主按钮（pink→orange），pill 圆角，默认全宽
 * - SecondaryButton: 浅色次按钮（pink 10% 透明背景）
 * - OutlineButton:   描边按钮（pink 边框）—— 新增
 * - GhostButton:     幽灵按钮（仅文字）
 *
 * 全部统一按下 0.95x 弹性缩放 + Spring 动画。
 */

@Composable
fun GradientButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    gradient: List<Color> = PrimaryGradient,
    height: Dp = 52.dp,
    enabled: Boolean = true,
    cornerRadius: Dp = Radius.pill,
    icon: ImageVector? = null
) {
    val interactionSource = remember { MutableInteractionSource() }
    val isPressed by interactionSource.collectIsPressedAsState()

    val scale by animateFloatAsState(
        targetValue = if (isPressed) 0.95f else 1f,
        animationSpec = spring(dampingRatio = Spring.DampingRatioMediumBouncy, stiffness = Spring.StiffnessHigh),
        label = "button_scale"
    )

    val alpha by animateFloatAsState(
        targetValue = if (enabled) 1f else 0.5f,
        animationSpec = tween(200),
        label = "button_alpha"
    )

    Box(
        modifier = modifier
            .scale(scale)
            .fillMaxWidth()
            .height(height)
            .shadow(
                elevation = if (isPressed) Elevation.sm else Elevation.lg,
                shape = RoundedCornerShape(cornerRadius)
            )
            .clip(RoundedCornerShape(cornerRadius))
            .background(
                brush = Brush.horizontalGradient(
                    colors = gradient.map { it.copy(alpha = alpha) }
                )
            )
            .clickable(
                interactionSource = interactionSource,
                indication = null,
                enabled = enabled,
                onClick = onClick
            ),
        contentAlignment = Alignment.Center
    ) {
        if (icon != null) {
            androidx.compose.foundation.layout.Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = androidx.compose.foundation.layout.Arrangement.spacedBy(8.dp)
            ) {
                Icon(
                    imageVector = icon,
                    contentDescription = null,
                    tint = Color.White,
                    modifier = Modifier.size(20.dp)
                )
                Text(
                    text = text,
                    color = Color.White,
                    fontSize = 16.sp,
                    fontWeight = FontWeight.SemiBold
                )
            }
        } else {
            Text(
                text = text,
                color = Color.White,
                fontSize = 16.sp,
                fontWeight = FontWeight.SemiBold
            )
        }
    }
}

@Composable
fun SecondaryButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    height: Dp = 48.dp,
    enabled: Boolean = true
) {
    val interactionSource = remember { MutableInteractionSource() }
    val isPressed by interactionSource.collectIsPressedAsState()

    val scale by animateFloatAsState(
        targetValue = if (isPressed) 0.95f else 1f,
        animationSpec = spring(dampingRatio = Spring.DampingRatioMediumBouncy),
        label = "secondary_scale"
    )

    Box(
        modifier = modifier
            .scale(scale)
            .fillMaxWidth()
            .height(height)
            .clip(RoundedCornerShape(Radius.pill))
            .background(
                if (enabled) RosePink.copy(alpha = 0.1f)
                else RosePink.copy(alpha = 0.05f)
            )
            .clickable(
                interactionSource = interactionSource,
                indication = null,
                enabled = enabled,
                onClick = onClick
            ),
        contentAlignment = Alignment.Center
    ) {
        Text(
            text = text,
            color = if (enabled) RosePink else RosePink.copy(alpha = 0.5f),
            fontSize = 15.sp,
            fontWeight = FontWeight.Medium
        )
    }
}

/**
 * 描边按钮，对应 PWA .btn-outline
 */
@Composable
fun OutlineButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    height: Dp = 48.dp,
    enabled: Boolean = true,
    borderColor: Color = RosePink
) {
    val interactionSource = remember { MutableInteractionSource() }
    val isPressed by interactionSource.collectIsPressedAsState()

    val scale by animateFloatAsState(
        targetValue = if (isPressed) 0.95f else 1f,
        animationSpec = spring(dampingRatio = Spring.DampingRatioMediumBouncy),
        label = "outline_scale"
    )

    Box(
        modifier = modifier
            .scale(scale)
            .fillMaxWidth()
            .height(height)
            .clip(RoundedCornerShape(Radius.pill))
            .background(Color.Transparent)
            .border(BorderStroke(1.5.dp, borderColor.copy(alpha = if (enabled) 1f else 0.4f)), RoundedCornerShape(Radius.pill))
            .clickable(
                interactionSource = interactionSource,
                indication = null,
                enabled = enabled,
                onClick = onClick
            ),
        contentAlignment = Alignment.Center
    ) {
        Text(
            text = text,
            color = if (enabled) borderColor else borderColor.copy(alpha = 0.5f),
            fontSize = 15.sp,
            fontWeight = FontWeight.Medium
        )
    }
}

/**
 * 幽灵按钮，对应 PWA .btn-ghost
 */
@Composable
fun GhostButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true
) {
    val interactionSource = remember { MutableInteractionSource() }
    val isPressed by interactionSource.collectIsPressedAsState()

    val scale by animateFloatAsState(
        targetValue = if (isPressed) 0.97f else 1f,
        animationSpec = spring(dampingRatio = Spring.DampingRatioMediumBouncy),
        label = "ghost_scale"
    )

    Box(
        modifier = modifier
            .scale(scale)
            .clip(RoundedCornerShape(Radius.sm))
            .clickable(
                interactionSource = interactionSource,
                indication = null,
                enabled = enabled,
                onClick = onClick
            )
            .padding(horizontal = 16.dp, vertical = 8.dp),
        contentAlignment = Alignment.Center
    ) {
        Text(
            text = text,
            color = if (enabled) SecondaryText else SecondaryText.copy(alpha = 0.5f),
            fontSize = 14.sp,
            fontWeight = FontWeight.Medium
        )
    }
}
