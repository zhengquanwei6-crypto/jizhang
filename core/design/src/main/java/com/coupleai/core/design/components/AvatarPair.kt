package com.coupleai.core.design.components

import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.coupleai.core.design.theme.PrimaryGradient
import com.coupleai.core.design.theme.RosePink
import com.coupleai.core.design.theme.RosePinkLight
import com.coupleai.core.design.theme.SecondaryText

@Composable
fun AvatarPair(
    leftImageUrl: String?,
    rightImageUrl: String?,
    leftName: String,
    rightName: String,
    modifier: Modifier = Modifier,
    size: Dp = 48.dp
) {
    Row(
        modifier = modifier,
        horizontalArrangement = Arrangement.Center,
        verticalAlignment = Alignment.CenterVertically
    ) {
        // Left avatar (you)
        AvatarWithBorder(
            imageUrl = leftImageUrl,
            name = leftName,
            size = size,
            borderOffset = (-4).dp
        )

        // Heart in the middle
        Box(
            modifier = Modifier
                .size(size * 0.4f)
                .offset(x = (-8).dp)
                .scale(1f),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                imageVector = Icons.Filled.Favorite,
                contentDescription = "love",
                tint = RosePink,
                modifier = Modifier.size(size * 0.35f)
            )
        }

        // Right avatar (partner)
        AvatarWithBorder(
            imageUrl = rightImageUrl,
            name = rightName,
            size = size,
            borderOffset = 4.dp
        )
    }
}

@Composable
private fun AvatarWithBorder(
    imageUrl: String?,
    name: String,
    size: Dp,
    borderOffset: Dp
) {
    Box {
        // Gradient border
        Box(
            modifier = Modifier
                .size(size + 4.dp)
                .offset(x = borderOffset)
                .clip(CircleShape)
                .background(
                    Brush.linearGradient(PrimaryGradient)
                )
                .padding(2.dp)
        ) {
            if (imageUrl != null) {
                AsyncImage(
                    model = imageUrl,
                    contentDescription = name,
                    modifier = Modifier
                        .size(size)
                        .clip(CircleShape),
                    contentScale = ContentScale.Crop
                )
            } else {
                Box(
                    modifier = Modifier
                        .size(size)
                        .clip(CircleShape)
                        .background(RosePinkLight),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = name.take(1).uppercase(),
                        fontSize = (size.value * 0.4f).sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White
                    )
                }
            }
        }
    }
}

@Composable
fun SingleAvatar(
    imageUrl: String?,
    name: String,
    size: Dp = 48.dp,
    showBorder: Boolean = true,
    modifier: Modifier = Modifier
) {
    if (showBorder) {
        Box(
            modifier = Modifier
                .size(size + 4.dp)
                .clip(CircleShape)
                .background(
                    Brush.linearGradient(PrimaryGradient)
                )
                .padding(2.dp)
                .then(modifier)
        ) {
            AvatarContent(imageUrl = imageUrl, name = name, size = size)
        }
    } else {
        AvatarContent(imageUrl = imageUrl, name = name, size = size, modifier = modifier)
    }
}

@Composable
private fun AvatarContent(
    imageUrl: String?,
    name: String,
    size: Dp,
    modifier: Modifier = Modifier
) {
    if (imageUrl != null) {
        AsyncImage(
            model = imageUrl,
            contentDescription = name,
            modifier = modifier
                .size(size)
                .clip(CircleShape),
            contentScale = ContentScale.Crop
        )
    } else {
        Box(
            modifier = modifier
                .size(size)
                .clip(CircleShape)
                .background(RosePinkLight),
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = name.take(1).uppercase(),
                fontSize = (size.value * 0.4f).sp,
                fontWeight = FontWeight.Bold,
                color = Color.White
            )
        }
    }
}
