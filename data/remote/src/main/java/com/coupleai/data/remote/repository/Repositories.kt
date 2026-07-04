package com.coupleai.data.remote.repository

import com.coupleai.data.remote.api.AiApi
import com.coupleai.data.remote.api.CoupleApi
import com.coupleai.data.remote.api.GrowthApi
import com.coupleai.data.remote.api.LocationApi
import com.coupleai.data.remote.api.PromiseApi
import com.coupleai.data.remote.dto.*
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class GrowthRepository @Inject constructor(
    private val growthApi: GrowthApi
) {
    suspend fun getPet(): GrowthPetOut = growthApi.getPet()

    suspend fun interact(type: String, expDelta: Int = 10, desc: String? = null): GrowthEventOut {
        return growthApi.createEvent(GrowthEventCreate(type, expDelta, desc))
    }

    suspend fun getEvents(limit: Int = 20): List<GrowthEventOut> =
        growthApi.getEvents(limit)
}

@Singleton
class PromiseRepository @Inject constructor(
    private val promiseApi: PromiseApi
) {
    suspend fun getPromises(): List<PromiseOut> = promiseApi.getPromises()

    suspend fun createPromise(title: String, desc: String?, frequency: String, reward: Int): PromiseOut {
        return promiseApi.createPromise(PromiseCreate(
            title = title,
            description = desc,
            start_at = java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", java.util.Locale.US)
                .apply { timeZone = java.util.TimeZone.getTimeZone("UTC") }
                .format(java.util.Date()),
            frequency = frequency,
            reward_points = reward
        ))
    }

    suspend fun checkin(id: Long) = promiseApi.checkin(id, mapOf("checked_at" to
        java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", java.util.Locale.US)
            .apply { timeZone = java.util.TimeZone.getTimeZone("UTC") }
            .format(java.util.Date())
    ))

    suspend fun completePromise(id: Long) = promiseApi.updatePromise(id, mapOf("status" to "completed"))
    suspend fun cancelPromise(id: Long) = promiseApi.updatePromise(id, mapOf("status" to "cancelled"))
}

@Singleton
class AiRepository @Inject constructor(
    private val aiApi: AiApi
) {
    suspend fun chat(message: String): AiChatResponse {
        return aiApi.chat(AiChatRequest(
            messages = listOf(AiMessage("user", message)),
            max_tokens = 500
        ))
    }

    suspend fun dailyAdvice(): AiChatResponse = aiApi.dailyAdvice()
    suspend fun ledgerAnalysis(): AiChatResponse = aiApi.ledgerAnalysis()
    suspend fun promiseSuggestion(): AiChatResponse = aiApi.promiseSuggestion()
}

@Singleton
class LocationRepository @Inject constructor(
    private val locationApi: LocationApi
) {
    suspend fun startSession(mode: String = "precise") =
        locationApi.startSession(LocationSessionStart(mode))

    suspend fun stopSession() = locationApi.stopSession()

    suspend fun getCurrentSessions() = locationApi.getCurrentSessions()

    suspend fun uploadPoint(lat: Double, lng: Double, accuracy: Float?) {
        val now = java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", java.util.Locale.US)
            .apply { timeZone = java.util.TimeZone.getTimeZone("UTC") }
            .format(java.util.Date())
        locationApi.uploadPoint(
            LocationPointCreate(
                latitude = lat,
                longitude = lng,
                accuracy = accuracy?.toDouble(),
                recorded_at = now
            )
        )
    }

    suspend fun getHistory(days: Int = 30) = locationApi.getHistory(days)

    suspend fun getTodayPoints() = locationApi.getTodayPoints()
}

@Singleton
class CoupleRepository @Inject constructor(
    private val coupleApi: CoupleApi
) {
    suspend fun createInviteCode() = coupleApi.createInviteCode()
    suspend fun bindCouple(code: String) = coupleApi.bindCouple(CoupleBindRequest(code))
    suspend fun getMyCouple() = coupleApi.getMyCouple()
    suspend fun updateCouple(name: String?, anniversary: String?) =
        coupleApi.updateCouple(mapOf("display_name" to name, "anniversary_date" to anniversary))
}
