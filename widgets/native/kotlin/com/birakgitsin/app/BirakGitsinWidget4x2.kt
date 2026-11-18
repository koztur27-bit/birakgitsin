package com.birakgitsin.app

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews

class BirakGitsinWidget4x2 : AppWidgetProvider() {
    override fun onUpdate(context: Context, manager: AppWidgetManager, appWidgetIds: IntArray) {
        render(context, manager, appWidgetIds)
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        if (intent.action == "com.birakgitsin.app.WIDGET_UPDATE") {
            val manager = AppWidgetManager.getInstance(context)
            val ids = manager.getAppWidgetIds(ComponentName(context, BirakGitsinWidget4x2::class.java))
            render(context, manager, ids)
        }
    }

    private fun render(context: Context, manager: AppWidgetManager, ids: IntArray) {
        val prefs = context.getSharedPreferences("BirakGitsinWidget", Context.MODE_PRIVATE)
        val quitText = prefs.getString("quitText", "0 gün 00 saat") ?: "0 gün 00 saat"
        val savingsText = prefs.getString("savingsText", "0 ₺") ?: "0 ₺"
        val nextWindow = prefs.getString("nextWindow", "--:--") ?: "--:--"

        for (id in ids) {
            val views = RemoteViews(context.packageName, R.layout.birakgitsin_widget_4x2)
            views.setTextViewText(R.id.widget_quit_counter_4x2, quitText)
            views.setTextViewText(R.id.widget_savings_4x2, savingsText)
            views.setTextViewText(R.id.widget_next_4x2, "Sıradaki pencere $nextWindow")

            val launch = context.packageManager.getLaunchIntentForPackage(context.packageName)
            if (launch != null) {
                launch.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
                val pending = PendingIntent.getActivity(
                    context,
                    42,
                    launch,
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )
                views.setOnClickPendingIntent(R.id.widget_root_4x2, pending)
                views.setOnClickPendingIntent(R.id.widget_open_4x2, pending)
            }
            manager.updateAppWidget(id, views)
        }
    }
}
