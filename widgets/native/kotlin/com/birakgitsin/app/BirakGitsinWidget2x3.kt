package com.birakgitsin.app

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent

class BirakGitsinWidget2x3 : AppWidgetProvider() {
    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        BirakGitsinWidget.render(
            context,
            appWidgetManager,
            appWidgetIds,
            R.layout.birakgitsin_widget_2x3,
            true,
            true,
            BirakGitsinWidget2x3::class.java,
            103,
        )
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        if (intent.action == BirakGitsinWidget.ACTION_REFRESH) {
            BirakGitsinWidget.renderProvider(context, BirakGitsinWidget2x3::class.java)
            BirakGitsinWidget.showRefreshFeedback(context)
        }
    }
}
