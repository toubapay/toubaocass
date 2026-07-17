plugins {
    id("com.android.application")
    // The Flutter Gradle Plugin must be applied after the Android and Kotlin Gradle plugins.
    id("dev.flutter.flutter-gradle-plugin")
}

// Only apply the Firebase Gradle plugin once a real google-services.json has
// been downloaded from the Firebase console and placed next to this file —
// the plugin fails the build outright if the file is missing, and this repo
// intentionally doesn't commit that secret (see .gitignore).
if (file("google-services.json").exists()) {
    apply(plugin = "com.google.gms.google-services")
}

android {
    namespace = "com.intercity.rider_flutter"
    compileSdk = flutter.compileSdkVersion
    ndkVersion = flutter.ndkVersion

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
        // flutter_local_notifications ships Java 8+ APIs that need
        // desugaring on older Android runtimes.
        isCoreLibraryDesugaringEnabled = true
    }

    defaultConfig {
        applicationId = "com.intercity.rider_flutter"
        minSdk = flutter.minSdkVersion
        targetSdk = flutter.targetSdkVersion
        versionCode = flutter.versionCode
        versionName = flutter.versionName
        // Set via `flutter run --dart-define=... ` is not available to manifest
        // placeholders, so this reads a Gradle property instead — pass
        // `-PmapsApiKey=...` or set `mapsApiKey=...` in android/local.properties
        // (gitignored) before building for a device.
        manifestPlaceholders["MAPS_API_KEY"] = (project.findProperty("mapsApiKey") as String?) ?: ""
    }

    buildTypes {
        release {
            // TODO: Add your own signing config for the release build.
            // Signing with the debug keys for now, so `flutter run --release` works.
            signingConfig = signingConfigs.getByName("debug")
        }
    }
}

kotlin {
    compilerOptions {
        jvmTarget = org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17
    }
}

dependencies {
    coreLibraryDesugaring("com.android.tools:desugar_jdk_libs:2.1.4")
}

flutter {
    source = "../.."
}
