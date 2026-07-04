package com.coupleai.core.design.theme

import android.app.Activity
import android.os.Build
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.dynamicDarkColorScheme
import androidx.compose.material3.dynamicLightColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat

/**
 * CoupleSpaceAI 主题
 *
 * 品牌主色统一为 RosePink #FF6B9D。
 * Android 12+ 启用 dynamicColor，但强制保留 primary/secondary/tertiary 品牌色，
 * 确保跨设备视觉一致性。
 */

private val LightColorScheme = lightColorScheme(
    primary = RosePink,
    onPrimary = Color.White,
    primaryContainer = RosePinkContainer,
    onPrimaryContainer = RosePinkDeep,
    secondary = CoralOrange,
    onSecondary = Color.White,
    secondaryContainer = WarmYellow,
    onSecondaryContainer = CoralOrange,
    tertiary = MintGreen,
    onTertiary = Color.White,
    tertiaryContainer = SuccessContainer,
    onTertiaryContainer = Success,
    background = Background,
    onBackground = OnSurface,
    surface = SurfaceColor,
    onSurface = OnSurface,
    surfaceVariant = SurfaceVariant,
    onSurfaceVariant = SecondaryText,
    outline = Outline,
    outlineVariant = Divider,
    error = Error,
    onError = Color.White,
    errorContainer = ErrorContainer,
    onErrorContainer = Error
)

private val DarkColorScheme = darkColorScheme(
    primary = RosePink,
    onPrimary = Color.White,
    primaryContainer = RosePinkDeep,
    onPrimaryContainer = RosePinkLight,
    secondary = CoralOrange,
    onSecondary = Color.White,
    secondaryContainer = CoralOrange.copy(alpha = 0.3f),
    onSecondaryContainer = CoralOrange,
    tertiary = MintGreen,
    onTertiary = Color.Black,
    tertiaryContainer = Success.copy(alpha = 0.3f),
    onTertiaryContainer = MintGreen,
    background = BackgroundDark,
    onBackground = OnSurfaceDark,
    surface = SurfaceDark,
    onSurface = OnSurfaceDark,
    surfaceVariant = SurfaceVariantDark,
    onSurfaceVariant = SecondaryTextDark,
    outline = OutlineDark,
    outlineVariant = DividerDark,
    error = Error,
    onError = Color.White,
    errorContainer = Error.copy(alpha = 0.2f),
    onErrorContainer = Error
)

@Composable
fun CoupleSpaceTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    dynamicColor: Boolean = true,
    content: @Composable () -> Unit
) {
    val colorScheme = when {
        dynamicColor && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S -> {
            val context = LocalContext.current
            if (darkTheme) dynamicDarkColorScheme(context).copy(
                primary = RosePink,
                secondary = CoralOrange,
                tertiary = MintGreen
            ) else dynamicLightColorScheme(context).copy(
                primary = RosePink,
                secondary = CoralOrange,
                tertiary = MintGreen
            )
        }
        darkTheme -> DarkColorScheme
        else -> LightColorScheme
    }

    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as Activity).window
            window.statusBarColor = Color.Transparent.toArgb()
            WindowCompat.getInsetsController(window, view).isAppearanceLightStatusBars = !darkTheme
        }
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = CoupleSpaceTypography,
        shapes = CoupleSpaceShapes,
        content = content
    )
}
