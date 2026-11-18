package com.birakgitsin.app

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent

class BirakGitsinWidget2x2 : AppWidgetProvider() {
    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        BirakGitsinWidget.render(
            context,
            appWidgetManager,
            appWidgetIds,
            R.layout.birakgitsin_widget_2x2,
            true,
            true
        )
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        if (intent.action == "com.birakgitsin.app.WIDGET_UPDATE") {
            val manager = AppWidgetManager.getInstance(context)
            val ids = manager.getAppWidgetIds(ComponentName(context, BirakGitsinWidget2x2::class.java))
            BirakGitsinWidget.render(
                context,
                manager,
                ids,
                R.layout.birakgitsin_widget_2x2,
                true,
                true
            )
        }
    }
}
