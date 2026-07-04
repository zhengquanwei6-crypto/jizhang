package com.coupleai.core.design.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.coupleai.core.design.theme.RosePink
import com.coupleai.core.design.theme.RosePinkLight
import com.coupleai.core.design.theme.SecondaryText

@Composable
fun CoupleBindSheet(
    loading: Boolean,
    inviteCode: String?,
    error: String?,
    bindInput: String,
    onBindInputChange: (String) -> Unit,
    onCreateCode: () -> Unit,
    onBind: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(topStart = 20.dp, topEnd = 20.dp))
            .background(
                Brush.horizontalGradient(listOf(RosePinkLight.copy(alpha = 0.35f), Color.White))
            )
            .padding(20.dp)
    ) {
        Text("绑定情侣", fontWeight = FontWeight.SemiBold, fontSize = 16.sp, color = RosePink)
        Spacer(modifier = Modifier.height(4.dp))
        Text(
            "生成邀请码分享给伴侣，或输入对方的邀请码完成绑定",
            fontSize = 12.sp,
            color = SecondaryText
        )
        Spacer(modifier = Modifier.height(16.dp))

        when {
            loading -> {
                CircularProgressIndicator(
                    color = RosePink,
                    modifier = Modifier.align(Alignment.CenterHorizontally)
                )
            }
            inviteCode != null -> {
                Text("你的邀请码", fontSize = 12.sp, color = SecondaryText)
                Text(
                    inviteCode,
                    fontSize = 32.sp,
                    fontWeight = FontWeight.Bold,
                    color = RosePink,
                    modifier = Modifier.padding(vertical = 8.dp)
                )
                Text("将此码发给伴侣，对方注册后输入即可绑定", fontSize = 11.sp, color = SecondaryText)
            }
            else -> {
                OutlineButton(text = "生成我的邀请码", onClick = onCreateCode)
                Spacer(modifier = Modifier.height(12.dp))
                OutlinedTextField(
                    value = bindInput,
                    onValueChange = onBindInputChange,
                    label = { Text("输入伴侣的邀请码") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = RosePink,
                        focusedLabelColor = RosePink
                    )
                )
                Spacer(modifier = Modifier.height(12.dp))
                GradientButton(text = "绑定", onClick = onBind)
            }
        }

        if (!error.isNullOrBlank()) {
            Spacer(modifier = Modifier.height(8.dp))
            Text(error, color = MaterialTheme.colorScheme.error, fontSize = 12.sp)
        }
    }
}
