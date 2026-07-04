package com.coupleai.data.local.database.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "users")
data class UserEntity(
    @PrimaryKey val id: String,
    val nickname: String,
    val avatarUrl: String?,
    val loveStartDate: Long,
    val createdAt: Long = System.currentTimeMillis()
)

@Entity(tableName = "accounts")
data class AccountEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val coupleId: String,
    val amount: Double,
    val category: String,
    val type: String, // "income" or "expense"
    val note: String?,
    val date: Long,
    val createdBy: String,
    val createdAt: Long = System.currentTimeMillis()
)

@Entity(tableName = "chat_messages")
data class ChatMessageEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val coupleId: String,
    val senderId: String,
    val content: String,
    val type: String = "text", // text, image, emoji
    val isRead: Boolean = false,
    val createdAt: Long = System.currentTimeMillis()
)

@Entity(tableName = "goals")
data class GoalEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val coupleId: String,
    val title: String,
    val description: String?,
    val frequency: String, // daily, weekly
    val targetDays: Int, // how many days per week/month
    val createdBy: String,
    val createdAt: Long = System.currentTimeMillis(),
    val isActive: Boolean = true
)

@Entity(tableName = "check_ins")
data class CheckInEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val goalId: Long,
    val userId: String,
    val date: Long,
    val note: String?,
    val createdAt: Long = System.currentTimeMillis()
)

@Entity(tableName = "intimacy_logs")
data class IntimacyLogEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val coupleId: String,
    val userId: String,
    val action: String, // check_in, chat, account, anniversary
    val points: Int,
    val createdAt: Long = System.currentTimeMillis()
)

@Entity(tableName = "achievements")
data class AchievementEntity(
    @PrimaryKey val id: String,
    val title: String,
    val description: String,
    val icon: String,
    val requirement: Int,
    val type: String, // check_in_streak, chat_count, account_sum, intimacy_level
    val unlockedAt: Long? = null
)
