package com.birakgitsin.app

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews

open class BirakGitsinWidget : AppWidgetProvider() {
    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        render(context, appWidgetManager, appWidgetIds, R.layout.birakgitsin_widget_2x2, true, true)
    }

    companion object {
        fun render(
            context: Context,
            appWidgetManager: AppWidgetManager,
            appWidgetIds: IntArray,
            layoutRes: Int,
            showSavings: Boolean,
            showNext: Boolean
        ) {
            val prefs = context.getSharedPreferences("BirakGitsinWidget", Context.MODE_PRIVATE)
            val quitText = prefs.getString("quitText", "0 gün 00 saat") ?: "0 gün 00 saat"
            val savingsText = prefs.getString("savingsText", "0 ₺") ?: "0 ₺"
            val nextWindow = prefs.getString("nextWindow", "--:--") ?: "--:--"

            val launch = context.packageManager.getLaunchIntentForPackage(context.packageName)
            val pending = launch?.let {
                it.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
                PendingIntent.getActivity(
                    context,
                    42,
                    it,
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )
            }

            for (id in appWidgetIds) {
                val views = RemoteViews(context.packageName, layoutRes)
                views.setTextViewText(R.id.widget_counter, quitText)
                if (showSavings) {
                    views.setTextViewText(R.id.widget_savings, "Tasarruf: $savingsText")
                }
                if (showNext) {
                    views.setTextViewText(R.id.widget_next, "Sıradaki pencere $nextWindow")
                }
                if (pending != null) {
                    views.setOnClickPendingIntent(R.id.widget_root, pending)
                    views.setOnClickPendingIntent(R.id.widget_open, pending)
                }
                appWidgetManager.updateAppWidget(id, views)
            }
        }
    }
}
