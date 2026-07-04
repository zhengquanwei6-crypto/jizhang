package com.coupleai.core.common.ext

import android.content.Context
import android.content.res.Resources

val Int.dp: Int get() = (this * Resources.getSystem().displayMetrics.density).toInt()
val Float.dp: Float get() = this * Resources.getSystem().displayMetrics.density

val Int.sp: Float get() = this * Resources.getSystem().displayMetrics.scaledDensity

fun String.isValidEmail(): Boolean {
    return android.util.Patterns.EMAIL_ADDRESS.matcher(this).matches()
}

fun Long.toDateString(): String {
    val sdf = java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.getDefault())
    return sdf.format(java.util.Date(this))
}

fun Long.toTimeString(): String {
    val sdf = java.text.SimpleDateFormat("HH:mm", java.util.Locale.getDefault())
    return sdf.format(java.util.Date(this))
}

fun Float.formatCurrency(): String {
    return String.format(java.util.Locale.getDefault(), "%.2f", this)
}

fun Int.formatWithComma(): String {
    return java.text.NumberFormat.getNumberInstance(java.util.Locale.getDefault()).format(this)
}
