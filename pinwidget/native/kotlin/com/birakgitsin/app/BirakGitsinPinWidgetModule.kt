package com.birakgitsin.app

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.os.Build
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise

class BirakGitsinPinWidgetModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    override fun getName(): String = "BirakGitsinPinWidget"

    @ReactMethod
    fun pinWidget(size: String, promise: Promise) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            promise.reject("UNSUPPORTED", "Android 8+ gerekli")
            return
        }
        val context = reactApplicationContext
        val appWidgetManager = context.getSystemService(Context.APPWIDGET_SERVICE) as AppWidgetManager
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
        val ok = appWidgetManager.requestPinAppWidget(provider, null, null)
        if (ok) promise.resolve(true) else promise.reject("FAILED", "Widget sabitlenemedi")
    }
}
