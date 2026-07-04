package com.coupleai.feature.goal.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.navigation.NavController
import com.coupleai.core.design.components.CoupleBottomSheet
import com.coupleai.core.design.components.CoupleFab
import androidx.compose.runtime.DisposableEffect
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.compose.ui.platform.LocalLifecycleOwner
import com.coupleai.core.design.components.GradientBackground
import com.coupleai.core.design.components.RequireLoginView
import com.coupleai.core.design.components.SkeletonCard
import com.coupleai.core.design.components.ToastHost
import com.coupleai.core.design.components.rememberToastState
import com.coupleai.core.design.theme.Radius
import com.coupleai.core.design.theme.RosePink
import com.coupleai.core.design.theme.SecondaryText
import com.coupleai.core.design.theme.Spacing
import com.coupleai.core.design.theme.Success
import com.coupleai.data.remote.dto.PromiseOut
import com.coupleai.data.remote.interceptor.TokenManager
import com.coupleai.data.remote.repository.PromiseRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class GoalViewModel @Inject constructor(
    private val tokenManager: TokenManager,
    private val promiseRepository: PromiseRepository
) : ViewModel() {

    private val _promises = MutableStateFlow<List<PromiseOut>>(emptyList())
    val promises = _promises.asStateFlow()

    private val _isLoggedIn = MutableStateFlow(tokenManager.getTokenSync() != null)
    val isLoggedIn = _isLoggedIn.asStateFlow()

    fun refreshSession() {
        _isLoggedIn.value = tokenManager.getTokenSync() != null
        if (_isLoggedIn.value) load()
    }

    private val _loading = MutableStateFlow(true)
    val loading = _loading.asStateFlow()

    fun load() {
        _loading.value = true
        viewModelScope.launch {
            try {
                _promises.value = promiseRepository.getPromises()
            } catch (_: Exception) {
            } finally {
                _loading.value = false
            }
        }
    }

    fun createPromise(title: String, desc: String, frequency: String, reward: Int, onResult: (Boolean, String) -> Unit) {
        viewModelScope.launch {
            try {
                promiseRepository.createPromise(title, desc, frequency, reward)
                load()
                onResult(true, "已创建")
            } catch (e: Exception) {
                onResult(false, e.message ?: "创建失败")
            }
        }
    }

    fun checkin(id: Long, onResult: (Boolean, String) -> Unit) {
        viewModelScope.launch {
            try {
                promiseRepository.checkin(id)
                load()
                onResult(true, "打卡成功 +5 经验")
            } catch (e: Exception) {
                onResult(false, e.message ?: "打卡失败")
            }
        }
    }

    fun complete(id: Long, onResult: (Boolean, String) -> Unit) {
        viewModelScope.launch {
            try {
                promiseRepository.completePromise(id)
                load()
                onResult(true, "已完成 +20 经验")
            } catch (e: Exception) {
                onResult(false, e.message ?: "操作失败")
            }
        }
    }
}

@Composable
fun GoalScreen(
    navController: NavController,
    onOpenAuth: () -> Unit = {}
) {
    val viewModel: GoalViewModel = hiltViewModel()
    val promises by viewModel.promises.collectAsState()
    val loading by viewModel.loading.collectAsState()
    val toast = rememberToastState()
    var showAdd by remember { mutableStateOf(false) }

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
        RequireLoginView(onOpenAuth = onOpenAuth, title = "登录后开始打卡", subtitle = "连接云端后可创建并同步你们的共同目标")
        return
    }

    ToastHost(toast) {
        Box(modifier = Modifier.fillMaxSize()) {
            GradientBackground {
                LazyColumn(
                    modifier = Modifier.fillMaxSize().padding(horizontal = Spacing.md),
                    verticalArrangement = Arrangement.spacedBy(Spacing.md)
                ) {
                    item { Spacer(modifier = Modifier.height(Spacing.sm)) }
                    item {
                        Text("承诺打卡", fontSize = 22.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurface)
                        Text("互相许下承诺，每日打卡共同成长", fontSize = 13.sp, color = SecondaryText)
                    }

                    if (loading && promises.isEmpty()) {
                        item { SkeletonCard() }
                        item { SkeletonCard() }
                    } else if (promises.isEmpty()) {
                        item {
                            Box(modifier = Modifier.fillMaxWidth().padding(40.dp), contentAlignment = Alignment.Center) {
                                Text("还没有承诺，点击 + 创建第一个", color = SecondaryText, fontSize = 13.sp)
                            }
                        }
                    } else {
                        items(promises) { p ->
                            PromiseCard(
                                promise = p,
                                onCheckin = { viewModel.checkin(p.id) { ok, msg -> if (ok) toast.success(msg) else toast.error(msg) } },
                                onComplete = { viewModel.complete(p.id) { ok, msg -> if (ok) toast.success(msg) else toast.error(msg) } }
                            )
                        }
                    }
                    item { Spacer(modifier = Modifier.height(80.dp)) }
                }
            }

            CoupleFab(icon = Icons.Filled.Add, onClick = { showAdd = true }, modifier = Modifier.align(Alignment.BottomEnd).padding(Spacing.lg))

            CoupleBottomSheet(show = showAdd, onDismiss = { showAdd = false }, title = "新建承诺") {
                AddPromiseForm { title, desc, freq, reward ->
                    viewModel.createPromise(title, desc, freq, reward) { ok, msg ->
                        if (ok) { toast.success(msg); showAdd = false }
                        else toast.error(msg)
                    }
                }
            }
        }
    }
}

@Composable
private fun PromiseCard(promise: PromiseOut, onCheckin: () -> Unit, onComplete: () -> Unit) {
    val isActive = promise.status == "active"
    val isCompleted = promise.status == "completed"
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(Radius.lg),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(modifier = Modifier.padding(Spacing.md)) {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Text(promise.title, fontSize = 16.sp, fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.onSurface)
                Box(
                    modifier = Modifier.clip(RoundedCornerShape(Radius.pill))
                        .background(if (isActive) Success.copy(alpha = 0.15f) else if (isCompleted) SecondaryText.copy(alpha = 0.1f) else Color(0xFFFFF3E0))
                        .padding(horizontal = 10.dp, vertical = 4.dp)
                ) {
                    Text(
                        when (promise.status) { "active" -> "进行中"; "completed" -> "已完成"; "failed" -> "失败"; else -> promise.status },
                        fontSize = 11.sp, fontWeight = FontWeight.Medium,
                        color = when (promise.status) { "active" -> Success; "completed" -> SecondaryText; else -> Color(0xFFEF9F27) }
                    )
                }
            }
            if (!promise.description.isNullOrBlank()) {
                Text(promise.description!!, fontSize = 13.sp, color = SecondaryText, modifier = Modifier.padding(top = 4.dp))
            }
            Row(modifier = Modifier.padding(top = 8.dp), horizontalArrangement = Arrangement.spacedBy(Spacing.sm)) {
                Text("频率: ${promise.frequency}", fontSize = 11.sp, color = SecondaryText)
                Text("奖励: ${promise.reward_points} 经验", fontSize = 11.sp, color = RosePink)
            }
            if (isActive) {
                Row(modifier = Modifier.padding(top = Spacing.sm), horizontalArrangement = Arrangement.spacedBy(Spacing.sm)) {
                    ActionChip("今日打卡", onCheckin)
                    ActionChip("完成承诺", onComplete)
                }
            }
        }
    }
}

@Composable
private fun ActionChip(label: String, onClick: () -> Unit) {
    Box(
        modifier = Modifier
            .clip(RoundedCornerShape(Radius.pill))
            .background(RosePink.copy(alpha = 0.1f))
            .clickable(onClick = onClick)
            .padding(horizontal = 14.dp, vertical = 8.dp)
    ) {
        Text(label, fontSize = 12.sp, color = RosePink, fontWeight = FontWeight.Medium)
    }
}

@Composable
private fun AddPromiseForm(onSubmit: (String, String, String, Int) -> Unit) {
    var title by remember { mutableStateOf("") }
    var desc by remember { mutableStateOf("") }
    var frequency by remember { mutableStateOf("daily") }
    var reward by remember { mutableStateOf("10") }

    Column(modifier = Modifier.fillMaxWidth()) {
        OutlinedTextField(value = title, onValueChange = { title = it }, label = { Text("承诺标题") }, modifier = Modifier.fillMaxWidth(), singleLine = true, colors = androidx.compose.material3.OutlinedTextFieldDefaults.colors(focusedBorderColor = RosePink, focusedLabelColor = RosePink))
        Spacer(modifier = Modifier.height(12.dp))
        OutlinedTextField(value = desc, onValueChange = { desc = it }, label = { Text("描述 (可选)") }, modifier = Modifier.fillMaxWidth(), colors = androidx.compose.material3.OutlinedTextFieldDefaults.colors(focusedBorderColor = RosePink, focusedLabelColor = RosePink))
        Spacer(modifier = Modifier.height(12.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            listOf("daily", "weekly", "monthly").forEach { f ->
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .clip(RoundedCornerShape(Radius.pill))
                        .background(if (frequency == f) RosePink else Color.Transparent)
                        .clickable { frequency = f }
                        .padding(10.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text(when (f) { "daily" -> "每日"; "weekly" -> "每周"; else -> "每月" }, color = if (frequency == f) Color.White else SecondaryText, fontSize = 13.sp)
                }
            }
        }
        Spacer(modifier = Modifier.height(12.dp))
        OutlinedTextField(value = reward, onValueChange = { reward = it.filter { c -> c.isDigit() } }, label = { Text("奖励经验") }, modifier = Modifier.fillMaxWidth(), singleLine = true, colors = androidx.compose.material3.OutlinedTextFieldDefaults.colors(focusedBorderColor = RosePink, focusedLabelColor = RosePink))
        Spacer(modifier = Modifier.height(20.dp))
        com.coupleai.core.design.components.GradientButton(text = "创建承诺", onClick = {
            if (title.isNotBlank()) onSubmit(title, desc, frequency, reward.toIntOrNull() ?: 10)
        })
    }
}
