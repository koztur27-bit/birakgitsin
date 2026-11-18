package com.birakgitsin.app

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
        val prefs = context.getSharedPreferences("BirakGitsinWidget", Context.MODE_PRIVATE)
        prefs.edit()
            .putInt("todaySmoked", smoked)
            .putInt("todayGoal", goal)
            .putFloat("savedTotal", saved.toFloat())
            .putInt("streak", streak)
            .putString("nextWindow", nextWindow)
            .putString("quitText", quitText)
            .putString("savingsText", savingsText)
            .apply()

        val intent = Intent("com.birakgitsin.app.WIDGET_UPDATE")
        intent.setPackage(context.packageName)
        context.sendBroadcast(intent)
    }
}
