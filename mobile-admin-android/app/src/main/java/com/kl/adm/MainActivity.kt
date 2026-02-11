package com.kl.adm

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.navigation.compose.rememberNavController
import com.kl.adm.data.api.ApiModule
import com.kl.adm.data.repository.AuthRepository
import com.kl.adm.ui.navigation.KLAdminNavGraph
import com.kl.adm.ui.navigation.Screen
import com.kl.adm.ui.theme.KLAdminTheme
import java.net.URLDecoder

class MainActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        
        // Verificar se foi aberto via notificação
        val notificationType = intent.getStringExtra("notification_type")
        val registroId = intent.getStringExtra("registro_id")
        val funcionarioNome = intent.getStringExtra("funcionario_nome")
        val tipo = intent.getStringExtra("tipo")
        val timestamp = intent.getStringExtra("timestamp")
        val unidadeNome = intent.getStringExtra("unidade_nome")
        val protocolo = intent.getStringExtra("protocolo")
        
        setContent {
            KLAdminTheme {
                val context = LocalContext.current
                val authRepository = remember { AuthRepository(context) }
                ApiModule.init(authRepository)
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.surface
                ) {
                    val navController = rememberNavController()
                    
                    // Navegar para tela de detalhes se veio de notificação
                    LaunchedEffect(notificationType) {
                        if (notificationType == "PONTO_BATIDO" && registroId != null && funcionarioNome != null && tipo != null && timestamp != null && unidadeNome != null) {
                            navController.navigate(
                                Screen.PontoDetail.withData(
                                    registroId,
                                    funcionarioNome,
                                    tipo,
                                    timestamp,
                                    unidadeNome,
                                    protocolo
                                )
                            )
                        }
                    }
                    
                    KLAdminNavGraph(navController = navController, authRepository = authRepository)
                }
            }
        }
    }
}
