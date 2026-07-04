package com.coupleai.app.splash

import android.annotation.SuppressLint
import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import androidx.lifecycle.lifecycleScope
import com.coupleai.app.MainActivity
import com.coupleai.app.auth.AuthActivity
import com.coupleai.app.onboarding.OnboardingActivity
import com.coupleai.core.design.theme.CoupleSpaceTheme
import com.coupleai.core.design.theme.RosePink
import com.coupleai.core.design.theme.RosePinkDeep
import com.coupleai.data.local.datastore.UserPreferencesDataStore
import com.coupleai.data.remote.interceptor.TokenManager
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import javax.inject.Inject

@SuppressLint("CustomSplashScreen")
@AndroidEntryPoint
class SplashActivity : ComponentActivity() {

    @Inject lateinit var userPreferences: UserPreferencesDataStore
    @Inject lateinit var tokenManager: TokenManager

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        lifecycleScope.launch {
            delay(1500)
            val isFirst = userPreferences.isFirstLaunch.first()
            val isLoggedIn = tokenManager.getTokenSync() != null

            val dest = when {
                isFirst -> OnboardingActivity::class.java
                !isLoggedIn -> AuthActivity::class.java
                else -> MainActivity::class.java
            }
            startActivity(Intent(this@SplashActivity, dest))
            finish()
        }

        setContent {
            CoupleSpaceTheme {
                SplashScreen()
            }
        }
    }
}

@Composable
private fun SplashScreen() {
    val scale = remember { Animatable(0.5f) }
    val alpha = remember { Animatable(0f) }

    LaunchedEffect(Unit) {
        scale.animateTo(
            targetValue = 1f,
            animationSpec = spring(
                dampingRatio = Spring.DampingRatioMediumBouncy,
                stiffness = Spring.StiffnessLow
            )
        )
        alpha.animateTo(targetValue = 1f, animationSpec = tween(400))
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Brush.verticalGradient(colors = listOf(RosePink, RosePinkDeep))),
        contentAlignment = Alignment.Center
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Icon(
                imageVector = Icons.Filled.Favorite,
                contentDescription = "Love",
                modifier = Modifier.size(100.dp).scale(scale.value).alpha(alpha.value),
                tint = Color.White
            )
            Spacer(modifier = Modifier.height(16.dp))
            Text("CoupleSpaceAI", fontSize = 28.sp, fontWeight = FontWeight.Bold,
                color = Color.White, modifier = Modifier.alpha(alpha.value))
            Spacer(modifier = Modifier.height(8.dp))
            Text("恋爱共生空间", fontSize = 16.sp,
                color = Color.White.copy(alpha = 0.85f), modifier = Modifier.alpha(alpha.value))
        }
    }
}
