package com.birakgitsin.app

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews

private data class WidgetSpec(
    val cls: Class<*>,
    val layoutRes: Int,
    val showSavings: Boolean,
    val showNext: Boolean
)

open class BirakGitsinWidget : AppWidgetProvider() {
    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        render(context, appWidgetManager, appWidgetIds, R.layout.birakgitsin_widget_2x2, true, true)
    }

    companion object {
        /** Ana ekrandaki tum widget'lari tek seferde gunceller (yayin yerine dogrudan). */
        fun renderAll(context: Context) {
            val manager = AppWidgetManager.getInstance(context)
            val specs = listOf(
                WidgetSpec(BirakGitsinWidget1x2::class.java, R.layout.birakgitsin_widget_1x2, false, false),
                WidgetSpec(BirakGitsinWidget2x2::class.java, R.layout.birakgitsin_widget_2x2, true, true),
                WidgetSpec(BirakGitsinWidget2x3::class.java, R.layout.birakgitsin_widget_2x3, true, true),
                WidgetSpec(BirakGitsinWidget4x2::class.java, R.layout.birakgitsin_widget_4x2, true, true)
            )
            for (spec in specs) {
                val ids = manager.getAppWidgetIds(ComponentName(context, spec.cls))
                if (ids.isNotEmpty()) {
                    render(context, manager, ids, spec.layoutRes, spec.showSavings, spec.showNext)
                }
            }
        }

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
