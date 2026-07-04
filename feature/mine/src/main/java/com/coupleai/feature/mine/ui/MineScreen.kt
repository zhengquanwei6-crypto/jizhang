package com.coupleai.feature.mine.ui

import android.content.Intent
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
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Chat
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.ExitToApp
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.School
import androidx.compose.material.icons.filled.Security
import androidx.compose.material.icons.filled.Share
import androidx.compose.material.icons.filled.SportsEsports
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
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
import com.coupleai.core.design.components.CoupleBindSheet
import com.coupleai.core.design.components.CoupleBottomSheet
import com.coupleai.core.design.components.GradientBackground
import com.coupleai.core.design.components.SingleAvatar
import com.coupleai.core.design.theme.PrimaryGradient
import com.coupleai.core.design.theme.Radius
import com.coupleai.core.design.theme.RosePink
import com.coupleai.core.design.theme.RosePinkLight
import com.coupleai.core.design.theme.SecondaryText
import com.coupleai.core.design.theme.Spacing
import com.coupleai.data.remote.dto.CoupleOut
import com.coupleai.data.remote.interceptor.TokenManager
import com.coupleai.data.remote.repository.AuthRepository
import com.coupleai.data.remote.repository.CoupleRepository
import com.coupleai.data.remote.util.ApiErrorParser
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class MineViewModel @Inject constructor(
    private val authRepository: AuthRepository,
    private val coupleRepository: CoupleRepository,
    private val tokenManager: TokenManager
) : ViewModel() {

    private val _nickname = MutableStateFlow("")
    val nickname = _nickname.asStateFlow()

    private val _email = MutableStateFlow("")
    val email = _email.asStateFlow()

    private val _userId = MutableStateFlow<Long?>(null)
    val userId = _userId.asStateFlow()

    private val _couple = MutableStateFlow<CoupleOut?>(null)
    val couple = _couple.asStateFlow()

    private val _bindLoading = MutableStateFlow(false)
    val bindLoading = _bindLoading.asStateFlow()

    private val _inviteCode = MutableStateFlow<String?>(null)
    val inviteCode = _inviteCode.asStateFlow()

    private val _bindError = MutableStateFlow<String?>(null)
    val bindError = _bindError.asStateFlow()

    init {
        refreshProfile()
    }

    fun refreshProfile() {
        _nickname.value = tokenManager.getNicknameSync() ?: ""
        _userId.value = tokenManager.getUserIdSync()
        if (_userId.value == null) {
            _email.value = ""
            _couple.value = null
            return
        }
        viewModelScope.launch {
            try {
                val me = authRepository.me()
                _nickname.value = me.nickname
                _email.value = me.email ?: me.phone ?: ""
                tokenManager.saveToken(tokenManager.getTokenSync() ?: "", me.id, me.nickname)
                _couple.value = coupleRepository.getMyCouple()
            } catch (_: Exception) {
                _couple.value = null
            }
        }
    }

    fun createInviteCode() {
        _bindLoading.value = true
        _bindError.value = null
        viewModelScope.launch {
            try {
                _inviteCode.value = coupleRepository.createInviteCode().code
            } catch (e: Exception) {
                _bindError.value = ApiErrorParser.parse(e)
            } finally {
                _bindLoading.value = false
            }
        }
    }

    fun bindCouple(code: String, onSuccess: () -> Unit) {
        if (code.isBlank()) {
            _bindError.value = "请输入邀请码"
            return
        }
        _bindLoading.value = true
        _bindError.value = null
        viewModelScope.launch {
            try {
                _couple.value = coupleRepository.bindCouple(code.trim())
                onSuccess()
            } catch (e: Exception) {
                _bindError.value = ApiErrorParser.parse(e)
            } finally {
                _bindLoading.value = false
            }
        }
    }

    fun resetBindState() {
        _inviteCode.value = null
        _bindError.value = null
    }

    fun logout(onDone: () -> Unit) {
        viewModelScope.launch {
            authRepository.logout()
            onDone()
        }
    }
}

@Composable
fun MineScreen(
    navController: NavController,
    onOpenAuth: () -> Unit = {}
) {
    val viewModel: MineViewModel = hiltViewModel()
    val nickname by viewModel.nickname.collectAsState()
    val email by viewModel.email.collectAsState()
    val userId by viewModel.userId.collectAsState()
    val couple by viewModel.couple.collectAsState()
    val bindLoading by viewModel.bindLoading.collectAsState()
    val inviteCode by viewModel.inviteCode.collectAsState()
    val bindError by viewModel.bindError.collectAsState()

    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    var showLogoutDialog by remember { mutableStateOf(false) }
    var showBindSheet by remember { mutableStateOf(false) }
    var bindInput by remember { mutableStateOf("") }

    DisposableEffect(lifecycleOwner) {
        val observer = LifecycleEventObserver { _, event ->
            if (event == Lifecycle.Event.ON_RESUME) viewModel.refreshProfile()
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose { lifecycleOwner.lifecycle.removeObserver(observer) }
    }

    GradientBackground {
        LazyColumn(
            modifier = Modifier.fillMaxSize().padding(horizontal = Spacing.md),
            verticalArrangement = Arrangement.spacedBy(Spacing.md)
        ) {
            item { Spacer(modifier = Modifier.height(Spacing.sm)) }

            item {
                ProfileHeader(
                    nickname = nickname.ifBlank { "未登录" },
                    email = when {
                        userId == null -> "点击登录"
                        couple?.display_name != null -> couple?.display_name ?: email
                        couple?.user_b_id != null -> "已绑定伴侣"
                        else -> email.ifBlank { "已登录" }
                    },
                    onClick = { if (userId == null) onOpenAuth() }
                )
            }

            item {
                SettingsSection("账户") {
                    MenuItem(Icons.Filled.Person, "云端账号", if (userId != null) "已登录" else "注册 / 登录") { onOpenAuth() }
                    MenuItem(
                        Icons.AutoMirrored.Filled.Chat,
                        "邀请伴侣",
                        if (couple?.user_b_id != null) "已绑定" else "生成或输入邀请码"
                    ) {
                        if (userId == null) onOpenAuth() else {
                            viewModel.resetBindState()
                            bindInput = ""
                            showBindSheet = true
                        }
                    }
                }
            }

            item {
                SettingsSection("更多功能") {
                    MenuItem(Icons.Filled.School, "爱情养成", "宠物与亲密度") { navController.navigate("relationship") }
                    MenuItem(Icons.Filled.SportsEsports, "AI 助手", "账单分析与恋爱建议") { navController.navigate("ai") }
                    MenuItem(Icons.Filled.LocationOn, "恋爱足迹", "记录共同去过的地方") { navController.navigate("location") }
                }
            }

            item {
                SettingsSection("偏好") {
                    MenuItem(Icons.Filled.Notifications, "推送通知", "记账/打卡提醒") { }
                    MenuItem(Icons.Filled.Star, "评分支持", "给个好评") { }
                }
            }

            item {
                SettingsSection("其他") {
                    MenuItem(Icons.Filled.Security, "隐私政策", "") { }
                    MenuItem(Icons.Filled.Info, "关于我们", "v0.2.1") { }
                    MenuItem(Icons.Filled.Share, "分享应用", "http://162.243.78.70") { }
                }
            }

            if (userId != null) {
                item {
                    Card(
                        modifier = Modifier.fillMaxWidth().clickable { showLogoutDialog = true },
                        shape = RoundedCornerShape(Radius.lg),
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth().padding(Spacing.md),
                            horizontalArrangement = Arrangement.Center,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(Icons.Filled.ExitToApp, "退出", tint = RosePink, modifier = Modifier.size(20.dp))
                            Spacer(modifier = Modifier.size(Spacing.sm))
                            Text("退出登录", color = RosePink, fontSize = 15.sp, fontWeight = FontWeight.Medium)
                        }
                    }
                }
            }

            item {
                Text(
                    "CoupleSpaceAI v0.2.1 · 恋爱共生空间\n用户ID: ${userId ?: "-"}",
                    fontSize = 11.sp,
                    color = SecondaryText,
                    modifier = Modifier.fillMaxWidth().padding(Spacing.md),
                    textAlign = androidx.compose.ui.text.style.TextAlign.Center
                )
            }
            item { Spacer(modifier = Modifier.height(88.dp)) }
        }

        if (showBindSheet) {
            CoupleBottomSheet(
                show = showBindSheet,
                onDismiss = { showBindSheet = false }
            ) {
                CoupleBindSheet(
                    loading = bindLoading,
                    inviteCode = inviteCode,
                    error = bindError,
                    bindInput = bindInput,
                    onBindInputChange = { bindInput = it },
                    onCreateCode = { viewModel.createInviteCode() },
                    onBind = {
                        viewModel.bindCouple(bindInput) {
                            showBindSheet = false
                            viewModel.refreshProfile()
                        }
                    }
                )
            }
        }

        if (showLogoutDialog) {
            AlertDialog(
                onDismissRequest = { showLogoutDialog = false },
                title = { Text("退出登录") },
                text = { Text("确定要退出当前账号吗？") },
                confirmButton = {
                    TextButton(onClick = {
                        showLogoutDialog = false
                        viewModel.logout {
                            val intent = context.packageManager.getLaunchIntentForPackage(context.packageName)
                            intent?.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_NEW_TASK)
                            context.startActivity(intent)
                        }
                    }) { Text("确定", color = RosePink) }
                },
                dismissButton = {
                    TextButton(onClick = { showLogoutDialog = false }) { Text("取消") }
                }
            )
        }
    }
}

@Composable
private fun ProfileHeader(nickname: String, email: String, onClick: () -> Unit = {}) {
    Card(
        modifier = Modifier.fillMaxWidth().clickable(onClick = onClick),
        shape = RoundedCornerShape(Radius.lg),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 8.dp)
    ) {
        Box {
            Box(modifier = Modifier.fillMaxWidth().height(80.dp).background(Brush.horizontalGradient(PrimaryGradient)))
            Column(
                modifier = Modifier.fillMaxWidth().padding(top = 40.dp).padding(Spacing.md),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                SingleAvatar(imageUrl = null, name = nickname, size = 64.dp)
                Spacer(modifier = Modifier.height(12.dp))
                Text(nickname, fontSize = 18.sp, fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.onSurface)
                Text(email, fontSize = 13.sp, color = SecondaryText, modifier = Modifier.padding(top = 2.dp))
            }
        }
    }
}

@Composable
private fun SettingsSection(title: String, content: @Composable () -> Unit) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(Radius.lg),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(modifier = Modifier.padding(Spacing.md)) {
            Text(title, fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = SecondaryText, modifier = Modifier.padding(bottom = Spacing.sm))
            content()
        }
    }
}

@Composable
private fun MenuItem(icon: ImageVector, title: String, subtitle: String, onClick: () -> Unit) {
    Row(
        modifier = Modifier.fillMaxWidth().clickable(onClick = onClick).padding(vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(
            modifier = Modifier.size(36.dp).clip(RoundedCornerShape(10.dp)).background(RosePinkLight.copy(alpha = 0.25f)),
            contentAlignment = Alignment.Center
        ) {
            Icon(icon, title, tint = RosePink, modifier = Modifier.size(20.dp))
        }
        Spacer(modifier = Modifier.size(Spacing.md))
        Column(modifier = Modifier.weight(1f)) {
            Text(title, fontSize = 15.sp, fontWeight = FontWeight.Medium, color = MaterialTheme.colorScheme.onSurface)
            if (subtitle.isNotBlank()) {
                Text(subtitle, fontSize = 12.sp, color = SecondaryText, modifier = Modifier.padding(top = 2.dp))
            }
        }
        Icon(Icons.Filled.ChevronRight, "更多", tint = SecondaryText, modifier = Modifier.size(20.dp))
    }
}
