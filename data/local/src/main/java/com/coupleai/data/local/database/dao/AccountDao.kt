package com.coupleai.data.local.database.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.coupleai.data.local.database.entity.AccountEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface AccountDao {
    @Query("SELECT * FROM accounts WHERE coupleId = :coupleId ORDER BY date DESC")
    fun getAccounts(coupleId: String): Flow<List<AccountEntity>>

    @Query("SELECT * FROM accounts WHERE coupleId = :coupleId AND date >= :startDate AND date <= :endDate ORDER BY date DESC")
    fun getAccountsByDateRange(coupleId: String, startDate: Long, endDate: Long): Flow<List<AccountEntity>>

    @Query("SELECT SUM(amount) FROM accounts WHERE coupleId = :coupleId AND type = 'expense' AND date >= :startDate AND date <= :endDate")
    fun getTotalExpense(coupleId: String, startDate: Long, endDate: Long): Flow<Double?>

    @Query("SELECT category, SUM(amount) as total FROM accounts WHERE coupleId = :coupleId AND type = 'expense' AND date >= :startDate AND date <= :endDate GROUP BY category")
    fun getCategoryBreakdown(coupleId: String, startDate: Long, endDate: Long): Flow<List<CategorySum>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(account: AccountEntity): Long

    @Query("DELETE FROM accounts WHERE id = :id")
    suspend fun delete(id: Long)
}

data class CategorySum(
    val category: String,
    val total: Double
)
