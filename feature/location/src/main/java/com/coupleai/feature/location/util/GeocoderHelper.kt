package com.coupleai.feature.location.util

import android.content.Context
import android.location.Geocoder
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.util.Locale

object GeocoderHelper {
    suspend fun reverse(context: Context, lat: Double, lng: Double): String? = withContext(Dispatchers.IO) {
        try {
            if (!Geocoder.isPresent()) return@withContext null
            val geocoder = Geocoder(context, Locale.CHINA)
            @Suppress("DEPRECATION")
            val list = geocoder.getFromLocation(lat, lng, 1) ?: return@withContext null
            val address = list.firstOrNull() ?: return@withContext null
            buildString {
                address.adminArea?.let { append(it) }
                address.locality?.let { if (!contains(it)) append(it) }
                address.subLocality?.let { append(it) }
                address.thoroughfare?.let { append(it) }
            }.ifBlank { address.featureName }
        } catch (_: Exception) {
            null
        }
    }
}
