import com.android.build.api.dsl.ApplicationExtension
import org.gradle.api.Plugin
import org.gradle.api.Project
import org.gradle.kotlin.dsl.configure

class AndroidApplicationConventionPlugin : Plugin<Project> {
    override fun apply(target: Project) {
        with(target) {
            with(pluginManager) {
                apply("com.android.application")
                apply("org.jetbrains.kotlin.android")
                apply("org.jetbrains.kotlin.plugin.serialization")
            }
            extensions.configure<ApplicationExtension> {
                configureAndroidCommon(this)
                defaultConfig.targetSdk = 34
                buildFeatures {
                    compose = true
                    buildConfig = true
                }
                composeOptions {
                    kotlinCompilerExtensionVersion = providers.gradleProperty("composeCompilerVersion").getOrElse("1.5.8")
                }
                packaging {
                    resources.excludes += setOf(
                        "/META-INF/{AL2.0,LGPL2.1}",
                        "META-INF/DEPENDENCIES",
                        "META-INF/LICENSE",
                        "META-INF/LICENSE.txt",
                        "META-INF/NOTICE",
                        "META-INF/NOTICE.txt"
                    )
                }
            }
        }
    }
}
