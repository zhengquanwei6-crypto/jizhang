package com.coupleai.core.design.components

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.scaleIn
import androidx.compose.animation.scaleOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.coupleai.core.design.theme.Elevation
import com.coupleai.core.design.theme.OnSurface
import com.coupleai.core.design.theme.Outline
import com.coupleai.core.design.theme.Radius
import com.coupleai.core.design.theme.SecondaryText
import com.coupleai.core.design.theme.Spacing
import com.coupleai.core.design.theme.SurfaceColor

/**
 * 弹窗组件，对应后端 PWA 的 .modal-overlay + .modal
 *
 * 两种形态：
 * - BottomSheet: 底部上滑，圆角顶部，slideUp 动画（对应 PWA 默认 modal）
 * - CenterDialog: 居中，scale+fade 动画（对应 PWA .modal-overlay.center）
 *
 * 用法：
 *   var show by remember { mutableStateOf(false) }
 *   CoupleBottomSheet(show = show, onDismiss = { show = false }, title = "新增账单") {
 *       // 内容
 *   }
 *   CoupleCenterDialog(show = show, onDismiss = { show = false }, title = "确认删除") {
 *       // 内容 + 按钮
 *   }
 */

@Composable
fun CoupleBottomSheet(
    show: Boolean,
    onDismiss: () -> Unit,
    modifier: Modifier = Modifier,
    title: String? = null,
    content: @Composable () -> Unit
) {
    AnimatedVisibility(
        visible = show,
        enter = fadeIn(),
        exit = fadeOut(),
        modifier = Modifier.fillMaxSize()
    ) {
        Box(
            modifier = modifier
                .fillMaxSize()
                .background(Color.Black.copy(alpha = 0.4f))
                .clickable(
                    interactionSource = remember { MutableInteractionSource() },
                    indication = null,
                    onClick = onDismiss
                ),
            contentAlignment = Alignment.BottomCenter
        ) {
            AnimatedVisibility(
                visible = show,
                enter = slideInVertically { it } + fadeIn(),
                exit = slideOutVertically { it } + fadeOut(),
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable(
                        interactionSource = remember { MutableInteractionSource() },
                        indication = null,
                        onClick = {}
                    )
            ) {
                Column(
                    modifier = Modifier
                        .background(SurfaceColor, RoundedCornerShape(topStart = Radius.lg, topEnd = Radius.lg))
                        .padding(Spacing.lg)
                        .padding(bottom = Spacing.lg)
                ) {
                    if (title != null) {
                        ModalHeader(title, onDismiss)
                    }
                    content()
                }
            }
        }
    }
}

@Composable
fun CoupleCenterDialog(
    show: Boolean,
    onDismiss: () -> Unit,
    modifier: Modifier = Modifier,
    title: String? = null,
    content: @Composable () -> Unit
) {
    AnimatedVisibility(
        visible = show,
        enter = fadeIn(),
        exit = fadeOut(),
        modifier = Modifier.fillMaxSize()
    ) {
        Box(
            modifier = modifier
                .fillMaxSize()
                .background(Color.Black.copy(alpha = 0.4f))
                .clickable(
                    interactionSource = remember { MutableInteractionSource() },
                    indication = null,
                    onClick = onDismiss
                ),
            contentAlignment = Alignment.Center
        ) {
            AnimatedVisibility(
                visible = show,
                enter = scaleIn(initialScale = 0.92f) + fadeIn(),
                exit = scaleOut(targetScale = 0.92f) + fadeOut(),
                modifier = Modifier
                    .padding(horizontal = Spacing.lg)
                    .clickable(
                        interactionSource = remember { MutableInteractionSource() },
                        indication = null,
                        onClick = {}
                    )
            ) {
                Column(
                    modifier = Modifier
                        .widthIn(max = 360.dp)
                        .clip(RoundedCornerShape(Radius.lg))
                        .background(SurfaceColor)
                        .padding(Spacing.lg)
                ) {
                    if (title != null) {
                        ModalHeader(title, onDismiss)
                    }
                    content()
                }
            }
        }
    }
}

@Composable
private fun ModalHeader(title: String, onClose: () -> Unit) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            text = title,
            fontSize = 18.sp,
            fontWeight = FontWeight.SemiBold,
            color = OnSurface
        )
        Box(
            modifier = Modifier
                .clip(RoundedCornerShape(Radius.full))
                .clickable(onClick = onClose)
                .padding(Spacing.xs)
        ) {
            Icon(
                imageVector = Icons.Filled.Close,
                contentDescription = "关闭",
                tint = SecondaryText,
                modifier = Modifier.padding(4.dp)
            )
        }
    }
}
