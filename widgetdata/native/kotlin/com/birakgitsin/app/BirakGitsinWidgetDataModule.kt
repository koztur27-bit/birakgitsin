package com.birakgitsin.app

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class BirakGitsinWidgetDataModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    override fun getName(): String = "BirakGitsinWidgetData"

    @ReactMethod
    fun updateWidgetData(
        smoked: Int,
        goal: Int,
        saved: Double,
        streak: Int,
        nextWindow: String,
        quitText: String,
        savingsText: String
    ) {
        val context = reactApplicationContext
        // JS hesabını da AsyncStorage'dan okunan gerçek değerle doğrula.
        val resolvedSavings = WidgetStorage.readSavingsText(context) ?: savingsText
        val prefs = context.getSharedPreferences("BirakGitsinWidget", Context.MODE_PRIVATE)
        prefs.edit()
            .putInt("todaySmoked", smoked)
            .putInt("todayGoal", goal)
            .putFloat("savedTotal", saved.toFloat())
            .putInt("streak", streak)
            .putString("nextWindow", nextWindow)
            .putString("quitText", quitText)
            .putString("savingsText", resolvedSavings)
            .apply()

        forceRefresh()
    }

    /**
     * Uygulama açılırken/arka plana geçerken widget'ları zorla yeniler.
     * Doğrudan render + resmi ACTION_APPWIDGET_UPDATE broadcast'i birlikte
     * kullanılır; bazı launcher'lar yalnızca broadcast'i dinler.
     */
    @ReactMethod
    fun forceRefresh() {
        val context = reactApplicationContext
        BirakGitsinWidget.renderAll(context)

        val manager = AppWidgetManager.getInstance(context)
        val providers = listOf(
            BirakGitsinWidget1x2::class.java,
            BirakGitsinWidget2x2::class.java,
            BirakGitsinWidget2x3::class.java,
            BirakGitsinWidget4x2::class.java,
        )
        for (provider in providers) {
            val ids = manager.getAppWidgetIds(ComponentName(context, provider))
            if (ids.isEmpty()) continue
            val intent = Intent(context, provider)
            intent.action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
            intent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids)
            context.sendBroadcast(intent)
        }
    }
}
