package com.kl.adm.data.repository

import com.kl.adm.data.api.ApiModule
import com.kl.adm.data.model.RegisterFcmTokenRequest
import com.kl.adm.data.model.RegisterFcmTokenResponse

class NotificationRepository {
    private val api = ApiModule.api()

    suspend fun registerToken(token: String, deviceId: String? = null): Result<RegisterFcmTokenResponse> = runCatching {
        api.registerFcmToken(RegisterFcmTokenRequest(token, deviceId)).let { r ->
            if (r.isSuccessful) r.body()!! else throw Exception(r.message() ?: "Erro ao registrar token FCM")
        }
    }
}
