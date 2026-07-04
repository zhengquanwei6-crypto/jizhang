package com.coupleai.data.remote.interceptor

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking
import javax.inject.Inject
import javax.inject.Singleton

private val Context.tokenDataStore: DataStore<Preferences> by preferencesDataStore(name = "auth_tokens")

@Singleton
class TokenManager @Inject constructor(
    private val context: Context
) {
    companion object {
        private val KEY_TOKEN = stringPreferencesKey("access_token")
        private val KEY_USER_ID = stringPreferencesKey("user_id")
        private val KEY_NICKNAME = stringPreferencesKey("nickname")
    }

    fun getTokenSync(): String? = runBlocking {
        context.tokenDataStore.data.first()[KEY_TOKEN]
    }

    suspend fun getToken(): String? {
        return context.tokenDataStore.data.first()[KEY_TOKEN]
    }

    suspend fun saveToken(token: String, userId: Long, nickname: String) {
        context.tokenDataStore.edit { prefs ->
            prefs[KEY_TOKEN] = token
            prefs[KEY_USER_ID] = userId.toString()
            prefs[KEY_NICKNAME] = nickname
        }
    }

    suspend fun clearToken() {
        context.tokenDataStore.edit { it.clear() }
    }

    suspend fun getUserId(): Long? {
        return context.tokenDataStore.data.first()[KEY_USER_ID]?.toLongOrNull()
    }

    suspend fun getNickname(): String? {
        return context.tokenDataStore.data.first()[KEY_NICKNAME]
    }

    fun getUserIdSync(): Long? = runBlocking { getUserId() }
    fun getNicknameSync(): String? = runBlocking { getNickname() }
}
