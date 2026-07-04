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
import androidx.compose.material.icons.outlined.Language
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
import com.coupleai.core.design.theme.SecondaryText

@Composable
fun RequireLoginView(
    onOpenAuth: () -> Unit,
    modifier: Modifier = Modifier,
    title: String = "登录后开始记录",
    subtitle: String = "配置云端账号后，首页将展示你们的真实恋爱数据",
    actionLabel: String = "前往云端设置"
) {
    Column(
        modifier = modifier
            .fillMaxSize()
            .padding(horizontal = 32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Icon(
            imageVector = Icons.Outlined.Language,
            contentDescription = null,
            tint = ChampagneGold.copy(alpha = 0.55f),
            modifier = Modifier.size(72.dp)
        )
        Spacer(modifier = Modifier.height(24.dp))
        Text(
            text = title,
            fontSize = 18.sp,
            fontWeight = FontWeight.SemiBold,
            color = MaterialTheme.colorScheme.onSurface,
            textAlign = TextAlign.Center
        )
        Spacer(modifier = Modifier.height(10.dp))
        Text(
            text = subtitle,
            fontSize = 14.sp,
            color = SecondaryText,
            lineHeight = 22.sp,
            textAlign = TextAlign.Center
        )
        Spacer(modifier = Modifier.height(28.dp))
        GradientButton(
            text = actionLabel,
            onClick = onOpenAuth,
            modifier = Modifier.fillMaxWidth(),
            gradient = listOf(ChampagneGold, ChampagneGold.copy(alpha = 0.85f))
        )
    }
}
