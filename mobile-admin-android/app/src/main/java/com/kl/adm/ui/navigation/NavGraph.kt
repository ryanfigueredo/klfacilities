package com.kl.adm.ui.navigation

import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.kl.adm.data.repository.AuthRepository
import com.kl.adm.ui.screens.ChecklistDetailScreen
import com.kl.adm.ui.screens.ChecklistsScreen
import com.kl.adm.ui.screens.DashboardScreen
import com.kl.adm.ui.screens.LoginScreen
import com.kl.adm.ui.screens.NovoChecklistScreen
import com.kl.adm.ui.screens.PontosScreen

sealed class Screen(val route: String) {
    data object Login : Screen("login")
    data object Dashboard : Screen("dashboard")
    data object Checklists : Screen("checklists")
    data object NovoChecklist : Screen("novo_checklist")
    data object ChecklistDetail : Screen("checklist/{escopoId}") {
        fun withId(escopoId: String) = "checklist/$escopoId"
    }
    data object Pontos : Screen("pontos")
}

@Composable
fun KLAdminNavGraph(
    navController: NavHostController = rememberNavController(),
    authRepository: AuthRepository
) {
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
                onPontos = { navController.navigate(Screen.Pontos.route) }
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
            val escopoId = backStackEntry.arguments?.getString("escopoId") ?: return@composable
            ChecklistDetailScreen(
                escopoId = escopoId,
                checklistRepository = checklistRepo,
                onBack = { navController.popBackStack() }
            )
        }
        composable(Screen.Pontos.route) {
            PontosScreen(
                pontoRepository = pontoRepo,
                onBack = { navController.popBackStack() }
            )
        }
    }
}
