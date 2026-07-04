package com.coupleai.feature.account.ui

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
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.ArrowDownward
import androidx.compose.material.icons.filled.ArrowUpward
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
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
import androidx.compose.runtime.DisposableEffect
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.compose.ui.platform.LocalLifecycleOwner
import com.coupleai.core.design.components.CoupleBottomSheet
import com.coupleai.core.design.components.RequireLoginView
import com.coupleai.core.design.components.CoupleFab
import com.coupleai.core.design.components.GradientBackground
import com.coupleai.core.design.components.SkeletonCard
import com.coupleai.core.design.components.StatCard
import com.coupleai.core.design.components.ToastHost
import com.coupleai.core.design.components.rememberToastState
import com.coupleai.core.design.theme.PrimaryGradient
import com.coupleai.core.design.theme.Radius
import com.coupleai.core.design.theme.RosePink
import com.coupleai.core.design.theme.RosePinkLight
import com.coupleai.core.design.theme.SecondaryText
import com.coupleai.core.design.theme.Spacing
import com.coupleai.data.remote.dto.BalanceOut
import com.coupleai.data.remote.dto.LedgerSummary
import com.coupleai.data.remote.dto.StatsOut
import com.coupleai.data.remote.dto.TxOut
import com.coupleai.data.remote.interceptor.TokenManager
import com.coupleai.data.remote.repository.LedgerRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class AccountViewModel @Inject constructor(
    private val ledgerRepository: LedgerRepository,
    private val tokenManager: TokenManager
) : ViewModel() {

    private val _summary = MutableStateFlow<LedgerSummary?>(null)
    val summary = _summary.asStateFlow()

    private val _balance = MutableStateFlow<BalanceOut?>(null)
    val balance = _balance.asStateFlow()

    private val _stats = MutableStateFlow<StatsOut?>(null)
    val stats = _stats.asStateFlow()

    private val _transactions = MutableStateFlow<List<TxOut>>(emptyList())
    val transactions = _transactions.asStateFlow()

    private val _loading = MutableStateFlow(true)
    val loading = _loading.asStateFlow()

    private val _error = MutableStateFlow<String?>(null)
    val error = _error.asStateFlow()

    private val _isLoggedIn = MutableStateFlow(tokenManager.getTokenSync() != null)
    val isLoggedIn = _isLoggedIn.asStateFlow()

    fun refreshSession() {
        _isLoggedIn.value = tokenManager.getTokenSync() != null
        if (_isLoggedIn.value) loadData()
    }

    fun loadData() {
        _loading.value = true
        _error.value = null
        viewModelScope.launch {
            try {
                val txs = ledgerRepository.getTransactions(100)
                _transactions.value = txs
                _summary.value = ledgerRepository.getSummary()
                _balance.value = ledgerRepository.getBalance()
                _stats.value = ledgerRepository.getStats()
            } catch (e: Exception) {
                _error.value = e.message ?: "加载失败"
            } finally {
                _loading.value = false
            }
        }
    }

    fun addTransaction(amount: Double, type: String, note: String, onResult: (Boolean, String) -> Unit) {
        viewModelScope.launch {
            try {
                ledgerRepository.addTransaction(amount, type, note)
                loadData()
                onResult(true, "记账成功")
            } catch (e: Exception) {
                onResult(false, e.message ?: "记账失败")
            }
        }
    }

    fun deleteTransaction(id: Long, onResult: (Boolean, String) -> Unit) {
        viewModelScope.launch {
            try {
                ledgerRepository.deleteTransaction(id)
                loadData()
                onResult(true, "已删除")
            } catch (e: Exception) {
                onResult(false, e.message ?: "删除失败")
            }
        }
    }
}

@Composable
fun AccountScreen(
    navController: NavController,
    onOpenAuth: () -> Unit = {},
    openAddOnStart: Boolean = false
) {
    val viewModel: AccountViewModel = hiltViewModel()
    val loading by viewModel.loading.collectAsState()
    val summary by viewModel.summary.collectAsState()
    val balance by viewModel.balance.collectAsState()
    val stats by viewModel.stats.collectAsState()
    val transactions by viewModel.transactions.collectAsState()
    val error by viewModel.error.collectAsState()
    val isLoggedIn by viewModel.isLoggedIn.collectAsState()
    val lifecycleOwner = LocalLifecycleOwner.current

    DisposableEffect(lifecycleOwner) {
        val observer = LifecycleEventObserver { _, event ->
            if (event == Lifecycle.Event.ON_RESUME) viewModel.refreshSession()
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose { lifecycleOwner.lifecycle.removeObserver(observer) }
    }

    if (!isLoggedIn) {
        RequireLoginView(
            onOpenAuth = onOpenAuth,
            title = "登录后开始记账",
            subtitle = "连接云端账号后，可与伴侣同步账单与统计"
        )
        return
    }

    val toast = rememberToastState()
    var showAdd by remember { mutableStateOf(openAddOnStart) }
    var visible by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) {
        delay(100)
        visible = true
        viewModel.loadData()
    }

    LaunchedEffect(error) {
        error?.let { toast.error(it) }
    }

    ToastHost(toast) {
        Box(modifier = Modifier.fillMaxSize()) {
            GradientBackground {
                LazyColumn(
                    modifier = Modifier.fillMaxSize().padding(horizontal = Spacing.md),
                    verticalArrangement = Arrangement.spacedBy(Spacing.md)
                ) {
                    item { Spacer(modifier = Modifier.height(Spacing.sm)) }

                    // Summary cards
                    item {
                        AnimatedVisibility(visible = visible, enter = fadeIn() + slideInVertically { -it }) {
                            if (loading && summary == null) {
                                SkeletonCard()
                            } else {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.spacedBy(Spacing.sm)
                                ) {
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
                    }

                    // Balance card
                    item {
                        AnimatedVisibility(visible = visible, enter = fadeIn() + slideInVertically { -it / 2 }) {
                            if (loading && balance == null) {
                                SkeletonCard()
                            } else {
                                BalanceCard(balance = balance)
                            }
                        }
                    }

                    // Stats card
                    item {
                        AnimatedVisibility(visible = visible, enter = fadeIn() + slideInVertically { -it / 3 }) {
                            if (loading && stats == null) {
                                SkeletonCard()
                            } else {
                                StatsCard(stats = stats)
                            }
                        }
                    }

                    // Transaction list header
                    item {
                        Text(
                            "账单明细",
                            fontSize = 16.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = MaterialTheme.colorScheme.onSurface,
                            modifier = Modifier.padding(top = Spacing.sm)
                        )
                    }

                    // Transaction list
                    if (loading && transactions.isEmpty()) {
                        item { SkeletonCard() }
                        item { SkeletonCard() }
                        item { SkeletonCard() }
                    } else if (transactions.isEmpty()) {
                        item {
                            EmptyTransactionState()
                        }
                    } else {
                        items(transactions) { tx ->
                            TransactionItem(
                                tx = tx,
                                onDelete = {
                                    viewModel.deleteTransaction(tx.id) { ok, msg ->
                                        if (ok) toast.success(msg) else toast.error(msg)
                                    }
                                }
                            )
                        }
                    }
                    item { Spacer(modifier = Modifier.height(80.dp)) }
                }
            }

            // FAB
            CoupleFab(
                icon = Icons.Filled.Add,
                onClick = { showAdd = true },
                modifier = Modifier
                    .align(Alignment.BottomEnd)
                    .padding(Spacing.lg)
            )

            // Add transaction bottom sheet
            CoupleBottomSheet(
                show = showAdd,
                onDismiss = { showAdd = false },
                title = "新增账单"
            ) {
                AddTransactionForm(
                    onSubmit = { amount, type, note ->
                        viewModel.addTransaction(amount, type, note) { ok, msg ->
                            if (ok) {
                                toast.success(msg)
                                showAdd = false
                            } else {
                                toast.error(msg)
                            }
                        }
                    }
                )
            }
        }
    }
}

@Composable
private fun BalanceCard(balance: BalanceOut?) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(Radius.lg))
            .background(RosePinkLight.copy(alpha = 0.3f))
            .padding(Spacing.md)
    ) {
        Text("资金总览", fontSize = 13.sp, color = SecondaryText)
        Spacer(modifier = Modifier.height(4.dp))
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            Column {
                Text("当前余额", fontSize = 11.sp, color = SecondaryText)
                Text("¥${balance?.current_balance?.toInt() ?: 0}",
                    fontSize = 24.sp, fontWeight = FontWeight.Bold, color = RosePink)
            }
            Column(horizontalAlignment = Alignment.End) {
                Text("总收入 / 总支出", fontSize = 11.sp, color = SecondaryText)
                Text("¥${balance?.total_income?.toInt() ?: 0} / ¥${balance?.total_expense?.toInt() ?: 0}",
                    fontSize = 13.sp, fontWeight = FontWeight.Medium, color = MaterialTheme.colorScheme.onSurface)
            }
        }
    }
}

@Composable
private fun StatsCard(stats: StatsOut?) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(Spacing.sm)
    ) {
        StatBox("今日", "¥${stats?.today?.toInt() ?: 0}", Modifier.weight(1f))
        StatBox("本周", "¥${stats?.week?.toInt() ?: 0}", Modifier.weight(1f))
        StatBox("本年", "¥${stats?.year?.toInt() ?: 0}", Modifier.weight(1f))
    }
}

@Composable
private fun StatBox(label: String, value: String, modifier: Modifier = Modifier) {
    Column(
        modifier = modifier
            .clip(RoundedCornerShape(Radius.md))
            .background(MaterialTheme.colorScheme.surface)
            .padding(Spacing.md)
    ) {
        Text(label, fontSize = 11.sp, color = SecondaryText)
        Text(value, fontSize = 18.sp, fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.onSurface)
    }
}

@Composable
private fun TransactionItem(tx: TxOut, onDelete: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(Radius.md))
            .background(MaterialTheme.colorScheme.surface)
            .padding(Spacing.md)
            .clickable(onClick = onDelete),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(
            modifier = Modifier
                .size(40.dp)
                .clip(RoundedCornerShape(12.dp))
                .background(if (tx.type == "expense") RosePinkLight else Color(0xFFE1F5EE)),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                imageVector = if (tx.type == "expense") Icons.Filled.ArrowUpward else Icons.Filled.ArrowDownward,
                contentDescription = null,
                tint = if (tx.type == "expense") RosePink else Color(0xFF1D9E75),
                modifier = Modifier.size(20.dp)
            )
        }
        Spacer(modifier = Modifier.size(Spacing.sm))
        Column(modifier = Modifier.weight(1f)) {
            Text(tx.note ?: "未备注", fontSize = 14.sp, fontWeight = FontWeight.Medium, color = MaterialTheme.colorScheme.onSurface)
            Text(tx.happened_at.take(10), fontSize = 11.sp, color = SecondaryText)
        }
        Text(
            "${if (tx.type == "expense") "-" else "+"}¥${tx.amount.toInt()}",
            fontSize = 16.sp, fontWeight = FontWeight.SemiBold,
            color = if (tx.type == "expense") RosePink else Color(0xFF1D9E75)
        )
    }
}

@Composable
private fun EmptyTransactionState() {
    Column(
        modifier = Modifier.fillMaxWidth().padding(40.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text("还没有账单记录", fontSize = 14.sp, color = SecondaryText)
        Text("点击右下角 + 添加第一笔", fontSize = 12.sp, color = SecondaryText, modifier = Modifier.padding(top = 4.dp))
    }
}

@Composable
private fun AddTransactionForm(onSubmit: (Double, String, String) -> Unit) {
    var amount by remember { mutableStateOf("") }
    var note by remember { mutableStateOf("") }
    var isExpense by remember { mutableStateOf(true) }

    Column(modifier = Modifier.fillMaxWidth()) {
        // Type toggle
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Box(
                modifier = Modifier
                    .weight(1f)
                    .clip(RoundedCornerShape(Radius.pill))
                    .background(if (isExpense) RosePink else Color.Transparent)
                    .clickable { isExpense = true }
                    .padding(12.dp),
                contentAlignment = Alignment.Center
            ) { Text("支出", color = if (isExpense) Color.White else SecondaryText, fontWeight = FontWeight.Medium) }
            Box(
                modifier = Modifier
                    .weight(1f)
                    .clip(RoundedCornerShape(Radius.pill))
                    .background(if (!isExpense) Color(0xFF1D9E75) else Color.Transparent)
                    .clickable { isExpense = false }
                    .padding(12.dp),
                contentAlignment = Alignment.Center
            ) { Text("收入", color = if (!isExpense) Color.White else SecondaryText, fontWeight = FontWeight.Medium) }
        }
        Spacer(modifier = Modifier.height(16.dp))
        OutlinedTextField(
            value = amount, onValueChange = { amount = it.filter { c -> c.isDigit() || c == '.' } },
            label = { Text("金额") },
            modifier = Modifier.fillMaxWidth(), singleLine = true,
            colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = RosePink, focusedLabelColor = RosePink)
        )
        Spacer(modifier = Modifier.height(12.dp))
        OutlinedTextField(
            value = note, onValueChange = { note = it },
            label = { Text("备注") },
            modifier = Modifier.fillMaxWidth(), singleLine = true,
            colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = RosePink, focusedLabelColor = RosePink)
        )
        Spacer(modifier = Modifier.height(20.dp))
        com.coupleai.core.design.components.GradientButton(
            text = "确定",
            onClick = {
                val amt = amount.toDoubleOrNull() ?: 0.0
                if (amt > 0) {
                    onSubmit(amt, if (isExpense) "expense" else "income", note.ifBlank { "未备注" })
                }
            }
        )
    }
}

private suspend fun delay(ms: Long) = kotlinx.coroutines.delay(ms)
