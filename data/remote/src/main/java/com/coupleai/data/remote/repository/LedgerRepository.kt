package com.coupleai.data.remote.repository

import com.coupleai.data.remote.api.LedgerApi
import com.coupleai.data.remote.dto.*
import com.coupleai.data.remote.interceptor.TokenManager
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class LedgerRepository @Inject constructor(
    private val ledgerApi: LedgerApi,
    private val tokenManager: TokenManager
) {
    private val isoFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).apply {
        timeZone = TimeZone.getTimeZone("UTC")
    }

    suspend fun getTransactions(limit: Int = 100): List<TxOut> =
        ledgerApi.getTransactions(limit)

    suspend fun addTransaction(amount: Double, type: String, note: String?, splitMode: String = "aa"): TxOut {
        return ledgerApi.createTransaction(TxCreateRequest(
            amount = amount,
            type = type,
            note = note,
            paid_by_user_id = tokenManager.getUserIdSync() ?: 0,
            split_mode = splitMode,
            happened_at = isoFormat.format(Date())
        ))
    }

    suspend fun deleteTransaction(id: Long) = ledgerApi.deleteTransaction(id)

    suspend fun getSummary(): LedgerSummary = ledgerApi.getSummary()

    suspend fun getBalance(): BalanceOut = ledgerApi.getBalance()

    suspend fun setInitialBalance(amount: Double, note: String? = null): BalanceOut {
        return ledgerApi.updateBalance(mapOf(
            "initial_balance" to amount,
            "note" to note
        ))
    }

    suspend fun getStats(): StatsOut = ledgerApi.getStats()
}
