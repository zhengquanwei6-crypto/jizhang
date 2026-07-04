package com.coupleai.core.design.components

import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.airbnb.lottie.compose.LottieAnimation
import com.airbnb.lottie.compose.LottieCompositionSpec
import com.airbnb.lottie.compose.LottieConstants
import com.airbnb.lottie.compose.rememberLottieComposition
import com.coupleai.core.design.theme.RosePink
import com.coupleai.core.design.theme.SecondaryText
import kotlin.math.cos
import kotlin.math.sin

@Composable
fun HeartAnimation(
    modifier: Modifier = Modifier,
    size: Dp = 120.dp,
    animated: Boolean = true
) {
    val infiniteTransition = rememberInfiniteTransition(label = "heart_pulse")

    val scale by infiniteTransition.animateFloat(
        initialValue = 1f,
        targetValue = if (animated) 1.15f else 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(800, easing = LinearEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "heart_scale"
    )

    val rotation by infiniteTransition.animateFloat(
        initialValue = -5f,
        targetValue = if (animated) 5f else 0f,
        animationSpec = infiniteRepeatable(
            animation = tween(1200, easing = LinearEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "heart_rotation"
    )

    Box(
        modifier = modifier.size(size),
        contentAlignment = Alignment.Center
    ) {
        Icon(
            imageVector = Icons.Filled.Favorite,
            contentDescription = "Heart",
            tint = RosePink,
            modifier = Modifier
                .size(size * 0.8f)
                .scale(scale)
                .graphicsLayer { rotationZ = rotation }
        )
    }
}

@Composable
fun LottieHeartBeat(
    modifier: Modifier = Modifier,
    resId: Int? = null
) {
    if (resId != null) {
        val composition by rememberLottieComposition(LottieCompositionSpec.RawRes(resId))
        LottieAnimation(
            composition = composition,
            iterations = LottieConstants.IterateForever,
            modifier = modifier
        )
    } else {
        HeartAnimation(modifier = modifier)
    }
}

@Composable
fun ConfettiEffect(
    modifier: Modifier = Modifier,
    particleCount: Int = 20
) {
    val particles = remember { List(particleCount) { ConfettiParticle() } }
    val infiniteTransition = rememberInfiniteTransition(label = "confetti")
    val progress by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(3000, easing = LinearEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "confetti_progress"
    )

    Canvas(modifier = modifier.fillMaxSize()) {
        val particleList: List<ConfettiParticle> = particles
        particleList.forEach { particle ->
            val x = size.width * particle.startX
            val y = size.height * (1f - particle.speed * progress) + (particle.amplitude * sin(progress * particle.frequency * 2 * Math.PI)).toFloat()
            val alpha = (1f - progress).coerceIn(0f, 1f) * particle.alpha

            drawCircle(
                color = particle.color,
                radius = particle.size,
                center = androidx.compose.ui.geometry.Offset(x, y),
                alpha = alpha
            )
        }
    }
}

private data class ConfettiParticle(
    val startX: Float = kotlin.random.Random.nextFloat(),
    val speed: Float = 0.3f + kotlin.random.Random.nextFloat() * 0.5f,
    val amplitude: Float = 20f + kotlin.random.Random.nextFloat() * 40f,
    val frequency: Float = 2f + kotlin.random.Random.nextFloat() * 4f,
    val size: Float = 4f + kotlin.random.Random.nextFloat() * 6f,
    val alpha: Float = 0.5f + kotlin.random.Random.nextFloat() * 0.5f,
    val color: Color = listOf(
        RosePink,
        Color(0xFFFF6B9D),
        Color(0xFFFFA07A),
        Color(0xFFFFD89B),
        Color(0xFF98D8C8)
    ).random()
)

@Composable
fun EmptyStateView(
    title: String,
    subtitle: String,
    modifier: Modifier = Modifier,
    lottieResId: Int? = null
) {
    Column(
        modifier = modifier,
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        if (lottieResId != null) {
            val composition by rememberLottieComposition(LottieCompositionSpec.RawRes(lottieResId))
            LottieAnimation(
                composition = composition,
                iterations = LottieConstants.IterateForever,
                modifier = Modifier.size(200.dp)
            )
        } else {
            Icon(
                imageVector = Icons.Filled.Favorite,
                contentDescription = null,
                tint = RosePink.copy(alpha = 0.3f),
                modifier = Modifier.size(80.dp)
            )
        }

        Spacer(modifier = Modifier.height(16.dp))

        Text(
            text = title,
            fontSize = 18.sp,
            fontWeight = FontWeight.SemiBold,
            color = MaterialTheme.colorScheme.onSurface,
            textAlign = TextAlign.Center
        )

        Spacer(modifier = Modifier.height(8.dp))

        Text(
            text = subtitle,
            fontSize = 14.sp,
            color = SecondaryText,
            textAlign = TextAlign.Center
        )
    }
}

@Composable
fun LoadingIndicator(
    modifier: Modifier = Modifier
) {
    Box(
        modifier = modifier,
        contentAlignment = Alignment.Center
    ) {
        HeartAnimation(size = 60.dp)
    }
}
