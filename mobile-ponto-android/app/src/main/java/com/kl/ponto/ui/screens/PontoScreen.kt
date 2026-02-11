package com.kl.ponto.ui.screens

import android.Manifest
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Schedule
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.core.content.FileProvider
import com.google.android.gms.location.LocationServices
import com.kl.ponto.data.api.ApiModule
import com.kl.ponto.data.model.Funcionario
import com.kl.ponto.utils.GeofenceResult
import com.kl.ponto.utils.validarGeofence
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import com.google.android.gms.tasks.Tasks
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.asRequestBody
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.File

data class TipoPonto(val value: String, val label: String)

private val TIPOS = listOf(
    TipoPonto("ENTRADA", "Entrada"),
    TipoPonto("INTERVALO_INICIO", "Início Intervalo"),
    TipoPonto("INTERVALO_FIM", "Fim Intervalo"),
    TipoPonto("SAIDA", "Saída"),
    TipoPonto("HORA_EXTRA_INICIO", "Hora Extra - Início"),
    TipoPonto("HORA_EXTRA_FIM", "Hora Extra - Saída"),
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PontoScreen(
    funcionario: Funcionario,
    onLogout: () -> Unit
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var pontosHoje by remember { mutableStateOf<List<String>>(emptyList()) }
    var loading by mutableStateOf(false)
    var tipoSelecionado by mutableStateOf<String?>(null) // tipo em progresso
    var locationLat by mutableStateOf<Double?>(null)
    var locationLng by mutableStateOf<Double?>(null)
    var locationAccuracy by mutableStateOf<Float?>(null)
    var geofenceResult by mutableStateOf<GeofenceResult?>(null)
    var errorDialog by mutableStateOf<String?>(null)
    var successMessage by mutableStateOf<String?>(null)

    val selfieFile = remember { File(context.cacheDir, "selfie_${System.currentTimeMillis()}.jpg") }
    val selfieUri = remember {
        FileProvider.getUriForFile(context, "${context.packageName}.fileprovider", selfieFile)
    }

    val permissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { map ->
        if (map[Manifest.permission.ACCESS_FINE_LOCATION] == true ||
            map[Manifest.permission.CAMERA] == true
        ) {
            scope.launch { refreshLocation(context, scope) { lat, lng, acc ->
                locationLat = lat; locationLng = lng; locationAccuracy = acc
                if (lat != null && lng != null) geofenceResult = validarGeofence(lat, lng, funcionario.unidade)
            } }
        }
    }

    val takePictureLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.TakePicture()
    ) { success ->
        if (!success) {
            tipoSelecionado = null
            loading = false
            return@rememberLauncherForActivityResult
        }
        scope.launch {
            val tipo = tipoSelecionado ?: return@launch
            val lat = locationLat ?: run { errorDialog = "Localização não disponível"; loading = false; tipoSelecionado = null; return@launch }
            val lng = locationLng ?: run { errorDialog = "Localização não disponível"; loading = false; tipoSelecionado = null; return@launch }
            val result = withContext(Dispatchers.IO) {
                runCatching {
                    val cpfClean = funcionario.cpf.replace(Regex("\\D"), "")
                    val api = ApiModule.api()
                    val partCpf = cpfClean.toRequestBody("text/plain".toMediaTypeOrNull())
                    val partTipo = tipo.toRequestBody("text/plain".toMediaTypeOrNull())
                    val partLat = lat.toString().toRequestBody("text/plain".toMediaTypeOrNull())
                    val partLng = lng.toString().toRequestBody("text/plain".toMediaTypeOrNull())
                    val accStr = locationAccuracy?.toString() ?: ""
                    val partAccuracy = accStr.toRequestBody("text/plain".toMediaTypeOrNull())
                    val partDevice = (Build.MODEL ?: "Android").toRequestBody("text/plain".toMediaTypeOrNull())
                    val partSelfie = MultipartBody.Part.createFormData(
                        "selfie",
                        selfieFile.name,
                        selfieFile.asRequestBody("image/jpeg".toMediaTypeOrNull())
                    )
                    val res = api.registrarPonto(partCpf, partTipo, partLat, partLng, partAccuracy, partDevice, partSelfie)
                    if (res.isSuccessful && res.body()?.success == true) {
                        pontosHoje = pontosHoje + tipo
                        "Ponto registrado com sucesso!"
                    } else {
                        res.errorBody()?.string() ?: "Erro ao registrar ponto"
                    }
                }
            }
            loading = false
            tipoSelecionado = null
            when (val v = result.getOrNull()) {
                is String -> if (v.contains("sucesso")) successMessage = v else errorDialog = v
                else -> errorDialog = "Erro ao registrar. Tente novamente."
            }
            // Recarregar pontos hoje
            withContext(Dispatchers.IO) {
                runCatching {
                    val r = ApiModule.api().pontosHoje(mapOf("cpf" to funcionario.cpf.replace(Regex("\\D"), "")))
                    if (r.isSuccessful && r.body()?.pontos != null) pontosHoje = r.body()!!.pontos
                }
            }
        }
    }

    LaunchedEffect(Unit) {
        if (context.checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED ||
            context.checkSelfPermission(Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED
        ) {
            permissionLauncher.launch(
                arrayOf(Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.CAMERA)
            )
        } else {
            refreshLocation(context, scope) { lat, lng, acc ->
                locationLat = lat; locationLng = lng; locationAccuracy = acc
                if (lat != null && lng != null) geofenceResult = validarGeofence(lat, lng, funcionario.unidade)
            }
        }
    }

    LaunchedEffect(funcionario.cpf) {
        withContext(Dispatchers.IO) {
            runCatching {
                val r = ApiModule.api().pontosHoje(mapOf("cpf" to funcionario.cpf.replace(Regex("\\D"), "")))
                if (r.isSuccessful && r.body()?.pontos != null) pontosHoje = r.body()!!.pontos
            }
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Ponto Eletrônico") },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.primary,
                    titleContentColor = MaterialTheme.colorScheme.onPrimary
                ),
                actions = {
                    IconButton(onClick = onLogout) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Sair", tint = MaterialTheme.colorScheme.onPrimary)
                    }
                }
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .padding(16.dp)
        ) {
            Text("Olá, ${funcionario.nome}", style = MaterialTheme.typography.titleMedium)
            Text(funcionario.unidade.nome, style = MaterialTheme.typography.bodySmall)
            Spacer(modifier = Modifier.height(16.dp))

            geofenceResult?.let { gr ->
                Card(
                    colors = CardDefaults.cardColors(
                        containerColor = if (gr.valido) MaterialTheme.colorScheme.primaryContainer
                        else MaterialTheme.colorScheme.errorContainer
                    )
                ) {
                    Row(modifier = Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            if (gr.valido) Icons.Default.CheckCircle else Icons.Default.Warning,
                            contentDescription = null,
                            tint = if (gr.valido) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.error
                        )
                        Spacer(modifier = Modifier.padding(8.dp))
                        Text(gr.mensagem ?: if (gr.valido) "Dentro da área" else "Fora da área")
                    }
                }
                Spacer(modifier = Modifier.height(16.dp))
            }

            Text("Pontos registrados hoje:", style = MaterialTheme.typography.titleSmall)
            if (pontosHoje.isEmpty()) Text("Nenhum ponto registrado hoje")
            else pontosHoje.forEach { tipo ->
                Text("• ${TIPOS.find { it.value == tipo }?.label ?: tipo}")
            }
            Spacer(modifier = Modifier.height(24.dp))

            Text("Registrar ponto:", style = MaterialTheme.typography.titleSmall)
            TIPOS.forEach { tipo ->
                val jaRegistrado = pontosHoje.contains(tipo.value)
                Button(
                    onClick = {
                        if (jaRegistrado) {
                            errorDialog = "Você já registrou ${tipo.label.lowercase()} hoje."
                            return@Button
                        }
                        if (geofenceResult?.valido == false) {
                            errorDialog = geofenceResult?.mensagem ?: "Você está fora da área da unidade."
                            return@Button
                        }
                        if (locationLat == null || locationLng == null) {
                            errorDialog = "Aguarde a localização ou ative o GPS."
                            return@Button
                        }
                        tipoSelecionado = tipo.value
                        loading = true
                        if (selfieFile.exists()) selfieFile.delete()
                        takePictureLauncher.launch(selfieUri)
                    },
                    modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
                    enabled = !loading && !jaRegistrado
                ) {
                    Icon(Icons.Default.Schedule, contentDescription = null, modifier = Modifier.padding(end = 8.dp))
                    Text(if (jaRegistrado) "${tipo.label} (já registrado)" else tipo.label)
                }
            }

            if (loading) {
                Spacer(modifier = Modifier.height(16.dp))
                Box(modifier = Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator()
                }
            }
        }
    }

    successMessage?.let { msg ->
        AlertDialog(
            onDismissRequest = { successMessage = null },
            title = { Text("Sucesso") },
            text = { Text(msg) },
            confirmButton = {
                Button(onClick = { successMessage = null }) { Text("OK") }
            }
        )
    }
    errorDialog?.let { msg ->
        AlertDialog(
            onDismissRequest = { errorDialog = null },
            title = { Text("Erro") },
            text = { Text(msg) },
            confirmButton = {
                Button(onClick = { errorDialog = null }) { Text("OK") }
            }
        )
    }
}

private suspend fun refreshLocation(
    context: android.content.Context,
    scope: kotlinx.coroutines.CoroutineScope,
    onResult: (Double?, Double?, Float?) -> Unit
) {
    withContext(Dispatchers.IO) {
        val fused = LocationServices.getFusedLocationProviderClient(context)
        runCatching {
            val loc = Tasks.await(fused.lastLocation)
            if (loc != null) {
                kotlinx.coroutines.withContext(Dispatchers.Main) {
                    onResult(loc.latitude, loc.longitude, loc.accuracy)
                }
            } else {
                kotlinx.coroutines.withContext(Dispatchers.Main) { onResult(null, null, null) }
            }
        }.onFailure {
            kotlinx.coroutines.withContext(Dispatchers.Main) { onResult(null, null, null) }
        }
    }
}
