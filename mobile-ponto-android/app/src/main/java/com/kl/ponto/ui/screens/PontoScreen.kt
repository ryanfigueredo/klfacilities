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
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Menu
import androidx.compose.material.icons.filled.Schedule
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material.icons.filled.Campaign
import androidx.compose.material.icons.filled.ChatBubble
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Settings
import androidx.compose.foundation.clickable
import androidx.compose.material3.ModalNavigationDrawer
import androidx.compose.material3.DrawerValue
import androidx.compose.material3.Surface
import androidx.compose.material3.rememberDrawerState
import androidx.compose.material3.TextButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.HorizontalDivider
import kotlinx.coroutines.launch
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Snackbar
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material.icons.filled.LocationOn
import androidx.core.content.FileProvider
import com.google.android.gms.location.CurrentLocationRequest
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import com.kl.ponto.data.api.ApiModule
import com.kl.ponto.data.model.Funcionario
import com.kl.ponto.data.model.HistoricoDia
import com.kl.ponto.data.model.ManifestacaoRequest
import com.kl.ponto.utils.GeofenceResult
import com.kl.ponto.utils.validarGeofence
import com.kl.ponto.worker.ReminderScheduler
import kotlinx.coroutines.delay
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlin.coroutines.resume
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

private fun formatCpf(cpf: String): String {
    val digits = cpf.replace(Regex("\\D"), "")
    return if (digits.length == 11)
        "${digits.slice(0..2)}.${digits.slice(3..5)}.${digits.slice(6..8)}-${digits.slice(9..10)}"
    else cpf
}

private fun colorForTipo(value: String): Color = when (value) {
    "ENTRADA" -> Color(0xFF2E7D32)           // Verde
    "INTERVALO_INICIO" -> Color(0xFF00838F)  // Teal/Ciano
    "INTERVALO_FIM" -> Color(0xFFEF6C00)      // Laranja
    "SAIDA" -> Color(0xFFC62828)              // Vermelho
    "HORA_EXTRA_INICIO", "HORA_EXTRA_FIM" -> Color(0xFF546E7A) // Cinza azulado
    else -> Color(0xFF009ee2)                 // Azul padrão
}

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
    var showManifestacaoScreen by mutableStateOf(false)
    var showFolhaScreen by mutableStateOf(false)
    var drawerMenuView by remember { mutableStateOf(true) }
    val snackbarHostState = remember { SnackbarHostState() }

    val drawerState = rememberDrawerState(initialValue = DrawerValue.Closed)

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

    LaunchedEffect(drawerState.currentValue) {
        if (drawerState.isOpen) drawerMenuView = true
    }

    LaunchedEffect(Unit) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (context.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                permissionLauncher.launch(arrayOf(Manifest.permission.POST_NOTIFICATIONS))
            }
        }
        ReminderScheduler.schedule(context)
    }

    ModalNavigationDrawer(
        drawerState = drawerState,
        drawerContent = {
            Surface(
                modifier = Modifier.fillMaxSize(),
                color = Color.White
            ) {
                Column(modifier = Modifier.fillMaxWidth()) {
                    // Cabeçalho azul: Menu/Configurações + Voltar (se config) + X
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(MaterialTheme.colorScheme.primary)
                            .padding(horizontal = 8.dp, vertical = 12.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            if (!drawerMenuView) {
                                IconButton(onClick = { drawerMenuView = true }) {
                                    Icon(Icons.Default.ArrowBack, contentDescription = "Voltar", tint = Color.White)
                                }
                            }
                            Text(
                                text = if (drawerMenuView) "Menu" else "Configurações",
                                style = MaterialTheme.typography.titleLarge,
                                color = Color.White
                            )
                        }
                        IconButton(onClick = { scope.launch { drawerState.close() } }) {
                            Icon(Icons.Default.Close, contentDescription = "Fechar menu", tint = Color.White)
                        }
                    }
                    if (drawerMenuView) {
                        // Lista no estilo do segundo anexo
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(16.dp)
                        ) {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(vertical = 14.dp)
                                    .clickable(onClick = { drawerMenuView = false }),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Icon(Icons.Default.Settings, contentDescription = null, tint = Color.DarkGray, modifier = Modifier.padding(end = 16.dp))
                                Text("Configurações", style = MaterialTheme.typography.bodyLarge, color = Color.Black)
                            }
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(vertical = 14.dp)
                                    .clickable(
                                        onClick = {
                                            showFolhaScreen = true
                                            scope.launch { drawerState.close() }
                                        },
                                        enabled = true
                                    ),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Icon(Icons.Default.Schedule, contentDescription = null, tint = Color.DarkGray, modifier = Modifier.padding(end = 16.dp))
                                Text("Pontos Batidos", style = MaterialTheme.typography.bodyLarge, color = Color.Black)
                            }
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(vertical = 14.dp)
                                    .clickable(
                                        onClick = {
                                            showManifestacaoScreen = true
                                            scope.launch { drawerState.close() }
                                        },
                                        enabled = true
                                    ),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Icon(Icons.Default.ChatBubble, contentDescription = null, tint = Color.DarkGray, modifier = Modifier.padding(end = 16.dp))
                                Column {
                                    Text("Manifestação", style = MaterialTheme.typography.bodyLarge, color = Color.Black)
                                    Text("Elogio, Sugestão ou Denúncia", style = MaterialTheme.typography.bodySmall, color = Color.DarkGray)
                                }
                            }
                            HorizontalDivider(color = Color.LightGray, modifier = Modifier.padding(vertical = 8.dp))
                            Text("Para outro colaborador bater ponto neste celular, saia da conta:", style = MaterialTheme.typography.bodySmall, color = Color.DarkGray)
                            Spacer(modifier = Modifier.height(8.dp))
                            Button(
                                onClick = {
                                    scope.launch {
                                        drawerState.close()
                                        onLogout()
                                    }
                                },
                                modifier = Modifier.fillMaxWidth(),
                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFC62828))
                            ) {
                                Icon(Icons.Default.ArrowBack, contentDescription = null, modifier = Modifier.padding(end = 8.dp), tint = Color.White)
                                Text("Sair")
                            }
                        }
                    } else {
                        // Conteúdo de Configurações (dados do colaborador, pontos hoje, informações)
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(16.dp)
                                .verticalScroll(rememberScrollState())
                        ) {
                            Text("Dados do colaborador", style = MaterialTheme.typography.titleSmall, color = Color.DarkGray)
                            Spacer(modifier = Modifier.height(8.dp))
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Default.Person, contentDescription = null, modifier = Modifier.padding(end = 8.dp), tint = Color.DarkGray)
                                Column {
                                    Text("Nome: ${funcionario.nome}", style = MaterialTheme.typography.bodyMedium, color = Color.Black)
                                    Text("CPF: ${formatCpf(funcionario.cpf)}", style = MaterialTheme.typography.bodySmall, color = Color.Black)
                                    Text("Unidade: ${funcionario.unidade.nome}", style = MaterialTheme.typography.bodySmall, color = Color.Black)
                                    Text("Grupo: ${funcionario.grupo.nome}", style = MaterialTheme.typography.bodySmall, color = Color.Black)
                                    Text("Cidade: ${funcionario.unidade.cidade ?: "—"}", style = MaterialTheme.typography.bodySmall, color = Color.Black)
                                }
                            }
                            Spacer(modifier = Modifier.height(20.dp))
                            HorizontalDivider(color = Color.LightGray)
                            Spacer(modifier = Modifier.height(16.dp))
                            Text("Pontos batidos hoje", style = MaterialTheme.typography.titleSmall, color = Color.DarkGray)
                            Spacer(modifier = Modifier.height(8.dp))
                            if (pontosHoje.isEmpty()) {
                                Text("Nenhum ponto registrado hoje", style = MaterialTheme.typography.bodySmall, color = Color.Black)
                            } else {
                                pontosHoje.forEach { tipo ->
                                    Text("• ${TIPOS.find { it.value == tipo }?.label ?: tipo}", style = MaterialTheme.typography.bodySmall, color = Color.Black)
                                }
                            }
                            Spacer(modifier = Modifier.height(20.dp))
                            HorizontalDivider(color = Color.LightGray)
                            Spacer(modifier = Modifier.height(16.dp))
                            Text("Informações", style = MaterialTheme.typography.titleSmall, color = Color.DarkGray)
                            Text("App Ponto Eletrônico - Registre sua jornada e envie manifestações.", style = MaterialTheme.typography.bodySmall, color = Color.Black)
                        }
                    }
                }
            }
        }
    ) {
        Scaffold(
            snackbarHost = { SnackbarHost(snackbarHostState) { data -> Snackbar(snackbarData = data) } },
            topBar = {
                TopAppBar(
                    title = { Text("Ponto Eletrônico") },
                    colors = TopAppBarDefaults.topAppBarColors(
                        containerColor = MaterialTheme.colorScheme.primary,
                        titleContentColor = MaterialTheme.colorScheme.onPrimary
                    ),
                    navigationIcon = {
                        IconButton(onClick = { scope.launch { drawerState.open() } }) {
                            Icon(Icons.Default.Menu, contentDescription = "Menu", tint = MaterialTheme.colorScheme.onPrimary)
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
            Text("Unidade: ${funcionario.unidade.nome}", style = MaterialTheme.typography.bodySmall)
            Spacer(modifier = Modifier.height(20.dp))

            // Localização e status: dentro ou fora da loja
            Card(
                colors = CardDefaults.cardColors(
                    containerColor = when {
                        geofenceResult == null -> MaterialTheme.colorScheme.surfaceVariant
                        geofenceResult!!.valido -> Color(0xFFE8F5E9)
                        else -> MaterialTheme.colorScheme.errorContainer
                    }
                ),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            Icons.Default.LocationOn,
                            contentDescription = null,
                            tint = if (geofenceResult?.valido == true) Color(0xFF2E7D32)
                                  else if (geofenceResult?.valido == false) MaterialTheme.colorScheme.error
                                  else MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Spacer(modifier = Modifier.padding(8.dp))
                        Text(
                            text = when {
                                locationLat == null || locationLng == null -> "Obtendo localização..."
                                geofenceResult?.valido == true -> "Dentro da loja"
                                geofenceResult?.valido == false -> "Fora da área da loja"
                                else -> "Localização obtida"
                            },
                            style = MaterialTheme.typography.titleSmall
                        )
                    }
                    if (locationLat != null && locationLng != null) {
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = "%.6f, %.6f".format(locationLat, locationLng),
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                    geofenceResult?.let { gr ->
                        Spacer(modifier = Modifier.height(6.dp))
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                if (gr.valido) Icons.Default.CheckCircle else Icons.Default.Warning,
                                contentDescription = null,
                                tint = if (gr.valido) Color(0xFF2E7D32) else MaterialTheme.colorScheme.error,
                                modifier = Modifier.padding(end = 6.dp)
                            )
                            Text(
                                gr.mensagem ?: if (gr.valido) "Pode registrar ponto aqui." else "Aproxime-se da unidade.",
                                style = MaterialTheme.typography.bodyMedium
                            )
                        }
                    }
                }
            }
            Spacer(modifier = Modifier.height(20.dp))

            Text("Pontos registrados hoje:", style = MaterialTheme.typography.titleSmall)
            if (pontosHoje.isEmpty()) Text("Nenhum ponto registrado hoje")
            else pontosHoje.forEach { tipo ->
                Text("• ${TIPOS.find { it.value == tipo }?.label ?: tipo}")
            }
            Spacer(modifier = Modifier.height(24.dp))

            Text(
                "Registrar ponto:",
                style = MaterialTheme.typography.titleMedium
            )
            Spacer(modifier = Modifier.height(12.dp))
            TIPOS.forEach { tipo ->
                val jaRegistrado = pontosHoje.contains(tipo.value)
                Button(
                    onClick = {
                        if (jaRegistrado) {
                            val msg = "Você já registrou ${tipo.label.lowercase()} hoje."
                            errorDialog = msg
                            scope.launch { snackbarHostState.showSnackbar(msg) }
                            return@Button
                        }
                        if (geofenceResult?.valido == false) {
                            val msg = geofenceResult?.mensagem ?: "Você está fora da área da unidade."
                            errorDialog = msg
                            scope.launch { snackbarHostState.showSnackbar(msg) }
                            return@Button
                        }
                        if (locationLat == null || locationLng == null) {
                            val msg = "Aguarde a localização ou ative o GPS."
                            errorDialog = msg
                            scope.launch { snackbarHostState.showSnackbar(msg) }
                            return@Button
                        }
                        tipoSelecionado = tipo.value
                        loading = true
                        if (selfieFile.exists()) selfieFile.delete()
                        takePictureLauncher.launch(selfieUri)
                    },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(56.dp)
                        .padding(vertical = 6.dp),
                    enabled = !loading && !jaRegistrado,
                    colors = ButtonDefaults.buttonColors(
                        containerColor = colorForTipo(tipo.value),
                        disabledContainerColor = MaterialTheme.colorScheme.surfaceVariant
                    ),
                    contentPadding = ButtonDefaults.ContentPadding
                ) {
                    Icon(
                        Icons.Default.Schedule,
                        contentDescription = null,
                        modifier = Modifier.padding(end = 12.dp),
                        tint = Color.White
                    )
                    Text(
                        if (jaRegistrado) "${tipo.label} (já registrado)" else tipo.label,
                        style = MaterialTheme.typography.titleSmall
                    )
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
    }

    if (showManifestacaoScreen) {
        ManifestacaoScreen(
            funcionario = funcionario,
            onDismiss = { showManifestacaoScreen = false },
            onSuccess = { successMessage = "Manifestação enviada com sucesso!"; showManifestacaoScreen = false },
            onError = { errorDialog = it; showManifestacaoScreen = false }
        )
    }

    if (showFolhaScreen) {
        FolhaDePontoScreen(
            funcionario = funcionario,
            onDismiss = { showFolhaScreen = false },
            onError = { showFolhaScreen = false; errorDialog = it }
        )
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

private val MESES = listOf(
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
)

@Composable
private fun FolhaDePontoScreen(
    funcionario: Funcionario,
    onDismiss: () -> Unit,
    onError: (String) -> Unit
) {
    val calendar = java.util.Calendar.getInstance()
    var selectedMonth by remember {
        val y = calendar.get(java.util.Calendar.YEAR)
        val m = calendar.get(java.util.Calendar.MONTH) + 1
        mutableStateOf("%d-%02d".format(y, m))
    }
    var table by remember { mutableStateOf<List<HistoricoDia>?>(null) }
    var loading by remember { mutableStateOf(true) }

    LaunchedEffect(selectedMonth) {
        loading = true
        table = null
        val result = withContext(Dispatchers.IO) {
            runCatching {
                val cpfClean = funcionario.cpf.replace(Regex("\\D"), "")
                val r = ApiModule.api().historico(mapOf("cpf" to cpfClean, "month" to selectedMonth))
                if (r.isSuccessful && r.body()?.success == true) r.body()?.table else null
            }.getOrNull()
        }
        table = result ?: emptyList()
        loading = false
    }

    val (year, monthNum) = selectedMonth.split("-").map { it.toInt() }
    val monthLabel = "${MESES.getOrNull(monthNum - 1) ?: selectedMonth} de $year"

    fun changeMonth(delta: Int) {
        var m = monthNum
        var y = year
        m += delta
        if (m > 12) { m = 1; y++ }
        if (m < 1) { m = 12; y-- }
        selectedMonth = "%d-%02d".format(y, m)
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black.copy(alpha = 0.5f)),
        contentAlignment = Alignment.Center
    ) {
        Surface(
            modifier = Modifier
                .fillMaxSize()
                .padding(16.dp),
            color = Color.White,
            shape = MaterialTheme.shapes.medium
        ) {
            Column(modifier = Modifier.fillMaxSize()) {
                // Header azul: Folha de Ponto + nome + X
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(MaterialTheme.colorScheme.primary)
                        .padding(12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text("Folha de Ponto", style = MaterialTheme.typography.titleLarge, color = Color.White)
                        Text(funcionario.nome, style = MaterialTheme.typography.bodyMedium, color = Color.White.copy(alpha = 0.9f))
                    }
                    IconButton(onClick = onDismiss) {
                        Icon(Icons.Default.Close, contentDescription = "Fechar", tint = Color.White)
                    }
                }
                // Seletor de mês
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(Color(0xFFF5F5F5))
                        .padding(12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    IconButton(onClick = { changeMonth(-1) }) {
                        Text("‹", style = MaterialTheme.typography.headlineMedium, color = MaterialTheme.colorScheme.primary)
                    }
                    Text(monthLabel, style = MaterialTheme.typography.titleMedium, color = Color.Black)
                    IconButton(onClick = { changeMonth(1) }) {
                        Text("›", style = MaterialTheme.typography.headlineMedium, color = MaterialTheme.colorScheme.primary)
                    }
                }
                if (loading) {
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            CircularProgressIndicator()
                            Spacer(modifier = Modifier.height(8.dp))
                            Text("Carregando histórico...", style = MaterialTheme.typography.bodyMedium, color = Color.DarkGray)
                        }
                    }
                } else {
                    val list = table ?: emptyList()
                    Column(
                        modifier = Modifier
                            .fillMaxSize()
                            .verticalScroll(rememberScrollState())
                    ) {
                        // Cabeçalho da tabela
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .background(MaterialTheme.colorScheme.primary)
                                .padding(vertical = 10.dp, horizontal = 6.dp),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text("Dia", style = MaterialTheme.typography.labelSmall, color = Color.White, modifier = Modifier.weight(0.6f))
                            Text("Sem.", style = MaterialTheme.typography.labelSmall, color = Color.White, modifier = Modifier.weight(0.5f))
                            Text("Entrada", style = MaterialTheme.typography.labelSmall, color = Color.White, modifier = Modifier.weight(0.9f))
                            Text("Saída", style = MaterialTheme.typography.labelSmall, color = Color.White, modifier = Modifier.weight(0.9f))
                            Text("Início Int.", style = MaterialTheme.typography.labelSmall, color = Color.White, modifier = Modifier.weight(0.9f))
                            Text("Fim Int.", style = MaterialTheme.typography.labelSmall, color = Color.White, modifier = Modifier.weight(0.9f))
                            Text("Total", style = MaterialTheme.typography.labelSmall, color = Color.White, modifier = Modifier.weight(0.7f))
                        }
                        list.forEachIndexed { index, row ->
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(vertical = 8.dp, horizontal = 6.dp)
                                    .background(if (index % 2 == 0) Color(0xFFF9F9F9) else Color.White),
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Text("${row.dia}", style = MaterialTheme.typography.bodySmall, modifier = Modifier.weight(0.6f), color = Color.Black)
                                Text(row.semana, style = MaterialTheme.typography.bodySmall, modifier = Modifier.weight(0.5f), color = Color.Black)
                                Text(row.entrada ?: "—", style = MaterialTheme.typography.bodySmall, modifier = Modifier.weight(0.9f), color = Color.Black)
                                Text(row.saida ?: "—", style = MaterialTheme.typography.bodySmall, modifier = Modifier.weight(0.9f), color = Color.Black)
                                Text(row.intervaloInicio ?: "—", style = MaterialTheme.typography.bodySmall, modifier = Modifier.weight(0.9f), color = Color.Black)
                                Text(row.intervaloFim ?: "—", style = MaterialTheme.typography.bodySmall, modifier = Modifier.weight(0.9f), color = Color.Black)
                                Text(row.totalHoras ?: "—", style = MaterialTheme.typography.bodySmall, modifier = Modifier.weight(0.7f), color = Color.Black)
                            }
                        }
                        if (list.isNotEmpty()) {
                            val totalMin = list.sumOf { it.totalMinutos }
                            val h = totalMin / 60
                            val min = totalMin % 60
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .background(MaterialTheme.colorScheme.primary)
                                    .padding(16.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text("Total do Mês:", style = MaterialTheme.typography.titleMedium, color = Color.White)
                                Text("${h}h ${min}min", style = MaterialTheme.typography.titleMedium, color = Color.White)
                            }
                        }
                        if (list.isEmpty()) {
                            Box(modifier = Modifier.fillMaxWidth().padding(32.dp), contentAlignment = Alignment.Center) {
                                Text("Nenhum registro de ponto encontrado para este mês.", style = MaterialTheme.typography.bodyMedium, color = Color.DarkGray)
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun ManifestacaoScreen(
    funcionario: Funcionario,
    onDismiss: () -> Unit,
    onSuccess: () -> Unit,
    onError: (String) -> Unit
) {
    var tipoSelecionado by mutableStateOf("ELOGIO")
    var mensagem by mutableStateOf("")
    var sending by mutableStateOf(false)
    val scope = rememberCoroutineScope()

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black.copy(alpha = 0.5f))
            .padding(24.dp),
        contentAlignment = Alignment.Center
    ) {
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
        ) {
            Column(modifier = Modifier.padding(20.dp)) {
                Text("Central de Atendimento ao Funcionário", style = MaterialTheme.typography.titleLarge)
                Text("Registre elogio, sugestão ou denúncia.", style = MaterialTheme.typography.bodySmall)
                Spacer(modifier = Modifier.height(20.dp))
                Text("Tipo", style = MaterialTheme.typography.titleSmall)
                Spacer(modifier = Modifier.height(8.dp))
                listOf(
                    "ELOGIO" to "Elogio",
                    "SUGESTAO" to "Sugestão",
                    "DENUNCIA" to "Denúncia"
                ).forEach { (value, label) ->
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 4.dp)
                            .clickable { tipoSelecionado = value },
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Box(
                            modifier = Modifier
                                .padding(end = 12.dp)
                                .height(24.dp)
                                .padding(2.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            if (tipoSelecionado == value) {
                                Icon(Icons.Default.CheckCircle, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
                            } else {
                                Icon(Icons.Default.CheckCircle, contentDescription = null, tint = MaterialTheme.colorScheme.outline)
                            }
                        }
                        Text(label, style = MaterialTheme.typography.bodyLarge)
                    }
                }
                Spacer(modifier = Modifier.height(16.dp))
                OutlinedTextField(
                    value = mensagem,
                    onValueChange = { mensagem = it },
                    label = { Text("Mensagem (mín. 10 caracteres)") },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(120.dp),
                    minLines = 3,
                    maxLines = 5
                )
                Spacer(modifier = Modifier.height(20.dp))
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
                    TextButton(onClick = onDismiss) { Text("Cancelar") }
                    Spacer(modifier = Modifier.padding(8.dp))
                    Button(
                        onClick = {
                            if (mensagem.trim().length < 10) {
                                onError("A mensagem deve ter pelo menos 10 caracteres.")
                                return@Button
                            }
                            sending = true
                            scope.launch {
                                val result = withContext(Dispatchers.IO) {
                                    runCatching {
                                        val api = ApiModule.api()
                                        val cpfClean = funcionario.cpf.replace(Regex("\\D"), "")
                                        val req = ManifestacaoRequest(
                                            tipo = tipoSelecionado,
                                            mensagem = mensagem.trim(),
                                            funcionarioNome = funcionario.nome,
                                            funcionarioCpf = cpfClean,
                                            grupoId = funcionario.grupo.id,
                                            unidadeId = funcionario.unidade.id
                                        )
                                        val res = api.criarManifestacao(req)
                                        if (res.isSuccessful && res.body()?.ok == true) true else res.errorBody()?.string() ?: "Erro ao enviar"
                                    }
                                }
                                sending = false
                                when (val v = result.getOrNull()) {
                                    true -> onSuccess()
                                    is String -> onError(v)
                                    else -> onError("Erro ao enviar manifestação.")
                                }
                            }
                        },
                        enabled = !sending
                    ) {
                        Text(if (sending) "Enviando..." else "Enviar")
                    }
                }
            }
        }
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
            var loc = Tasks.await(fused.lastLocation)
            if (loc == null) {
                loc = suspendCancellableCoroutine { cont ->
                    val cts = com.google.android.gms.tasks.CancellationTokenSource()
                    val request = CurrentLocationRequest.Builder().setPriority(Priority.PRIORITY_HIGH_ACCURACY).build()
                    fused.getCurrentLocation(request, cts.token)
                        .addOnSuccessListener { cont.resume(it) }
                        .addOnFailureListener { cont.resume(null) }
                    cont.invokeOnCancellation { cts.cancel() }
                }
            }
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
