package com.kl.adm.ui.navigation

import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.platform.LocalContext
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.kl.adm.data.prefs.ChecklistInProgressPrefs
import com.kl.adm.data.repository.AuthRepository
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import com.kl.adm.ui.screens.ChecklistDetailScreen
import com.kl.adm.ui.screens.ChecklistsScreen
import com.kl.adm.ui.screens.DashboardScreen
import com.kl.adm.ui.screens.LoginScreen
import com.kl.adm.ui.screens.NovoChecklistScreen
import com.kl.adm.ui.screens.PontoDetailScreen
import com.kl.adm.ui.screens.PontosScreen
import java.net.URLDecoder

sealed class Screen(val route: String) {
    data object Login : Screen("login")
    data object Dashboard : Screen("dashboard")
    data object Checklists : Screen("checklists")
    data object NovoChecklist : Screen("novo_checklist")
    data object ChecklistDetail : Screen("checklist/{escopoId}") {
        fun withId(escopoId: String) = "checklist/$escopoId"
    }
    data object Pontos : Screen("pontos")
    data object PontoDetail : Screen("ponto_detail/{registroId}/{funcionarioNome}/{tipo}/{timestamp}/{unidadeNome}/{protocolo}") {
        fun withData(
            registroId: String,
            funcionarioNome: String,
            tipo: String,
            timestamp: String,
            unidadeNome: String,
            protocolo: String?
        ) = "ponto_detail/$registroId/${funcionarioNome.replace("/", "_")}/$tipo/${timestamp.replace("/", "_")}/${unidadeNome.replace("/", "_")}/${protocolo ?: "null"}"
    }
}

@Composable
fun KLAdminNavGraph(
    navController: NavHostController,
    authRepository: AuthRepository
) {
    val scope = rememberCoroutineScope()
    val checklistRepo = remember { com.kl.adm.data.repository.ChecklistRepository() }
    val pontoRepo = remember { com.kl.adm.data.repository.PontoRepository() }

    NavHost(
        navController = navController,
        startDestination = Screen.Login.route
    ) {
        composable(Screen.Login.route) {
            LoginScreen(
                authRepository = authRepository,
                onLoginSuccess = { navController.navigate(Screen.Dashboard.route) { popUpTo(0) { inclusive = true } } }
            )
        }
        composable(Screen.Dashboard.route) {
            DashboardScreen(
                authRepository = authRepository,
                checklistRepository = checklistRepo,
                onLogout = { navController.navigate(Screen.Login.route) { popUpTo(0) { inclusive = true } } },
                onChecklists = { navController.navigate(Screen.Checklists.route) },
                onPontos = { navController.navigate(Screen.Pontos.route) },
                onRestoreChecklistInProgress = { escopoId ->
                    navController.navigate(Screen.ChecklistDetail.withId(escopoId))
                }
            )
        }
        composable(Screen.Checklists.route) {
            ChecklistsScreen(
                checklistRepository = checklistRepo,
                onBack = { navController.popBackStack() },
                onOpenEscopo = { escopoId -> navController.navigate(Screen.ChecklistDetail.withId(escopoId)) },
                onIniciarChecklist = { navController.navigate(Screen.NovoChecklist.route) }
            )
        }
        composable(Screen.NovoChecklist.route) {
            NovoChecklistScreen(
                checklistRepository = checklistRepo,
                onBack = { navController.popBackStack() },
                onOpenEscopo = { escopoId ->
                    navController.navigate(Screen.ChecklistDetail.withId(escopoId)) {
                        popUpTo(Screen.NovoChecklist.route) { inclusive = true }
                    }
                }
            )
        }
        composable(Screen.ChecklistDetail.route) { backStackEntry ->
            val context = LocalContext.current
            val escopoId = backStackEntry.arguments?.getString("escopoId") ?: return@composable
            ChecklistDetailScreen(
                escopoId = escopoId,
                checklistRepository = checklistRepo,
                onBack = {
                    scope.launch {
                        withContext(Dispatchers.IO) { ChecklistInProgressPrefs.clear(context) }
                        navController.popBackStack()
                    }
                }
            )
        }
        composable(Screen.Pontos.route) {
            PontosScreen(
                pontoRepository = pontoRepo,
                onBack = { navController.popBackStack() }
            )
        }
        composable(Screen.PontoDetail.route) { backStackEntry ->
            val registroId = backStackEntry.arguments?.getString("registroId") ?: return@composable
            val funcionarioNome = URLDecoder.decode(backStackEntry.arguments?.getString("funcionarioNome") ?: "", "UTF-8")
            val tipo = backStackEntry.arguments?.getString("tipo") ?: return@composable
            val timestamp = URLDecoder.decode(backStackEntry.arguments?.getString("timestamp") ?: "", "UTF-8")
            val unidadeNome = URLDecoder.decode(backStackEntry.arguments?.getString("unidadeNome") ?: "", "UTF-8")
            val protocolo = backStackEntry.arguments?.getString("protocolo")?.takeIf { it != "null" }
            
            PontoDetailScreen(
                registroId = registroId,
                funcionarioNome = funcionarioNome,
                tipo = tipo,
                timestamp = timestamp,
                unidadeNome = unidadeNome,
                protocolo = protocolo,
                pontoRepository = pontoRepo,
                onBack = { navController.popBackStack() }
            )
        }
    }
}
