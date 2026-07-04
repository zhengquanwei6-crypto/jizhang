package com.coupleai.feature.ai.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material.icons.filled.Bolt
import androidx.compose.material.icons.filled.Lightbulb
import androidx.compose.material.icons.filled.PieChart
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.navigation.NavController
import com.coupleai.core.design.components.ChatBubble
import com.coupleai.core.design.components.ChatRole
import com.coupleai.core.design.components.FeatureTopBar
import com.coupleai.core.design.components.RequireLoginView
import com.coupleai.core.design.components.ToastHost
import com.coupleai.core.design.components.rememberToastState
import com.coupleai.core.design.theme.Radius
import com.coupleai.core.design.theme.RosePink
import com.coupleai.core.design.theme.SecondaryText
import com.coupleai.core.design.theme.Spacing
import com.coupleai.data.remote.interceptor.TokenManager
import com.coupleai.data.remote.repository.AiRepository
import com.coupleai.data.remote.util.ApiErrorParser
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class AiMessage(val role: String, val content: String)

@HiltViewModel
class AiViewModel @Inject constructor(
    private val tokenManager: TokenManager,
    private val aiRepository: AiRepository
) : ViewModel() {

    private val _isLoggedIn = MutableStateFlow(tokenManager.getTokenSync() != null)
    val isLoggedIn = _isLoggedIn.asStateFlow()

    private val _messages = MutableStateFlow<List<AiMessage>>(
        listOf(AiMessage("ai", "你好！我是你们的 AI 助手，可以分析账单、推荐承诺、给恋爱建议 ✨"))
    )
    val messages = _messages.asStateFlow()

    private val _loading = MutableStateFlow(false)
    val loading = _loading.asStateFlow()

    fun refreshSession() {
        _isLoggedIn.value = tokenManager.getTokenSync() != null
    }

    fun chat(content: String, onResult: (Boolean, String) -> Unit) {
        if (content.isBlank()) return
        _messages.value = _messages.value + AiMessage("user", content)
        _loading.value = true
        viewModelScope.launch {
            try {
                val resp = aiRepository.chat(content)
                _messages.value = _messages.value + AiMessage("ai", resp.content)
                onResult(true, "OK")
            } catch (e: Exception) {
                val msg = ApiErrorParser.parse(e)
                _messages.value = _messages.value + AiMessage("ai", "抱歉，我暂时无法回复：$msg")
                onResult(false, msg)
            } finally {
                _loading.value = false
            }
        }
    }

    fun quickAction(type: String) {
        _loading.value = true
        _messages.value = _messages.value + AiMessage(
            "user",
            when (type) {
                "advice" -> "给我今日恋爱建议"
                "analysis" -> "分析本月账单"
                "promise" -> "推荐一个承诺"
                else -> "..."
            }
        )
        viewModelScope.launch {
            try {
                val resp = when (type) {
                    "advice" -> aiRepository.dailyAdvice()
                    "analysis" -> aiRepository.ledgerAnalysis()
                    "promise" -> aiRepository.promiseSuggestion()
                    else -> aiRepository.chat("你好")
                }
                _messages.value = _messages.value + AiMessage("ai", resp.content)
            } catch (e: Exception) {
                _messages.value = _messages.value + AiMessage("ai", "暂不可用：${ApiErrorParser.parse(e)}")
            } finally {
                _loading.value = false
            }
        }
    }
}

@Composable
fun AiScreen(
    navController: NavController,
    onOpenAuth: () -> Unit = {}
) {
    val viewModel: AiViewModel = hiltViewModel()
    val isLoggedIn by viewModel.isLoggedIn.collectAsState()
    val messages by viewModel.messages.collectAsState()
    val loading by viewModel.loading.collectAsState()
    val lifecycleOwner = LocalLifecycleOwner.current

    DisposableEffect(lifecycleOwner) {
        val observer = LifecycleEventObserver { _, event ->
            if (event == Lifecycle.Event.ON_RESUME) viewModel.refreshSession()
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose { lifecycleOwner.lifecycle.removeObserver(observer) }
    }
    LaunchedEffect(Unit) { viewModel.refreshSession() }

    if (!isLoggedIn) {
        RequireLoginView(
            onOpenAuth = onOpenAuth,
            title = "登录后使用 AI 助手",
            subtitle = "连接云端后可分析账单、推荐承诺与恋爱建议"
        )
        return
    }

    val toast = rememberToastState()
    var input by remember { mutableStateOf("") }
    val listState = rememberLazyListState()

    LaunchedEffect(messages.size) {
        if (messages.isNotEmpty()) listState.animateScrollToItem(messages.size - 1)
    }

    ToastHost(toast) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .background(MaterialTheme.colorScheme.background)
                .imePadding()
        ) {
            FeatureTopBar(title = "AI 助手", onBack = { navController.popBackStack() })

            Row(
                modifier = Modifier.fillMaxWidth().padding(Spacing.md),
                horizontalArrangement = Arrangement.spacedBy(Spacing.sm)
            ) {
                QuickActionChip(Icons.Filled.Lightbulb, "今日建议") { viewModel.quickAction("advice") }
                QuickActionChip(Icons.Filled.PieChart, "账单分析") { viewModel.quickAction("analysis") }
                QuickActionChip(Icons.Filled.Bolt, "推荐承诺") { viewModel.quickAction("promise") }
            }

            LazyColumn(
                state = listState,
                modifier = Modifier.weight(1f).fillMaxWidth().padding(horizontal = Spacing.md),
                verticalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                items(messages) { msg ->
                    ChatBubble(
                        role = if (msg.role == "user") ChatRole.Me else ChatRole.Ai,
                        content = msg.content,
                        showName = msg.role == "ai",
                        name = if (msg.role == "ai") "AI 助手" else null
                    )
                }
                if (loading) {
                    item {
                        Box(
                            modifier = Modifier.fillMaxWidth().padding(Spacing.md),
                            contentAlignment = Alignment.Center
                        ) {
                            CircularProgressIndicator(
                                color = RosePink,
                                modifier = Modifier.size(20.dp),
                                strokeWidth = 2.dp
                            )
                        }
                    }
                }
            }

            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(MaterialTheme.colorScheme.surface)
                    .padding(Spacing.sm),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(Spacing.sm)
            ) {
                OutlinedTextField(
                    value = input,
                    onValueChange = { input = it },
                    modifier = Modifier.weight(1f),
                    placeholder = { Text("问我点什么...", fontSize = 14.sp) },
                    shape = RoundedCornerShape(Radius.pill),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = RosePink,
                        unfocusedBorderColor = MaterialTheme.colorScheme.outline
                    ),
                    singleLine = true
                )
                IconButton(
                    onClick = { viewModel.chat(input) { ok, _ -> if (ok) input = "" } },
                    enabled = input.isNotBlank() && !loading
                ) {
                    Icon(
                        Icons.AutoMirrored.Filled.Send,
                        "发送",
                        tint = if (input.isNotBlank() && !loading) RosePink else SecondaryText
                    )
                }
            }
        }
    }
}

@Composable
private fun QuickActionChip(icon: ImageVector, label: String, onClick: () -> Unit) {
    Card(
        modifier = Modifier.clip(RoundedCornerShape(Radius.pill)).clickable(onClick = onClick),
        colors = CardDefaults.cardColors(containerColor = RosePink.copy(alpha = 0.1f))
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(icon, label, tint = RosePink, modifier = Modifier.size(16.dp))
            Spacer(modifier = Modifier.size(4.dp))
            Text(label, fontSize = 12.sp, color = RosePink, fontWeight = FontWeight.Medium)
        }
    }
}
