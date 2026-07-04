package com.coupleai.core.common.util

object DateUtils {
    fun getDaysSince(startTimestamp: Long): Long {
        val now = System.currentTimeMillis()
        val diff = now - startTimestamp
        return diff / (1000 * 60 * 60 * 24)
    }

    fun formatDate(timestamp: Long): String {
        val sdf = java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.getDefault())
        return sdf.format(java.util.Date(timestamp))
    }

    fun formatTime(timestamp: Long): String {
        val sdf = java.text.SimpleDateFormat("HH:mm", java.util.Locale.getDefault())
        return sdf.format(java.util.Date(timestamp))
    }

    fun formatDateTime(timestamp: Long): String {
        val sdf = java.text.SimpleDateFormat("yyyy-MM-dd HH:mm", java.util.Locale.getDefault())
        return sdf.format(java.util.Date(timestamp))
    }

    fun getGreeting(): String {
        val hour = java.util.Calendar.getInstance().get(java.util.Calendar.HOUR_OF_DAY)
        return when (hour) {
            in 0..5 -> "夜深了"
            in 6..11 -> "早上好"
            in 12..13 -> "中午好"
            in 14..17 -> "下午好"
            in 18..20 -> "傍晚好"
            else -> "晚上好"
        }
    }

    fun getCurrentTimestamp(): Long = System.currentTimeMillis()
}
