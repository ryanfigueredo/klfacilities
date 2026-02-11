package com.kl.adm.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Check
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.kl.adm.data.model.GrupoOption
import com.kl.adm.data.model.TemplateOption
import com.kl.adm.data.model.UnidadeOption
import com.kl.adm.data.repository.ChecklistRepository
import com.kl.adm.ui.theme.KLBlue

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NovoChecklistScreen(
    checklistRepository: ChecklistRepository,
    onBack: () -> Unit,
    onOpenEscopo: (String) -> Unit
) {
    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    var grupos by remember { mutableStateOf<List<GrupoOption>>(emptyList()) }
    var unidades by remember { mutableStateOf<List<UnidadeOption>>(emptyList()) }
    var templates by remember { mutableStateOf<List<TemplateOption>>(emptyList()) }
    var allowedUnidadeIds by remember { mutableStateOf<List<String>?>(null) }

    var selectedGrupoId by remember { mutableStateOf<String?>(null) }
    var selectedUnidadeId by remember { mutableStateOf<String?>(null) }
    var selectedTemplateId by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(Unit) {
        loading = true
        checklistRepository.options()
            .onSuccess { opt ->
                grupos = opt.grupos
                val rawUnidades = opt.unidades
                allowedUnidadeIds = opt.allowedUnidadeIds
                unidades = if (!opt.allowedUnidadeIds.isNullOrEmpty()) {
                    rawUnidades.filter { opt.allowedUnidadeIds!!.contains(it.id) }
                } else {
                    rawUnidades
                }
                templates = opt.templates
            }
            .onFailure { error = it.message ?: "Erro ao carregar opções" }
        loading = false
    }

    // Unidades filtradas pelo grupo selecionado (e pelo acesso do supervisor já está em unidades)
    val unidadesFiltradas = remember(unidades, selectedGrupoId) {
        val grupoId = selectedGrupoId ?: return@remember emptyList()
        unidades.filter { unidade ->
            unidade.grupos?.any { it.id == grupoId } == true
        }
    }

    // Templates que têm escopo ativo na unidade selecionada
    val templatesDaUnidade = remember(templates, selectedUnidadeId) {
        val unidadeId = selectedUnidadeId ?: return@remember emptyList()
        templates.filter { template ->
            template.escopos?.any { it.unidadeId == unidadeId && it.ativo != false } == true
        }
    }

    // Escopo para (unidade, template) selecionados
    // Ao trocar de grupo, limpar unidade/template se não pertencerem ao novo grupo
    LaunchedEffect(selectedGrupoId, unidadesFiltradas) {
        selectedUnidadeId?.let { uid ->
            if (unidadesFiltradas.none { it.id == uid }) {
                selectedUnidadeId = null
                selectedTemplateId = null
            }
        }
    }
    LaunchedEffect(selectedUnidadeId, templatesDaUnidade) {
        selectedTemplateId?.let { tid ->
            if (templatesDaUnidade.none { it.id == tid }) {
                selectedTemplateId = null
            }
        }
    }

    val escopoId = remember(selectedUnidadeId, selectedTemplateId, templatesDaUnidade) {
        val uid = selectedUnidadeId ?: return@remember null
        val template = templatesDaUnidade.find { it.id == selectedTemplateId } ?: return@remember null
        template.escopos?.find { it.unidadeId == uid }?.id
    }

    val podeAbrir = selectedGrupoId != null && selectedUnidadeId != null && escopoId != null

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Novo Checklist") },
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
                Text("Carregando opções...", modifier = Modifier.padding(16.dp))
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
                // Grupo
                Text("Grupo *", style = MaterialTheme.typography.titleSmall, modifier = Modifier.padding(top = 8.dp, bottom = 4.dp))
                Text("Selecione o grupo da unidade", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                if (grupos.isEmpty()) {
                    Text("Nenhum grupo disponível para você.", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(vertical = 12.dp))
                } else {
                    grupos.forEach { grupo ->
                        val selected = selectedGrupoId == grupo.id
                        Card(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 4.dp)
                                .then(if (selected) Modifier.border(2.dp, KLBlue) else Modifier)
                                .clickable { selectedGrupoId = grupo.id },
                            colors = CardDefaults.cardColors(containerColor = if (selected) KLBlue.copy(alpha = 0.12f) else MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f))
                        ) {
                            Text(grupo.nome, modifier = Modifier.padding(16.dp), style = MaterialTheme.typography.bodyLarge, color = if (selected) KLBlue else MaterialTheme.colorScheme.onSurface)
                        }
                    }
                }

                // Unidade (depende do grupo) — apenas unidades vinculadas ao supervisor
                Text("Unidade *", style = MaterialTheme.typography.titleSmall, modifier = Modifier.padding(top = 24.dp, bottom = 4.dp))
                Text("Selecione a unidade vinculada a você", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                when {
                    selectedGrupoId == null -> Text("Selecione um grupo primeiro.", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(vertical = 12.dp))
                    unidadesFiltradas.isEmpty() -> Text("Nenhuma unidade disponível para o grupo selecionado.", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(vertical = 12.dp))
                    else -> unidadesFiltradas.forEach { unidade ->
                        val selected = selectedUnidadeId == unidade.id
                        Card(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 4.dp)
                                .then(if (selected) Modifier.border(2.dp, KLBlue) else Modifier)
                                .clickable { selectedUnidadeId = unidade.id },
                            colors = CardDefaults.cardColors(containerColor = if (selected) KLBlue.copy(alpha = 0.12f) else MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f))
                        ) {
                            Column(modifier = Modifier.padding(16.dp)) {
                                Text(unidade.nome, style = MaterialTheme.typography.bodyLarge, color = if (selected) KLBlue else MaterialTheme.colorScheme.onSurface)
                                if (unidade.cidade != null || unidade.estado != null) {
                                    Text(
                                        listOfNotNull(unidade.cidade, unidade.estado).joinToString(" - "),
                                        style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                }
                            }
                        }
                    }
                }

                // Tipo de checklist (template) — depende da unidade
                if (selectedUnidadeId != null) {
                    Text("Tipo de Checklist *", style = MaterialTheme.typography.titleSmall, modifier = Modifier.padding(top = 24.dp, bottom = 4.dp))
                    when {
                        templatesDaUnidade.isEmpty() -> {
                            Text("Nenhum checklist disponível para esta unidade.", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.error, modifier = Modifier.padding(vertical = 12.dp))
                        }
                        templatesDaUnidade.size == 1 -> {
                            val t = templatesDaUnidade.single()
                            LaunchedEffect(t) { selectedTemplateId = t.id }
                            Card(
                                modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
                                colors = CardDefaults.cardColors(containerColor = KLBlue.copy(alpha = 0.08f))
                            ) {
                                Column(modifier = Modifier.padding(16.dp)) {
                                    Text(t.titulo, style = MaterialTheme.typography.titleMedium)
                                    t.descricao?.let { Text(it, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant) }
                                }
                            }
                        }
                        else -> {
                            templatesDaUnidade.forEach { template ->
                                val selected = selectedTemplateId == template.id
                                Card(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(vertical = 4.dp)
                                        .then(if (selected) Modifier.border(2.dp, KLBlue) else Modifier)
                                        .clickable { selectedTemplateId = template.id },
                                    colors = CardDefaults.cardColors(containerColor = if (selected) KLBlue.copy(alpha = 0.12f) else MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f))
                                ) {
                                    Column(modifier = Modifier.padding(16.dp)) {
                                        Text(template.titulo, style = MaterialTheme.typography.bodyLarge, color = if (selected) KLBlue else MaterialTheme.colorScheme.onSurface)
                                        template.descricao?.let { Text(it, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant) }
                                    }
                                }
                            }
                        }
                    }
                }

                // Abrir checklist
                if (podeAbrir && escopoId != null) {
                    OutlinedButton(
                        onClick = { onOpenEscopo(escopoId) },
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(top = 24.dp),
                        colors = androidx.compose.material3.ButtonDefaults.outlinedButtonColors(contentColor = KLBlue)
                    ) {
                        Icon(Icons.Default.Check, contentDescription = null, modifier = Modifier.padding(end = 8.dp))
                        Text("Abrir Checklist")
                    }
                }
            }
        }
    }
}
