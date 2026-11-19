package com.birakgitsin.app

import android.content.Context
import android.database.sqlite.SQLiteDatabase
import org.json.JSONObject
import java.io.File
import java.text.NumberFormat
import java.util.Locale

/**
 * Widget, uygulama verisiniAsyncStorage'ın gerçek depolama alanından okur.
 *
 * @react-native-async-storage/async-storage Android'de veriyi SharedPreferences
 * yerine `RKStorage` SQLite veritabanındaki `catalystLocalStorage` tablosunda
 * tutar. Bu yüzden "Tasarruf: 0 ₺" sorunu, JS'ten gelen hazır metne güvenmek
 * yerine plan ve log kayıtlarının doğrudan okunup yeniden hesaplanmasıyla
 * kesin olarak çözülür.
 */
object WidgetStorage {
    private const val DATA_KEY = "@birakgitsin/data/v1"
    private const val TABLE = "catalystLocalStorage"
    private const val KEY_COLUMN = "key"
    private const val VALUE_COLUMN = "value"
    private val DATABASE_NAMES = listOf("RKStorage", "AsyncStorage")
    private val LEGACY_PREFS = listOf("RKStorage", "AsyncStorage")

    /** AsyncStorage'da saklanan ham uygulama verisi (JSON). */
    fun readRawData(context: Context): String? {
        for (name in DATABASE_NAMES) {
            val path = context.getDatabasePath(name).absolutePath
            if (!File(path).exists()) continue

            var db: SQLiteDatabase? = null
            try {
                // Widget ile uygulama aynı UID altında çalışır; READWRITE kullanmak
                // WAL dosyasındaki son yazımların da görünmesini sağlar.
                db = SQLiteDatabase.openDatabase(path, null, SQLiteDatabase.OPEN_READWRITE)
                val cursor = db.query(
                    TABLE,
                    arrayOf(VALUE_COLUMN),
                    "$KEY_COLUMN=?",
                    arrayOf(DATA_KEY),
                    null,
                    null,
                    null,
                )
                cursor.use {
                    if (it.moveToFirst()) {
                        val value = it.getString(0)
                        if (!value.isNullOrBlank()) return value
                    }
                }
            } catch (_: Exception) {
                // Bir sonraki depolama adayına geç.
            } finally {
                try {
                    db?.close()
                } catch (_: Exception) {
                    // Yoksay.
                }
            }
        }

        // Çok eski sürümlerde AsyncStorage SharedPreferences kullanıyordu.
        for (name in LEGACY_PREFS) {
            try {
                val value = context
                    .getSharedPreferences(name, Context.MODE_PRIVATE)
                    .getString(DATA_KEY, null)
                if (!value.isNullOrBlank()) return value
            } catch (_: Exception) {
                // Yoksay.
            }
        }
        return null
    }

    /**
     * Paket fiyatı, paketteki sigara sayısı ve günlük kayıtlardan toplam tasarrufu
     * hesaplar. Uygulamanın `totalMoneySaved()` fonksiyonuyla aynı formül.
     */
    fun readSavingsText(context: Context): String? {
        val raw = readRawData(context) ?: return null
        return try {
            val root = JSONObject(raw)
            val plan = root.optJSONObject("plan") ?: return null
            val packPrice = plan.optDouble("packPrice", 0.0)
            val cigarettesPerPack = plan.optDouble("cigarettesPerPack", 0.0)
            val baseline = plan.optDouble("baselinePerDay", 0.0)
            if (packPrice <= 0.0 || cigarettesPerPack <= 0.0 || baseline <= 0.0) return null

            val currency = plan.optString("currency", "₺").ifBlank { "₺" }
            var avoidedCigarettes = 0.0
            val logs = root.optJSONArray("logs")
            if (logs != null) {
                for (i in 0 until logs.length()) {
                    val log = logs.optJSONObject(i) ?: continue
                    val smoked = log.optDouble("smoked", 0.0)
                    avoidedCigarettes += maxOf(0.0, baseline - smoked)
                }
            }
            val total = avoidedCigarettes * (packPrice / cigarettesPerPack)

            val formatter = NumberFormat.getNumberInstance(Locale("tr", "TR"))
            formatter.minimumFractionDigits = 0
            formatter.maximumFractionDigits = 0
            "${formatter.format(total)} $currency".trim()
        } catch (_: Exception) {
            null
        }
    }
}
