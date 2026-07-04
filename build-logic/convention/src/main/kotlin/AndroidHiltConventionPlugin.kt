import org.gradle.api.Plugin
import org.gradle.api.Project
import org.gradle.kotlin.dsl.dependencies

class AndroidHiltConventionPlugin : Plugin<Project> {
    override fun apply(target: Project) {
        with(target) {
            with(pluginManager) {
                apply("com.google.devtools.ksp")
                apply("com.google.dagger.hilt.android")
            }
            dependencies {
                add("implementation", "com.google.dagger:hilt-android:2.50")
                add("ksp", "com.google.dagger:hilt-compiler:2.50")
            }
        }
    }
}
