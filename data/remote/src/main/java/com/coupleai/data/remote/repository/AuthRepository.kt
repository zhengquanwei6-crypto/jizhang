package com.coupleai.data.remote.repository

import com.coupleai.data.remote.api.AuthApi
import com.coupleai.data.remote.dto.LoginRequest
import com.coupleai.data.remote.dto.RegisterRequest
import com.coupleai.data.remote.dto.TokenOut
import com.coupleai.data.remote.dto.UserOut
import com.coupleai.data.remote.interceptor.TokenManager
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AuthRepository @Inject constructor(
    private val authApi: AuthApi,
    private val tokenManager: TokenManager
) {
    suspend fun login(account: String, password: String): TokenOut {
        val token = authApi.login(LoginRequest(account, password))
        tokenManager.saveToken(token.access_token, token.user.id, token.user.nickname)
        return token
    }

    suspend fun register(nickname: String, account: String, password: String): TokenOut {
        val phone = if (account.matches(Regex("^1\\d{10}$"))) account else null
        val email = if (account.contains("@")) account else null
        val token = authApi.register(RegisterRequest(phone, email, nickname, password))
        tokenManager.saveToken(token.access_token, token.user.id, token.user.nickname)
        return token
    }

    suspend fun me(): UserOut = authApi.me()

    suspend fun isLoggedIn(): Boolean = tokenManager.getToken() != null

    suspend fun logout() = tokenManager.clearToken()

    fun isLoggedInSync(): Boolean = tokenManager.getTokenSync() != null
    fun getUserIdSync(): Long? = tokenManager.getUserIdSync()
    fun getNicknameSync(): String? = tokenManager.getNicknameSync()
}
