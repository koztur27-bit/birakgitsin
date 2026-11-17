package com.birakgitsin.app

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context

class BirakGitsinWidget2x2 : AppWidgetProvider() {
    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        BirakGitsinWidget.updateAll(context, appWidgetManager, appWidgetIds)
    }
    override fun onReceive(context: Context, intent: android.content.Intent) {
        super.onReceive(context, intent)
        if (intent.action == "com.birakgitsin.app.WIDGET_UPDATE") {
            val m = AppWidgetManager.getInstance(context)
            val ids = m.getAppWidgetIds(android.content.ComponentName(context, BirakGitsinWidget2x2::class.java))
            BirakGitsinWidget.updateAll(context, m, ids)
        }
    }
}
