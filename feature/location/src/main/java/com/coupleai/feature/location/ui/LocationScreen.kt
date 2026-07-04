package com.coupleai.feature.location.ui

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.slideInVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Map
import androidx.compose.material.icons.filled.ShareLocation
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
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
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.navigation.NavController
import com.coupleai.core.design.components.FeatureTopBar
import com.coupleai.core.design.components.GradientBackground
import com.coupleai.core.design.components.GradientButton
import com.coupleai.core.design.components.RequireLoginView
import com.coupleai.core.design.theme.ChampagneGold
import com.coupleai.core.design.theme.PrimaryGradient
import com.coupleai.core.design.theme.RosePink
import com.coupleai.core.design.theme.RosePinkLight
import com.coupleai.core.design.theme.SecondaryText
import com.coupleai.core.design.theme.Radius
import com.coupleai.data.remote.dto.LocationPointOut
import com.coupleai.data.remote.interceptor.TokenManager
import com.coupleai.data.remote.repository.LocationRepository
import com.coupleai.data.remote.util.ApiErrorParser
import com.coupleai.feature.location.util.GeocoderHelper
import com.coupleai.feature.location.util.LocationHelper
import com.coupleai.feature.location.util.LocationReading
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class LocationSessionViewModel @Inject constructor(
    @ApplicationContext private val appContext: Context,
    private val tokenManager: TokenManager,
    private val locationRepository: LocationRepository
) : ViewModel() {
    private val _isLoggedIn = MutableStateFlow(tokenManager.getTokenSync() != null)
    val isLoggedIn = _isLoggedIn.asStateFlow()

    private val _loading = MutableStateFlow(false)
    val loading = _loading.asStateFlow()

    private val _isSharing = MutableStateFlow(false)
    val isSharing = _isSharing.asStateFlow()

    private val _partnerSharing = MutableStateFlow(false)
    val partnerSharing = _partnerSharing.asStateFlow()

    private val _history = MutableStateFlow<List<LocationPointOut>>(emptyList())
    val history = _history.asStateFlow()

    private val _mapPoints = MutableStateFlow<List<Pair<Double, Double>>>(emptyList())
    val mapPoints = _mapPoints.asStateFlow()

    private val _latestLabel = MutableStateFlow<String?>(null)
    val latestLabel = _latestLabel.asStateFlow()

    private val _addressLabels = MutableStateFlow<Map<Long, String>>(emptyMap())
    val addressLabels = _addressLabels.asStateFlow()

    private val _latestPoint = MutableStateFlow<LocationPointOut?>(null)
    val latestPoint = _latestPoint.asStateFlow()

    private val _error = MutableStateFlow<String?>(null)
    val error = _error.asStateFlow()

    fun refresh() {
        _isLoggedIn.value = tokenManager.getTokenSync() != null
        if (_isLoggedIn.value) loadData()
    }

    fun clearError() {
        _error.value = null
    }

    fun setError(msg: String) {
        _error.value = msg
    }

    fun loadData() {
        viewModelScope.launch {
            _loading.value = true
            try {
                val userId = tokenManager.getUserIdSync()
                val sessions = locationRepository.getCurrentSessions()
                _isSharing.value = userId != null && sessions.any { it.user_id == userId && it.status == "active" }
                _partnerSharing.value = userId != null && sessions.any { it.user_id != userId && it.status == "active" }
                val points = locationRepository.getHistory(30)
                _history.value = points
                _latestPoint.value = points.firstOrNull()
                _mapPoints.value = points.take(5).map { it.latitude to it.longitude }
                resolveAddresses(points.take(12))
            } catch (e: Exception) {
                _error.value = ApiErrorParser.parse(e)
            } finally {
                _loading.value = false
            }
        }
    }

    private suspend fun resolveAddresses(points: List<LocationPointOut>) {
        val labels = mutableMapOf<Long, String>()
        for (point in points) {
            GeocoderHelper.reverse(appContext, point.latitude, point.longitude)?.let {
                labels[point.id] = it
            }
        }
        _addressLabels.value = labels
        _latestLabel.value = points.firstOrNull()?.id?.let { labels[it] }
    }

    fun startSharing(reading: LocationReading) {
        viewModelScope.launch {
            _loading.value = true
            _error.value = null
            try {
                locationRepository.startSession()
                locationRepository.uploadPoint(reading.latitude, reading.longitude, reading.accuracy)
                loadData()
            } catch (e: Exception) {
                _error.value = ApiErrorParser.parse(e)
            } finally {
                _loading.value = false
            }
        }
    }

    fun uploadLocation(reading: LocationReading) {
        viewModelScope.launch {
            try {
                locationRepository.uploadPoint(reading.latitude, reading.longitude, reading.accuracy)
                loadData()
            } catch (e: Exception) {
                _error.value = ApiErrorParser.parse(e)
            }
        }
    }

    fun stopSharing() {
        viewModelScope.launch {
            _loading.value = true
            _error.value = null
            try {
                locationRepository.stopSession()
                loadData()
            } catch (e: Exception) {
                _error.value = ApiErrorParser.parse(e)
            } finally {
                _loading.value = false
            }
        }
    }
}

@Composable
fun LocationScreen(
    navController: NavController,
    onOpenAuth: () -> Unit = {}
) {
    val viewModel: LocationSessionViewModel = hiltViewModel()
    val isLoggedIn by viewModel.isLoggedIn.collectAsState()
    val loading by viewModel.loading.collectAsState()
    val isSharing by viewModel.isSharing.collectAsState()
    val partnerSharing by viewModel.partnerSharing.collectAsState()
    val history by viewModel.history.collectAsState()
    val mapPoints by viewModel.mapPoints.collectAsState()
    val latestPoint by viewModel.latestPoint.collectAsState()
    val latestLabel by viewModel.latestLabel.collectAsState()
    val addressLabels by viewModel.addressLabels.collectAsState()
    val error by viewModel.error.collectAsState()

    val context = LocalContext.current
    var pendingShare by remember { mutableStateOf(false) }
    var pendingUpload by remember { mutableStateOf(false) }
    var visible by remember { mutableStateOf(false) }

    fun hasLocationPermission(): Boolean =
        ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) ==
            PackageManager.PERMISSION_GRANTED

    fun readAndUpload() {
        LocationHelper.readLastLocation(context)?.let { viewModel.uploadLocation(it) }
            ?: viewModel.setError("无法获取当前位置，请开启 GPS 后重试")
    }

    val permissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { granted ->
        val ok = granted[Manifest.permission.ACCESS_FINE_LOCATION] == true ||
            granted[Manifest.permission.ACCESS_COARSE_LOCATION] == true
        when {
            ok && pendingShare -> {
                pendingShare = false
                LocationHelper.readLastLocation(context)?.let { viewModel.startSharing(it) }
                    ?: viewModel.setError("无法获取当前位置，请开启 GPS 后重试")
            }
            ok && pendingUpload -> {
                pendingUpload = false
                readAndUpload()
            }
            pendingShare || pendingUpload -> {
                pendingShare = false
                pendingUpload = false
                viewModel.setError("需要位置权限才能记录足迹")
            }
        }
    }

    val lifecycleOwner = LocalLifecycleOwner.current
    DisposableEffect(lifecycleOwner, isSharing) {
        val observer = LifecycleEventObserver { _, event ->
            if (event == Lifecycle.Event.ON_RESUME) {
                viewModel.refresh()
                if (isSharing && hasLocationPermission()) readAndUpload()
            }
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose { lifecycleOwner.lifecycle.removeObserver(observer) }
    }

    LaunchedEffect(Unit) {
        viewModel.refresh()
        delay(100)
        visible = true
    }

    LaunchedEffect(isSharing) {
        if (!isSharing) return@LaunchedEffect
        while (true) {
            delay(180_000L)
            if (hasLocationPermission()) readAndUpload()
        }
    }

    if (!isLoggedIn) {
        RequireLoginView(
            onOpenAuth = onOpenAuth,
            title = "登录后记录足迹",
            subtitle = "连接云端后可保存你们的共同足迹"
        )
        return
    }

    fun requestPermission(forShare: Boolean) {
        if (forShare) pendingShare = true else pendingUpload = true
        permissionLauncher.launch(
            arrayOf(
                Manifest.permission.ACCESS_FINE_LOCATION,
                Manifest.permission.ACCESS_COARSE_LOCATION
            )
        )
    }

    fun tryStartSharing() {
        if (hasLocationPermission()) {
            LocationHelper.readLastLocation(context)?.let { viewModel.startSharing(it) }
                ?: viewModel.setError("无法获取当前位置，请开启 GPS 后重试")
        } else {
            requestPermission(forShare = true)
        }
    }

    fun tryUploadLocation() {
        viewModel.clearError()
        if (hasLocationPermission()) readAndUpload() else requestPermission(forShare = false)
    }

    GradientBackground {
        FeatureTopBar(title = "恋爱足迹", onBack = { navController.popBackStack() })
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 16.dp)
                .padding(bottom = 24.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Spacer(modifier = Modifier.height(8.dp))

            error?.let { msg ->
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = RosePinkLight.copy(alpha = 0.25f)),
                    shape = RoundedCornerShape(Radius.md)
                ) {
                    Text(
                        text = msg,
                        modifier = Modifier.padding(12.dp),
                        fontSize = 13.sp,
                        color = RosePink
                    )
                }
                Spacer(modifier = Modifier.height(12.dp))
            }

            AnimatedVisibility(visible = visible, enter = fadeIn() + slideInVertically { -it }) {
                Card(
                    modifier = Modifier.fillMaxWidth().height(280.dp),
                    shape = RoundedCornerShape(Radius.lg),
                    colors = CardDefaults.cardColors(containerColor = Color.White),
                    elevation = CardDefaults.cardElevation(defaultElevation = 8.dp)
                ) {
                    if (mapPoints.isNotEmpty()) {
                        OsmMapView(
                            points = mapPoints,
                            modifier = Modifier.fillMaxSize()
                        )
                    } else {
                        Box(
                            modifier = Modifier
                                .fillMaxSize()
                                .background(
                                    Brush.verticalGradient(
                                        colors = listOf(
                                            RosePinkLight.copy(alpha = 0.2f),
                                            RosePink.copy(alpha = 0.05f)
                                        )
                                    )
                                ),
                            contentAlignment = Alignment.Center
                        ) {
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Icon(
                                    imageVector = Icons.Filled.Map,
                                    contentDescription = null,
                                    tint = RosePink.copy(alpha = 0.5f),
                                    modifier = Modifier.size(64.dp)
                                )
                                Spacer(modifier = Modifier.height(12.dp))
                                Text("地图预览", fontSize = 16.sp, fontWeight = FontWeight.SemiBold)
                                Text("开启共享后会显示足迹地图", fontSize = 13.sp, color = SecondaryText)
                            }
                        }
                    }
                }
            }

            latestPoint?.let { point ->
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = latestLabel ?: formatCoordinate(point.latitude, point.longitude),
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Medium,
                    color = MaterialTheme.colorScheme.onSurface
                )
                Text(
                    text = "最近记录 · ${formatTime(point.recorded_at)}",
                    fontSize = 12.sp,
                    color = SecondaryText
                )
            }

            Spacer(modifier = Modifier.height(16.dp))

            AnimatedVisibility(visible = visible, enter = fadeIn() + slideInVertically()) {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(Radius.lg),
                    colors = CardDefaults.cardColors(containerColor = RosePinkLight.copy(alpha = 0.1f))
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Filled.ShareLocation, null, tint = RosePink, modifier = Modifier.size(20.dp))
                            Spacer(modifier = Modifier.size(8.dp))
                            Text("位置共享状态", fontWeight = FontWeight.SemiBold, color = RosePink)
                        }
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = when {
                                isSharing && partnerSharing -> "双方正在共享位置"
                                isSharing -> "你正在共享位置，等待伴侣加入"
                                partnerSharing -> "伴侣正在共享位置"
                                else -> "尚未开启位置共享"
                            },
                            fontSize = 14.sp,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                        Spacer(modifier = Modifier.height(6.dp))
                        Text(
                            text = "共享期间每 3 分钟自动更新位置，返回本页也会刷新。可随时停止共享。",
                            fontSize = 13.sp,
                            color = SecondaryText,
                            lineHeight = 20.sp
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            AnimatedVisibility(visible = visible, enter = fadeIn() + slideInVertically()) {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(Radius.lg),
                    colors = CardDefaults.cardColors(containerColor = Color.White),
                    elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text("我们的足迹", fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.onSurface)
                        Spacer(modifier = Modifier.height(12.dp))
                        if (loading && history.isEmpty()) {
                            Box(Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
                                CircularProgressIndicator(modifier = Modifier.size(28.dp), color = RosePink)
                            }
                        } else if (history.isEmpty()) {
                            Text("暂无足迹，开启位置共享后会自动记录", fontSize = 13.sp, color = SecondaryText)
                        } else {
                            history.take(20).forEach { point ->
                                FootprintRow(
                                    point = point,
                                    label = addressLabels[point.id]
                                )
                            }
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(20.dp))

            AnimatedVisibility(visible = visible, enter = fadeIn()) {
                Column(modifier = Modifier.fillMaxWidth()) {
                    if (loading && !isSharing) {
                        Box(Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
                            CircularProgressIndicator(color = RosePink)
                        }
                    } else {
                        GradientButton(
                            text = if (isSharing) "停止位置共享" else "开启位置共享",
                            onClick = {
                                viewModel.clearError()
                                if (isSharing) viewModel.stopSharing() else tryStartSharing()
                            },
                            gradient = PrimaryGradient,
                            enabled = !loading
                        )
                        if (isSharing) {
                            Spacer(modifier = Modifier.height(10.dp))
                            GradientButton(
                                text = "立即更新位置",
                                onClick = { tryUploadLocation() },
                                gradient = listOf(ChampagneGold, ChampagneGold.copy(alpha = 0.85f)),
                                enabled = !loading
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun FootprintRow(point: LocationPointOut, label: String?) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(Icons.Filled.LocationOn, null, tint = RosePink, modifier = Modifier.size(20.dp))
        Spacer(modifier = Modifier.size(8.dp))
        Column {
            Text(
                text = label ?: formatCoordinate(point.latitude, point.longitude),
                fontWeight = FontWeight.Medium,
                color = MaterialTheme.colorScheme.onSurface
            )
            Text(
                text = buildString {
                    if (label != null) append(formatCoordinate(point.latitude, point.longitude) + " · ")
                    append(formatTime(point.recorded_at))
                },
                fontSize = 12.sp,
                color = SecondaryText
            )
        }
    }
}

private fun formatCoordinate(lat: Double, lng: Double): String =
    "${"%.4f".format(lat)}, ${"%.4f".format(lng)}"

private fun formatTime(iso: String): String =
    iso.replace("T", " ").take(16)
