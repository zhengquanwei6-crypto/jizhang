plugins {
    id("com.android.library")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.serialization")
    id("com.google.devtools.ksp")
    id("com.google.dagger.hilt.android")
}

android {
    namespace = "com.coupleai.data.remote"
    compileSdk = 34

    defaultConfig {
        minSdk = 31
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}

dependencies {
    implementation(libs.kotlinx.coroutines.core)
    implementation(libs.kotlinx.serialization)

    // Retrofit + OkHttp
    implementation(libs.retrofit.core)
    implementation(libs.okhttp.core)
    implementation(libs.okhttp.logging)

    // Retrofit kotlinx-serialization converter (via retrofit2-kotlinx-serialization-converter)
    implementation("com.jakewharton.retrofit:retrofit2-kotlinx-serialization-converter:1.0.0")

    // DataStore for token storage
    implementation(libs.datastore.preferences)

    // Hilt
    implementation(libs.dagger.android)
    ksp(libs.dagger.compiler)

    // Timber
    implementation(libs.timber)
}
