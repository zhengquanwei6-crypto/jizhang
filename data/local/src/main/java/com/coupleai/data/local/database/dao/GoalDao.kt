package com.coupleai.data.local.database.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.coupleai.data.local.database.entity.CheckInEntity
import com.coupleai.data.local.database.entity.GoalEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface GoalDao {
    @Query("SELECT * FROM goals WHERE coupleId = :coupleId AND isActive = 1 ORDER BY createdAt DESC")
    fun getGoals(coupleId: String): Flow<List<GoalEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertGoal(goal: GoalEntity): Long

    @Query("UPDATE goals SET isActive = 0 WHERE id = :goalId")
    suspend fun deactivateGoal(goalId: Long)

    @Query("SELECT * FROM check_ins WHERE goalId = :goalId ORDER BY date DESC")
    fun getCheckIns(goalId: Long): Flow<List<CheckInEntity>>

    @Query("SELECT * FROM check_ins WHERE goalId = :goalId AND date >= :startDate AND date <= :endDate")
    fun getCheckInsByDateRange(goalId: Long, startDate: Long, endDate: Long): Flow<List<CheckInEntity>>

    @Query("SELECT COUNT(*) FROM check_ins WHERE goalId = :goalId")
    fun getCheckInCount(goalId: Long): Flow<Int>

    @Query("SELECT COUNT(*) FROM check_ins WHERE userId = :userId AND date >= :startDate AND date <= :endDate")
    fun getTodayCheckInCount(userId: String, startDate: Long, endDate: Long): Flow<Int>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertCheckIn(checkIn: CheckInEntity): Long

    @Query("DELETE FROM check_ins WHERE id = :id")
    suspend fun deleteCheckIn(id: Long)
}
