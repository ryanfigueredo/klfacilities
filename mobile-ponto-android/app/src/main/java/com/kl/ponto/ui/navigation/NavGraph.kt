package com.kl.ponto.ui.navigation

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.CircularProgressIndicator
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
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.kl.ponto.data.model.Funcionario
import com.kl.ponto.data.repository.AuthRepository
import com.kl.ponto.ui.screens.LoginScreen
import com.kl.ponto.ui.screens.PontoScreen

@Composable
fun NavGraph(authRepository: AuthRepository) {
    val navController = rememberNavController()
    val scope = rememberCoroutineScope()
    var funcionario by remember { mutableStateOf<Funcionario?>(null) }
    var initialLoadDone by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) {
        funcionario = authRepository.getFuncionario()
        initialLoadDone = true
    }

    if (!initialLoadDone) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(24.dp),
            contentAlignment = Alignment.Center
        ) {
            CircularProgressIndicator()
        }
        return
    }

    NavHost(
        navController = navController,
        startDestination = if (funcionario != null) "ponto" else "login"
    ) {
        composable("login") {
            LoginScreen(
                authRepository = authRepository,
                onLoginSuccess = { f ->
                    funcionario = f
                    navController.navigate("ponto") { popUpTo(0) { inclusive = true } }
                }
            )
        }
        composable("ponto") {
            val f = funcionario ?: run {
                navController.navigate("login") { popUpTo(0) { inclusive = true } }
                return@composable
            }
            PontoScreen(
                funcionario = f,
                onLogout = {
                    scope.launch {
                        authRepository.clear()
                        funcionario = null
                        navController.navigate("login") { popUpTo(0) { inclusive = true } }
                    }
                }
            )
        }
    }
}
