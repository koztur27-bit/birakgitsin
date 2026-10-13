package expo.modules.bgstatus

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
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

  override fun definition() = ModuleDefinition {
    Name("BgStatus")

    Function("showCountdown") { title: String, body: String, endAtMs: Double, channelId: String ->
      val context = appContext.reactContext ?: return@Function false
      ensureChannel(context, channelId)

      val now = System.currentTimeMillis()
      val useChronometer = endAtMs > now

      val builder = NotificationCompat.Builder(context, channelId)
        .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
        .setContentTitle(title)
        .setContentText(body)
        .setOngoing(true)
        .setOnlyAlertOnce(true)
        .setShowWhen(true)
        .setAutoCancel(false)
        .setCategory(NotificationCompat.CATEGORY_STOPWATCH)
        .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
        .setPriority(NotificationCompat.PRIORITY_DEFAULT)

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
