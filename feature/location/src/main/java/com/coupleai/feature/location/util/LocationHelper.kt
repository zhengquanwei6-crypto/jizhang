package com.coupleai.feature.location.util

import android.annotation.SuppressLint
import android.content.Context
import android.location.Criteria
import android.location.LocationManager

data class LocationReading(
    val latitude: Double,
    val longitude: Double,
    val accuracy: Float?
)

object LocationHelper {
    @SuppressLint("MissingPermission")
    fun readLastLocation(context: Context): LocationReading? {
        val lm = context.getSystemService(Context.LOCATION_SERVICE) as LocationManager
        val provider = lm.getBestProvider(
            Criteria().apply { accuracy = Criteria.ACCURACY_FINE },
            true
        ) ?: lm.getProviders(true).firstOrNull() ?: return null
        val loc = lm.getLastKnownLocation(provider) ?: return null
        return LocationReading(loc.latitude, loc.longitude, loc.accuracy)
    }
}
