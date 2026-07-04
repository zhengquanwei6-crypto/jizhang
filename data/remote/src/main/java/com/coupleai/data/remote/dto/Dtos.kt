package com.coupleai.data.remote.dto

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

// ===== Auth =====
@Serializable
data class RegisterRequest(
    val phone: String? = null,
    val email: String? = null,
    val nickname: String,
    val password: String
)

@Serializable
data class LoginRequest(
    val account: String,
    val password: String
)

@Serializable
data class UserOut(
    val id: Long,
    val phone: String? = null,
    val email: String? = null,
    val nickname: String,
    val avatar_url: String? = null,
    val created_at: String
)

@Serializable
data class TokenOut(
    val access_token: String,
    val token_type: String = "bearer",
    val user: UserOut
)

// ===== Couple =====
@Serializable
data class CoupleBindRequest(val code: String)

@Serializable
data class InviteCodeOut(
    val code: String,
    val expires_at: String
)

@Serializable
data class CoupleOut(
    val id: Long,
    val user_a_id: Long,
    val user_b_id: Long? = null,
    val display_name: String? = null,
    val anniversary_date: String? = null,
    val created_at: String
)

// ===== Ledger =====
@Serializable
data class TxCreateRequest(
    val amount: Double,
    val type: String,
    val note: String? = null,
    val paid_by_user_id: Long,
    val split_mode: String = "aa",
    val happened_at: String
)

@Serializable
data class TxOut(
    val id: Long,
    val couple_id: Long,
    val amount: Double,
    val type: String,
    val note: String? = null,
    val paid_by_user_id: Long,
    val split_mode: String,
    val happened_at: String,
    val created_at: String
)

@Serializable
data class LedgerSummary(
    val month_expense: Double = 0.0,
    val month_income: Double = 0.0,
    val budget: Double = 0.0,
    val today_expense: Double = 0.0,
    val payer_a_spent: Double = 0.0,
    val payer_b_spent: Double = 0.0
)

@Serializable
data class BalanceOut(
    val initial_balance: Double = 0.0,
    val total_income: Double = 0.0,
    val total_expense: Double = 0.0,
    val current_balance: Double = 0.0,
    val note: String? = null
)

@Serializable
data class StatsOut(
    val today: Double = 0.0,
    val week: Double = 0.0,
    val month: Double = 0.0,
    val year: Double = 0.0,
    val month_count: Int = 0,
    val month_max: Double = 0.0,
    val month_avg: Double = 0.0,
    val daily_avg: Double = 0.0
)

// ===== Chat =====
@Serializable
data class ChatMessageCreate(
    val message_type: String = "text",
    val content: String
)

@Serializable
data class ChatMessageOut(
    val id: Long,
    val couple_id: Long,
    val sender_user_id: Long? = null,
    val role: String,
    val message_type: String,
    val content: String,
    val created_at: String
)

// ===== Growth/Pet =====
@Serializable
data class GrowthPetOut(
    val id: Long,
    val couple_id: Long,
    val name: String,
    val level: Int,
    val exp: Int,
    val intimacy: Int,
    val mood: Int,
    val energy: Int
)

@Serializable
data class GrowthEventCreate(
    val event_type: String,
    val exp_delta: Int = 0,
    val description: String? = null
)

@Serializable
data class GrowthEventOut(
    val id: Long,
    val couple_id: Long,
    val event_type: String,
    val exp_delta: Int,
    val description: String? = null,
    val created_at: String
)

// ===== Promise =====
@Serializable
data class PromiseCreate(
    val title: String,
    val description: String? = null,
    val start_at: String,
    val end_at: String? = null,
    val frequency: String = "daily",
    val reward_points: Int = 10
)

@Serializable
data class PromiseOut(
    val id: Long,
    val couple_id: Long,
    val title: String,
    val description: String? = null,
    val creator_user_id: Long,
    val start_at: String,
    val end_at: String? = null,
    val frequency: String,
    val reward_points: Int,
    val status: String
)

// ===== AI =====
@Serializable
data class AiChatRequest(
    val messages: List<AiMessage>,
    val max_tokens: Int = 500
)

@Serializable
data class AiMessage(
    val role: String,
    val content: String
)

@Serializable
data class AiChatResponse(
    val content: String,
    val model: String,
    val usage: Map<String, Int>? = null
)

// ===== Location =====
@Serializable
data class LocationSessionStart(
    val mode: String = "precise",
    val duration: String = "1h"
)

@Serializable
data class LocationSessionOut(
    val id: Long,
    val couple_id: Long,
    val user_id: Long,
    val status: String,
    val mode: String,
    val started_at: String,
    val ended_at: String? = null
)

@Serializable
data class LocationPointCreate(
    val latitude: Double,
    val longitude: Double,
    val accuracy: Double? = null,
    val is_fuzzy: Boolean = false,
    val recorded_at: String
)

@Serializable
data class LocationPointOut(
    val id: Long,
    val couple_id: Long,
    val user_id: Long,
    val latitude: Double,
    val longitude: Double,
    val accuracy: Double? = null,
    val is_fuzzy: Boolean = false,
    val recorded_at: String,
    val created_at: String
)

// ===== Health =====
@Serializable
data class HealthOut(
    val status: String,
    val version: String,
    val db: String,
    val redis: String
)
