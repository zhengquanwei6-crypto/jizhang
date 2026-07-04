plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.serialization")
    id("com.google.devtools.ksp")
    id("com.google.dagger.hilt.android")
}

android {
    namespace = "com.coupleai.app"
    compileSdk = 34
    defaultConfig {
        applicationId = "com.coupleai.app"
        versionCode = 2
        versionName = "0.2.0"
        minSdk = 31
        targetSdk = 34
        vectorDrawables { useSupportLibrary = true }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    buildFeatures {
        compose = true
        buildConfig = true
    }
    composeOptions {
        kotlinCompilerExtensionVersion = "1.5.8"
    }
    packaging {
        resources {
            excludes += setOf(
                "/META-INF/{AL2.0,LGPL2.1}",
                "META-INF/DEPENDENCIES",
                "META-INF/LICENSE",
                "META-INF/LICENSE.txt",
                "META-INF/NOTICE",
                "META-INF/NOTICE.txt",
                "META-INF/gradle/incremental.annotation.processors"
            )
        }
    }
}

dependencies {
    implementation(platform(libs.androidx.compose.bom))
    implementation(libs.androidx.compose.ui)
    implementation(libs.androidx.compose.ui.graphics)
    implementation(libs.androidx.compose.ui.tooling.preview)
    implementation(libs.androidx.compose.material3)
    implementation(libs.androidx.compose.material.icons)
    implementation(libs.androidx.compose.animation)
    implementation(libs.androidx.compose.foundation)

    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.activity.compose)
    implementation(libs.androidx.lifecycle.runtime)
    implementation(libs.androidx.lifecycle.viewmodel)
    implementation(libs.androidx.lifecycle.viewmodel.compose)
    implementation(libs.androidx.lifecycle.runtime.compose)
    implementation(libs.androidx.navigation.compose)

    // Hilt
    implementation(libs.dagger.android)
    implementation(libs.hiltx.navigation.compose)
    implementation(libs.dagger.compiler)

    implementation(libs.room.runtime)
    implementation(libs.room.ktx)
    ksp(libs.room.compiler)

    implementation(libs.datastore.preferences)

    implementation(libs.retrofit.core)
    implementation(libs.okhttp.core)
    implementation(libs.okhttp.logging)
    implementation(libs.kotlinx.serialization)

    implementation(libs.kotlinx.coroutines.core)
    implementation(libs.kotlinx.coroutines.android)

    implementation(libs.coil.compose)
    implementation(libs.lottie.compose)
    implementation(libs.vico.compose)

    implementation(libs.accompanist.pager)
    implementation(libs.accompanist.pager.indicators)
    implementation(libs.accompanist.systemuicontroller)
    implementation(libs.accompanist.navigation.animation)

    implementation(libs.work.runtime)
    implementation(libs.androidx.splashscreen)
    implementation(libs.timber)

    implementation(project(":core:common"))
    implementation(project(":core:design"))
    implementation(project(":core:animation"))
    implementation(project(":data:local"))
    implementation(project(":data:remote"))
    implementation(project(":feature:home"))
    implementation(project(":feature:account"))
    implementation(project(":feature:chat"))
    implementation(project(":feature:relationship"))
    implementation(project(":feature:ai"))
    implementation(project(":feature:location"))
    implementation(project(":feature:goal"))
    implementation(project(":feature:mine"))

    debugImplementation(libs.androidx.compose.ui.tooling)
}
