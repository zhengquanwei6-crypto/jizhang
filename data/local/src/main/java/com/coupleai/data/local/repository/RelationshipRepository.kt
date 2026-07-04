package com.coupleai.data.local.repository

import com.coupleai.data.local.database.entity.AchievementEntity
import com.coupleai.data.local.database.entity.IntimacyLogEntity
import com.coupleai.data.local.mock.MockRepository
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import javax.inject.Inject
import javax.inject.Singleton

data class RelationshipData(
    val level: Int,
    val title: String,
    val currentPoints: Int,
    val nextLevelPoints: Int,
    val progress: Float,
    val totalCheckIns: Int,
    val totalChats: Int,
    val totalAccounts: Int,
    val achievements: List<AchievementEntity>
)

@Singleton
class RelationshipRepository @Inject constructor(
    private val mock: MockRepository
) {
    fun getRelationshipData(): Flow<RelationshipData> = flow {
        val logs = mock.getIntimacyLogs()
        val achievements = mock.getAchievements()
        val accounts = mock.getAccounts()

        val totalPoints = logs.sumOf { it.points }
        val level = ((totalPoints / 100) + 1).coerceAtMost(10)
        val currentLevelPoints = totalPoints % 100
        val nextLevelPoints = 100
        val progress = currentLevelPoints / 100f

        val title = getIntimacyTitle(level)

        val checkIns = logs.count { it.action == "check_in" }
        val chats = logs.count { it.action == "chat" }

        emit(
            RelationshipData(
                level = level,
                title = title,
                currentPoints = currentLevelPoints,
                nextLevelPoints = nextLevelPoints,
                progress = progress,
                totalCheckIns = checkIns,
                totalChats = chats,
                totalAccounts = accounts.size,
                achievements = achievements
            )
        )
    }

    private fun getIntimacyTitle(level: Int): String {
        return when (level) {
            1 -> "初见倾心"
            2 -> "怦然心动"
            3 -> "甜蜜相守"
            4 -> "心心相印"
            5 -> "情深似海"
            6 -> "灵魂伴侣"
            7 -> "命中注定"
            8 -> "天作之合"
            9 -> "永恒之约"
            10 -> "生死不渝"
            else -> "恋人未满"
        }
    }
}
