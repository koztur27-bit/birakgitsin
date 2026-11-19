package com.birakgitsin.app

import android.content.Context
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

        // Standart disi bir broadcast yerine widget'lari dogrudan guncelle.
        BirakGitsinWidget.renderAll(context)
    }
}
