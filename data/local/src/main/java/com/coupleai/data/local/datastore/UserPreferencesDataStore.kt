package com.coupleai.data.local.datastore

import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.longPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class UserPreferencesDataStore @Inject constructor(
    private val dataStore: DataStore<Preferences>
) {
    companion object {
        val KEY_IS_FIRST_LAUNCH = booleanPreferencesKey("is_first_launch")
        val KEY_LOVE_START_DATE = longPreferencesKey("love_start_date")
        val KEY_MY_NICKNAME = stringPreferencesKey("my_nickname")
        val KEY_PARTNER_NICKNAME = stringPreferencesKey("partner_nickname")
        val KEY_MY_AVATAR_URL = stringPreferencesKey("my_avatar_url")
        val KEY_PARTNER_AVATAR_URL = stringPreferencesKey("partner_avatar_url")
        val KEY_IS_DARK_MODE = booleanPreferencesKey("is_dark_mode")
        val KEY_IS_NOTIFICATION_ENABLED = booleanPreferencesKey("is_notification_enabled")
        val KEY_AI_BASE_URL = stringPreferencesKey("ai_base_url")
        val KEY_AI_API_KEY = stringPreferencesKey("ai_api_key")
        val KEY_AI_MODEL = stringPreferencesKey("ai_model")
        val KEY_SUPABASE_URL = stringPreferencesKey("supabase_url")
        val KEY_SUPABASE_ANON_KEY = stringPreferencesKey("supabase_anon_key")
    }

    val isFirstLaunch: Flow<Boolean> = dataStore.data.map { prefs ->
        prefs[KEY_IS_FIRST_LAUNCH] ?: true
    }

    suspend fun setFirstLaunch(value: Boolean) {
        dataStore.edit { prefs ->
            prefs[KEY_IS_FIRST_LAUNCH] = value
        }
    }

    val loveStartDate: Flow<Long> = dataStore.data.map { prefs ->
        prefs[KEY_LOVE_START_DATE] ?: (System.currentTimeMillis() - 128L * 24 * 60 * 60 * 1000)
    }

    suspend fun setLoveStartDate(timestamp: Long) {
        dataStore.edit { prefs ->
            prefs[KEY_LOVE_START_DATE] = timestamp
        }
    }

    val myNickname: Flow<String> = dataStore.data.map { prefs ->
        prefs[KEY_MY_NICKNAME] ?: "小明"
    }

    suspend fun setMyNickname(name: String) {
        dataStore.edit { prefs ->
            prefs[KEY_MY_NICKNAME] = name
        }
    }

    val partnerNickname: Flow<String> = dataStore.data.map { prefs ->
        prefs[KEY_PARTNER_NICKNAME] ?: "小红"
    }

    suspend fun setPartnerNickname(name: String) {
        dataStore.edit { prefs ->
            prefs[KEY_PARTNER_NICKNAME] = name
        }
    }

    val isDarkMode: Flow<Boolean> = dataStore.data.map { prefs ->
        prefs[KEY_IS_DARK_MODE] ?: false
    }

    suspend fun setDarkMode(value: Boolean) {
        dataStore.edit { prefs ->
            prefs[KEY_IS_DARK_MODE] = value
        }
    }

    val aiApiKey: Flow<String> = dataStore.data.map { prefs ->
        prefs[KEY_AI_API_KEY] ?: ""
    }

    suspend fun setAiApiKey(key: String) {
        dataStore.edit { prefs ->
            prefs[KEY_AI_API_KEY] = key
        }
    }

    val aiBaseUrl: Flow<String> = dataStore.data.map { prefs ->
        prefs[KEY_AI_BASE_URL] ?: "https://api.openai.com/v1"
    }

    suspend fun setAiBaseUrl(url: String) {
        dataStore.edit { prefs ->
            prefs[KEY_AI_BASE_URL] = url
        }
    }

    val aiModel: Flow<String> = dataStore.data.map { prefs ->
        prefs[KEY_AI_MODEL] ?: "gpt-3.5-turbo"
    }

    suspend fun setAiModel(model: String) {
        dataStore.edit { prefs ->
            prefs[KEY_AI_MODEL] = model
        }
    }
}
