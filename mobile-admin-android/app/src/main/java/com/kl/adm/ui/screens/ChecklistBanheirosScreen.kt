package com.kl.adm.ui.screens

import android.Manifest
import android.content.pm.PackageManager
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.clickable
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Camera
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.RadioButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
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
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import com.kl.adm.data.model.ChecklistUnidadeItem
import com.kl.adm.data.repository.ChecklistRepository
import com.kl.adm.ui.theme.KLBlue
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.io.File

private val TIPOS = listOf("LIMPEZA", "INSUMOS", "SATISFACAO")
private val SERVICOS_LIMPEZA = listOf("LIMPEZA", "RETIRADA_LIXO")
private val INSUMOS = listOf("ALCOOL_HIGIENIZACAO", "PAPEL_HIGIENICO", "PAPEL_TOALHA", "SABONETE")
private val AVALIACOES = listOf("MUITO_RUIM", "RUIM", "REGULAR", "BOM", "MUITO_BOM")
private val FATORES = listOf("CHEIRO", "DISPONIBILIDADE_INSUMOS", "LIMPEZA_SUPERFICIES", "POSTURA_EQUIPE", "RECOLHIMENTO_LIXO")

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ChecklistBanheirosScreen(
    checklistRepository: ChecklistRepository,
    onBack: () -> Unit
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    var unidades by remember { mutableStateOf<List<ChecklistUnidadeItem>>(emptyList()) }
    var selectedUnidade by remember { mutableStateOf<ChecklistUnidadeItem?>(null) }
    var selectedTipo by remember { mutableStateOf<String?>(null) }
    var servicosLimpeza by remember { mutableStateOf(setOf<String>()) }
    var insumos by remember { mutableStateOf(setOf<String>()) }
    var avaliacao by remember { mutableStateOf<String?>(null) }
    var fatores by remember { mutableStateOf(setOf<String>()) }
    var comentarios by remember { mutableStateOf("") }
    var fotoFile by remember { mutableStateOf<File?>(null) }
    var pendingCameraUri by remember { mutableStateOf<Uri?>(null) }
    var submitting by remember { mutableStateOf(false) }
    var success by remember { mutableStateOf(false) }

    val takePictureLauncher = rememberLauncherForActivityResult(ActivityResultContracts.TakePicture()) { success ->
        if (success) { /* fotoFile already set */ }
    }
    val permissionLauncher = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
        if (granted && pendingCameraUri != null) {
            takePictureLauncher.launch(pendingCameraUri!!)
            pendingCameraUri = null
        } else {
            pendingCameraUri = null
        }
    }

    LaunchedEffect(Unit) {
        loading = true
        checklistRepository.unidadesBanheiros()
            .onSuccess { resp -> unidades = resp.data ?: emptyList() }
            .onFailure { error = it.message }
        loading = false
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Checklist Banheiros") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Voltar")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = KLBlue, titleContentColor = androidx.compose.ui.graphics.Color.White, navigationIconContentColor = androidx.compose.ui.graphics.Color.White)
            )
        }
    ) { padding ->
        when {
            loading -> Column(Modifier.fillMaxSize().background(MaterialTheme.colorScheme.surface).padding(padding), verticalArrangement = Arrangement.Center, horizontalAlignment = Alignment.CenterHorizontally) {
                CircularProgressIndicator(color = KLBlue)
            }
            error != null -> Column(Modifier.fillMaxSize().background(MaterialTheme.colorScheme.surface).padding(padding), verticalArrangement = Arrangement.Center, horizontalAlignment = Alignment.CenterHorizontally) {
                Text(error!!, color = MaterialTheme.colorScheme.error)
            }
            else -> Column(
                modifier = Modifier
                    .fillMaxSize()
                    .background(MaterialTheme.colorScheme.surface)
                    .padding(padding)
                    .verticalScroll(rememberScrollState())
                    .padding(16.dp)
            ) {
                Text("Unidade", style = MaterialTheme.typography.titleSmall)
                LazyColumn(verticalArrangement = Arrangement.spacedBy(4.dp), contentPadding = PaddingValues(vertical = 8.dp)) {
                    items(unidades) { u ->
                        Card(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable { selectedUnidade = u },
                            colors = CardDefaults.cardColors(containerColor = if (selectedUnidade?.id == u.id) KLBlue.copy(alpha = 0.2f) else MaterialTheme.colorScheme.surface)
                        ) {
                            Text(u.nome, modifier = Modifier.padding(12.dp))
                        }
                    }
                }
                Spacer(Modifier.height(16.dp))
                Text("Tipo", style = MaterialTheme.typography.titleSmall)
                TIPOS.forEach { tipo ->
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        RadioButton(selected = selectedTipo == tipo, onClick = { selectedTipo = tipo })
                        Text(tipo)
                    }
                }
                when (selectedTipo) {
                    "LIMPEZA" -> {
                        Text("Serviços de limpeza", style = MaterialTheme.typography.titleSmall)
                        SERVICOS_LIMPEZA.forEach { s ->
                            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                                Switch(checked = s in servicosLimpeza, onCheckedChange = { checked -> servicosLimpeza = if (checked) servicosLimpeza + s else servicosLimpeza - s })
                                Text(s)
                            }
                        }
                    }
                    "INSUMOS" -> {
                        Text("Insumos solicitados", style = MaterialTheme.typography.titleSmall)
                        INSUMOS.forEach { s ->
                            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                                Switch(checked = s in insumos, onCheckedChange = { checked -> insumos = if (checked) insumos + s else insumos - s })
                                Text(s)
                            }
                        }
                    }
                    "SATISFACAO" -> {
                        Text("Avaliação limpeza", style = MaterialTheme.typography.titleSmall)
                        AVALIACOES.forEach { a ->
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                RadioButton(selected = avaliacao == a, onClick = { avaliacao = a })
                                Text(a)
                            }
                        }
                        Text("Fatores de influência", style = MaterialTheme.typography.titleSmall)
                        FATORES.forEach { f ->
                            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                                Switch(checked = f in fatores, onCheckedChange = { checked -> fatores = if (checked) fatores + f else fatores - f })
                                Text(f)
                            }
                        }
                        OutlinedTextField(
                            value = comentarios,
                            onValueChange = { comentarios = it },
                            label = { Text("Comentários") },
                            modifier = Modifier.fillMaxWidth()
                        )
                    }
                }
                Spacer(Modifier.height(16.dp))
                Text("Foto (opcional)", style = MaterialTheme.typography.titleSmall)
                IconButton(onClick = {
                    fotoFile = File(context.cacheDir, "banheiros_${System.currentTimeMillis()}.jpg")
                    val uri = FileProvider.getUriForFile(context, "${context.packageName}.fileprovider", fotoFile!!)
                    if (ContextCompat.checkSelfPermission(context, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED) {
                        takePictureLauncher.launch(uri)
                    } else {
                        pendingCameraUri = uri
                        permissionLauncher.launch(Manifest.permission.CAMERA)
                    }
                }) {
                    Icon(Icons.Default.Camera, contentDescription = "Tirar foto")
                }
                if (fotoFile != null) Text("Foto anexada", style = MaterialTheme.typography.bodySmall)
                Spacer(Modifier.height(24.dp))
                Button(
                    onClick = {
                        val unidade = selectedUnidade
                        val tipo = selectedTipo
                        if (unidade == null || tipo == null) {
                            error = "Selecione unidade e tipo"
                            return@Button
                        }
                        when (tipo) {
                            "LIMPEZA" -> if (servicosLimpeza.isEmpty()) { error = "Selecione ao menos um serviço"; return@Button }
                            "INSUMOS" -> if (insumos.isEmpty()) { error = "Selecione ao menos um insumo"; return@Button }
                            "SATISFACAO" -> if (avaliacao == null) { error = "Selecione avaliação"; return@Button }
                        }
                        scope.launch {
                            submitting = true
                            val data = JSONObject()
                            when (tipo) {
                                "LIMPEZA" -> data.put("servicosLimpeza", org.json.JSONArray(servicosLimpeza.toList()))
                                "INSUMOS" -> data.put("insumosSolicitados", org.json.JSONArray(insumos.toList()))
                                "SATISFACAO" -> {
                                    data.put("avaliacaoLimpeza", avaliacao)
                                    data.put("fatoresInfluencia", org.json.JSONArray(fatores.toList()))
                                    if (comentarios.isNotBlank()) data.put("comentarios", comentarios.trim())
                                }
                            }
                            val result = withContext(Dispatchers.IO) {
                                checklistRepository.submitChecklistBanheiros(
                                    unidadeId = unidade.id,
                                    tipo = tipo,
                                    dataJson = data.toString(),
                                    fotoFile = fotoFile
                                )
                            }
                            submitting = false
                            result.onSuccess { success = true }.onFailure { error = it.message }
                        }
                    },
                    modifier = Modifier.fillMaxWidth(),
                    enabled = !submitting
                ) {
                    Text(if (submitting) "Enviando..." else "Enviar")
                }
                if (success) Text("Enviado com sucesso!", color = MaterialTheme.colorScheme.primary, modifier = Modifier.padding(8.dp))
            }
        }
    }
}
