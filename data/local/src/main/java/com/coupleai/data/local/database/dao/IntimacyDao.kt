package com.coupleai.data.local.database.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.coupleai.data.local.database.entity.IntimacyLogEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface IntimacyDao {
    @Query("SELECT * FROM intimacy_logs WHERE coupleId = :coupleId ORDER BY createdAt DESC")
    fun getLogs(coupleId: String): Flow<List<IntimacyLogEntity>>

    @Query("SELECT SUM(points) FROM intimacy_logs WHERE coupleId = :coupleId")
    fun getTotalPoints(coupleId: String): Flow<Int?>

    @Query("SELECT SUM(points) FROM intimacy_logs WHERE coupleId = :coupleId AND createdAt >= :startDate AND createdAt <= :endDate")
    fun getPointsInRange(coupleId: String, startDate: Long, endDate: Long): Flow<Int?>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(log: IntimacyLogEntity)

    @Query("SELECT * FROM intimacy_logs WHERE coupleId = :coupleId AND action = :action ORDER BY createdAt DESC LIMIT 1")
    fun getLastLogByAction(coupleId: String, action: String): Flow<IntimacyLogEntity?>
}
