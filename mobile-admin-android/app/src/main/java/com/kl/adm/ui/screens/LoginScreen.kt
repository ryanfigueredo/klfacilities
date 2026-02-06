package com.kl.adm.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import android.os.Build
import com.google.firebase.messaging.FirebaseMessaging
import com.kl.adm.data.api.ApiModule
import com.kl.adm.data.model.AuthRequest
import com.kl.adm.data.repository.AuthRepository
import com.kl.adm.data.repository.NotificationRepository
import com.kl.adm.ui.theme.KLBlue
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await
import kotlinx.coroutines.withContext

@Composable
fun LoginScreen(
    authRepository: AuthRepository,
    onLoginSuccess: () -> Unit
) {
    var email by rememberSaveable { mutableStateOf("") }
    var password by rememberSaveable { mutableStateOf("") }
    var loading by mutableStateOf(false)
    var error by mutableStateOf<String?>(null)

    val scope = rememberCoroutineScope()

    LaunchedEffect(Unit) {
        val user = authRepository.getSavedUser()
        if (user != null) onLoginSuccess()
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(androidx.compose.material3.MaterialTheme.colorScheme.surface)
            .padding(24.dp)
            .verticalScroll(rememberScrollState()),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text(
            text = "KL Administração",
            style = androidx.compose.material3.MaterialTheme.typography.headlineMedium,
            color = KLBlue
        )
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            text = "Checklists e Pontos",
            style = androidx.compose.material3.MaterialTheme.typography.bodyLarge,
            color = androidx.compose.ui.graphics.Color.Gray
        )
        Spacer(modifier = Modifier.height(32.dp))

        OutlinedTextField(
            value = email,
            onValueChange = { email = it; error = null },
            label = { Text("Email") },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true,
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email)
        )
        Spacer(modifier = Modifier.height(16.dp))
        OutlinedTextField(
            value = password,
            onValueChange = { password = it; error = null },
            label = { Text("Senha") },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true,
            visualTransformation = PasswordVisualTransformation(),
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password)
        )

        error?.let { msg ->
            Spacer(modifier = Modifier.height(12.dp))
            Text(text = msg, color = androidx.compose.material3.MaterialTheme.colorScheme.error)
        }

        Spacer(modifier = Modifier.height(24.dp))
        Button(
            onClick = {
                if (loading) return@Button
                loading = true
                error = null
                scope.launch {
                    val result = withContext(Dispatchers.IO) {
                        runCatching {
                            val res = ApiModule.api().login(AuthRequest(email.trim().lowercase(), password))
                            if (res.isSuccessful && res.body() != null) {
                                val body = res.body()!!
                                authRepository.saveAuth(body.token, body.user.id, body.user.name, body.user.email, body.user.role)
                                
                                // Registrar token FCM após login bem-sucedido
                                try {
                                    val fcmToken = FirebaseMessaging.getInstance().token.await()
                                    val notificationRepo = NotificationRepository()
                                    val deviceId = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                                        android.provider.Settings.Secure.getString(
                                            LocalContext.current.contentResolver,
                                            android.provider.Settings.Secure.ANDROID_ID
                                        )
                                    } else {
                                        null
                                    }
                                    notificationRepo.registerToken(fcmToken, deviceId)
                                } catch (e: Exception) {
                                    // Não bloquear login se falhar registro do token
                                    android.util.Log.e("LoginScreen", "Erro ao registrar token FCM", e)
                                }
                                
                                true
                            } else {
                                res.errorBody()?.string() ?: "Erro ao fazer login"
                            }
                        }
                    }
                    loading = false
                    when {
                        result.getOrNull() == true -> onLoginSuccess()
                        else -> error = (result.exceptionOrNull()?.message ?: result.getOrNull().toString()).takeIf { it is String } ?: "Verifique email e senha."
                    }
                }
            },
            modifier = Modifier.fillMaxWidth(),
            enabled = !loading
        ) {
            if (loading) CircularProgressIndicator(modifier = Modifier.height(24.dp).padding(4.dp), color = androidx.compose.material3.MaterialTheme.colorScheme.onPrimary)
            else Text("Entrar")
        }
    }
}
