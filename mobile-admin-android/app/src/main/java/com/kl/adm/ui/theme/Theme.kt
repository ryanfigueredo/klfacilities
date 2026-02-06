package com.kl.adm.ui.theme

import android.app.Activity
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat

val KLBlue = Color(0xFF009ee2)
val KLBlueDark = Color(0xFF007ab3)

private val LightColorScheme = lightColorScheme(
    primary = KLBlue,
    onPrimary = Color.White,
    primaryContainer = KLBlue.copy(alpha = 0.2f),
    onPrimaryContainer = KLBlueDark,
    surface = Color.White,
    onSurface = Color(0xFF1a1a1a),
    error = Color(0xFFf44336),
    onError = Color.White
)

@Composable
fun KLAdminTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    val colorScheme = LightColorScheme
    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as Activity).window
            window.statusBarColor = KLBlue.toArgb()
            window.navigationBarColor = Color.White.toArgb()
            WindowCompat.getInsetsController(window, view).isAppearanceLightStatusBars = false
        }
    }
    MaterialTheme(
        colorScheme = colorScheme,
        content = content
    )
}
