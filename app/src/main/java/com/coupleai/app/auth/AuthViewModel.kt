package com.coupleai.app.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.coupleai.data.remote.repository.AuthRepository
import com.coupleai.data.remote.repository.CoupleRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

sealed class AuthState {
    data object Idle : AuthState()
    data object Loading : AuthState()
    data object LoggedIn : AuthState()
    data class Error(val message: String) : AuthState()
}

sealed class CoupleBindState {
    data object Idle : CoupleBindState()
    data object Loading : CoupleBindState()
    data class HasCode(val code: String) : CoupleBindState()
    data class Bound(val displayName: String?) : CoupleBindState()
    data class Error(val message: String) : CoupleBindState()
}

@HiltViewModel
class AuthViewModel @Inject constructor(
    private val authRepository: AuthRepository,
    private val coupleRepository: CoupleRepository
) : ViewModel() {

    private val _authState = MutableStateFlow<AuthState>(AuthState.Idle)
    val authState: StateFlow<AuthState> = _authState.asStateFlow()

    private val _coupleState = MutableStateFlow<CoupleBindState>(CoupleBindState.Idle)
    val coupleState: StateFlow<CoupleBindState> = _coupleState.asStateFlow()

    private val _nickname = MutableStateFlow("")
    val nickname: StateFlow<String> = _nickname.asStateFlow()

    fun login(account: String, password: String) {
        if (account.isBlank() || password.isBlank()) {
            _authState.value = AuthState.Error("请填写账号和密码")
            return
        }
        _authState.value = AuthState.Loading
        viewModelScope.launch {
            try {
                val token = authRepository.login(account, password)
                _nickname.value = token.user.nickname
                _authState.value = AuthState.LoggedIn
                checkCoupleStatus()
            } catch (e: Exception) {
                _authState.value = AuthState.Error(parseError(e))
            }
        }
    }

    fun register(nickname: String, account: String, password: String) {
        if (nickname.isBlank() || account.isBlank() || password.isBlank()) {
            _authState.value = AuthState.Error("请填写所有字段")
            return
        }
        if (password.length < 6) {
            _authState.value = AuthState.Error("密码至少 6 位")
            return
        }
        _authState.value = AuthState.Loading
        viewModelScope.launch {
            try {
                val token = authRepository.register(nickname, account, password)
                _nickname.value = token.user.nickname
                _authState.value = AuthState.LoggedIn
                _coupleState.value = CoupleBindState.Idle
            } catch (e: Exception) {
                _authState.value = AuthState.Error(parseError(e))
            }
        }
    }

    fun createInviteCode() {
        _coupleState.value = CoupleBindState.Loading
        viewModelScope.launch {
            try {
                val invite = coupleRepository.createInviteCode()
                _coupleState.value = CoupleBindState.HasCode(invite.code)
            } catch (e: Exception) {
                _coupleState.value = CoupleBindState.Error(parseError(e))
            }
        }
    }

    fun bindCouple(code: String) {
        if (code.isBlank()) {
            _coupleState.value = CoupleBindState.Error("请输入邀请码")
            return
        }
        _coupleState.value = CoupleBindState.Loading
        viewModelScope.launch {
            try {
                val couple = coupleRepository.bindCouple(code)
                _coupleState.value = CoupleBindState.Bound(couple.display_name)
            } catch (e: Exception) {
                _coupleState.value = CoupleBindState.Error(parseError(e))
            }
        }
    }

    private suspend fun checkCoupleStatus() {
        try {
            val couple = coupleRepository.getMyCouple()
            if (couple.user_b_id != null) {
                _coupleState.value = CoupleBindState.Bound(couple.display_name)
            } else {
                _coupleState.value = CoupleBindState.Idle
            }
        } catch (e: Exception) {
            _coupleState.value = CoupleBindState.Idle
        }
    }

    fun checkExistingLogin() {
        if (authRepository.isLoggedInSync()) {
            _nickname.value = authRepository.getNicknameSync() ?: ""
            _authState.value = AuthState.LoggedIn
            viewModelScope.launch { checkCoupleStatus() }
        }
    }

    fun resetState() {
        _authState.value = AuthState.Idle
        _coupleState.value = CoupleBindState.Idle
    }

    private fun parseError(e: Exception): String {
        val msg = e.message ?: "网络错误"
        return when {
            msg.contains("401") -> "账号或密码错误"
            msg.contains("409") -> "该账号已注册"
            msg.contains("404") -> "邀请码无效或已使用"
            msg.contains("400") -> "请求参数错误"
            msg.contains("Unable to resolve host") || msg.contains("timeout") -> "网络连接失败，请检查网络"
            else -> msg
        }
    }
}
