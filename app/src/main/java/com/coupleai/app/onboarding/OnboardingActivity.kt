package com.coupleai.app.onboarding

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.animation.togetherWith
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
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.Handshake
import androidx.compose.material.icons.filled.Map
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.lifecycleScope
import com.coupleai.app.MainActivity
import com.coupleai.core.design.theme.CoupleSpaceTheme
import com.coupleai.core.design.theme.RosePink
import com.coupleai.core.design.theme.RosePinkDeep
import com.coupleai.core.design.theme.RosePinkLight
import com.coupleai.data.local.datastore.UserPreferencesDataStore
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.launch
import javax.inject.Inject

data class OnboardingPage(
    val icon: ImageVector,
    val title: String,
    val subtitle: String,
    val background: Color
)

@AndroidEntryPoint
class OnboardingActivity : ComponentActivity() {

    @Inject lateinit var userPreferences: UserPreferencesDataStore

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            CoupleSpaceTheme {
                OnboardingScreen(
                    onComplete = {
                        lifecycleScope.launch {
                            userPreferences.setFirstLaunch(false)
                            startActivity(Intent(this@OnboardingActivity, MainActivity::class.java))
                            finish()
                        }
                    },
                    onSkip = {
                        lifecycleScope.launch {
                            userPreferences.setFirstLaunch(false)
                            startActivity(Intent(this@OnboardingActivity, MainActivity::class.java))
                            finish()
                        }
                    }
                )
            }
        }
    }
}

@Composable
private fun OnboardingScreen(
    onComplete: () -> Unit,
    onSkip: () -> Unit
) {
    val pages = listOf(
        OnboardingPage(
            icon = Icons.Filled.Favorite,
            title = "记录爱情每一步",
            subtitle = "共同记账、聊天、设置目标\n让你们的感情更加甜蜜",
            background = RosePink
        ),
        OnboardingPage(
            icon = Icons.Filled.Handshake,
            title = "AI 助手相伴",
            subtitle = "智能生成恋爱周报\n吵架调解、约会推荐",
            background = RosePinkDeep
        ),
        OnboardingPage(
            icon = Icons.Filled.Map,
            title = "一起打卡足迹",
            subtitle = "地图记录每一个浪漫地点\n共同打卡，养成好习惯",
            background = RosePinkLight
        )
    )

    var currentPage by remember { mutableIntStateOf(0) }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                Brush.verticalGradient(
                    colors = listOf(
                        pages[currentPage].background,
                        pages[currentPage].background.copy(alpha = 0.7f)
                    )
                )
            )
    ) {
        // Skip button
        AnimatedVisibility(
            visible = true,
            modifier = Modifier
                .align(Alignment.TopEnd)
                .padding(16.dp),
            enter = fadeIn(),
            exit = fadeOut()
        ) {
            TextButton(onClick = onSkip) {
                Text("跳过", color = Color.White.copy(alpha = 0.8f))
            }
        }

        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            // Page content with slide animation
            AnimatedContent(
                targetState = currentPage,
                transitionSpec = {
                    slideInHorizontally { width -> width } togetherWith
                            slideOutHorizontally { width -> -width }
                },
                label = "page_transition"
            ) { page ->
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Box(
                        modifier = Modifier
                            .size(160.dp)
                            .clip(CircleShape)
                            .background(Color.White.copy(alpha = 0.2f)),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = pages[page].icon,
                            contentDescription = null,
                            modifier = Modifier.size(80.dp),
                            tint = Color.White
                        )
                    }

                    Spacer(modifier = Modifier.height(48.dp))

                    Text(
                        text = pages[page].title,
                        fontSize = 28.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White,
                        textAlign = TextAlign.Center
                    )

                    Spacer(modifier = Modifier.height(16.dp))

                    Text(
                        text = pages[page].subtitle,
                        fontSize = 16.sp,
                        color = Color.White.copy(alpha = 0.85f),
                        textAlign = TextAlign.Center,
                        lineHeight = 24.sp
                    )
                }
            }

            Spacer(modifier = Modifier.height(64.dp))

            // Page indicators
            Row(
                horizontalArrangement = Arrangement.Center
            ) {
                pages.forEachIndexed { index, _ ->
                    Box(
                        modifier = Modifier
                            .width(if (index == currentPage) 24.dp else 8.dp)
                            .height(8.dp)
                            .clip(RoundedCornerShape(4.dp))
                            .background(
                                if (index == currentPage) Color.White
                                else Color.White.copy(alpha = 0.4f)
                            )
                    )
                    if (index < pages.lastIndex) Spacer(modifier = Modifier.width(8.dp))
                }
            }

            Spacer(modifier = Modifier.height(48.dp))

            // Next / Done button
            Button(
                onClick = {
                    if (currentPage < pages.lastIndex) {
                        currentPage++
                    } else {
                        onComplete()
                    }
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(56.dp),
                shape = RoundedCornerShape(28.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = Color.White,
                    contentColor = pages[currentPage].background
                )
            ) {
                Text(
                    text = if (currentPage < pages.lastIndex) "下一步" else "开始使用",
                    fontSize = 18.sp,
                    fontWeight = FontWeight.SemiBold
                )
            }
        }
    }
}
