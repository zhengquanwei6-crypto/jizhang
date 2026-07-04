package com.coupleai.core.design.components

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Error
import androidx.compose.material.icons.filled.Info
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.coupleai.core.design.theme.Error
import com.coupleai.core.design.theme.Info
import com.coupleai.core.design.theme.OnSurface
import com.coupleai.core.design.theme.Radius
import com.coupleai.core.design.theme.Spacing
import com.coupleai.core.design.theme.Success
import kotlinx.coroutines.delay

/**
 * Toast 提示组件，对应后端 PWA 的 .toast-msg / .toast-bottom
 *
 * 支持：
 * - 顶部/底部定位
 * - success / error / info 三态
 * - 自动消失（默认 2s）
 *
 * 用法：
 *   val toast = rememberToastState()
 *   toast.success("已保存")
 *   toast.error("网络错误")
 *   ToastHost(toast) { 页面内容 }
 */

enum class ToastType { Success, Error, Info }
enum class ToastPosition { Top, Bottom }

data class ToastData(
    val message: String,
    val type: ToastType = ToastType.Info,
    val durationMs: Long = 2000L,
    val position: ToastPosition = ToastPosition.Top
)

class ToastState {
    var current by mutableStateOf<ToastData?>(null)
        private set

    fun show(
        message: String,
        type: ToastType = ToastType.Info,
        durationMs: Long = 2000L,
        position: ToastPosition = ToastPosition.Top
    ) {
        current = ToastData(message, type, durationMs, position)
    }

    fun success(message: String, durationMs: Long = 2000L) =
        show(message, ToastType.Success, durationMs, ToastPosition.Top)

    fun error(message: String, durationMs: Long = 2500L) =
        show(message, ToastType.Error, durationMs, ToastPosition.Top)

    fun info(message: String, durationMs: Long = 2000L) =
        show(message, ToastType.Info, durationMs, ToastPosition.Top)

    fun bottom(message: String, type: ToastType = ToastType.Info, durationMs: Long = 2000L) =
        show(message, type, durationMs, ToastPosition.Bottom)

    fun dismiss() { current = null }
}

@Composable
fun rememberToastState(): ToastState = remember { ToastState() }

@Composable
fun ToastHost(
    state: ToastState,
    modifier: Modifier = Modifier,
    content: @Composable () -> Unit
) {
    Box(modifier = modifier.fillMaxSize()) {
        content()

        val toast = state.current
        if (toast != null) {
            LaunchedEffect(toast) {
                delay(toast.durationMs)
                state.dismiss()
            }

            val enter = if (toast.position == ToastPosition.Top) {
                slideInVertically { -it } + fadeIn()
            } else {
                slideInVertically { it } + fadeIn()
            }
            val exit = if (toast.position == ToastPosition.Top) {
                slideOutVertically { -it } + fadeOut()
            } else {
                slideOutVertically { it } + fadeOut()
            }

            AnimatedVisibility(
                visible = true,
                enter = enter,
                exit = exit,
                modifier = if (toast.position == ToastPosition.Top) {
                    Modifier
                        .align(Alignment.TopCenter)
                        .padding(top = Spacing.lg, start = Spacing.lg, end = Spacing.lg)
                } else {
                    Modifier
                        .align(Alignment.BottomCenter)
                        .padding(bottom = Spacing.xxl, start = Spacing.lg, end = Spacing.lg)
                }
            ) {
                ToastBubble(toast)
            }
        }
    }
}

@Composable
private fun ToastBubble(toast: ToastData) {
    val (bg, icon) = when (toast.type) {
        ToastType.Success -> Success to Icons.Filled.CheckCircle
        ToastType.Error -> Error to Icons.Filled.Error
        ToastType.Info -> OnSurface to Icons.Filled.Info
    }
    Row(
        modifier = Modifier
            .clip(RoundedCornerShape(Radius.pill))
            .background(bg)
            .padding(horizontal = Spacing.lg, vertical = Spacing.sm + Spacing.xs),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(Spacing.sm)
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = Color.White,
            modifier = Modifier.size(18.dp)
        )
        Text(
            text = toast.message,
            color = Color.White,
            fontSize = 14.sp,
            fontWeight = FontWeight.Medium
        )
    }
}
