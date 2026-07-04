package com.coupleai.core.common.util

import android.content.Context
import android.widget.Toast

object ToastUtils {
    private var lastToast: Toast? = null

    fun show(context: Context, message: String, duration: Int = Toast.LENGTH_SHORT) {
        lastToast?.cancel()
        lastToast = Toast.makeText(context, message, duration).apply { show() }
    }
}
