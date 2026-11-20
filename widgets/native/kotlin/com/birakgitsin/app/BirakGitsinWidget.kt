package com.birakgitsin.app

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.widget.RemoteViews
import android.widget.Toast

internal data class WidgetSpec(
    val cls: Class<*>,
    val layoutRes: Int,
    val showSavings: Boolean,
    val showNext: Boolean,
    val refreshRequestCode: Int,
)

open class BirakGitsinWidget : AppWidgetProvider() {
    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        render(
            context,
            appWidgetManager,
            appWidgetIds,
            R.layout.birakgitsin_widget_2x2,
            true,
            true,
            BirakGitsinWidget2x2::class.java,
            102,
        )
    }

    companion object {
        const val ACTION_REFRESH = "com.birakgitsin.app.ACTION_REFRESH_WIDGET"

        internal fun specs() = listOf(
            WidgetSpec(BirakGitsinWidget1x2::class.java, R.layout.birakgitsin_widget_1x2, false, false, 101),
            WidgetSpec(BirakGitsinWidget2x2::class.java, R.layout.birakgitsin_widget_2x2, true, true, 102),
            WidgetSpec(BirakGitsinWidget2x3::class.java, R.layout.birakgitsin_widget_2x3, true, true, 103),
            WidgetSpec(BirakGitsinWidget4x2::class.java, R.layout.birakgitsin_widget_4x2, true, true, 104),
        )

        /** Ana ekrandaki tum widget'lari tek seferde gunceller (yayin yerine dogrudan). */
        fun renderAll(context: Context) {
            val manager = AppWidgetManager.getInstance(context)
            for (spec in specs()) {
                val ids = manager.getAppWidgetIds(ComponentName(context, spec.cls))
                if (ids.isNotEmpty()) {
                    render(
                        context,
                        manager,
                        ids,
                        spec.layoutRes,
                        spec.showSavings,
                        spec.showNext,
                        spec.cls,
                        spec.refreshRequestCode,
                    )
                }
            }
        }

        fun render(
            context: Context,
            appWidgetManager: AppWidgetManager,
            appWidgetIds: IntArray,
            layoutRes: Int,
            showSavings: Boolean,
            showNext: Boolean,
            providerClass: Class<*>? = null,
            refreshRequestCode: Int = 0,
        ) {
            val prefs = context.getSharedPreferences("BirakGitsinWidget", Context.MODE_PRIVATE)
            val lang = try {
                val raw = WidgetStorage.readRawData(context)
                val fromData = if (raw != null) org.json.JSONObject(raw).optString("language", "") else ""
                if (fromData == "en" || fromData == "tr") fromData else (prefs.getString("language", "tr") ?: "tr")
            } catch (_: Exception) {
                prefs.getString("language", "tr") ?: "tr"
            }
            val isEn = lang == "en"
            val computed = WidgetStorage.readWidgetData(context)
            val defaultQuit = if (isEn) "0 days 00 hrs" else "0 gün 00 saat"
            val quitText = computed?.quitText
                ?: prefs.getString("quitText", null)?.takeIf { it.isNotBlank() }
                ?: defaultQuit
            val savingsText = computed?.savingsText
                ?: WidgetStorage.readSavingsText(context)
                ?: prefs.getString("savingsText", "0 ₺")
                ?: "0 ₺"
            val nextWindow = prefs.getString("nextWindow", "--:--") ?: "--:--"
            val savingsLabel = if (isEn) "Saved" else "Tasarruf"
            val nextLabel = if (isEn) "Next window" else "Sıradaki pencere"

            // Hesaplanan değerleri prefs'e de yaz ki sonraki okumalar tutarlı kalsın.
            try {
                prefs.edit()
                    .putString("quitText", quitText)
                    .putString("savingsText", savingsText)
                    .putString("language", if (isEn) "en" else "tr")
                    .apply()
            } catch (_: Exception) {
            }

            val launch = context.packageManager.getLaunchIntentForPackage(context.packageName)
            val pending = launch?.let {
                it.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
                PendingIntent.getActivity(
                    context,
                    42,
                    it,
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
                )
            }

            val refreshPending = if (providerClass != null) {
                val refreshIntent = Intent(context, providerClass).apply {
                    action = ACTION_REFRESH
                }
                PendingIntent.getBroadcast(
                    context,
                    refreshRequestCode,
                    refreshIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
                )
            } else {
                null
            }

            for (id in appWidgetIds) {
                val views = RemoteViews(context.packageName, layoutRes)
                views.setTextViewText(R.id.widget_counter, quitText)
                if (showSavings) {
                    views.setTextViewText(R.id.widget_savings, "$savingsLabel: $savingsText")
                }
                if (showNext) {
                    views.setTextViewText(R.id.widget_next, "$nextLabel $nextWindow")
                }
                if (pending != null) {
                    views.setOnClickPendingIntent(R.id.widget_root, pending)
                    views.setOnClickPendingIntent(R.id.widget_open, pending)
                }
                if (refreshPending != null) {
                    try {
                        views.setOnClickPendingIntent(R.id.widget_refresh, refreshPending)
                    } catch (_: Exception) {
                        // Eski layout'larda widget_refresh olmayabilir.
                    }
                }
                appWidgetManager.updateAppWidget(id, views)
            }
        }

        fun renderProvider(context: Context, providerClass: Class<*>) {
            val spec = specs().firstOrNull { it.cls == providerClass } ?: return
            val manager = AppWidgetManager.getInstance(context)
            val ids = manager.getAppWidgetIds(ComponentName(context, spec.cls))
            if (ids.isNotEmpty()) {
                render(
                    context,
                    manager,
                    ids,
                    spec.layoutRes,
                    spec.showSavings,
                    spec.showNext,
                    spec.cls,
                    spec.refreshRequestCode,
                )
            }
        }

        fun showRefreshFeedback(context: Context) {
            try {
                val lang = WidgetStorage.readLanguage(context)
                val msg = if (lang == "en") "Refreshed" else "Yenilendi"
                Toast.makeText(context, msg, Toast.LENGTH_SHORT).show()
            } catch (_: Exception) {
            }
            try {
                val vibrator = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                    val vm = context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as VibratorManager
                    vm.defaultVibrator
                } else {
                    @Suppress("DEPRECATION")
                    context.getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
                }
                if (!vibrator.hasVibrator()) return
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    vibrator.vibrate(VibrationEffect.createOneShot(40, VibrationEffect.DEFAULT_AMPLITUDE))
                } else {
                    @Suppress("DEPRECATION")
                    vibrator.vibrate(40)
                }
            } catch (_: Exception) {
            }
        }
    }
}
