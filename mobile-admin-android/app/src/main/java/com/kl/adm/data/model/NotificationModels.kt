package com.kl.adm.data.model

import com.google.gson.annotations.SerializedName

data class RegisterFcmTokenRequest(
    val token: String,
    val deviceId: String? = null
)

data class RegisterFcmTokenResponse(
    val success: Boolean,
    val message: String
)

data class PontoNotificationData(
    val registroId: String,
    val funcionarioId: String,
    val funcionarioNome: String,
    val tipo: String,
    val timestamp: String,
    val unidadeNome: String,
    val protocolo: String?
)
