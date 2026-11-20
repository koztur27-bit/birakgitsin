package com.birakgitsin.app

import android.content.Context
import android.database.Cursor
import android.database.sqlite.SQLiteDatabase
import org.json.JSONObject
import java.io.File
import java.text.NumberFormat
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Locale

/**
 * Widget, uygulama verisini AsyncStorage'ın gerçek depolama alanından okur.
 *
 * @react-native-async-storage/async-storage Android'de veriyi iki farklı şemada
 * tutabilir:
 *  - eski: `RKStorage` veritabanı / `catalystLocalStorage` tablosu
 *  - yeni: `AsyncStorage` veritabanı / `Storage` tablosu
 * Bu yüzden her iki (veritabanı, tablo) çifti denenir.
 */
object WidgetStorage {
    private const val DATA_KEY = "@birakgitsin/data/v1"
    private const val MS_DAY = 24L * 60L * 60L * 1000L
    private const val MS_HOUR = 60L * 60L * 1000L

    private data class StorageSpec(val database: String, val table: String)

    private val STORAGES = listOf(
        StorageSpec("RKStorage", "catalystLocalStorage"),
        StorageSpec("AsyncStorage", "Storage"),
        StorageSpec("AsyncStorage", "catalystLocalStorage"),
        StorageSpec("RKStorage", "Storage"),
    )

    private val LEGACY_PREFS = listOf("RKStorage", "AsyncStorage")

    data class WidgetData(
        val quitText: String,
        val savingsText: String,
    )

    fun readLanguage(context: Context): String {
        val raw = readRawData(context)
        if (raw != null) {
            try {
                val root = JSONObject(raw)
                val lang = root.optString("language", "")
                if (lang == "tr" || lang == "en") return lang
            } catch (_: Exception) {
            }
        }
        return try {
            val prefs = context.getSharedPreferences("BirakGitsinWidget", Context.MODE_PRIVATE)
            val lang = prefs.getString("language", "tr") ?: "tr"
            if (lang == "en") "en" else "tr"
        } catch (_: Exception) {
            "tr"
        }
    }

    /** AsyncStorage'da saklanan ham uygulama verisi (JSON). */
    fun readRawData(context: Context): String? {
        for (spec in STORAGES) {
            val path = context.getDatabasePath(spec.database).absolutePath
            if (!File(path).exists()) continue

            var db: SQLiteDatabase? = null
            try {
                // Widget ile uygulama aynı UID altında çalışır; READWRITE kullanmak
                // WAL dosyasındaki son yazımların da görünmesini sağlar.
                db = SQLiteDatabase.openDatabase(path, null, SQLiteDatabase.OPEN_READWRITE)
                val columns = db.rawQuery("PRAGMA table_info(`${spec.table}`)", null)
                val exists = columns.use { it.moveToFirst() }
                if (!exists) continue

                val cursor: Cursor = db.query(
                    spec.table,
                    arrayOf("value"),
                    "`key`=?",
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

    /** Plan + günlük kayıtlardan sayaç ve tasarrufu yeniden hesaplar. */
    fun readWidgetData(context: Context): WidgetData? {
        val raw = readRawData(context) ?: return null
        return try {
            val root = JSONObject(raw)
            val plan = root.optJSONObject("plan") ?: return null
            val startDate = plan.optString("startDate", "")
            if (startDate.isBlank()) return null
            val lang = root.optString("language", readLanguage(context))
            val quitText = computeQuitText(startDate, lang) ?: return null
            val savingsText = computeSavingsText(plan, root) ?: return null
            WidgetData(quitText, savingsText)
        } catch (_: Exception) {
            null
        }
    }

    /**
     * Plan başlangıcından bugüne geçen süre (gün/saat) - JS elapsedDays ile uyumlu.
     */
    fun readQuitText(context: Context): String? {
        val raw = readRawData(context) ?: return null
        return try {
            val root = JSONObject(raw)
            val plan = root.optJSONObject("plan") ?: return null
            val startDate = plan.optString("startDate", "")
            if (startDate.isBlank()) return null
            val lang = root.optString("language", readLanguage(context))
            computeQuitText(startDate, lang)
        } catch (_: Exception) {
            null
        }
    }

    /**
     * Plan + günlük kayıtlardan toplam tasarrufu hesaplar.
     *
     * Uygulamanın `avoidedCigarettesTotal()` / `totalMoneySaved()` fonksiyonuyla
     * aynı formül kullanılır: başlangıçtan bugüne kadar geçen süre için günlük
     * hedef, o gün için kayıt varsa içilen adet düşülür. Kayıt olmayan günler
     * "hiç sigara içilmedi" kabul edilir.
     */
    fun readSavingsText(context: Context): String? {
        val raw = readRawData(context) ?: return null
        return try {
            val root = JSONObject(raw)
            val plan = root.optJSONObject("plan") ?: return null
            computeSavingsText(plan, root)
        } catch (_: Exception) {
            null
        }
    }

    private fun parseStartMidnight(startDate: String): Long? {
        val parts = startDate.split("-").mapNotNull { it.toIntOrNull() }
        if (parts.size != 3) return null
        return try {
            val calendar = Calendar.getInstance().apply {
                isLenient = false
                set(parts[0], parts[1] - 1, parts[2], 0, 0, 0)
                set(Calendar.MILLISECOND, 0)
            }
            calendar.timeInMillis
        } catch (_: Exception) {
            null
        }
    }

    private fun computeQuitText(startDate: String, language: String = "tr"): String? {
        val startMidnight = parseStartMidnight(startDate) ?: return null
        val now = System.currentTimeMillis()
        val elapsedMs = maxOf(0L, now - startMidnight)
        val days = (elapsedMs / MS_DAY).toInt()
        val hours = ((elapsedMs % MS_DAY) / MS_HOUR).toInt()
        val hh = String.format(Locale.US, "%02d", hours)
        return if (language == "en") "$days days $hh hrs" else "$days gün $hh saat"
    }

    fun formatQuitText(days: Int, hours: Int, language: String): String {
        val hh = String.format(Locale.US, "%02d", hours)
        return if (language == "en") "$days days $hh hrs" else "$days gün $hh saat"
    }

    private fun computeSavingsText(plan: JSONObject, root: JSONObject): String? {
        val packPrice = plan.optDouble("packPrice", 0.0)
        val cigarettesPerPack = plan.optDouble("cigarettesPerPack", 0.0)
        val baseline = plan.optDouble("baselinePerDay", 0.0)
        val startDate = plan.optString("startDate", "")
        if (packPrice <= 0.0 || cigarettesPerPack <= 0.0 || baseline <= 0.0 || startDate.isBlank()) {
            return null
        }
        val currency = plan.optString("currency", "₺").ifBlank { "₺" }
        val startMidnight = parseStartMidnight(startDate) ?: return null

        val nowCal = Calendar.getInstance()
        val today = Calendar.getInstance().apply {
            set(Calendar.HOUR_OF_DAY, 0)
            set(Calendar.MINUTE, 0)
            set(Calendar.SECOND, 0)
            set(Calendar.MILLISECOND, 0)
        }
        val todayMidnight = today.timeInMillis
        val wholeDays = maxOf(
            0,
            Math.round((todayMidnight - startMidnight).toDouble() / MS_DAY).toInt(),
        )
        val dayFraction = maxOf(
            0.0,
            minOf(1.0, (nowCal.timeInMillis - todayMidnight).toDouble() / MS_DAY),
        )

        val smokedByDate = HashMap<String, Double>()
        val logs = root.optJSONArray("logs")
        if (logs != null) {
            for (i in 0 until logs.length()) {
                val log = logs.optJSONObject(i) ?: continue
                val date = log.optString("date", "")
                if (date.isNotBlank()) {
                    smokedByDate[date] = log.optDouble("smoked", 0.0)
                }
            }
        }

        val dateFormat = SimpleDateFormat("yyyy-MM-dd", Locale.US)
        var avoided = 0.0
        val day = Calendar.getInstance().apply { timeInMillis = startMidnight }
        for (i in 0 until wholeDays) {
            val key = dateFormat.format(day.time)
            val smoked = smokedByDate[key] ?: 0.0
            avoided += maxOf(0.0, baseline - smoked)
            day.add(Calendar.DAY_OF_MONTH, 1)
        }

        val todayKey = dateFormat.format(today.time)
        val todaySmoked = smokedByDate[todayKey] ?: 0.0
        avoided += maxOf(0.0, baseline * dayFraction - todaySmoked)

        val total = avoided * (packPrice / cigarettesPerPack)
        val formatter = NumberFormat.getNumberInstance(Locale("tr", "TR"))
        formatter.minimumFractionDigits = 0
        formatter.maximumFractionDigits = 0
        return "${formatter.format(total)} $currency".trim()
    }
}
