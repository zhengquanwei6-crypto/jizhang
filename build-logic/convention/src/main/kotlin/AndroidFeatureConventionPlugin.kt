import org.gradle.api.Plugin
import org.gradle.api.Project

class AndroidFeatureConventionPlugin : Plugin<Project> {
    override fun apply(target: Project) {
        with(target) {
            with(pluginManager) {
                apply("couplespace.android.library.compose")
                apply("couplespace.android.hilt")
            }
            dependencies {
                add("implementation", project(":core:common"))
                add("implementation", project(":core:design"))
                add("implementation", project(":core:animation"))
            }
        }
    }
}
