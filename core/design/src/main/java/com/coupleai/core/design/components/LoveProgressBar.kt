package com.coupleai.core.design.components

import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.clipPath
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.coupleai.core.design.theme.PrimaryGradient
import com.coupleai.core.design.theme.Radius
import com.coupleai.core.design.theme.RosePink
import com.coupleai.core.design.theme.RosePinkLight
import com.coupleai.core.design.theme.SecondaryText
import kotlin.math.sin

@Composable
fun LoveProgressBar(
    progress: Float,
    modifier: Modifier = Modifier,
    height: Dp = 12.dp,
    label: String? = null,
    showPercentage: Boolean = true
) {
    var animatedProgress by remember { mutableFloatStateOf(0f) }

    LaunchedEffect(progress) {
        animatedProgress = progress.coerceIn(0f, 1f)
    }

    val animatedValue by animateFloatAsState(
        targetValue = animatedProgress,
        animationSpec = spring(
            dampingRatio = Spring.DampingRatioMediumBouncy,
            stiffness = Spring.StiffnessLow
        ),
        label = "progress_animation"
    )

    Column(modifier = modifier) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            if (label != null) {
                Text(
                    text = label,
                    fontSize = 13.sp,
                    color = SecondaryText
                )
            }
            if (showPercentage) {
                Text(
                    text = "${(animatedValue * 100).toInt()}%",
                    fontSize = 13.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = RosePink
                )
            }
        }

        Spacer(modifier = Modifier.height(6.dp))

        Canvas(
            modifier = Modifier
                .fillMaxWidth()
                .height(height)
        ) {
            val pillRadius = size.height / 2

            // Background track
            drawRoundRect(
                color = RosePinkLight.copy(alpha = 0.3f),
                size = size,
                cornerRadius = androidx.compose.ui.geometry.CornerRadius(pillRadius)
            )

            // Animated fill with gradient
            val fillWidth = size.width * animatedValue
            if (fillWidth > 0) {
                val heartPath = createHeartPath(size.width * 0.5f, size.height * 0.5f, size.height * 0.6f)

                val gradientBrush = Brush.horizontalGradient(
                    colors = PrimaryGradient,
                    startX = 0f,
                    endX = size.width
                )

                drawRoundRect(
                    brush = gradientBrush,
                    size = Size(fillWidth, size.height),
                    cornerRadius = androidx.compose.ui.geometry.CornerRadius(pillRadius)
                )

                // Heart indicator at the end
                if (animatedValue > 0.05f) {
                    drawCircle(
                        color = Color.White,
                        radius = size.height * 0.35f,
                        center = Offset(fillWidth, size.height / 2)
                    )
                    drawCircle(
                        color = RosePink,
                        radius = size.height * 0.25f,
                        center = Offset(fillWidth, size.height / 2)
                    )
                }
            }
        }
    }
}

private fun createHeartPath(cx: Float, cy: Float, size: Float): Path {
    return Path().apply {
        val x = cx
        val y = cy
        val w = size
        moveTo(x, y + w * 0.3f)
        cubicTo(
            x - w, y - w * 0.3f,
            x - w * 1.5f, y + w * 0.5f,
            x, y + w
        )
        cubicTo(
            x + w * 1.5f, y + w * 0.5f,
            x + w, y - w * 0.3f,
            x, y + w * 0.3f
        )
        close()
    }
}

@Composable
fun IntimacyBadge(
    level: Int,
    title: String,
    progress: Float,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier.padding(Radius.md),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Box(contentAlignment = Alignment.Center) {
            Canvas(modifier = Modifier.size(80.dp)) {
                drawCircle(
                    color = RosePinkLight.copy(alpha = 0.2f),
                    radius = size.minDimension / 2
                )
                drawArc(
                    brush = Brush.sweepGradient(PrimaryGradient),
                    startAngle = -90f,
                    sweepAngle = 360f * progress,
                    useCenter = false,
                    style = Stroke(width = 4.dp.toPx()),
                    size = size,
                    topLeft = Offset.Zero
                )
            }
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Icon(
                    imageVector = Icons.Filled.Favorite,
                    contentDescription = null,
                    tint = RosePink,
                    modifier = Modifier.size(24.dp)
                )
                Text(
                    text = "Lv.$level",
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold,
                    color = RosePink
                )
            }
        }

        Spacer(modifier = Modifier.height(8.dp))

        Text(
            text = title,
            fontSize = 13.sp,
            fontWeight = FontWeight.Medium,
            color = MaterialTheme.colorScheme.onSurface
        )
    }
}
