package com.coupleai.core.design.components

import androidx.compose.animation.core.Spring
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.spring
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.coupleai.core.design.theme.Outline
import com.coupleai.core.design.theme.RosePink
import com.coupleai.core.design.theme.Success

/**
 * 开关组件，对应后端 PWA 的 .switch / .switch.on
 *
 * - 52x30 轨道（比 PWA 略大，触控更友好）
 * - 关闭灰、开启 pink（默认）或 green（强调成功状态）
 * - 圆点 22dp，带弹性滑动
 *
 * 用法：
 *   var on by remember { mutableStateOf(false) }
 *   CoupleSwitch(checked = on, onCheckedChange = { on = it })
 *   CoupleSwitch(checked = on, onCheckedChange = { on = it }, accent = SwitchAccent.Green)
 */
enum class SwitchAccent(val onColor: Color) {
    Pink(RosePink),
    Green(Success)
}

@Composable
fun CoupleSwitch(
    checked: Boolean,
    onCheckedChange: (Boolean) -> Unit,
    modifier: Modifier = Modifier,
    accent: SwitchAccent = SwitchAccent.Pink,
    width: Dp = 52.dp,
    height: Dp = 30.dp
) {
    val trackColor by animateColorAsState(
        targetValue = if (checked) accent.onColor else Outline,
        animationSpec = spring(dampingRatio = Spring.DampingRatioMediumBouncy),
        label = "switch_track"
    )

    val thumbOffset by animateDpAsState(
        targetValue = if (checked) width - height + 3.dp else 3.dp,
        animationSpec = spring(dampingRatio = Spring.DampingRatioMediumBouncy),
        label = "switch_thumb"
    )

    val thumbSize = height - 8.dp

    Box(
        modifier = modifier
            .width(width)
            .height(height)
            .clip(CircleShape)
            .background(trackColor)
            .clickable(
                interactionSource = remember { MutableInteractionSource() },
                indication = null,
                onClick = { onCheckedChange(!checked) }
            ),
        contentAlignment = Alignment.CenterStart
    ) {
        Box(
            modifier = Modifier
                .size(thumbSize)
                .offset(x = thumbOffset)
                .clip(CircleShape)
                .background(Color.White)
        )
    }
}
