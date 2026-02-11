package com.kl.adm.data.model

import com.google.gson.annotations.SerializedName

data class AuthRequest(
    val email: String,
    val password: String
)

data class AuthResponse(
    val success: Boolean,
    val user: User,
    val token: String
)

data class User(
    val id: String,
    val email: String,
    val name: String,
    val role: String
)

data class MeResponse(
    val id: String,
    val name: String,
    val email: String,
    val role: String
)
