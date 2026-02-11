package com.kl.ponto.utils

import com.kl.ponto.data.model.Unidade

/**
 * Distância Haversine em metros.
 */
fun haversineMeters(
    lat1: Double,
    lng1: Double,
    lat2: Double,
    lng2: Double
): Double {
    val R = 6_371_000.0 // Raio da Terra em metros
    val dLat = Math.toRadians(lat2 - lat1)
    val dLng = Math.toRadians(lng2 - lng1)
    val a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2)
    val c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
}

data class GeofenceResult(
    val valido: Boolean,
    val distancia: Int? = null,
    val mensagem: String? = null
)

fun validarGeofence(
    minhaLat: Double,
    minhaLng: Double,
    unidade: Unidade
): GeofenceResult {
    val lat = unidade.lat
    val lng = unidade.lng
    val radiusM = unidade.radiusM

    if (lat == null || lng == null || lat.isNaN() || lng.isNaN()) {
        return GeofenceResult(valido = true, mensagem = "Unidade sem geofence configurado")
    }
    if (radiusM == null || radiusM.isNaN()) {
        return GeofenceResult(valido = true, mensagem = "Unidade sem raio configurado")
    }

    val distancia = haversineMeters(minhaLat, minhaLng, lat, lng)
    val margem = maxOf(radiusM * 0.2, 30.0)
    val raioComTolerancia = radiusM + margem

    return if (distancia > raioComTolerancia) {
        GeofenceResult(
            valido = false,
            distancia = distancia.toInt(),
            mensagem = "Você está a ${distancia.toInt()}m da unidade. É necessário estar dentro do raio de ${radiusM.toInt()}m."
        )
    } else {
        GeofenceResult(
            valido = true,
            distancia = distancia.toInt(),
            mensagem = "Localização válida (${distancia.toInt()}m da unidade)"
        )
    }
}
