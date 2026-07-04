package com.coupleai.app.auth

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
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
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.coupleai.core.design.components.GradientButton
import com.coupleai.core.design.components.OutlineButton
import com.coupleai.core.design.theme.RosePink
import com.coupleai.core.design.theme.RosePinkDeep
import com.coupleai.core.design.theme.RosePinkLight
import com.coupleai.core.design.theme.SecondaryText

@Composable
fun AuthScreen(
    onAuthSuccess: () -> Unit,
    viewModel: AuthViewModel = hiltViewModel()
) {
    val authState by viewModel.authState.collectAsState()
    val coupleState by viewModel.coupleState.collectAsState()

    var isLogin by rememberSaveable { mutableStateOf(true) }
    var account by rememberSaveable { mutableStateOf("") }
    var password by rememberSaveable { mutableStateOf("") }
    var nickname by rememberSaveable { mutableStateOf("") }
    var inviteCode by rememberSaveable { mutableStateOf("") }

    LaunchedEffect(Unit) {
        viewModel.checkExistingLogin()
    }

    LaunchedEffect(authState) {
        if (authState is AuthState.LoggedIn) {
            if (coupleState is CoupleBindState.Bound) {
                onAuthSuccess()
            }
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Brush.verticalGradient(listOf(RosePinkLight.copy(alpha = 0.3f), Color.White)))
            .imePadding()
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Spacer(modifier = Modifier.height(40.dp))

            // Logo
            Box(
                modifier = Modifier
                    .size(80.dp)
                    .clip(RoundedCornerShape(20.dp))
                    .background(Brush.linearGradient(listOf(RosePink, RosePinkDeep))),
                contentAlignment = Alignment.Center
            ) {
                Icon(Icons.Filled.Favorite, "love", tint = Color.White, modifier = Modifier.size(40.dp))
            }
            Spacer(modifier = Modifier.height(12.dp))
            Text("恋爱共生空间", fontSize = 22.sp, fontWeight = FontWeight.Bold, color = RosePink)
            Text("CoupleSpaceAI", fontSize = 13.sp, color = SecondaryText)
            Spacer(modifier = Modifier.height(32.dp))

            // Tab switch
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.Center
            ) {
                TextButton(onClick = { isLogin = true; viewModel.resetState() }) {
                    Text(
                        "登录", fontWeight = if (isLogin) FontWeight.SemiBold else FontWeight.Normal,
                        color = if (isLogin) RosePink else SecondaryText, fontSize = 16.sp
                    )
                }
                Text("·", color = SecondaryText, fontSize = 16.sp, modifier = Modifier.padding(horizontal = 8.dp))
                TextButton(onClick = { isLogin = false; viewModel.resetState() }) {
                    Text(
                        "注册", fontWeight = if (!isLogin) FontWeight.SemiBold else FontWeight.Normal,
                        color = if (!isLogin) RosePink else SecondaryText, fontSize = 16.sp
                    )
                }
            }
            Spacer(modifier = Modifier.height(20.dp))

            AnimatedContent(targetState = isLogin, transitionSpec = { fadeIn() togetherWith fadeOut() }, label = "auth") { login ->
                if (login) {
                    LoginForm(
                        account = account, onAccountChange = { account = it },
                        password = password, onPasswordChange = { password = it },
                        authState = authState,
                        onLogin = { viewModel.login(account, password) }
                    )
                } else {
                    RegisterForm(
                        nickname = nickname, onNicknameChange = { nickname = it },
                        account = account, onAccountChange = { account = it },
                        password = password, onPasswordChange = { password = it },
                        authState = authState,
                        onRegister = { viewModel.register(nickname, account, password) }
                    )
                }
            }

            // Couple binding section (shown when logged in but not bound)
            if (authState is AuthState.LoggedIn && coupleState !is CoupleBindState.Bound) {
                Spacer(modifier = Modifier.height(24.dp))
                CoupleBindSection(
                    coupleState = coupleState,
                    inviteCode = inviteCode,
                    onInviteCodeChange = { inviteCode = it },
                    onCreateCode = { viewModel.createInviteCode() },
                    onBind = { viewModel.bindCouple(inviteCode) },
                    onSkip = onAuthSuccess
                )
            }

            // Error message
            if (authState is AuthState.Error) {
                Spacer(modifier = Modifier.height(12.dp))
                Text(
                    (authState as AuthState.Error).message,
                    color = MaterialTheme.colorScheme.error,
                    fontSize = 13.sp
                )
            }

            Spacer(modifier = Modifier.height(40.dp))
        }
    }
}

@Composable
private fun LoginForm(
    account: String, onAccountChange: (String) -> Unit,
    password: String, onPasswordChange: (String) -> Unit,
    authState: AuthState,
    onLogin: () -> Unit
) {
    Column(modifier = Modifier.fillMaxWidth()) {
        OutlinedTextField(
            value = account, onValueChange = onAccountChange,
            label = { Text("手机号或邮箱") },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true,
            colors = OutlinedTextFieldDefaults.colors(
                focusedBorderColor = RosePink,
                focusedLabelColor = RosePink
            )
        )
        Spacer(modifier = Modifier.height(12.dp))
        OutlinedTextField(
            value = password, onValueChange = onPasswordChange,
            label = { Text("密码") },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true,
            visualTransformation = PasswordVisualTransformation(),
            colors = OutlinedTextFieldDefaults.colors(
                focusedBorderColor = RosePink,
                focusedLabelColor = RosePink
            )
        )
        Spacer(modifier = Modifier.height(20.dp))
        if (authState is AuthState.Loading) {
            Box(modifier = Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = RosePink)
            }
        } else {
            GradientButton(text = "登录", onClick = onLogin)
        }
    }
}

@Composable
private fun RegisterForm(
    nickname: String, onNicknameChange: (String) -> Unit,
    account: String, onAccountChange: (String) -> Unit,
    password: String, onPasswordChange: (String) -> Unit,
    authState: AuthState,
    onRegister: () -> Unit
) {
    Column(modifier = Modifier.fillMaxWidth()) {
        OutlinedTextField(
            value = nickname, onValueChange = onNicknameChange,
            label = { Text("昵称") },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true,
            colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = RosePink, focusedLabelColor = RosePink)
        )
        Spacer(modifier = Modifier.height(12.dp))
        OutlinedTextField(
            value = account, onValueChange = onAccountChange,
            label = { Text("手机号或邮箱") },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true,
            colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = RosePink, focusedLabelColor = RosePink)
        )
        Spacer(modifier = Modifier.height(12.dp))
        OutlinedTextField(
            value = password, onValueChange = onPasswordChange,
            label = { Text("密码（至少 6 位）") },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true,
            visualTransformation = PasswordVisualTransformation(),
            colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = RosePink, focusedLabelColor = RosePink)
        )
        Spacer(modifier = Modifier.height(20.dp))
        if (authState is AuthState.Loading) {
            Box(modifier = Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = RosePink)
            }
        } else {
            GradientButton(text = "注册", onClick = onRegister)
        }
    }
}

@Composable
private fun CoupleBindSection(
    coupleState: CoupleBindState,
    inviteCode: String,
    onInviteCodeChange: (String) -> Unit,
    onCreateCode: () -> Unit,
    onBind: () -> Unit,
    onSkip: () -> Unit
) {
    Column(modifier = Modifier.fillMaxWidth()) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(16.dp))
                .background(Brush.horizontalGradient(listOf(RosePinkLight, Color.White)))
                .padding(20.dp)
        ) {
            Column {
                Text("绑定情侣", fontWeight = FontWeight.SemiBold, fontSize = 16.sp, color = RosePink)
                Spacer(modifier = Modifier.height(4.dp))
                Text("生成邀请码分享给伴侣，或输入对方的邀请码绑定", fontSize = 12.sp, color = SecondaryText)
                Spacer(modifier = Modifier.height(16.dp))

                when (coupleState) {
                    is CoupleBindState.Loading -> {
                        Box(modifier = Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
                            CircularProgressIndicator(color = RosePink)
                        }
                    }
                    is CoupleBindState.HasCode -> {
                        Text("你的邀请码", fontSize = 12.sp, color = SecondaryText)
                        Text(
                            coupleState.code,
                            fontSize = 32.sp, fontWeight = FontWeight.Bold, color = RosePink,
                            modifier = Modifier.padding(vertical = 8.dp)
                        )
                        Text("将此码发给伴侣，对方注册后输入即可绑定", fontSize = 11.sp, color = SecondaryText)
                    }
                    else -> {
                        OutlineButton(text = "生成我的邀请码", onClick = onCreateCode)
                        Spacer(modifier = Modifier.height(12.dp))
                        OutlinedTextField(
                            value = inviteCode, onValueChange = onInviteCodeChange,
                            label = { Text("输入伴侣的邀请码") },
                            modifier = Modifier.fillMaxWidth(),
                            singleLine = true,
                            colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = RosePink, focusedLabelColor = RosePink)
                        )
                        Spacer(modifier = Modifier.height(12.dp))
                        GradientButton(text = "绑定", onClick = onBind)
                    }
                }

                if (coupleState is CoupleBindState.Error) {
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(coupleState.message, color = MaterialTheme.colorScheme.error, fontSize = 12.sp)
                }

                Spacer(modifier = Modifier.height(12.dp))
                TextButton(onClick = onSkip, modifier = Modifier.fillMaxWidth()) {
                    Text("稍后再绑", color = SecondaryText, fontSize = 13.sp)
                }
            }
        }
    }
}
