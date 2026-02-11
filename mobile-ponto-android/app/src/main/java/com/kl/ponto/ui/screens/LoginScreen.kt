package com.kl.ponto.ui.screens

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
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
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
import androidx.compose.ui.text.input.OffsetMapping
import androidx.compose.ui.text.input.TransformedText
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import coil.decode.SvgDecoder
import coil.request.ImageRequest
import com.kl.ponto.data.api.ApiModule
import com.kl.ponto.data.model.AuthRequest
import com.kl.ponto.data.model.Funcionario
import com.kl.ponto.data.repository.AuthRepository
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

/** Máscara CPF: guardamos só dígitos; a exibição usa VisualTransformation para manter o cursor correto. */
private object CpfVisualTransformation : VisualTransformation {
    override fun filter(text: androidx.compose.ui.text.AnnotatedString): TransformedText {
        val digits = text.text.filter { it.isDigit() }.take(11)
        val formatted = buildString {
            digits.forEachIndexed { i, c ->
                if (i == 3 || i == 6) append('.')
                if (i == 9) append('-')
                append(c)
            }
        }
        val offsetMapping = object : OffsetMapping {
            override fun originalToTransformed(offset: Int): Int = when {
                offset <= 3 -> offset
                offset <= 6 -> offset + 1
                offset <= 9 -> offset + 2
                else -> (offset + 3).coerceAtMost(14)
            }
            override fun transformedToOriginal(offset: Int): Int = when {
                offset <= 3 -> offset
                offset <= 7 -> (offset - 1).coerceIn(0, 11)
                offset <= 11 -> (offset - 2).coerceIn(0, 11)
                else -> (offset - 3).coerceIn(0, 11)
            }
        }
        return TransformedText(androidx.compose.ui.text.AnnotatedString(formatted), offsetMapping)
    }
}

@Composable
fun LoginScreen(
    authRepository: AuthRepository,
    onLoginSuccess: (Funcionario) -> Unit
) {
    val context = LocalContext.current
    val svgImageLoader = remember {
        coil.ImageLoader.Builder(context)
            .components { add(SvgDecoder.Factory()) }
            .build()
    }
    var cpf by rememberSaveable { mutableStateOf("") } // só dígitos, máx 11
    var loading by mutableStateOf(false)
    var error by mutableStateOf<String?>(null)
    val scope = rememberCoroutineScope()

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
            text = "KL Facilities",
            style = MaterialTheme.typography.headlineMedium,
            color = MaterialTheme.colorScheme.primary
        )
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            text = "Registro de Ponto",
            style = MaterialTheme.typography.bodyLarge,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        Spacer(modifier = Modifier.height(32.dp))

        OutlinedTextField(
            value = cpf,
            onValueChange = { new -> cpf = new.filter { it.isDigit() }.take(11) },
            label = { Text("Digite seu CPF") },
            placeholder = { Text("000.000.000-00") },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true,
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
            visualTransformation = CpfVisualTransformation,
            isError = error != null
        )

        error?.let { msg ->
            Spacer(modifier = Modifier.height(8.dp))
            Text(text = msg, color = MaterialTheme.colorScheme.error)
        }

        Spacer(modifier = Modifier.height(24.dp))
        Button(
            onClick = {
                val clean = cpf.replace(Regex("\\D"), "")
                if (clean.length != 11) {
                    error = "CPF deve ter 11 dígitos"
                    return@Button
                }
                loading = true
                error = null
                scope.launch {
                    val result = withContext(kotlinx.coroutines.Dispatchers.IO) {
                        runCatching<Any?> {
                            val res = ApiModule.api().auth(AuthRequest(clean))
                            if (res.isSuccessful && res.body() != null) {
                                val body = res.body()!!
                                if (body.success && body.funcionario != null) {
                                    authRepository.saveFuncionario(body.funcionario)
                                    body.funcionario
                                } else null
                            } else {
                                res.errorBody()?.string() ?: "CPF não encontrado"
                            }
                        }
                    }
                    loading = false
                    when (val v = result.getOrNull()) {
                        is Funcionario -> onLoginSuccess(v)
                        is String -> error = v
                        else -> error = "Erro ao conectar. Verifique a internet."
                    }
                }
            },
            modifier = Modifier.fillMaxWidth(),
            enabled = !loading
        ) {
            if (loading) CircularProgressIndicator(
                modifier = Modifier.height(24.dp).padding(4.dp),
                color = MaterialTheme.colorScheme.onPrimary
            )
            else Text("Entrar")
        }

        Spacer(modifier = Modifier.height(24.dp))
        Text(
            text = "Se seu CPF não for encontrado, entre em contato com o RH",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}
