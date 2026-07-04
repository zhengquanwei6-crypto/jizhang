package com.coupleai.feature.relationship.ui

import androidx.compose.foundation.background
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
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
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
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import com.coupleai.core.design.components.FeatureTopBar
import com.coupleai.core.design.components.GradientButton
import com.coupleai.core.design.components.GradientBackground
import com.coupleai.core.design.components.RequireLoginView
import com.coupleai.core.design.components.LoveProgressBar
import com.coupleai.core.design.components.SkeletonCard
import com.coupleai.core.design.theme.MintGreen
import com.coupleai.core.design.theme.PrimaryGradient
import com.coupleai.core.design.theme.Radius
import com.coupleai.core.design.theme.RosePink
import com.coupleai.core.design.theme.SecondaryText
import com.coupleai.core.design.theme.Spacing
import com.coupleai.data.remote.dto.GrowthEventOut
import com.coupleai.data.remote.dto.GrowthPetOut
import com.coupleai.data.remote.interceptor.TokenManager
import com.coupleai.data.remote.repository.GrowthRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class RelationshipViewModel @Inject constructor(
    private val tokenManager: TokenManager,
    private val growthRepository: GrowthRepository
) : ViewModel() {

    private val _pet = MutableStateFlow<GrowthPetOut?>(null)
    val pet = _pet.asStateFlow()

    private val _events = MutableStateFlow<List<GrowthEventOut>>(emptyList())
    val events = _events.asStateFlow()

    private val _isLoggedIn = MutableStateFlow(tokenManager.getTokenSync() != null)
    val isLoggedIn = _isLoggedIn.asStateFlow()

    fun refreshSession() {
        _isLoggedIn.value = tokenManager.getTokenSync() != null
        if (_isLoggedIn.value) load()
    }

    private val _loading = MutableStateFlow(true)
    val loading = _loading.asStateFlow()

    private val _interacting = MutableStateFlow(false)
    val interacting = _interacting.asStateFlow()

    fun load() {
        _loading.value = true
        viewModelScope.launch {
            try {
                _pet.value = growthRepository.getPet()
                _events.value = growthRepository.getEvents(20)
            } catch (_: Exception) {
            } finally {
                _loading.value = false
            }
        }
    }

    fun interact(type: String, label: String) {
        if (_interacting.value) return
        _interacting.value = true
        viewModelScope.launch {
            try {
                growthRepository.interact(type, 10, label)
                _pet.value = growthRepository.getPet()
                _events.value = growthRepository.getEvents(20)
            } catch (_: Exception) {
            } finally {
                _interacting.value = false
            }
        }
    }
}

@Composable
fun RelationshipScreen(
    navController: NavController,
    onOpenAuth: () -> Unit = {}
) {
    val viewModel: RelationshipViewModel = hiltViewModel()
    val pet by viewModel.pet.collectAsState()
    val events by viewModel.events.collectAsState()
    val loading by viewModel.loading.collectAsState()
    val interacting by viewModel.interacting.collectAsState()

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
        RequireLoginView(onOpenAuth = onOpenAuth, title = "登录后开始养成", subtitle = "连接云端后可领养爱情宠物、记录互动")
        return
    }

    GradientBackground {
        FeatureTopBar(title = "爱情养成", onBack = { navController.popBackStack() })
        LazyColumn(
            modifier = Modifier.fillMaxSize().padding(horizontal = Spacing.md),
            verticalArrangement = Arrangement.spacedBy(Spacing.md)
        ) {
            item { Spacer(modifier = Modifier.height(Spacing.sm)) }
            item {
                Text("养成系统", fontSize = 22.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurface)
                Text("一起养育你们的爱情宠物", fontSize = 13.sp, color = SecondaryText)
            }

            // Pet card
            item {
                if (loading && pet == null) SkeletonCard()
                else PetCard(pet)
            }

            // Stats
            if (pet != null) {
                item {
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(Spacing.sm)) {
                        StatBox("等级", "Lv.${pet!!.level}", Modifier.weight(1f))
                        StatBox("亲密度", "${pet!!.intimacy}", Modifier.weight(1f))
                        StatBox("心情", "${pet!!.mood}", Modifier.weight(1f))
                        StatBox("活力", "${pet!!.energy}", Modifier.weight(1f))
                    }
                }
                item {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(Spacing.sm)
                    ) {
                        GradientButton(
                            text = "喂食",
                            onClick = { viewModel.interact("feed", "给宠物喂食") },
                            modifier = Modifier.weight(1f),
                            enabled = !interacting
                        )
                        GradientButton(
                            text = "抚摸",
                            onClick = { viewModel.interact("pet", "温柔抚摸") },
                            modifier = Modifier.weight(1f),
                            enabled = !interacting
                        )
                        GradientButton(
                            text = "玩耍",
                            onClick = { viewModel.interact("play", "一起玩耍") },
                            modifier = Modifier.weight(1f),
                            enabled = !interacting
                        )
                    }
                }
                item {
                    Card(modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(Radius.lg), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface), elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)) {
                        Column(modifier = Modifier.padding(Spacing.md)) {
                            Text("升级进度", fontSize = 13.sp, color = SecondaryText, modifier = Modifier.padding(bottom = 6.dp))
                            val need = pet!!.level * 100
                            LoveProgressBar(progress = (pet!!.exp.toFloat() / need.toFloat()).coerceIn(0f, 1f), label = "${pet!!.exp} / $need EXP")
                        }
                    }
                }
            }

            // Events list
            item {
                Text("成长事件", fontSize = 16.sp, fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.onSurface, modifier = Modifier.padding(top = Spacing.sm))
            }
            if (loading && events.isEmpty()) {
                item { SkeletonCard() }
            } else if (events.isEmpty()) {
                item { Text("暂无事件，记账/聊天/打卡会获得经验", fontSize = 13.sp, color = SecondaryText, modifier = Modifier.padding(Spacing.md)) }
            } else {
                items(events) { ev ->
                    EventItem(ev)
                }
            }
            item { Spacer(modifier = Modifier.height(80.dp)) }
        }
    }
}

@Composable
private fun PetCard(pet: GrowthPetOut?) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(Radius.lg),
        elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .background(Brush.horizontalGradient(PrimaryGradient))
                .padding(Spacing.lg)
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(modifier = Modifier.size(72.dp).clip(RoundedCornerShape(Radius.full)).background(Color.White.copy(alpha = 0.25f)), contentAlignment = Alignment.Center) {
                    Text("🐾", fontSize = 36.sp)
                }
                Spacer(modifier = Modifier.size(Spacing.md))
                Column {
                    Text(pet?.name ?: "蜜糖", fontSize = 22.sp, fontWeight = FontWeight.Bold, color = Color.White)
                    Text("Lv.${pet?.level ?: 1} · 爱情宠物", fontSize = 13.sp, color = Color.White.copy(alpha = 0.85f), modifier = Modifier.padding(top = 2.dp))
                }
            }
        }
    }
}

@Composable
private fun StatBox(label: String, value: String, modifier: Modifier = Modifier) {
    Card(modifier = modifier, shape = RoundedCornerShape(Radius.md), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface), elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)) {
        Column(modifier = Modifier.padding(Spacing.md), horizontalAlignment = Alignment.CenterHorizontally) {
            Text(label, fontSize = 11.sp, color = SecondaryText)
            Text(value, fontSize = 18.sp, fontWeight = FontWeight.SemiBold, color = RosePink, modifier = Modifier.padding(top = 2.dp))
        }
    }
}

@Composable
private fun EventItem(ev: GrowthEventOut) {
    Row(
        modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(Radius.md)).background(MaterialTheme.colorScheme.surface).padding(Spacing.md),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(modifier = Modifier.size(32.dp).clip(RoundedCornerShape(8.dp)).background(MintGreen.copy(alpha = 0.15f)), contentAlignment = Alignment.Center) {
            Text("+${ev.exp_delta}", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = MintGreen)
        }
        Spacer(modifier = Modifier.size(Spacing.sm))
        Column(modifier = Modifier.weight(1f)) {
            Text(ev.event_type, fontSize = 14.sp, fontWeight = FontWeight.Medium, color = MaterialTheme.colorScheme.onSurface)
            Text(ev.description ?: "", fontSize = 12.sp, color = SecondaryText)
        }
        Text(ev.created_at.take(10), fontSize = 11.sp, color = SecondaryText)
    }
}
