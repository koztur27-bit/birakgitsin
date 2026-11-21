package com.birakgitsin.app

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent

class BirakGitsinWidget1x2 : AppWidgetProvider() {
    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        BirakGitsinWidget.render(
            context,
            appWidgetManager,
            appWidgetIds,
            R.layout.birakgitsin_widget_1x2,
            false,
            false,
            BirakGitsinWidget1x2::class.java,
            101,
            201,
        )
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        when (intent.action) {
            BirakGitsinWidget.ACTION_REFRESH -> {
                BirakGitsinWidget.renderProvider(context, BirakGitsinWidget1x2::class.java)
                BirakGitsinWidget.showRefreshFeedback(context)
            }
            BirakGitsinWidget.ACTION_ADD_SMOKED -> {
                BirakGitsinWidget.handleAddSmoked(context)
            }
        }
    }
}
