package com.birakgitsin.app

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent

class BirakGitsinWidget4x2 : AppWidgetProvider() {
    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        BirakGitsinWidget.render(
            context,
            appWidgetManager,
            appWidgetIds,
            R.layout.birakgitsin_widget_4x2,
            true,
            true,
            BirakGitsinWidget4x2::class.java,
            104,
            204,
        )
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        when (intent.action) {
            BirakGitsinWidget.ACTION_REFRESH -> {
                BirakGitsinWidget.renderProvider(context, BirakGitsinWidget4x2::class.java)
                BirakGitsinWidget.showRefreshFeedback(context)
            }
            BirakGitsinWidget.ACTION_ADD_SMOKED -> {
                BirakGitsinWidget.handleAddSmoked(context)
            }
        }
    }
}
