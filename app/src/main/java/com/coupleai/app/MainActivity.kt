package com.coupleai.app

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import androidx.lifecycle.lifecycleScope
import androidx.navigation.compose.rememberNavController
import com.coupleai.app.navigation.MainNavHost
import com.coupleai.app.navigation.Screen
import com.coupleai.app.onboarding.OnboardingActivity
import com.coupleai.core.design.theme.CoupleSpaceTheme
import com.coupleai.data.local.datastore.UserPreferencesDataStore
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import javax.inject.Inject

@AndroidEntryPoint
class MainActivity : ComponentActivity() {

    @Inject lateinit var userPreferences: UserPreferencesDataStore

    override fun onCreate(savedInstanceState: Bundle?) {
        installSplashScreen()
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        setContent {
            CoupleSpaceTheme {
                var showSplash by remember { mutableStateOf(true) }

                LaunchedEffect(Unit) {
                    delay(1200)
                    showSplash = false
                }

                AnimatedVisibility(
                    visible = showSplash,
                    enter = fadeIn(),
                    exit = fadeOut()
                ) {
                    Surface(modifier = Modifier.fillMaxSize()) {
                        // Splash placeholder — themed background from theme
                    }
                }

                AnimatedVisibility(
                    visible = !showSplash,
                    enter = fadeIn(),
                    exit = fadeOut()
                ) {
                    MainContent(userPreferences = userPreferences)
                }
            }
        }
    }
}

@Composable
private fun MainContent(userPreferences: UserPreferencesDataStore) {
    val navController = rememberNavController()

    LaunchedEffect(Unit) {
        val isFirstLaunch = userPreferences.isFirstLaunch.first()
        if (isFirstLaunch) {
            // Will be handled by SplashActivity, not here
        }
    }

    Surface(modifier = Modifier.fillMaxSize()) {
        MainNavHost(navController = navController)
    }
}
