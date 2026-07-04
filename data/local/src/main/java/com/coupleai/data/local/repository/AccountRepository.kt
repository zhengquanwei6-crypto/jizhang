package com.coupleai.data.local.repository

import com.coupleai.data.local.database.entity.AccountEntity
import com.coupleai.data.local.mock.MockRepository
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import javax.inject.Inject
import javax.inject.Singleton

data class AccountCategory(
    val category: String,
    val amount: Double,
    val percentage: Float
)

data class AccountMonth(
    val month: String,
    val expense: Double,
    val income: Double
)

@Singleton
class AccountRepository @Inject constructor(
    private val mock: MockRepository
) {
    fun getAccounts(): Flow<List<AccountEntity>> = flow {
        emit(mock.getAccounts())
    }

    fun getCategoryBreakdown(): Flow<List<AccountCategory>> = flow {
        val accounts = mock.getAccounts()
        val totalExpense = accounts.filter { it.type == "expense" }.sumOf { it.amount }
        val grouped = accounts.filter { it.type == "expense" }
            .groupBy { it.category }
            .mapValues { it.value.sumOf { acc -> acc.amount } }

        emit(grouped.map { (cat, amt) ->
            AccountCategory(
                category = cat,
                amount = amt,
                percentage = (amt / totalExpense).toFloat()
            )
        }.sortedByDescending { it.amount })
    }

    fun getMonthlyTrend(): Flow<List<AccountMonth>> = flow {
        emit(
            listOf(
                AccountMonth("1月", 4200.0, 8000.0),
                AccountMonth("2月", 3800.0, 8000.0),
                AccountMonth("3月", 5100.0, 10000.0),
                AccountMonth("4月", 2580.0, 10000.0),
            )
        )
    }

    fun getTodayExpense(): Flow<Double> = flow {
        emit(2580.0)
    }

    fun getMonthExpense(): Flow<Double> = flow {
        val accounts = mock.getAccounts()
        val now = System.currentTimeMillis()
        val monthStart = now - 30L * 24 * 60 * 60 * 1000
        emit(accounts.filter { it.type == "expense" && it.date >= monthStart }.sumOf { it.amount })
    }
}
