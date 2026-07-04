package com.coupleai.core.design.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.coupleai.core.design.theme.ChatBubbleAi
import com.coupleai.core.design.theme.ChatBubbleAiText
import com.coupleai.core.design.theme.ChatBubbleMe
import com.coupleai.core.design.theme.ChatBubbleMeText
import com.coupleai.core.design.theme.ChatBubbleOther
import com.coupleai.core.design.theme.ChatBubbleOtherText
import com.coupleai.core.design.theme.OnSurface
import com.coupleai.core.design.theme.SecondaryText
import com.coupleai.core.design.theme.Spacing

/**
 * 聊天气泡组件，对应后端 PWA 的 .msg.me / .msg.other / .msg.ai
 *
 * 三态：
 * - Me:    右对齐，pink 背景，白字（角标右下小圆角）
 * - Other: 左对齐，白背景，深字（角标左下小圆角）
 * - Ai:    左对齐，mint 绿背景，深字（标识 AI 身份）
 *
 * 用法：
 *   ChatBubble(
 *       role = ChatRole.Me,
 *       content = "想你啦",
 *       time = "20:30"
 *   )
 *   ChatBubble(
 *       role = ChatRole.Ai,
 *       content = "建议今天一起完成「散步」承诺哦",
 *       time = "20:31",
 *       showName = true,
 *       name = "AI 助手"
 *   )
 */

enum class ChatRole { Me, Other, Ai }

@Composable
fun ChatBubble(
    role: ChatRole,
    content: String,
    modifier: Modifier = Modifier,
    time: String? = null,
    showName: Boolean = false,
    name: String? = null
) {
    val isMe = role == ChatRole.Me

    Column(
        modifier = modifier
            .fillMaxWidth()
            .padding(vertical = Spacing.sm),
        horizontalAlignment = if (isMe) Alignment.End else Alignment.Start
    ) {
        if (showName && name != null) {
            Text(
                text = name,
                fontSize = 11.sp,
                color = SecondaryText,
                modifier = Modifier.padding(start = Spacing.sm, end = Spacing.sm, bottom = 2.dp)
            )
        }

        Row(
            verticalAlignment = Alignment.Bottom,
            horizontalArrangement = if (isMe) Arrangement.End else Arrangement.Start
        ) {
            Box(
                modifier = Modifier
                    .widthIn(max = 280.dp)
                    .clip(
                        when (role) {
                            ChatRole.Me -> RoundedCornerShape(18.dp, 18.dp, 4.dp, 18.dp)
                            ChatRole.Other -> RoundedCornerShape(18.dp, 18.dp, 18.dp, 4.dp)
                            ChatRole.Ai -> RoundedCornerShape(18.dp, 18.dp, 18.dp, 4.dp)
                        }
                    )
                    .background(
                        when (role) {
                            ChatRole.Me -> ChatBubbleMe
                            ChatRole.Other -> ChatBubbleOther
                            ChatRole.Ai -> ChatBubbleAi
                        }
                    )
                    .padding(horizontal = 14.dp, vertical = 10.dp)
            ) {
                Text(
                    text = content,
                    fontSize = 15.sp,
                    lineHeight = 22.sp,
                    color = when (role) {
                        ChatRole.Me -> ChatBubbleMeText
                        ChatRole.Other -> ChatBubbleOtherText
                        ChatRole.Ai -> ChatBubbleAiText
                    }
                )
            }
        }

        if (time != null) {
            Text(
                text = time,
                fontSize = 11.sp,
                color = SecondaryText,
                modifier = Modifier.padding(start = Spacing.sm, end = Spacing.sm, top = 2.dp)
            )
        }
    }
}
