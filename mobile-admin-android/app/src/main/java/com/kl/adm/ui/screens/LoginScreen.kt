package com.kl.adm.ui.screens

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.VisibilityOff
import androidx.compose.material3.Button
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import coil.decode.SvgDecoder
import coil.request.ImageRequest
import com.google.firebase.messaging.FirebaseMessaging
import com.kl.adm.data.api.ApiConfig
import com.kl.adm.data.api.ApiModule
import com.kl.adm.data.model.AuthRequest
import com.kl.adm.data.repository.AuthRepository
import com.kl.adm.data.repository.NotificationRepository
import com.kl.adm.ui.theme.KLBlue
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await
import kotlinx.coroutines.withContext

private const val FORGOT_PASSWORD_PATH = "/forgot-password"

@Composable
fun LoginScreen(
    authRepository: AuthRepository,
    onLoginSuccess: () -> Unit
) {
    val context = LocalContext.current
    var email by rememberSaveable { mutableStateOf("") }
    var password by rememberSaveable { mutableStateOf("") }
    var passwordVisible by rememberSaveable { mutableStateOf(false) }
    var savePassword by rememberSaveable { mutableStateOf(false) }
    var loading by mutableStateOf(false)
    var error by mutableStateOf<String?>(null)

    val scope = rememberCoroutineScope()

    val svgImageLoader = remember {
        coil.ImageLoader.Builder(context)
            .components { add(SvgDecoder.Factory()) }
            .build()
    }

    LaunchedEffect(Unit) {
        val user = authRepository.getSavedUser()
        if (user != null) {
            onLoginSuccess()
            return@LaunchedEffect
        }
        val saved = authRepository.getSavedCredentials()
        val checked = authRepository.getSavePasswordChecked()
        if (saved != null && checked) {
            email = saved.email
            password = saved.password
            savePassword = true
        } else if (checked) {
            savePassword = true
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.surface)
            .padding(24.dp)
            .verticalScroll(rememberScrollState()),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        AsyncImage(
            model = ImageRequest.Builder(context)
                .data("file:///android_asset/kl.svg")
                .build(),
            contentDescription = "Logo KL",
            imageLoader = svgImageLoader,
            modifier = Modifier
                .fillMaxWidth(0.7f)
                .height(72.dp),
            contentScale = ContentScale.Fit
        )
        Spacer(modifier = Modifier.height(16.dp))
        Text(
            text = "KL Administração",
            style = MaterialTheme.typography.headlineMedium,
            color = KLBlue
        )
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            text = "Checklists e Pontos",
            style = MaterialTheme.typography.bodyLarge,
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
            visualTransformation = if (passwordVisible) VisualTransformation.None else PasswordVisualTransformation(),
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
            trailingIcon = {
                IconButton(onClick = { passwordVisible = !passwordVisible }) {
                    Icon(
                        imageVector = if (passwordVisible) Icons.Filled.VisibilityOff else Icons.Filled.Visibility,
                        contentDescription = if (passwordVisible) "Ocultar senha" else "Mostrar senha"
                    )
                }
            }
        )

        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(top = 8.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            TextButton(onClick = {
                val url = ApiConfig.BASE_URL.trimEnd('/') + FORGOT_PASSWORD_PATH
                context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
            }) {
                Text("Esqueci senha", color = KLBlue)
            }
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.padding(end = 8.dp)
            ) {
                Checkbox(
                    checked = savePassword,
                    onCheckedChange = { savePassword = it }
                )
                Text("Salvar senha", style = MaterialTheme.typography.bodyMedium)
            }
        }

        error?.let { msg ->
            Spacer(modifier = Modifier.height(12.dp))
            Text(text = msg, color = MaterialTheme.colorScheme.error)
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
                                authRepository.saveCredentials(email.trim().lowercase(), password, savePassword)
                                true
                            } else {
                                res.errorBody()?.string() ?: "Erro ao fazer login"
                            }
                        }
                    }
                    loading = false
                    when {
                        result.getOrNull() == true -> {
                            onLoginSuccess()
                            launch(Dispatchers.IO) {
                                try {
                                    val fcmToken = FirebaseMessaging.getInstance().token.await()
                                    val notificationRepo = NotificationRepository()
                                    notificationRepo.registerToken(fcmToken, null)
                                } catch (e: Exception) {
                                    android.util.Log.e("LoginScreen", "Erro ao registrar token FCM", e)
                                }
                            }
                        }
                        else -> error = result.exceptionOrNull()?.message ?: (result.getOrNull() as? String) ?: "Verifique email e senha."
                    }
                }
            },
            modifier = Modifier.fillMaxWidth(),
            enabled = !loading
        ) {
            if (loading) CircularProgressIndicator(modifier = Modifier.size(24.dp), color = MaterialTheme.colorScheme.onPrimary)
            else Text("Entrar")
        }
    }
}
