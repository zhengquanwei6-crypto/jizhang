package com.coupleai.core.design.components

import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.coupleai.core.design.theme.PrimaryGradient
import com.coupleai.core.design.theme.RosePink
import com.coupleai.core.design.theme.RosePinkLight
import com.coupleai.core.design.theme.SecondaryText

@Composable
fun StatCard(
    title: String,
    value: String,
    subtitle: String? = null,
    icon: @Composable (() -> Unit)? = null,
    modifier: Modifier = Modifier,
    gradient: List<Color> = PrimaryGradient
) {
    Box(
        modifier = modifier
            .clip(RoundedCornerShape(16.dp))
            .background(
                Brush.horizontalGradient(gradient)
            )
            .padding(16.dp)
    ) {
        Column {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.Top
            ) {
                Column {
                    Text(
                        text = title,
                        fontSize = 13.sp,
                        color = Color.White.copy(alpha = 0.8f)
                    )
                    Text(
                        text = value,
                        fontSize = 28.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White
                    )
                    if (subtitle != null) {
                        Text(
                            text = subtitle,
                            fontSize = 12.sp,
                            color = Color.White.copy(alpha = 0.7f),
                            modifier = Modifier.padding(top = 4.dp)
                        )
                    }
                }
                if (icon != null) {
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(12.dp))
                            .background(Color.White.copy(alpha = 0.2f))
                            .padding(8.dp)
                    ) {
                        icon()
                    }
                }
            }
        }
    }
}

@Composable
fun NumberCounter(
    targetValue: Float,
    modifier: Modifier = Modifier,
    prefix: String = "",
    suffix: String = "",
    fontSize: Int = 28,
    fontWeight: FontWeight = FontWeight.Bold,
    color: Color = MaterialTheme.colorScheme.onSurface
) {
    val animatedValue by animateFloatAsState(
        targetValue = targetValue,
        animationSpec = spring(
            dampingRatio = Spring.DampingRatioMediumBouncy,
            stiffness = Spring.StiffnessLow
        ),
        label = "number_counter"
    )

    Text(
        text = "$prefix${animatedValue.toInt()}$suffix",
        modifier = modifier,
        fontSize = fontSize.sp,
        fontWeight = fontWeight,
        color = color
    )
}

@Composable
fun ShimmerBox(
    modifier: Modifier = Modifier,
    width: Dp? = null,
    height: Dp = 16.dp,
    cornerRadius: Dp = 8.dp
) {
    val infiniteTransition = rememberInfiniteTransition(label = "shimmer")
    val shimmerTranslate by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = 1000f,
        animationSpec = infiniteRepeatable(
            animation = tween(1200, easing = LinearEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "shimmer_translate"
    )

    Box(
        modifier = modifier
            .then(
                if (width != null) Modifier else Modifier.fillMaxWidth()
            )
            .height(height)
            .clip(RoundedCornerShape(cornerRadius))
            .background(
                Brush.horizontalGradient(
                    colors = listOf(
                        RosePinkLight.copy(alpha = 0.15f),
                        RosePinkLight.copy(alpha = 0.3f),
                        RosePinkLight.copy(alpha = 0.15f)
                    ),
                    startX = shimmerTranslate - 500f,
                    endX = shimmerTranslate
                )
            )
    )
}

@Composable
fun GradientBackground(
    modifier: Modifier = Modifier,
    colors: List<Color> = listOf(
        RosePink.copy(alpha = 0.05f),
        RosePinkLight.copy(alpha = 0.08f),
        Color.White
    ),
    content: @Composable () -> Unit
) {
    Box(
        modifier = modifier
            .background(
                Brush.verticalGradient(colors)
            )
    ) {
        content()
    }
}
