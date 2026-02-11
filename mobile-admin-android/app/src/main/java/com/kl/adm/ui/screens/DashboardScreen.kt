package com.kl.adm.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Menu
import androidx.compose.material.icons.filled.Schedule
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.kl.adm.data.prefs.ChecklistInProgressPrefs
import com.kl.adm.data.repository.AuthRepository
import com.kl.adm.data.repository.ChecklistRepository
import com.kl.adm.ui.theme.KLBlue
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DashboardScreen(
    authRepository: AuthRepository,
    checklistRepository: ChecklistRepository? = null,
    onLogout: () -> Unit,
    onChecklists: () -> Unit,
    onPontos: () -> Unit,
    onRestoreChecklistInProgress: ((escopoId: String) -> Unit)? = null
) {
    val context = LocalContext.current
    var user by remember { mutableStateOf<AuthRepository.SavedUser?>(null) }
    var rascunhosCount by remember { mutableStateOf<Int?>(null) }
    val scope = rememberCoroutineScope()

    LaunchedEffect(Unit) {
        user = authRepository.getSavedUser()
    }

    // Restaura checklist em progresso se o app foi morto (ex: ao abrir câmera em devices com pouca RAM)
    LaunchedEffect(user, onRestoreChecklistInProgress) {
        if (user != null && onRestoreChecklistInProgress != null) {
            val escopoId = withContext(Dispatchers.IO) { ChecklistInProgressPrefs.getChecklistInProgress(context) }
            escopoId?.let { id ->
                withContext(Dispatchers.IO) { ChecklistInProgressPrefs.clear(context) }
                onRestoreChecklistInProgress(id)
            }
        }
    }
    LaunchedEffect(checklistRepository) {
        checklistRepository?.emAberto()?.onSuccess { rascunhosCount = it.respostas.size }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("KL Administração") },
                navigationIcon = {
                    IconButton(onClick = { /* menu drawer opcional */ }) {
                        Icon(Icons.Default.Menu, contentDescription = "Menu")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = KLBlue, titleContentColor = androidx.compose.ui.graphics.Color.White, navigationIconContentColor = androidx.compose.ui.graphics.Color.White)
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .background(MaterialTheme.colorScheme.surface)
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .padding(16.dp)
        ) {
            user?.let { u ->
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f))
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text(text = u.name, style = MaterialTheme.typography.titleMedium)
                        Text(text = u.email, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Text(text = "Perfil: ${u.role}", style = MaterialTheme.typography.labelMedium)
                    }
                }
                Spacer(modifier = Modifier.height(24.dp))
            }

            Text("Funcionalidades", style = MaterialTheme.typography.titleLarge, modifier = Modifier.padding(bottom = 8.dp))
            Text("Checklists e Pontos", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(bottom = 16.dp))

            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 6.dp)
                    .clickable { onChecklists() },
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
            ) {
                Row(modifier = Modifier.padding(20.dp), verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.CheckCircle, contentDescription = null, modifier = Modifier.size(40.dp), tint = MaterialTheme.colorScheme.primary)
                    Spacer(modifier = Modifier.size(16.dp))
                    Column {
                        Text("Checklists", style = MaterialTheme.typography.titleMedium)
                        Text(
                            if (rascunhosCount != null && rascunhosCount!! > 0)
                                "$rascunhosCount rascunho(s) · Gerenciar checklists"
                            else
                                "Gerenciar checklists operacionais",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            }

            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 6.dp)
                    .clickable { onPontos() },
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
            ) {
                Row(modifier = Modifier.padding(20.dp), verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.Schedule, contentDescription = null, modifier = Modifier.size(40.dp), tint = MaterialTheme.colorScheme.primary)
                    Spacer(modifier = Modifier.size(16.dp))
                    Column {
                        Text("Pontos", style = MaterialTheme.typography.titleMedium)
                        Text("Visualizar e gerenciar registros de ponto", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
            }

            Spacer(modifier = Modifier.height(24.dp))
            Text("Sair", style = MaterialTheme.typography.bodyLarge, color = MaterialTheme.colorScheme.error, modifier = Modifier
                .fillMaxWidth()
                .clickable {
                    scope.launch {
                        withContext(Dispatchers.IO) { authRepository.clearAuth() }
                        onLogout()
                    }
                }
                .padding(16.dp))
        }
    }
}
