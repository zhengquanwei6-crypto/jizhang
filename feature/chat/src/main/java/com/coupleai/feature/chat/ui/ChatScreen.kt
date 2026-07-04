package com.coupleai.feature.chat.ui

import androidx.compose.foundation.background
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
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import com.coupleai.core.design.components.RequireLoginView
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.navigation.NavController
import com.coupleai.core.design.components.ChatBubble
import com.coupleai.core.design.components.ChatRole
import com.coupleai.core.design.components.SkeletonCard
import com.coupleai.core.design.components.ToastHost
import com.coupleai.core.design.components.rememberToastState
import com.coupleai.core.design.theme.Radius
import com.coupleai.core.design.theme.RosePink
import com.coupleai.core.design.theme.SecondaryText
import com.coupleai.core.design.theme.Spacing
import com.coupleai.data.remote.dto.ChatMessageOut
import com.coupleai.data.remote.interceptor.TokenManager
import com.coupleai.data.remote.repository.ChatRepository
import com.coupleai.data.remote.repository.CoupleRepository
import com.coupleai.feature.chat.ws.ChatWebSocketClient
import com.coupleai.feature.chat.ws.WsMessage
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class ChatViewModel @Inject constructor(
    private val chatRepository: ChatRepository,
    private val coupleRepository: CoupleRepository,
    private val tokenManager: TokenManager,
    private val wsClient: ChatWebSocketClient
) : ViewModel() {

    private val _messages = MutableStateFlow<List<ChatMessageOut>>(emptyList())
    val messages = _messages.asStateFlow()

    private val _isLoggedIn = MutableStateFlow(tokenManager.getTokenSync() != null)
    val isLoggedIn = _isLoggedIn.asStateFlow()

    fun refreshSession() {
        _isLoggedIn.value = tokenManager.getTokenSync() != null
        if (_isLoggedIn.value) loadAndConnect()
    }

    private val _loading = MutableStateFlow(true)
    val loading = _loading.asStateFlow()

    private val _sending = MutableStateFlow(false)
    val sending = _sending.asStateFlow()

    private val _connected = MutableStateFlow(false)
    val connected = _connected.asStateFlow()

    private val _error = MutableStateFlow<String?>(null)
    val error = _error.asStateFlow()

    private var coupleId: Long? = null

    fun loadAndConnect() {
        _loading.value = true
        viewModelScope.launch {
            try {
                _messages.value = chatRepository.getMessages(100)
                val couple = coupleRepository.getMyCouple()
                coupleId = couple.id
                connectWs()
            } catch (e: Exception) {
                _error.value = e.message
            } finally {
                _loading.value = false
            }
        }
    }

    private fun connectWs() {
        val cid = coupleId ?: return
        val token = tokenManager.getTokenSync() ?: return
        viewModelScope.launch {
            wsClient.connect(cid, token).collect { msg ->
                _connected.value = true
                val out = ChatMessageOut(
                    id = System.currentTimeMillis(),
                    couple_id = cid,
                    sender_user_id = msg.senderUserId,
                    role = msg.role,
                    message_type = msg.type,
                    content = msg.content,
                    created_at = msg.createdAt.ifBlank {
                        java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", java.util.Locale.US)
                            .format(java.util.Date())
                    }
                )
                _messages.value = _messages.value + out
            }
        }
    }

    fun sendMessage(content: String, onResult: (Boolean, String) -> Unit) {
        if (content.isBlank()) return
        _sending.value = true
        viewModelScope.launch {
            try {
                val msg = chatRepository.sendMessage(content)
                _messages.value = _messages.value + msg
                onResult(true, "已发送")
            } catch (e: Exception) {
                onResult(false, e.message ?: "发送失败")
            } finally {
                _sending.value = false
            }
        }
    }

    fun getCurrentUserId(): Long? = tokenManager.getUserIdSync()
}

@Composable
fun ChatScreen(
    navController: NavController,
    onOpenAuth: () -> Unit = {}
) {
    val viewModel: ChatViewModel = hiltViewModel()
    val messages by viewModel.messages.collectAsState()
    val loading by viewModel.loading.collectAsState()
    val sending by viewModel.sending.collectAsState()
    val connected by viewModel.connected.collectAsState()

    val toast = rememberToastState()
    var input by remember { mutableStateOf("") }
    val listState = rememberLazyListState()

    val isLoggedIn by viewModel.isLoggedIn.collectAsState()
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
        RequireLoginView(onOpenAuth = onOpenAuth, title = "登录后开始聊天", subtitle = "连接云端后可与伴侣实时同步消息")
        return
    }
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
            // Connection indicator
            if (!connected && !loading) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(SecondaryText.copy(alpha = 0.1f))
                        .padding(8.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text("实时连接断开，使用离线模式", fontSize = 11.sp, color = SecondaryText)
                }
            }

            LazyColumn(
                state = listState,
                modifier = Modifier.weight(1f).fillMaxWidth().padding(horizontal = Spacing.md),
                verticalArrangement = Arrangement.spacedBy(2.dp)
            ) {
                if (loading && messages.isEmpty()) {
                    item { SkeletonCard() }
                    item { SkeletonCard() }
                } else if (messages.isEmpty()) {
                    item {
                        Box(modifier = Modifier.fillMaxWidth().padding(40.dp), contentAlignment = Alignment.Center) {
                            Text("开始你们的对话吧 ♥", color = SecondaryText, fontSize = 14.sp)
                        }
                    }
                } else {
                    items(messages) { msg ->
                        val role = when (msg.role) {
                            "user" -> if (msg.sender_user_id == viewModel.getCurrentUserId()) ChatRole.Me else ChatRole.Other
                            "partner" -> ChatRole.Other
                            "ai" -> ChatRole.Ai
                            else -> ChatRole.Other
                        }
                        ChatBubble(
                            role = role,
                            content = msg.content,
                            time = msg.created_at.take(16).replace("T", " "),
                            showName = role == ChatRole.Ai,
                            name = if (role == ChatRole.Ai) "AI 助手" else null
                        )
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
                    placeholder = { Text("说点什么...", fontSize = 14.sp) },
                    shape = RoundedCornerShape(Radius.pill),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = RosePink,
                        unfocusedBorderColor = MaterialTheme.colorScheme.outline
                    ),
                    singleLine = true
                )
                if (sending) {
                    CircularProgressIndicator(color = RosePink, modifier = Modifier.size(24.dp), strokeWidth = 2.dp)
                } else {
                    IconButton(
                        onClick = {
                            viewModel.sendMessage(input) { ok, msg ->
                                if (ok) input = ""
                                else toast.error(msg)
                            }
                        },
                        enabled = input.isNotBlank()
                    ) {
                        Icon(
                            Icons.AutoMirrored.Filled.Send, "发送",
                            tint = if (input.isNotBlank()) RosePink else SecondaryText
                        )
                    }
                }
            }
        }
    }
}
