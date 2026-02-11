package com.kl.ponto

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Surface
import androidx.compose.ui.Modifier
import com.kl.ponto.data.repository.AuthRepository
import com.kl.ponto.ui.navigation.NavGraph
import com.kl.ponto.ui.theme.KLPontoTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        val authRepository = AuthRepository(applicationContext)
        setContent {
            KLPontoTheme {
                Surface(modifier = Modifier.fillMaxSize()) {
                    NavGraph(authRepository = authRepository)
                }
            }
        }
    }
}
