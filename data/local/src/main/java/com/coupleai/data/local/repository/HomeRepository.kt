package com.coupleai.data.local.repository

import com.coupleai.core.common.constant.AppConstants
import com.coupleai.data.local.mock.MockRepository
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import javax.inject.Inject
import javax.inject.Singleton

data class HomeDashboardData(
    val loveDays: Long,
    val monthExpense: Double,
    val monthIncome: Double,
    val unreadMessages: Int,
    val intimacyLevel: Int,
    val intimacyProgress: Float,
    val intimacyTitle: String,
    val todayCheckInCount: Int,
    val checkInGoals: List<GoalSummary>,
    val recentMessages: List<MessageSummary>
)

data class GoalSummary(
    val id: Long,
    val title: String,
    val isCheckedToday: Boolean,
    val streak: Int
)

data class MessageSummary(
    val senderId: String,
    val content: String,
    val createdAt: Long
)

@Singleton
class HomeRepository @Inject constructor(
    private val mock: MockRepository
) {
    fun getDashboard(): Flow<HomeDashboardData> = flow {
        val user = mock.getUser()
        val accounts = mock.getAccounts()
        val messages = mock.getChatMessages()
        val goals = mock.getGoals()
        val intimacyLogs = mock.getIntimacyLogs()

        val loveDays = (System.currentTimeMillis() - user.loveStartDate) / (24 * 60 * 60 * 1000)

        val now = System.currentTimeMillis()
        val monthStart = now - 30L * 24 * 60 * 60 * 1000
        val monthAccounts = accounts.filter { it.date >= monthStart }
        val monthExpense = monthAccounts.filter { it.type == "expense" }.sumOf { it.amount }
        val monthIncome = monthAccounts.filter { it.type == "income" }.sumOf { it.amount }

        val unreadMessages = 3

        val totalPoints = intimacyLogs.sumOf { it.points }
        val level = ((totalPoints / 100) + 1).coerceAtMost(AppConstants.INTIMACY_MAX_LEVEL)
        val levelProgress = (totalPoints % 100) / 100f
        val title = getIntimacyTitle(level)

        val checkInGoals = goals.take(4).map { goal ->
            GoalSummary(
                id = goal.id,
                title = goal.title,
                isCheckedToday = listOf(true, true, true, false).random(),
                streak = (3..15).random()
            )
        }

        val recentMessages = messages.takeLast(3).map {
            MessageSummary(it.senderId, it.content, it.createdAt)
        }

        emit(
            HomeDashboardData(
                loveDays = loveDays,
                monthExpense = monthExpense,
                monthIncome = monthIncome,
                unreadMessages = unreadMessages,
                intimacyLevel = level,
                intimacyProgress = levelProgress,
                intimacyTitle = title,
                todayCheckInCount = checkInGoals.count { it.isCheckedToday },
                checkInGoals = checkInGoals,
                recentMessages = recentMessages
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
