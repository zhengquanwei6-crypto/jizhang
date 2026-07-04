package com.coupleai.core.animation

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.LinearOutSlowInEasing
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.foundation.layout.Box
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.scale

object AnimationTokens {
    val Fast = 150
    val Normal = 300
    val Slow = 500
    val ExtraSlow = 1000
    val BounceEasing = FastOutSlowInEasing
    val SmoothEasing = LinearOutSlowInEasing
    val EmphasizedEasing = FastOutSlowInEasing
}

@Composable
fun AnimatedScaleIn(
    modifier: Modifier = Modifier,
    delay: Int = 0,
    content: @Composable () -> Unit
) {
    val scale = remember { Animatable(0f) }

    LaunchedEffect(Unit) {
        kotlinx.coroutines.delay(delay.toLong())
        scale.animateTo(
            targetValue = 1f,
            animationSpec = spring(
                dampingRatio = Spring.DampingRatioMediumBouncy,
                stiffness = Spring.StiffnessLow
            )
        )
    }

    Box(modifier = modifier.scale(scale.value)) {
        content()
    }
}

@Composable
fun AnimatedFadeIn(
    modifier: Modifier = Modifier,
    delay: Int = 0,
    duration: Int = AnimationTokens.Normal,
    content: @Composable () -> Unit
) {
    val alpha = remember { Animatable(0f) }

    LaunchedEffect(Unit) {
        kotlinx.coroutines.delay(delay.toLong())
        alpha.animateTo(
            targetValue = 1f,
            animationSpec = tween(duration)
        )
    }

    Box(modifier = modifier.alpha(alpha.value)) {
        content()
    }
}

@Composable
fun AnimatedSlideUp(
    modifier: Modifier = Modifier,
    delay: Int = 0,
    content: @Composable () -> Unit
) {
    val offsetY = remember { Animatable(100f) }

    LaunchedEffect(Unit) {
        kotlinx.coroutines.delay(delay.toLong())
        offsetY.animateTo(
            targetValue = 0f,
            animationSpec = spring(
                dampingRatio = Spring.DampingRatioMediumBouncy,
                stiffness = Spring.StiffnessMedium
            )
        )
    }

    Box(modifier = modifier) {
        content()
    }
}
