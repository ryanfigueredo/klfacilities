plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("com.google.gms.google-services")
}

android {
    namespace = "com.kl.adm"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.kl.adm"
        minSdk = 24
        targetSdk = 35
        // Version Code: Deve ser maior que o atual no Play Console
        // Se o app Expo atual tem versionCode = 5, use 6 ou maior
        // Ajuste este valor conforme necessário após verificar no Play Console
        versionCode = (project.findProperty("VERSION_CODE") as String?)?.toIntOrNull() ?: 10
        versionName = "2.0.0"
    }

    signingConfigs {
        create("release") {
            // Configuração via variáveis de ambiente ou gradle.properties
            val keystoreFile = project.findProperty("KEYSTORE_FILE") as String?
            val keystorePassword = project.findProperty("KEYSTORE_PASSWORD") as String?
            val keyAlias = project.findProperty("KEY_ALIAS") as String?
            val keyPassword = project.findProperty("KEY_PASSWORD") as String?

            if (keystoreFile != null && keystorePassword != null && keyAlias != null && keyPassword != null) {
                storeFile = file(keystoreFile)
                storePassword = keystorePassword
                this.keyAlias = keyAlias
                this.keyPassword = keyPassword
            }
        }
    }

    buildTypes {
        release {
            // Usar assinatura se configurada, senão gera AAB não assinado
            // (Google Play Console pode assinar automaticamente se usar assinatura gerenciada)
            val releaseSigningConfig = signingConfigs.findByName("release")
            signingConfig = if (releaseSigningConfig?.storeFile?.exists() == true) {
                releaseSigningConfig
            } else {
                null // Sem keystore: Google Play pode gerenciar assinatura automaticamente
            }
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
    buildFeatures {
        compose = true
    }
    composeOptions {
        kotlinCompilerExtensionVersion = "1.5.14"
    }
}

dependencies {
    implementation(platform("androidx.compose:compose-bom:2024.06.00"))
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.7.0")
    implementation("androidx.activity:activity-compose:1.8.2")
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-graphics")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.material:material-icons-extended")
    implementation("androidx.navigation:navigation-compose:2.7.7")
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.7.0")
    implementation("androidx.lifecycle:lifecycle-runtime-compose:2.7.0")

    implementation("com.squareup.retrofit2:retrofit:2.9.0")
    implementation("com.squareup.retrofit2:converter-gson:2.9.0")
    implementation("com.squareup.okhttp3:okhttp:4.12.0")
    implementation("com.squareup.okhttp3:logging-interceptor:4.12.0")

    implementation("androidx.datastore:datastore-preferences:1.0.0")

    implementation("io.coil-kt:coil-compose:2.5.0")

    // Firebase Cloud Messaging
    // Usando BOM 33.7.0 porque versões 34.x+ removeram módulos KTX
    implementation(platform("com.google.firebase:firebase-bom:33.7.0"))
    // Quando usar BoM, não especifique versões nas dependências abaixo
    implementation("com.google.firebase:firebase-messaging-ktx")
    implementation("com.google.firebase:firebase-analytics-ktx")

    debugImplementation("androidx.compose.ui:ui-tooling")
    debugImplementation("androidx.compose.ui:ui-test-manifest")
}
