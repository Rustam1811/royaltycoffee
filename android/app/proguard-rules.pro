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
# @capacitor-firebase/authentication plugin (io.capawesome.*)
# This plugin is NOT under com.getcapacitor.** so needs explicit keep
# ──────────────────────────────────────────────────────────
-keep class io.capawesome.** { *; }
-dontwarn io.capawesome.**

# ──────────────────────────────────────────────────────────
# App's own classes
# ──────────────────────────────────────────────────────────
-keep class com.royalcoffee.** { *; }

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
# Xiaomi / MIUI compatibility
# ──────────────────────────────────────────────────────────
-dontwarn com.miui.**
-keep class com.miui.** { *; }

# ──────────────────────────────────────────────────────────
# Serialization (Gson, JSON)
# ──────────────────────────────────────────────────────────
-keepattributes Signature
-keepattributes *Annotation*
-keep class sun.misc.Unsafe { *; }
-keep class com.google.gson.** { *; }
-dontwarn com.google.gson.**

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
-renamesourcefileattribute SourceFile

-dontwarn com.facebook.**
