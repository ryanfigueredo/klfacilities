package com.kl.adm.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
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
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.launch
import com.kl.adm.data.model.ChecklistEscopo
import com.kl.adm.data.model.RespostaConcluida
import com.kl.adm.data.model.RespostaRascunho
import com.kl.adm.data.repository.ChecklistRepository
import com.kl.adm.ui.theme.KLBlue

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ChecklistsScreen(
    checklistRepository: ChecklistRepository,
    onBack: () -> Unit,
    onOpenEscopo: (String) -> Unit,
    onIniciarChecklist: () -> Unit
) {
    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    var escopos by remember { mutableStateOf<List<ChecklistEscopo>>(emptyList()) }
    var rascunhos by remember { mutableStateOf<List<RespostaRascunho>>(emptyList()) }
    var respondidos by remember { mutableStateOf<List<RespostaConcluida>>(emptyList()) }
    val scope = rememberCoroutineScope()

    LaunchedEffect(Unit) {
        loading = true
        checklistRepository.pendentes().onSuccess { escopos = it.escopos }.onFailure { error = it.message }
        checklistRepository.emAberto().onSuccess { rascunhos = it.respostas }
        checklistRepository.respondidos().onSuccess { respondidos = it.respostas }
        loading = false
    }

    // Agrupar pendentes por grupo e depois por unidade (conforme acesso do supervisor)
    val pendentesByGrupoUnidade: Map<String, Map<String, List<ChecklistEscopo>>> = remember(escopos) {
        escopos
            .groupBy { it.grupo?.nome ?: "Sem grupo" }
            .mapValues { (_, list) -> list.groupBy { it.unidade?.nome ?: "Sem unidade" } }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Checklists") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Voltar")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = KLBlue,
                    titleContentColor = androidx.compose.ui.graphics.Color.White,
                    navigationIconContentColor = androidx.compose.ui.graphics.Color.White
                )
            )
        }
    ) { padding ->
        when {
            loading -> Column(
                Modifier.fillMaxSize().background(MaterialTheme.colorScheme.surface).padding(padding),
                verticalArrangement = Arrangement.Center,
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                CircularProgressIndicator(color = KLBlue)
                Text("Carregando...", modifier = Modifier.padding(16.dp))
            }
            error != null -> Column(
                Modifier.fillMaxSize().background(MaterialTheme.colorScheme.surface).padding(padding),
                verticalArrangement = Arrangement.Center,
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
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
                // Iniciar Checklist + Checklist Banheiros (mesmo lugar)
                Button(
                    onClick = onIniciarChecklist,
                    modifier = Modifier.fillMaxWidth(),
                    colors = androidx.compose.material3.ButtonDefaults.buttonColors(containerColor = KLBlue)
                ) {
                    Icon(Icons.Default.Add, contentDescription = null, modifier = Modifier.padding(end = 8.dp))
                    Text("Iniciar Checklist")
                }

                // Rascunhos — sempre mostrar a seção para o usuário saber onde achar
                Text(
                    "Rascunhos",
                    style = MaterialTheme.typography.titleSmall,
                    modifier = Modifier.padding(top = 24.dp, bottom = 8.dp)
                )
                if (rascunhos.isEmpty()) {
                    Text(
                        "Nenhum rascunho. Use Iniciar Checklist ou toque em um pendente abaixo para começar.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.padding(vertical = 8.dp)
                    )
                } else {
                    Text(
                        "${rascunhos.size} em andamento — toque para continuar",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.padding(bottom = 4.dp)
                    )
                    rascunhos.forEach { rascunho ->
                        val escopoId = rascunho.escopoId
                        if (escopoId != null) {
                            Card(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(vertical = 4.dp)
                                    .clickable { onOpenEscopo(escopoId) },
                                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)),
                                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                            ) {
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(16.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(rascunho.template.titulo, style = MaterialTheme.typography.titleMedium)
                                        Text(rascunho.unidade.nome, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                        rascunho.grupo?.let { Text(it.nome, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant) }
                                        Text("Toque para continuar", style = MaterialTheme.typography.labelSmall, color = KLBlue, modifier = Modifier.padding(top = 4.dp))
                                    }
                                    IconButton(
                                        onClick = {
                                            scope.launch {
                                                checklistRepository.deleteRascunho(rascunho.id).onSuccess {
                                                    rascunhos = rascunhos.filter { it.id != rascunho.id }
                                                }.onFailure { }
                                            }
                                        },
                                        modifier = Modifier.padding(start = 8.dp)
                                    ) {
                                        Icon(Icons.Default.Delete, contentDescription = "Excluir rascunho", tint = MaterialTheme.colorScheme.error)
                                    }
                                }
                            }
                        }
                    }
                }

                // Pendentes — separados por grupos e unidades
                Text(
                    "Pendentes",
                    style = MaterialTheme.typography.titleSmall,
                    modifier = Modifier.padding(top = 24.dp, bottom = 8.dp)
                )
                if (escopos.isEmpty()) {
                    Text(
                        "Nenhum checklist pendente.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.padding(vertical = 8.dp)
                    )
                } else {
                    pendentesByGrupoUnidade.forEach { (grupoNome, porUnidade) ->
                        Text(
                            "Grupo: $grupoNome",
                            style = MaterialTheme.typography.labelMedium,
                            color = MaterialTheme.colorScheme.primary,
                            modifier = Modifier.padding(top = 12.dp, bottom = 4.dp)
                        )
                        porUnidade.forEach { (unidadeNome, escoposList) ->
                            Text(
                                "Unidade: $unidadeNome",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.padding(PaddingValues(start = 8.dp, top = 6.dp, bottom = 4.dp))
                            )
                            escoposList.forEach { escopo ->
                                Card(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(PaddingValues(start = 16.dp, top = 4.dp, bottom = 4.dp))
                                        .clickable { onOpenEscopo(escopo.id) },
                                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                                    elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                                ) {
                                    Column(modifier = Modifier.padding(16.dp)) {
                                        Text(escopo.template.titulo, style = MaterialTheme.typography.titleMedium)
                                        escopo.unidade?.let { Text(it.nome, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant) }
                                        escopo.grupo?.let { Text(it.nome, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant) }
                                    }
                                }
                            }
                        }
                    }
                }

                // Concluídos
                Text(
                    "Concluídos (${respondidos.size})",
                    style = MaterialTheme.typography.titleSmall,
                    modifier = Modifier.padding(top = 24.dp, bottom = 8.dp)
                )
                if (respondidos.isEmpty()) {
                    Text(
                        "Nenhum checklist concluído.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.padding(vertical = 8.dp)
                    )
                } else {
                    respondidos.forEach { resp ->
                        Card(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 4.dp),
                            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f)),
                            elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
                        ) {
                            Column(modifier = Modifier.padding(16.dp)) {
                                Text(resp.template.titulo, style = MaterialTheme.typography.titleMedium)
                                Text(resp.unidade.nome, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                resp.grupo?.let { Text(it.nome, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant) }
                                resp.protocolo?.let { Text("Protocolo: $it", style = MaterialTheme.typography.bodySmall) }
                            }
                        }
                    }
                }
            }
        }
    }
}
