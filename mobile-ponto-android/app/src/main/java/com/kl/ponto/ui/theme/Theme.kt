package com.kl.ponto.ui.theme

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

private val KLBlue = Color(0xFF009ee2)
private val DarkColorScheme = darkColorScheme(primary = KLBlue)
private val LightColorScheme = lightColorScheme(primary = KLBlue)

@Composable
fun KLPontoTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    val colorScheme = if (darkTheme) DarkColorScheme else LightColorScheme
    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as Activity).window
            window.statusBarColor = KLBlue.toArgb()
        }
    }
    MaterialTheme(
        colorScheme = colorScheme,
        content = content
    )
}
