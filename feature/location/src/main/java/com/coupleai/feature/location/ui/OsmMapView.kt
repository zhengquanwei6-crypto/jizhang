package com.coupleai.feature.location.ui

import android.annotation.SuppressLint
import android.webkit.WebView
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.viewinterop.AndroidView

@SuppressLint("SetJavaScriptEnabled")
@Composable
fun OsmMapView(
    points: List<Pair<Double, Double>>,
    modifier: Modifier = Modifier,
    zoom: Int = 14
) {
    if (points.isEmpty()) return

    val markersJs = points.joinToString(",") { (lat, lng) -> "[$lat,$lng]" }
    val centerLat = points.map { it.first }.average()
    val centerLng = points.map { it.second }.average()
    val fitBounds = if (points.size > 1) {
        "map.fitBounds(L.latLngBounds([$markersJs]),{padding:[24,24]});"
    } else {
        ""
    }

    val html = """
        <!DOCTYPE html><html><head>
        <meta charset="utf-8"/>
        <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>*{margin:0;padding:0}html,body,#map{height:100%;width:100%}</style>
        </head><body><div id="map"></div>
        <script>
        var map=L.map('map',{zoomControl:false,attributionControl:false}).setView([$centerLat,$centerLng],$zoom);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19}).addTo(map);
        var pts=[$markersJs];
        pts.forEach(function(p,i){
          L.circleMarker(p,{radius:8,color:i===0?'#C9A962':'#E8A598',fillColor:i===0?'#C9A962':'#E8A598',fillOpacity:0.9}).addTo(map);
        });
        $fitBounds
        </script></body></html>
    """.trimIndent()

    AndroidView(
        modifier = modifier,
        factory = { ctx ->
            WebView(ctx).apply {
                settings.javaScriptEnabled = true
                settings.domStorageEnabled = true
                setBackgroundColor(0)
                loadDataWithBaseURL("https://local/", html, "text/html", "UTF-8", null)
            }
        }
    )
}
