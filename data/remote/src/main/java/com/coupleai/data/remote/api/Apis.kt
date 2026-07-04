package com.coupleai.data.remote.api

import com.coupleai.data.remote.dto.*
import retrofit2.http.*

interface AuthApi {
    @POST("auth/register")
    suspend fun register(@Body body: RegisterRequest): TokenOut

    @POST("auth/login")
    suspend fun login(@Body body: LoginRequest): TokenOut

    @GET("auth/me")
    suspend fun me(): UserOut

    @PUT("auth/me")
    suspend fun updateMe(@Body body: Map<String, String?>): UserOut
}

interface CoupleApi {
    @POST("couple/invite-code")
    suspend fun createInviteCode(): InviteCodeOut

    @POST("couple/bind")
    suspend fun bindCouple(@Body body: CoupleBindRequest): CoupleOut

    @GET("couple/me")
    suspend fun getMyCouple(): CoupleOut

    @PUT("couple/me")
    suspend fun updateCouple(@Body body: Map<String, String?>): CoupleOut
}

interface LedgerApi {
    @GET("ledger/transactions")
    suspend fun getTransactions(@Query("limit") limit: Int = 50): List<TxOut>

    @POST("ledger/transactions")
    suspend fun createTransaction(@Body body: TxCreateRequest): TxOut

    @PUT("ledger/transactions/{id}")
    suspend fun updateTransaction(@Path("id") id: Long, @Body body: Map<String, Any?>): TxOut

    @DELETE("ledger/transactions/{id}")
    suspend fun deleteTransaction(@Path("id") id: Long)

    @GET("ledger/summary")
    suspend fun getSummary(): LedgerSummary

    @GET("ledger/balance")
    suspend fun getBalance(): BalanceOut

    @PUT("ledger/balance")
    suspend fun updateBalance(@Body body: Map<String, Any?>): BalanceOut

    @GET("ledger/stats")
    suspend fun getStats(): StatsOut

    @GET("ledger/budget/current")
    suspend fun getCurrentBudget(): Map<String, Any?>
}

interface ChatApi {
    @GET("chat/messages")
    suspend fun getMessages(@Query("limit") limit: Int = 50): List<ChatMessageOut>

    @POST("chat/messages")
    suspend fun sendMessage(@Body body: ChatMessageCreate): ChatMessageOut
}

interface GrowthApi {
    @GET("growth/pet")
    suspend fun getPet(): GrowthPetOut

    @POST("growth/events")
    suspend fun createEvent(@Body body: GrowthEventCreate): GrowthEventOut

    @GET("growth/events")
    suspend fun getEvents(@Query("limit") limit: Int = 20): List<GrowthEventOut>
}

interface PromiseApi {
    @GET("promise")
    suspend fun getPromises(): List<PromiseOut>

    @POST("promise")
    suspend fun createPromise(@Body body: PromiseCreate): PromiseOut

    @PUT("promise/{id}")
    suspend fun updatePromise(@Path("id") id: Long, @Body body: Map<String, String?>): PromiseOut

    @POST("promise/{id}/checkin")
    suspend fun checkin(@Path("id") id: Long, @Body body: Map<String, String>): Any
}

interface AiApi {
    @POST("ai/chat")
    suspend fun chat(@Body body: AiChatRequest): AiChatResponse

    @POST("ai/daily-advice")
    suspend fun dailyAdvice(): AiChatResponse

    @POST("ai/ledger-analysis")
    suspend fun ledgerAnalysis(): AiChatResponse

    @POST("ai/promise-suggestion")
    suspend fun promiseSuggestion(): AiChatResponse
}

interface LocationApi {
    @POST("location/session/start")
    suspend fun startSession(@Body body: LocationSessionStart): LocationSessionOut

    @POST("location/session/stop")
    suspend fun stopSession(): LocationSessionOut

    @GET("location/session/current")
    suspend fun getCurrentSessions(): List<LocationSessionOut>

    @POST("location/points")
    suspend fun uploadPoint(@Body body: LocationPointCreate): LocationPointOut

    @GET("location/points/history")
    suspend fun getHistory(@Query("days") days: Int = 30): List<LocationPointOut>

    @GET("location/points/today")
    suspend fun getTodayPoints(): List<LocationPointOut>
}

interface HealthApi {
    @GET("health")
    suspend fun health(): HealthOut
}
