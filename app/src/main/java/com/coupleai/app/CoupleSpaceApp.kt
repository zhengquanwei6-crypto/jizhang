package com.coupleai.app

import android.app.Application
import dagger.hilt.android.HiltAndroidApp

@HiltAndroidApp
class CoupleSpaceApp : Application() {

    override fun onCreate() {
        super.onCreate()
    }
}
