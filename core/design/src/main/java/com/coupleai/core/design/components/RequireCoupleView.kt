package com.coupleai.core.design.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.coupleai.core.design.theme.ChampagneGold
import com.coupleai.core.design.theme.RosePink
import com.coupleai.core.design.theme.SecondaryText

@Composable
fun RequireCoupleView(
    onOpenBind: () -> Unit,
    modifier: Modifier = Modifier,
    title: String = "绑定伴侣后同步数据",
    subtitle: String = "你已在单人模式使用，绑定伴侣后可双向同步记账、聊天与目标"
) {
    Column(
        modifier = modifier.fillMaxSize().padding(horizontal = 32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Icon(Icons.Filled.Favorite, null, tint = RosePink.copy(alpha = 0.4f), modifier = Modifier.size(64.dp))
        Spacer(modifier = Modifier.height(20.dp))
        Text(title, fontSize = 18.sp, fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.onSurface, textAlign = TextAlign.Center)
        Spacer(modifier = Modifier.height(8.dp))
        Text(subtitle, fontSize = 14.sp, color = SecondaryText, lineHeight = 22.sp, textAlign = TextAlign.Center)
        Spacer(modifier = Modifier.height(24.dp))
        GradientButton(text = "去绑定伴侣", onClick = onOpenBind, modifier = Modifier.fillMaxWidth(), gradient = listOf(ChampagneGold, ChampagneGold.copy(alpha = 0.85f)))
    }
}
