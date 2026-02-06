package com.kl.adm

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import com.kl.adm.data.api.ApiModule
import com.kl.adm.data.repository.AuthRepository
import com.kl.adm.ui.navigation.KLAdminNavGraph
import com.kl.adm.ui.theme.KLAdminTheme

class MainActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            KLAdminTheme {
                val context = LocalContext.current
                val authRepository = remember { AuthRepository(context) }
                ApiModule.init(authRepository)
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.surface
                ) {
                    KLAdminNavGraph(authRepository = authRepository)
                }
            }
        }
    }
}
