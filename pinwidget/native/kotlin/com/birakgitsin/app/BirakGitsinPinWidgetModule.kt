package com.birakgitsin.app

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise

class BirakGitsinPinWidgetModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    override fun getName(): String = "BirakGitsinPinWidget"

    private fun appWidgetManager(): AppWidgetManager =
        reactApplicationContext.getSystemService(Context.APPWIDGET_SERVICE) as AppWidgetManager

    @ReactMethod
    fun canPinWidget(promise: Promise) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            promise.resolve(false)
            return
        }
        try {
            promise.resolve(appWidgetManager().isRequestPinAppWidgetSupported)
        } catch (e: Exception) {
            promise.resolve(false)
        }
    }

    @ReactMethod
    fun pinWidget(size: String, promise: Promise) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            promise.reject("UNSUPPORTED", "Android 8+ gerekli")
            return
        }
        val context = reactApplicationContext
        val appWidgetManager = appWidgetManager()
        val providerClass = when (size) {
            "1x2" -> BirakGitsinWidget1x2::class.java
            "2x3" -> BirakGitsinWidget2x3::class.java
            "4x2" -> BirakGitsinWidget4x2::class.java
            else -> BirakGitsinWidget2x2::class.java
        }
        val provider = ComponentName(context, providerClass)
        if (!appWidgetManager.isRequestPinAppWidgetSupported) {
            promise.reject("UNSUPPORTED", "Launcher widget sabitlemeyi desteklemiyor")
            return
        }
        try {
            val ok = appWidgetManager.requestPinAppWidget(provider, null, null)
            if (ok) promise.resolve(true) else promise.reject("FAILED", "Widget sabitlenemedi")
        } catch (e: Exception) {
            promise.reject("FAILED", e.message ?: "Widget sabitlenemedi")
        }
    }

    /**
     * MIUI/HyperOS'ta "Ana ekrana ekleme" izni kapaliysa kullaniciyi dogrudan
     * ilgili izin ekranina goturur. Diger markalarda uygulama ayarlari acilir.
     */
    @ReactMethod
    fun openWidgetPermissionSettings(promise: Promise) {
        val context = reactApplicationContext
        val miuiIntents = listOf(
            Intent("miui.intent.action.APP_PERM_EDITOR").apply {
                setClassName(
                    "com.miui.securitycenter",
                    "com.miui.permcenter.permissions.PermissionsEditorActivity"
                )
                putExtra("extra_pkgname", context.packageName)
            },
            Intent("miui.intent.action.APP_PERM_EDITOR").apply {
                setClassName(
                    "com.miui.securitycenter",
                    "com.miui.permcenter.permissions.AppPermissionsEditorActivity"
                )
                putExtra("extra_pkgname", context.packageName)
            }
        )
        for (intent in miuiIntents) {
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            try {
                context.startActivity(intent)
                promise.resolve(true)
                return
            } catch (_: Exception) {
                // Bu MIUI surumunde yok; sonraki secenegi dene.
            }
        }
        val settingsIntent = Intent(
            Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
            Uri.fromParts("package", context.packageName, null)
        )
        settingsIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        try {
            context.startActivity(settingsIntent)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("FAILED", e.message ?: "Ayarlar acilamadi")
        }
    }
}
