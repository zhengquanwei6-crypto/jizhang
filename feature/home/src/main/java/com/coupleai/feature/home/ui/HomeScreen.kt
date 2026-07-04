package com.coupleai.feature.home.ui

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.slideInVertically
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
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Chat
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.TrackChanges
import androidx.compose.material.icons.filled.Wallet
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
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
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.navigation.NavController
import androidx.compose.runtime.DisposableEffect
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.compose.ui.platform.LocalLifecycleOwner
import com.coupleai.core.design.components.GradientBackground
import com.coupleai.core.design.components.CoupleStatusBanner
import com.coupleai.core.design.components.RequireLoginView
import com.coupleai.core.design.components.HeartAnimation
import com.coupleai.core.design.components.NumberCounter
import com.coupleai.core.design.components.StatCard
import com.coupleai.core.design.components.SkeletonCard
import com.coupleai.core.design.theme.PrimaryGradient
import com.coupleai.core.design.theme.Radius
import com.coupleai.core.design.theme.RosePink
import com.coupleai.core.design.theme.RosePinkLight
import com.coupleai.core.design.theme.SecondaryText
import com.coupleai.core.design.theme.Spacing
import com.coupleai.data.remote.dto.BalanceOut
import com.coupleai.data.remote.dto.LedgerSummary
import com.coupleai.data.remote.dto.TxOut
import com.coupleai.data.remote.repository.CoupleRepository
import com.coupleai.data.remote.repository.LedgerRepository
import com.coupleai.data.remote.interceptor.TokenManager
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject
import kotlin.math.max

@HiltViewModel
class HomeViewModel @Inject constructor(
    private val ledgerRepository: LedgerRepository,
    private val coupleRepository: CoupleRepository,
    private val tokenManager: TokenManager
) : ViewModel() {

    private val _summary = MutableStateFlow<LedgerSummary?>(null)
    val summary = _summary.asStateFlow()

    private val _balance = MutableStateFlow<BalanceOut?>(null)
    val balance = _balance.asStateFlow()

    private val _recentTxs = MutableStateFlow<List<TxOut>>(emptyList())
    val recentTxs = _recentTxs.asStateFlow()

    private val _nickname = MutableStateFlow("")
    val nickname = _nickname.asStateFlow()

    private val _loveDays = MutableStateFlow(0L)
    val loveDays = _loveDays.asStateFlow()

    private val _waitingPartner = MutableStateFlow(false)
    val waitingPartner = _waitingPartner.asStateFlow()

    private val _loading = MutableStateFlow(true)
    val loading = _loading.asStateFlow()

    private val _isLoggedIn = MutableStateFlow(tokenManager.getTokenSync() != null)
    val isLoggedIn = _isLoggedIn.asStateFlow()

    fun refreshSession() {
        _isLoggedIn.value = tokenManager.getTokenSync() != null
        if (_isLoggedIn.value) loadDashboard() else {
            _loading.value = false
            _summary.value = null
            _balance.value = null
            _recentTxs.value = emptyList()
            _loveDays.value = 0L
            _nickname.value = ""
        }
    }

    fun loadDashboard() {
        _loading.value = true
        viewModelScope.launch {
            try {
                _nickname.value = tokenManager.getNicknameSync() ?: "我"
                _summary.value = ledgerRepository.getSummary()
                _balance.value = ledgerRepository.getBalance()
                _recentTxs.value = ledgerRepository.getTransactions(5)
                try {
                    val couple = coupleRepository.getMyCouple()
                    _waitingPartner.value = couple.user_b_id == null
                    val created = couple.created_at.take(10).split("-")
                    if (created.size == 3) {
                        val cal = java.util.GregorianCalendar(created[0].toInt(), created[1].toInt() - 1, created[2].toInt())
                        _loveDays.value = max(0, (System.currentTimeMillis() - cal.timeInMillis) / (24 * 3600 * 1000))
                    }
                } catch (_: Exception) {}
            } catch (_: Exception) {
            } finally {
                _loading.value = false
            }
        }
    }
}

@Composable
fun HomeScreen(
    navController: NavController,
    onOpenAuth: () -> Unit = {},
    onOpenBind: () -> Unit = { navController.navigate("mine") }
) {
    val viewModel: HomeViewModel = hiltViewModel()
    val summary by viewModel.summary.collectAsState()
    val balance by viewModel.balance.collectAsState()
    val recentTxs by viewModel.recentTxs.collectAsState()
    val nickname by viewModel.nickname.collectAsState()
    val loveDays by viewModel.loveDays.collectAsState()
    val loading by viewModel.loading.collectAsState()
    val waitingPartner by viewModel.waitingPartner.collectAsState()
    val isLoggedIn by viewModel.isLoggedIn.collectAsState()
    val lifecycleOwner = LocalLifecycleOwner.current

    DisposableEffect(lifecycleOwner) {
        val observer = LifecycleEventObserver { _, event ->
            if (event == Lifecycle.Event.ON_RESUME) viewModel.refreshSession()
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose { lifecycleOwner.lifecycle.removeObserver(observer) }
    }

    var visible by remember { mutableStateOf(false) }
    LaunchedEffect(Unit) {
        delay(100)
        visible = true
        viewModel.refreshSession()
    }

    if (!isLoggedIn) {
        RequireLoginView(onOpenAuth = onOpenAuth)
        return
    }

    GradientBackground {
        LazyColumn(
            modifier = Modifier.fillMaxSize().padding(horizontal = Spacing.md),
            verticalArrangement = Arrangement.spacedBy(Spacing.md)
        ) {
            item { Spacer(modifier = Modifier.height(Spacing.sm)) }

            item {
                CoupleStatusBanner(waitingPartner = waitingPartner, onClick = onOpenBind)
            }

            // Header
            item {
                AnimatedVisibility(visible = visible, enter = fadeIn() + slideInVertically { -it }) {
                    HomeHeader(nickname, navController)
                }
            }

            // Love days card
            item {
                AnimatedVisibility(visible = visible, enter = fadeIn() + slideInVertically { -it / 2 }) {
                    if (loading && loveDays == 0L) SkeletonCard()
                    else LoveDaysCard(loveDays)
                }
            }

            // Month expense
            item {
                AnimatedVisibility(visible = visible, enter = fadeIn() + slideInVertically { -it / 3 }) {
                    if (loading && summary == null) SkeletonCard()
                    else Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(Spacing.sm)) {
                        StatCard(
                            title = "本月支出",
                            value = "¥${summary?.month_expense?.toInt() ?: 0}",
                            subtitle = "今日 ¥${summary?.today_expense?.toInt() ?: 0}",
                            gradient = PrimaryGradient,
                            modifier = Modifier.weight(1f)
                        )
                    }
                }
            }

            // Balance
            item {
                AnimatedVisibility(visible = visible, enter = fadeIn() + slideInVertically { -it / 3 }) {
                    if (loading && balance == null) SkeletonCard()
                    else BalanceCard(balance)
                }
            }

            // Quick actions
            item {
                AnimatedVisibility(visible = visible, enter = fadeIn() + slideInVertically()) {
                    QuickActionsRow(navController)
                }
            }

            // Recent transactions
            item {
                AnimatedVisibility(visible = visible, enter = fadeIn() + slideInVertically()) {
                    Text("最近账单", fontSize = 16.sp, fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.onSurface, modifier = Modifier.padding(top = Spacing.sm))
                }
            }

            if (loading && recentTxs.isEmpty()) {
                item { SkeletonCard() }
                item { SkeletonCard() }
            } else if (recentTxs.isEmpty()) {
                item {
                    Box(modifier = Modifier.fillMaxWidth().padding(24.dp), contentAlignment = Alignment.Center) {
                        Text("暂无账单", color = SecondaryText, fontSize = 13.sp)
                    }
                }
            } else {
                items(recentTxs) { tx ->
                    RecentTxItem(tx)
                }
            }

            item { Spacer(modifier = Modifier.height(80.dp)) }
        }
    }
}

@Composable
private fun HomeHeader(nickname: String, navController: NavController) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(top = Spacing.sm),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column {
            Text(getGreeting(), fontSize = 14.sp, color = SecondaryText)
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(nickname, fontSize = 20.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurface)
                Spacer(modifier = Modifier.size(Spacing.sm))
                HeartAnimation(size = 20.dp)
            }
        }
        Row {
            IconButton(onClick = { navController.navigate("mine") }) { Icon(Icons.Filled.Notifications, "通知", tint = MaterialTheme.colorScheme.onSurface) }
            IconButton(onClick = { navController.navigate("mine") }) { Icon(Icons.Filled.Settings, "设置", tint = MaterialTheme.colorScheme.onSurface) }
        }
    }
}

@Composable
private fun LoveDaysCard(days: Long) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(Radius.lg))
            .background(Brush.horizontalGradient(listOf(RosePink.copy(alpha = 0.9f), RosePinkLight.copy(alpha = 0.8f))))
            .padding(20.dp)
    ) {
        Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            Column(modifier = Modifier.weight(1f)) {
                Text("恋爱时长", fontSize = 14.sp, color = Color.White.copy(alpha = 0.8f))
                Row(verticalAlignment = Alignment.Bottom) {
                    NumberCounter(targetValue = days.toFloat(), fontSize = 40, fontWeight = FontWeight.Bold, color = Color.White)
                    Spacer(modifier = Modifier.size(6.dp))
                    Text("天", fontSize = 18.sp, color = Color.White.copy(alpha = 0.9f), modifier = Modifier.padding(bottom = 6.dp))
                }
                Text("感谢相遇，感恩相守", fontSize = 13.sp, color = Color.White.copy(alpha = 0.75f), modifier = Modifier.padding(top = 4.dp))
            }
            Box(modifier = Modifier.size(64.dp).clip(CircleShape).background(Color.White.copy(alpha = 0.2f)), contentAlignment = Alignment.Center) {
                HeartAnimation(size = 48.dp)
            }
        }
    }
}

@Composable
private fun BalanceCard(balance: BalanceOut?) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(Radius.lg),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Row(modifier = Modifier.fillMaxWidth().padding(Spacing.md), horizontalArrangement = Arrangement.SpaceBetween) {
            Column {
                Text("当前余额", fontSize = 11.sp, color = SecondaryText)
                Text("¥${balance?.current_balance?.toInt() ?: 0}", fontSize = 24.sp, fontWeight = FontWeight.Bold, color = RosePink)
            }
            Column(horizontalAlignment = Alignment.End) {
                Text("收入 / 支出", fontSize = 11.sp, color = SecondaryText)
                Text("¥${balance?.total_income?.toInt() ?: 0} / ¥${balance?.total_expense?.toInt() ?: 0}", fontSize = 13.sp, fontWeight = FontWeight.Medium, color = MaterialTheme.colorScheme.onSurface)
            }
        }
    }
}

@Composable
private fun QuickActionsRow(navController: NavController) {
    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
        QuickAction("记账", Icons.Filled.Wallet) { navController.navigate("account") }
        QuickAction("聊天", Icons.Filled.Chat) { navController.navigate("chat") }
        QuickAction("目标", Icons.Filled.TrackChanges) { navController.navigate("goal") }
        QuickAction("养成", Icons.Filled.Favorite) { navController.navigate("relationship") }
    }
}

@Composable
private fun QuickAction(label: String, icon: androidx.compose.ui.graphics.vector.ImageVector, onClick: () -> Unit) {
    Column(
        modifier = Modifier.clip(RoundedCornerShape(Radius.md)).clickable(onClick = onClick).padding(Spacing.sm),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Box(modifier = Modifier.size(44.dp).clip(CircleShape).background(RosePinkLight.copy(alpha = 0.5f)), contentAlignment = Alignment.Center) {
            Icon(icon, label, tint = RosePink, modifier = Modifier.size(22.dp))
        }
        Spacer(modifier = Modifier.height(4.dp))
        Text(label, fontSize = 11.sp, color = SecondaryText)
    }
}

@Composable
private fun RecentTxItem(tx: TxOut) {
    Row(
        modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(Radius.md)).background(MaterialTheme.colorScheme.surface).padding(Spacing.md),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(modifier = Modifier.size(36.dp).clip(RoundedCornerShape(10.dp)).background(if (tx.type == "expense") RosePinkLight else Color(0xFFE1F5EE)), contentAlignment = Alignment.Center) {
            Text(if (tx.type == "expense") "出" else "入", color = if (tx.type == "expense") RosePink else Color(0xFF1D9E75), fontSize = 13.sp, fontWeight = FontWeight.Bold)
        }
        Spacer(modifier = Modifier.size(Spacing.sm))
        Column(modifier = Modifier.weight(1f)) {
            Text(tx.note ?: "未备注", fontSize = 14.sp, fontWeight = FontWeight.Medium, color = MaterialTheme.colorScheme.onSurface)
            Text(tx.happened_at.take(10), fontSize = 11.sp, color = SecondaryText)
        }
        Text("${if (tx.type == "expense") "-" else "+"}¥${tx.amount.toInt()}", fontSize = 15.sp, fontWeight = FontWeight.SemiBold, color = if (tx.type == "expense") RosePink else Color(0xFF1D9E75))
    }
}

private fun getGreeting(): String {
    val hour = java.util.Calendar.getInstance().get(java.util.Calendar.HOUR_OF_DAY)
    return when (hour) {
        in 5..10 -> "早上好"
        in 11..13 -> "中午好"
        in 14..17 -> "下午好"
        in 18..22 -> "晚上好"
        else -> "夜深了"
    }
}

private suspend fun delay(ms: Long) = kotlinx.coroutines.delay(ms)
