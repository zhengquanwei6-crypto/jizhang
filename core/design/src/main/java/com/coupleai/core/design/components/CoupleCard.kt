package com.coupleai.core.design.components

import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.foundation.background
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.coupleai.core.design.theme.PrimaryGradient
import com.coupleai.core.design.theme.RosePink
import com.coupleai.core.design.theme.Radius
import com.coupleai.core.design.theme.SecondaryText

@Composable
fun CoupleCard(
    modifier: Modifier = Modifier,
    title: String? = null,
    subtitle: String? = null,
    gradient: List<Color>? = null,
    onClick: (() -> Unit)? = null,
    content: @Composable ColumnScope.() -> Unit
) {
    val interactionSource = androidx.compose.foundation.interaction.MutableInteractionSource()
    val isPressed by interactionSource.collectIsPressedAsState()

    val scale by animateFloatAsState(
        targetValue = if (isPressed) 0.98f else 1f,
        animationSpec = spring(dampingRatio = Spring.DampingRatioMediumBouncy),
        label = "card_scale"
    )

    Surface(
        modifier = modifier
            .fillMaxWidth()
            .scale(scale),
        shape = RoundedCornerShape(Radius.lg),
        tonalElevation = if (isPressed) 2.dp else 8.dp,
        onClick = onClick ?: {},
        interactionSource = interactionSource
    ) {
        Column(
            modifier = Modifier.padding(Radius.md)
        ) {
            if (title != null || subtitle != null) {
                Column(
                    modifier = Modifier.padding(bottom = 8.dp)
                ) {
                    if (title != null) {
                        Text(
                            text = title,
                            fontSize = 18.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                    }
                    if (subtitle != null) {
                        Text(
                            text = subtitle,
                            fontSize = 13.sp,
                            color = SecondaryText,
                            modifier = Modifier.padding(top = 2.dp)
                        )
                    }
                }
            }
            content()
        }
    }
}

@Composable
fun GradientCard(
    modifier: Modifier = Modifier,
    gradient: List<Color> = PrimaryGradient,
    content: @Composable ColumnScope.() -> Unit
) {
    Surface(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(Radius.lg),
        tonalElevation = 8.dp
    ) {
        Box(
            modifier = Modifier
                .background(Brush.horizontalGradient(gradient))
                .padding(Radius.md)
        ) {
            Column {
                content()
            }
        }
    }
}
