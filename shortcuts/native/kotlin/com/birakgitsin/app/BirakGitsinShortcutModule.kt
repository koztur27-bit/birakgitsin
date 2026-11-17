package com.birakgitsin.app

import android.content.Context
import android.content.Intent
import android.content.pm.ShortcutInfo
import android.content.pm.ShortcutManager
import android.graphics.drawable.Icon
import android.os.Build
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise

class BirakGitsinShortcutModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    override fun getName(): String = "BirakGitsinShortcut"

    @ReactMethod
    fun pinShortcut(promise: Promise) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            promise.reject("UNSUPPORTED", "Android 8+ gerekli")
            return
        }
        val context = reactApplicationContext
        val shortcutManager = context.getSystemService(Context.SHORTCUT_SERVICE) as ShortcutManager
        if (!shortcutManager.isRequestPinShortcutSupported) {
            promise.reject("UNSUPPORTED", "Launcher kısayol desteklemiyor")
            return
        }
        val intent = Intent(context, MainActivity::class.java).apply {
            action = Intent.ACTION_VIEW
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        val shortcut = ShortcutInfo.Builder(context, "birakgitsin_shortcut")
            .setShortLabel("Bırak Gitsin")
            .setLongLabel("Bırak Gitsin aç")
            .setIcon(Icon.createWithResource(context, R.mipmap.ic_launcher))
            .setIntent(intent)
            .build()
        val ok = shortcutManager.requestPinShortcut(shortcut, null)
        if (ok) promise.resolve(true) else promise.reject("FAILED", "Kısayol eklenemedi")
    }
}
