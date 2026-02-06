package com.kl.adm.ui.screens

import android.Manifest
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.net.Uri
import android.util.Base64
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
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Camera
import androidx.compose.material.icons.filled.Close
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
import androidx.compose.material3.SnackbarDuration
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import com.kl.adm.ui.views.SignatureView
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import com.kl.adm.data.model.AnswerPayload
import com.kl.adm.data.model.ChecklistEscopoDetalhesResponse
import com.kl.adm.data.model.GrupoPerguntas
import com.kl.adm.data.model.PerguntaDetalhe
import com.kl.adm.data.model.RascunhoData
import com.kl.adm.data.repository.ChecklistRepository
import com.kl.adm.ui.theme.KLBlue
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.ByteArrayOutputStream
import java.io.File

private sealed class ChecklistStep {
    data class Pergunta(val grupo: GrupoPerguntas, val pergunta: PerguntaDetalhe) : ChecklistStep()
    data object Observacoes : ChecklistStep()
    data object Finalizar : ChecklistStep()
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ChecklistDetailScreen(
    escopoId: String,
    checklistRepository: ChecklistRepository,
    onBack: () -> Unit
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    var escopoDetail by remember { mutableStateOf<ChecklistEscopoDetalhesResponse?>(null) }
    var rascunho by remember { mutableStateOf<RascunhoData?>(null) }
    var respostaId by remember { mutableStateOf<String?>(null) }
    val booleanAnswers = remember { mutableStateMapOf<String, Boolean>() }
    val textAnswers = remember { mutableStateMapOf<String, String>() }
    val notaAnswers = remember { mutableStateMapOf<String, Int>() }
    val motivoNaoConformidade = remember { mutableStateMapOf<String, String>() }
    var optionalPhotoFiles by remember { mutableStateOf<Map<String, List<File>>>(emptyMap()) }
    var observacoes by remember { mutableStateOf("") }
    var saving by remember { mutableStateOf(false) }
    var signatureViewRef by remember { mutableStateOf<SignatureView?>(null) }
    var selfieFile by remember { mutableStateOf<File?>(null) }
    var pendingPhotoPerguntaId by remember { mutableStateOf<String?>(null) }
    var pendingPhotoFile by remember { mutableStateOf<File?>(null) }
    var pendingCameraUri by remember { mutableStateOf<Uri?>(null) }
    val snackbarHostState = remember { SnackbarHostState() }
    var currentStep by remember { mutableStateOf(0) }
    val steps = remember(escopoDetail) {
        escopoDetail?.escopo?.template?.grupos?.sortedBy { it.ordem }?.flatMap { grupo ->
            grupo.perguntas.sortedBy { it.ordem }.map { ChecklistStep.Pergunta(grupo, it) }
        }.orEmpty() + ChecklistStep.Observacoes + ChecklistStep.Finalizar
    }
    val takePictureLauncher = rememberLauncherForActivityResult(ActivityResultContracts.TakePicture()) { success ->
        if (!success) return@rememberLauncherForActivityResult
        if (pendingPhotoPerguntaId != null && pendingPhotoFile != null) {
            val id = pendingPhotoPerguntaId!!
            optionalPhotoFiles = optionalPhotoFiles + (id to (optionalPhotoFiles[id].orEmpty() + pendingPhotoFile!!))
            pendingPhotoPerguntaId = null
            pendingPhotoFile = null
        } else if (selfieFile != null) {
            scope.launch {
                saving = true
                val esc = escopoDetail ?: return@launch
                val answers = buildAnswers(esc, booleanAnswers.toMap(), textAnswers.toMap(), notaAnswers.toMap(), motivoNaoConformidade.toMap())
                val sigBase64 = signatureViewRef?.takeIf { it.hasSignature() }?.getSignatureBitmap()?.let { bitmapToBase64(it) }
                val result = withContext(Dispatchers.IO) {
                    checklistRepository.submitResposta(
                        escopoId = esc.escopo.id,
                        answers = answers,
                        observacoes = observacoes.ifBlank { null },
                        isDraft = false,
                        respostaId = respostaId,
                        assinaturaGerenteDataUrl = sigBase64,
                        selfieFile = selfieFile,
                        optionalPhotoFiles = optionalPhotoFiles
                    )
                }
                saving = false
                result.onSuccess { onBack() }.onFailure { error = it.message }
            }
        }
    }
    val permissionLauncher = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
        if (granted && pendingCameraUri != null) {
            takePictureLauncher.launch(pendingCameraUri!!)
            pendingCameraUri = null
        } else if (!granted) {
            scope.launch { snackbarHostState.showSnackbar("Permissão de câmera necessária para anexar fotos.", duration = SnackbarDuration.Short) }
            pendingCameraUri = null
        }
    }

    LaunchedEffect(escopoId) {
        loading = true
        checklistRepository.escopo(escopoId).onSuccess { escopoDetail = it }.onFailure { error = it.message }
        checklistRepository.rascunho(escopoId).onSuccess { resp ->
            resp.rascunho?.let { r ->
                rascunho = r
                respostaId = r.id
                observacoes = r.observacoes ?: ""
                r.respostas.forEach { item ->
                    item.valorBoolean?.let { v -> booleanAnswers[item.perguntaId] = v }
                    item.valorTexto?.let { v -> textAnswers[item.perguntaId] = v }
                    item.observacao?.let { v -> motivoNaoConformidade[item.perguntaId] = v }
                    item.nota?.toInt()?.let { n -> notaAnswers[item.perguntaId] = n }
                }
            }
        }
        loading = false
    }

    Scaffold(
        snackbarHost = { SnackbarHost(snackbarHostState) },
        topBar = {
            TopAppBar(
                title = { Text(escopoDetail?.escopo?.template?.titulo ?: "Checklist") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Voltar")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = KLBlue, titleContentColor = Color.White, navigationIconContentColor = Color.White)
            )
        }
    ) { padding ->
        when {
            loading -> Box(Modifier.fillMaxSize().background(MaterialTheme.colorScheme.surface).padding(padding), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = KLBlue)
            }
            error != null -> Box(Modifier.fillMaxSize().background(MaterialTheme.colorScheme.surface).padding(padding), contentAlignment = Alignment.Center) {
                Text(error!!, color = MaterialTheme.colorScheme.error)
            }
            escopoDetail == null -> Unit
            steps.isEmpty() -> Unit
            else -> {
                val step = steps[currentStep]
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(MaterialTheme.colorScheme.surface)
                        .padding(padding)
                        .padding(16.dp)
                ) {
                    Text(
                        "Pergunta ${currentStep + 1} de ${steps.size}",
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.padding(bottom = 8.dp)
                    )
                    when (val s = step) {
                        is ChecklistStep.Pergunta -> {
                            Card(Modifier.fillMaxWidth().weight(1f), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f))) {
                                Column(Modifier.padding(16.dp).verticalScroll(rememberScrollState())) {
                                    Text(s.grupo.titulo, style = MaterialTheme.typography.titleSmall, modifier = Modifier.padding(bottom = 8.dp))
                                    if (s.pergunta.tipo == "TEXTO") {
                                        TextQuestionField(
                                            pergunta = s.pergunta,
                                            textValue = textAnswers[s.pergunta.id] ?: "",
                                            onTextChange = { textAnswers[s.pergunta.id] = it }
                                        )
                                    } else {
                                    QuestionField(
                                        pergunta = s.pergunta,
                                        conforme = booleanAnswers[s.pergunta.id],
                                        onConformeChange = { v -> booleanAnswers[s.pergunta.id] = v },
                                        motivoNaoConformidade = motivoNaoConformidade[s.pergunta.id] ?: "",
                                        onMotivoChange = { motivoNaoConformidade[s.pergunta.id] = it },
                                        optionalPhotoFiles = optionalPhotoFiles[s.pergunta.id] ?: emptyList(),
                                        onAddPhoto = {
                                            try {
                                                val list = optionalPhotoFiles[s.pergunta.id] ?: emptyList()
                                                val f = File(context.cacheDir, "anexo_${s.pergunta.id}_${list.size}.jpg")
                                                pendingPhotoPerguntaId = s.pergunta.id
                                                pendingPhotoFile = f
                                                val uri = FileProvider.getUriForFile(context, "${context.packageName}.fileprovider", f)
                                                if (ContextCompat.checkSelfPermission(context, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED) {
                                                    takePictureLauncher.launch(uri)
                                                } else {
                                                    pendingCameraUri = uri
                                                    permissionLauncher.launch(Manifest.permission.CAMERA)
                                                }
                                            } catch (e: Exception) {
                                                scope.launch { snackbarHostState.showSnackbar("Erro ao abrir câmera: ${e.message}") }
                                            }
                                        },
                                        onRemovePhoto = { index ->
                                            val list = (optionalPhotoFiles[s.pergunta.id] ?: emptyList()).toMutableList()
                                            if (index in list.indices) {
                                                list.removeAt(index)
                                                optionalPhotoFiles = optionalPhotoFiles + (s.pergunta.id to list)
                                            }
                                        },
                                        notaValue = notaAnswers[s.pergunta.id],
                                        onNotaChange = { v -> if (v != null) notaAnswers[s.pergunta.id] = v else notaAnswers.remove(s.pergunta.id) }
                                    )
                                    }
                                }
                            }
                        }
                        is ChecklistStep.Observacoes -> {
                            Card(Modifier.fillMaxWidth().weight(1f), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f))) {
                                Column(Modifier.padding(16.dp)) {
                                    Text("Observações", style = MaterialTheme.typography.titleSmall, modifier = Modifier.padding(bottom = 8.dp))
                                    OutlinedTextField(
                                        value = observacoes,
                                        onValueChange = { observacoes = it },
                                        modifier = Modifier.fillMaxWidth(),
                                        minLines = 4
                                    )
                                }
                            }
                        }
                        is ChecklistStep.Finalizar -> {
                            Card(Modifier.fillMaxWidth().weight(1f), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f))) {
                                Column(Modifier.padding(16.dp)) {
                                    Text("Assinatura do gerente", style = MaterialTheme.typography.titleMedium, modifier = Modifier.padding(bottom = 4.dp))
                                    Text("Desenhe abaixo e depois tire sua foto para identificar.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(bottom = 8.dp))
                                    AndroidView(
                                        factory = { ctx -> SignatureView(ctx) },
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .height(200.dp)
                                            .background(Color.White),
                                        update = { signatureViewRef = it }
                                    )
                                    Row(Modifier.fillMaxWidth().padding(top = 8.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                        androidx.compose.material3.TextButton(onClick = { signatureViewRef?.clearCanvas() }) {
                                            Text("Limpar assinatura")
                                        }
                                    }
                                    Spacer(Modifier.height(16.dp))
                                    Button(
                                        onClick = {
                                            selfieFile = File(context.cacheDir, "selfie_${System.currentTimeMillis()}.jpg")
                                            val uri = FileProvider.getUriForFile(context, "${context.packageName}.fileprovider", selfieFile!!)
                                            if (ContextCompat.checkSelfPermission(context, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED) {
                                                takePictureLauncher.launch(uri)
                                            } else {
                                                pendingCameraUri = uri
                                                permissionLauncher.launch(Manifest.permission.CAMERA)
                                            }
                                        },
                                        modifier = Modifier.fillMaxWidth(),
                                        enabled = !saving
                                    ) { Text("Tirar foto do supervisor (identificação)") }
                                }
                            }
                        }
                    }
                    Row(Modifier.fillMaxWidth().padding(top = 16.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        if (step !is ChecklistStep.Finalizar) {
                            androidx.compose.material3.TextButton(onClick = {
                                scope.launch {
                                    saving = true
                                    val esc = escopoDetail!!
                                    val answers = buildAnswers(esc, booleanAnswers.toMap(), textAnswers.toMap(), notaAnswers.toMap(), motivoNaoConformidade.toMap())
                                    withContext(Dispatchers.IO) {
                                        checklistRepository.submitResposta(escopoId = esc.escopo.id, answers = answers, observacoes = observacoes.ifBlank { null }, isDraft = true, respostaId = respostaId, optionalPhotoFiles = optionalPhotoFiles)
                                    }.onSuccess {
                                        respostaId = null
                                        scope.launch { snackbarHostState.showSnackbar("Rascunho salvo.", duration = SnackbarDuration.Short) }
                                    }.onFailure { error = it.message }
                                    saving = false
                                }
                            }) { Text("Salvar rascunho") }
                        }
                        if (currentStep > 0) {
                            Button(onClick = { currentStep-- }, modifier = Modifier.weight(1f).widthIn(min = 96.dp), colors = androidx.compose.material3.ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)) {
                                Text("Anterior", maxLines = 1)
                            }
                        }
                        when (step) {
                            is ChecklistStep.Finalizar -> {
                                Button(
                                    onClick = {
                                        scope.launch {
                                            saving = true
                                            val esc = escopoDetail!!
                                            val answers = buildAnswers(esc, booleanAnswers.toMap(), textAnswers.toMap(), notaAnswers.toMap(), motivoNaoConformidade.toMap())
                                            val sigBase64 = signatureViewRef?.takeIf { it.hasSignature() }?.getSignatureBitmap()?.let { bitmapToBase64(it) }
                                            withContext(Dispatchers.IO) {
                                                    checklistRepository.submitResposta(
                                                        escopoId = esc.escopo.id,
                                                        answers = answers,
                                                        observacoes = observacoes.ifBlank { null },
                                                        isDraft = false,
                                                        respostaId = respostaId,
                                                        assinaturaGerenteDataUrl = sigBase64,
                                                        selfieFile = selfieFile,
                                                        optionalPhotoFiles = optionalPhotoFiles
                                                    )
                                            }.onSuccess { onBack() }.onFailure { error = it.message }
                                            saving = false
                                        }
                                    },
                                    enabled = !saving,
                                    modifier = Modifier.weight(1f),
                                    colors = androidx.compose.material3.ButtonDefaults.buttonColors(containerColor = KLBlue)
                                ) { Text("Enviar relatório") }
                            }
                            else -> Button(onClick = { currentStep++ }, modifier = Modifier.weight(1f).widthIn(min = 96.dp), colors = androidx.compose.material3.ButtonDefaults.buttonColors(containerColor = KLBlue)) {
                                Text("Próximo", maxLines = 1)
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun TextQuestionField(
    pergunta: PerguntaDetalhe,
    textValue: String,
    onTextChange: (String) -> Unit
) {
    Column(Modifier.padding(vertical = 6.dp)) {
        Text(pergunta.titulo, style = MaterialTheme.typography.bodyMedium)
        Text("Conforme", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(top = 4.dp))
        Text("Informe o texto abaixo para constar no relatório (PDF):", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(top = 2.dp))
        OutlinedTextField(
            value = textValue,
            onValueChange = onTextChange,
            modifier = Modifier.fillMaxWidth().padding(top = 8.dp),
            minLines = 3,
            placeholder = { Text("Digite aqui...") }
        )
    }
}

@Composable
private fun QuestionField(
    pergunta: PerguntaDetalhe,
    conforme: Boolean?,
    onConformeChange: (Boolean) -> Unit,
    motivoNaoConformidade: String,
    onMotivoChange: (String) -> Unit,
    optionalPhotoFiles: List<File>,
    onAddPhoto: () -> Unit,
    onRemovePhoto: (Int) -> Unit,
    notaValue: Int?,
    onNotaChange: (Int?) -> Unit
) {
    Column(Modifier.padding(vertical = 6.dp)) {
        Text(pergunta.titulo, style = MaterialTheme.typography.bodyMedium)
        Text("Conforme / Não conforme", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(top = 4.dp))
        Row(verticalAlignment = Alignment.CenterVertically) {
            RadioButton(selected = conforme == true, onClick = { onConformeChange(true) })
            Text("Conforme")
            RadioButton(selected = conforme == false, onClick = { onConformeChange(false) })
            Text("Não conforme")
        }
        if (conforme == false) {
            OutlinedTextField(
                value = motivoNaoConformidade,
                onValueChange = onMotivoChange,
                label = { Text("Motivo da não conformidade") },
                modifier = Modifier.fillMaxWidth().padding(top = 4.dp),
                minLines = 2
            )
        }
        Spacer(Modifier.height(8.dp))
        Text("Anexar foto (opcional)", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
            optionalPhotoFiles.forEachIndexed { index, _ ->
                Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(end = 4.dp)) {
                    Text("Foto ${index + 1}", style = MaterialTheme.typography.bodySmall)
                    IconButton(onClick = { onRemovePhoto(index) }, modifier = Modifier.size(32.dp)) {
                        Icon(Icons.Filled.Close, contentDescription = "Remover", modifier = Modifier.size(18.dp))
                    }
                }
            }
            IconButton(onClick = onAddPhoto) {
                Icon(Icons.Default.Camera, contentDescription = "Anexar foto")
            }
        }
        Spacer(Modifier.height(12.dp))
        Text("Nota (como está a loja?)", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
            listOf(1 to "Ruim", 2 to "Regular", 3 to "Bom", 4 to "Muito bom", 5 to "Excelente").forEach { (n, label) ->
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    RadioButton(selected = notaValue == n, onClick = { onNotaChange(if (notaValue == n) null else n) })
                    Text("$n", style = MaterialTheme.typography.labelSmall)
                    Text(label, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
        }
    }
}

private fun bitmapToBase64(bitmap: Bitmap): String? {
    return try {
        val baos = ByteArrayOutputStream()
        bitmap.compress(Bitmap.CompressFormat.JPEG, 80, baos)
        "data:image/jpeg;base64," + Base64.encodeToString(baos.toByteArray(), Base64.NO_WRAP)
    } catch (_: Exception) { null }
}

private fun buildAnswers(
    esc: ChecklistEscopoDetalhesResponse,
    booleanAnswers: Map<String, Boolean>,
    textAnswers: Map<String, String>,
    notaAnswers: Map<String, Int>,
    motivoNaoConformidade: Map<String, String>
): List<AnswerPayload> {
    return esc.escopo.template.grupos.flatMap { it.perguntas }.map { p ->
        when (p.tipo) {
            "TEXTO" -> {
                val texto = textAnswers[p.id].orEmpty().trim().takeIf { it.isNotBlank() }
                AnswerPayload(
                    perguntaId = p.id,
                    tipo = p.tipo,
                    valorTexto = texto,
                    valorBoolean = texto != null,
                    observacao = null,
                    nota = null
                )
            }
            else -> {
                val conforme = booleanAnswers[p.id]
                val motivo = if (conforme == false) motivoNaoConformidade[p.id].orEmpty().takeIf { it.isNotBlank() } else null
                AnswerPayload(
                    perguntaId = p.id,
                    tipo = p.tipo,
                    valorBoolean = conforme,
                    observacao = motivo,
                    nota = notaAnswers[p.id]?.toDouble()
                )
            }
        }
    }
}
