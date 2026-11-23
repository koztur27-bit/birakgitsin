package expo.modules.bgstatus

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.net.Uri
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

// Zamanlayıcıyı bildirimde Android'in KENDİ kronometresiyle gösterir.
// Böylece sayaç, JavaScript/uygulama arka planda dondurulmuş olsa bile
// sistem tarafından saniye saniye işlenir.
class BgStatusModule : Module() {
  private val tag = "birakgitsin-status"
  private val notifyId = 0x0B67
  private var sosLabel = "🆘 Kriz"
  private var resistedLabel = "💪 +1 Dayandım"
  private var smokedLabel = "🚬 +1 İçtim"
  private var pendingQuickAction: String? = null

  override fun definition() = ModuleDefinition {
    Name("BgStatus")

    Function("setQuickActionLabels") { sos: String, resisted: String, smoked: String ->
      sosLabel = sos
      resistedLabel = resisted
      smokedLabel = smoked
      true
    }

    Function("getPendingQuickAction") {
      val fromIntent = (appContext.reactContext as? android.app.Activity)
        ?.intent?.getStringExtra("birakgitsin_quick_action")
      val action = pendingQuickAction ?: fromIntent
      pendingQuickAction = null
      // Aynı aksiyonun tekrar tüketilmemesi için activity extras temizlenir.
      (appContext.reactContext as? android.app.Activity)?.intent?.removeExtra("birakgitsin_quick_action")
      action
    }

    Function("showCountdown") { title: String, body: String, endAtMs: Double, channelId: String ->
      val context = appContext.reactContext ?: return@Function false
      ensureChannel(context, channelId)

      val now = System.currentTimeMillis()
      val useChronometer = endAtMs > now

      var smallIconId = context.resources.getIdentifier(
        "ic_notification", "drawable", context.packageName
      )
      if (smallIconId == 0) {
        smallIconId = context.resources.getIdentifier(
          "notification_icon", "drawable", context.packageName
        )
      }
      val builder = NotificationCompat.Builder(context, channelId)
        .setSmallIcon(if (smallIconId != 0) smallIconId else android.R.drawable.ic_lock_idle_alarm)
        .setColor(Color.parseColor("#1E62D0"))
        .setContentTitle(title)
        .setContentText(body)
        .setOngoing(true)
        .setOnlyAlertOnce(true)
        .setShowWhen(true)
        .setAutoCancel(false)
        .setCategory(NotificationCompat.CATEGORY_STOPWATCH)
        .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
        .setPriority(NotificationCompat.PRIORITY_DEFAULT)

      // Bildirim kartının sağında tam renkli logo (Android largeIcon).
      val largeIconId = context.resources.getIdentifier(
        "ic_notification_large", "drawable", context.packageName
      )
      if (largeIconId != 0) {
        android.graphics.BitmapFactory.decodeResource(context.resources, largeIconId)?.let {
          builder.setLargeIcon(it)
        }
      }

      // Hızlı aksiyonlar: Kriz, +1 Dayandım ve +1 İçtim (aynı sırayla).
      quickActionPendingIntent(context, "SOS_ACTION")?.let {
        builder.addAction(android.R.drawable.ic_dialog_info, sosLabel, it)
      }
      quickActionPendingIntent(context, "RESISTED_ACTION")?.let {
        builder.addAction(android.R.drawable.ic_menu_add, resistedLabel, it)
      }
      quickActionPendingIntent(context, "SMOKED_ACTION")?.let {
        builder.addAction(android.R.drawable.ic_menu_save, smokedLabel, it)
      }

      if (useChronometer) {
        builder.setWhen(endAtMs.toLong())
        builder.setUsesChronometer(true)
        builder.setChronometerCountDown(true)
      } else {
        builder.setWhen(now)
        builder.setUsesChronometer(false)
      }

      NotificationManagerCompat.from(context).notify(tag, notifyId, builder.build())
      true
    }

    Function("clear") {
      val context = appContext.reactContext ?: return@Function false
      NotificationManagerCompat.from(context).cancel(tag, notifyId)
      true
    }
  }

  private fun quickActionPendingIntent(context: Context, action: String): PendingIntent? {
    val intent = context.packageManager.getLaunchIntentForPackage(context.packageName) ?: return null
    intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
    intent.putExtra("birakgitsin_quick_action", action)
    val flags = PendingIntent.FLAG_UPDATE_CURRENT or
      (if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) PendingIntent.FLAG_MUTABLE else 0)
    return PendingIntent.getActivity(context, action.hashCode(), intent, flags)
  }

  private fun ensureChannel(context: Context, channelId: String) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager ?: return
    if (manager.getNotificationChannel(channelId) != null) return

    val channel = NotificationChannel(
      channelId,
      "Kilit ekranı durumu",
      NotificationManager.IMPORTANCE_DEFAULT,
    )
    // MIUI sessiz (sound=null) kanalları kilit ekranında gizliyor: duyulmayan
    // bir ses (res/raw/silent.wav) tanımlayıp "normal" bildirim yapıyoruz.
    val soundId = context.resources.getIdentifier("silent", "raw", context.packageName)
    if (soundId != 0) {
      channel.setSound(Uri.parse("android.resource://${context.packageName}/$soundId"), null)
    }
    channel.enableVibration(false)
    channel.enableLights(false)
    channel.setShowBadge(false)
    channel.lockscreenVisibility = Notification.VISIBILITY_PUBLIC
    manager.createNotificationChannel(channel)
  }
}
