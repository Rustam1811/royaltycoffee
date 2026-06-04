# ──────────────────────────────────────────────────────────
# Capacitor bridge — uses heavy reflection, must survive R8
# ──────────────────────────────────────────────────────────
-keep class com.getcapacitor.** { *; }
-keep class * extends com.getcapacitor.Plugin { *; }
-keep @com.getcapacitor.annotation.CapacitorPlugin class * { *; }
-keepclassmembers class * {
    @com.getcapacitor.annotation.PluginMethod *;
}

# WebView ↔ JS bridge interface (required on all Android versions)
-keepattributes JavascriptInterface
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# ──────────────────────────────────────────────────────────
# Firebase / Google Play Services
# ──────────────────────────────────────────────────────────
-keep class com.google.firebase.** { *; }
-keep class com.google.android.gms.** { *; }
-dontwarn com.google.firebase.**
-dontwarn com.google.android.gms.**

# ──────────────────────────────────────────────────────────
# Kotlin (reflection + coroutines)
# ──────────────────────────────────────────────────────────
-keep class kotlin.** { *; }
-keep class kotlinx.** { *; }
-dontwarn kotlin.**
-dontwarn kotlinx.**

# ──────────────────────────────────────────────────────────
# AndroidX / Jetpack
# ──────────────────────────────────────────────────────────
-keep class androidx.** { *; }
-dontwarn androidx.**

# ──────────────────────────────────────────────────────────
# Huawei HMS (devices without GMS) — dontwarn so build doesn't fail
# ──────────────────────────────────────────────────────────
-dontwarn com.huawei.**
-keep class com.huawei.** { *; }

# ──────────────────────────────────────────────────────────
# Native methods
# ──────────────────────────────────────────────────────────
-keepclasseswithmembernames class * {
    native <methods>;
}

# ──────────────────────────────────────────────────────────
# Enums (serialization)
# ──────────────────────────────────────────────────────────
-keepclassmembers enum * {
    public static **[] values();
    public static ** valueOf(java.lang.String);
}

# ──────────────────────────────────────────────────────────
# Stack traces — keep source file + line numbers for crash reports
# ──────────────────────────────────────────────────────────
-keepattributes SourceFile,LineNumberTable
-keepattributes *Annotation*
-renamesourcefileattribute SourceFile

-dontwarn com.facebook.**
