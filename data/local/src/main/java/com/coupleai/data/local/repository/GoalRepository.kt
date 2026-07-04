package com.coupleai.data.local.repository

import com.coupleai.data.local.database.entity.GoalEntity
import com.coupleai.data.local.mock.MockRepository
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import javax.inject.Inject
import javax.inject.Singleton

data class GoalWithCheck(
    val goal: GoalEntity,
    val todayChecked: Boolean,
    val totalCheckIns: Int,
    val currentStreak: Int
)

@Singleton
class GoalRepository @Inject constructor(
    private val mock: MockRepository
) {
    fun getGoals(): Flow<List<GoalWithCheck>> = flow {
        val goals = mock.getGoals()
        emit(goals.map { goal ->
            GoalWithCheck(
                goal = goal,
                todayChecked = listOf(true, false).random(),
                totalCheckIns = (5..30).random(),
                currentStreak = (0..10).random()
            )
        })
    }

    fun getMonthCalendar(): Flow<Map<Int, Int>> = flow {
        val days = (1..30).associateWith { day ->
            listOf(0, 1, 2, 3).random()
        }
        emit(days)
    }

    fun getTotalDays(): Flow<Int> = flow { emit(128) }
}
