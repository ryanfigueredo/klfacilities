package com.kl.adm.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
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
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.kl.adm.data.model.FolhaPontoFuncionario
import com.kl.adm.data.repository.PontoRepository
import com.kl.adm.ui.theme.KLBlue

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PontosScreen(
    pontoRepository: PontoRepository,
    onBack: () -> Unit
) {
    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    var funcionarios by remember { mutableStateOf<List<FolhaPontoFuncionario>>(emptyList()) }
    var month by remember { mutableStateOf("") }

    LaunchedEffect(Unit) {
        loading = true
        pontoRepository.folhas(month = null)
            .onSuccess { resp ->
                funcionarios = resp.funcionarios
                month = resp.month
            }
            .onFailure { error = it.message ?: "Erro ao carregar folhas" }
        loading = false
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Pontos") },
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
                Text("Carregando...", modifier = Modifier.padding(16.dp))
            }
            error != null -> Column(Modifier.fillMaxSize().background(MaterialTheme.colorScheme.surface).padding(padding), verticalArrangement = Arrangement.Center, horizontalAlignment = Alignment.CenterHorizontally) {
                Text(error!!, color = MaterialTheme.colorScheme.error)
            }
            else -> LazyColumn(
                modifier = Modifier.fillMaxSize().background(MaterialTheme.colorScheme.surface).padding(padding),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                item {
                    Text("Mês: $month", style = MaterialTheme.typography.titleSmall, modifier = Modifier.padding(bottom = 8.dp))
                }
                items(funcionarios) { f ->
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                    ) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Text(f.nome, style = MaterialTheme.typography.titleMedium)
                            f.unidadeNome?.let { Text(it, style = MaterialTheme.typography.bodySmall) }
                            f.grupoNome?.let { Text(it, style = MaterialTheme.typography.bodySmall) }
                        }
                    }
                }
            }
        }
    }
}
