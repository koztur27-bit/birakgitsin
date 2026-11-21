package com.birakgitsin.app

import android.content.ContentValues
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
        val todaySmoked: Int = 0,
        val todayGoal: Int = 0,
    )

    data class TodayInfo(val smoked: Int, val goal: Int)
    data class AddSmokeResult(val smoked: Int, val goal: Int)

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
            val logs = root.optJSONArray("logs") ?: org.json.JSONArray()
            val todayInfo = computeTodayInfo(plan, logs)
            WidgetData(quitText, savingsText, todayInfo.smoked, todayInfo.goal)
        } catch (_: Exception) {
            null
        }
    }

    fun readTodayInfo(context: Context): TodayInfo? {
        val raw = readRawData(context) ?: return null
        return try {
            val root = JSONObject(raw)
            val plan = root.optJSONObject("plan") ?: return null
            val logs = root.optJSONArray("logs") ?: org.json.JSONArray()
            computeTodayInfo(plan, logs)
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

    private fun dayKey(cal: Calendar): String {
        val y = cal.get(Calendar.YEAR)
        val m = cal.get(Calendar.MONTH) + 1
        val d = cal.get(Calendar.DAY_OF_MONTH)
        return String.format(Locale.US, "%04d-%02d-%02d", y, m, d)
    }

    private fun addDaysKey(startDate: String, days: Int): String {
        val start = parseStartMidnight(startDate) ?: return startDate
        val cal = Calendar.getInstance().apply { timeInMillis = start; add(Calendar.DAY_OF_MONTH, days) }
        return dayKey(cal)
    }

    private fun daysSinceStart(startDate: String, dateKey: String): Int {
        val start = parseStartMidnight(startDate) ?: return 0
        val parts = dateKey.split("-").mapNotNull { it.toIntOrNull() }
        if (parts.size != 3) return 0
        val target = Calendar.getInstance().apply {
            isLenient = false
            set(parts[0], parts[1] - 1, parts[2], 0, 0, 0)
            set(Calendar.MILLISECOND, 0)
        }.timeInMillis
        return maxOf(0, Math.round((target - start).toDouble() / MS_DAY).toInt())
    }

    private fun toMin(hhmm: String): Int {
        val parts = hhmm.split(":").mapNotNull { it.toIntOrNull() }
        if (parts.size != 2) return 0
        return parts[0] * 60 + parts[1]
    }

    private fun isTimeInWindow(min: Int, start: String, end: String): Boolean {
        val sMin = toMin(start)
        val eMin = toMin(end)
        return if (eMin > sMin) min >= sMin && min < eMin else min >= sMin || min < eMin
    }

    private fun currentWindowIndex(plan: JSONObject): Int {
        val windows = plan.optJSONArray("windows") ?: return -1
        val now = Calendar.getInstance()
        val min = now.get(Calendar.HOUR_OF_DAY) * 60 + now.get(Calendar.MINUTE)
        for (i in 0 until windows.length()) {
            val w = windows.optJSONObject(i) ?: continue
            if (isTimeInWindow(min, w.optString("start", "00:00"), w.optString("end", "00:00"))) return i
        }
        return -1
    }

    private fun gentleCapForHeavy(baseline: Double): Int = if (baseline >= 30) 1 else 2

    private fun computeDailyGoal(plan: JSONObject, logsArr: org.json.JSONArray, dateKey: String): Int {
        val baseline = plan.optDouble("baselinePerDay", 0.0)
        val weeklyReduction = plan.optDouble("weeklyReduction", 0.0)
        val adaptive = plan.optBoolean("adaptive", true)
        val heavySmokerMode = plan.optBoolean("heavySmokerMode", false)
        val startDate = plan.optString("startDate", "")
        if (startDate.isBlank()) return maxOf(0, baseline.toInt())

        val week = maxOf(0, daysSinceStart(startDate, dateKey) / 7)
        val goals = ArrayList<Int>()
        goals.add(maxOf(0, baseline.toInt()))

        for (w in 1..week) {
            val previous = goals[w - 1]
            val startKey = addDaysKey(startDate, (w - 1) * 7)
            val endKey = addDaysKey(startDate, w * 7 - 1)

            var sum = 0.0
            var logged = 0
            for (i in 0 until logsArr.length()) {
                val l = logsArr.optJSONObject(i) ?: continue
                val d = l.optString("date", "")
                if (d >= startKey && d <= endKey) {
                    sum += l.optDouble("smoked", 0.0)
                    logged += 1
                }
            }
            val average = if (logged > 0) sum / logged else 0.0

            val heavy = heavySmokerMode && baseline >= 20
            var reduction = maxOf(0.0, weeklyReduction)
            if (heavy) {
                reduction = minOf(reduction, gentleCapForHeavy(baseline).toDouble())
            }
            if (adaptive && logged >= 4 && weeklyReduction > 0.0) {
                if (average <= previous * 0.85) {
                    reduction = if (heavy) minOf(reduction + 1.0, gentleCapForHeavy(baseline).toDouble()) else reduction + 1.0
                } else if (average > previous * 1.15) {
                    reduction = maxOf(0.0, reduction - 1.0)
                }
            }
            goals.add(maxOf(0, previous - reduction.toInt()))
        }
        return goals.getOrElse(week) { maxOf(0, baseline.toInt()) }
    }

    private fun computeTodayInfo(plan: JSONObject, logsArr: org.json.JSONArray): TodayInfo {
        val today = Calendar.getInstance().apply {
            set(Calendar.HOUR_OF_DAY, 0); set(Calendar.MINUTE, 0); set(Calendar.SECOND, 0); set(Calendar.MILLISECOND, 0)
        }
        val todayKey = dayKey(today)
        var todaySmoked = 0
        for (i in 0 until logsArr.length()) {
            val l = logsArr.optJSONObject(i) ?: continue
            if (l.optString("date", "") == todayKey) {
                todaySmoked = maxOf(0, l.optInt("smoked", 0))
                break
            }
        }
        val goal = computeDailyGoal(plan, logsArr, todayKey)
        return TodayInfo(todaySmoked, goal)
    }

    private data class StorageLocation(val database: String, val table: String)

    private fun findStorageLocation(context: Context): StorageLocation? {
        for (spec in STORAGES) {
            val path = context.getDatabasePath(spec.database).absolutePath
            if (!File(path).exists()) continue
            var db: SQLiteDatabase? = null
            try {
                db = SQLiteDatabase.openDatabase(path, null, SQLiteDatabase.OPEN_READWRITE)
                val columns = db.rawQuery("PRAGMA table_info(`${spec.table}`)", null)
                val exists = columns.use { it.moveToFirst() }
                if (!exists) continue
                val cursor = db.query(spec.table, arrayOf("value"), "`key`=?", arrayOf(DATA_KEY), null, null, null)
                cursor.use {
                    if (it.moveToFirst() && !it.getString(0).isNullOrBlank()) return StorageLocation(spec.database, spec.table)
                }
            } catch (_: Exception) {
            } finally {
                try { db?.close() } catch (_: Exception) {}
            }
        }
        return null
    }

    private fun writeRawData(context: Context, raw: String): Boolean {
        // Update wherever the key exists; if none, write to primary
        var wrote = false
        for (spec in STORAGES) {
            val path = context.getDatabasePath(spec.database).absolutePath
            if (!File(path).exists()) continue
            var db: SQLiteDatabase? = null
            try {
                db = SQLiteDatabase.openDatabase(path, null, SQLiteDatabase.OPEN_READWRITE)
                val columns = db.rawQuery("PRAGMA table_info(`${spec.table}`)", null)
                val exists = columns.use { it.moveToFirst() }
                if (!exists) continue
                val cursor = db.query(spec.table, arrayOf("key"), "`key`=?", arrayOf(DATA_KEY), null, null, null)
                val hasKey = cursor.use { it.moveToFirst() }
                if (hasKey) {
                    val cv = ContentValues().apply { put("value", raw) }
                    db.update(spec.table, cv, "`key`=?", arrayOf(DATA_KEY))
                    wrote = true
                }
            } catch (_: Exception) {
            } finally {
                try { db?.close() } catch (_: Exception) {}
            }
        }
        if (!wrote) {
            // fallback: try primary RKStorage
            val spec = STORAGES[0]
            val path = context.getDatabasePath(spec.database).absolutePath
            if (File(path).exists()) {
                var db: SQLiteDatabase? = null
                try {
                    db = SQLiteDatabase.openDatabase(path, null, SQLiteDatabase.OPEN_READWRITE)
                    val cv = ContentValues().apply { put("key", DATA_KEY); put("value", raw) }
                    db.insertWithOnConflict(spec.table, null, cv, SQLiteDatabase.CONFLICT_REPLACE)
                    wrote = true
                } catch (_: Exception) {
                } finally { try { db?.close() } catch (_: Exception) {} }
            }
        }
        return wrote
    }

    fun addSmokedToday(context: Context, delta: Int = 1): AddSmokeResult? {
        val raw = readRawData(context) ?: return null
        return try {
            val root = JSONObject(raw)
            val plan = root.optJSONObject("plan") ?: return null
            val logs = root.optJSONArray("logs") ?: org.json.JSONArray()

            val today = Calendar.getInstance().apply {
                set(Calendar.HOUR_OF_DAY, 0); set(Calendar.MINUTE, 0); set(Calendar.SECOND, 0); set(Calendar.MILLISECOND, 0)
            }
            val todayKey = dayKey(today)

            var foundIdx = -1
            for (i in 0 until logs.length()) {
                val l = logs.optJSONObject(i) ?: continue
                if (l.optString("date", "") == todayKey) { foundIdx = i; break }
            }

            val rec = if (foundIdx >= 0) logs.getJSONObject(foundIdx) else JSONObject().apply {
                put("date", todayKey); put("smoked", 0)
            }
            val smoked = maxOf(0, rec.optInt("smoked", 0) + delta)
            rec.put("smoked", smoked)

            // windowSmoked
            val winIdx = currentWindowIndex(plan)
            val wsArr = rec.optJSONArray("windowSmoked") ?: org.json.JSONArray()
            if (winIdx >= 0) {
                // ensure size
                while (wsArr.length() <= winIdx) wsArr.put(0)
                val cur = wsArr.optInt(winIdx, 0)
                wsArr.put(winIdx, maxOf(0, cur + delta))
                rec.put("windowSmoked", wsArr)
            } else {
                rec.put("outsideSmoked", maxOf(0, rec.optInt("outsideSmoked", 0) + delta))
            }

            // times
            val times = rec.optJSONArray("times") ?: org.json.JSONArray()
            if (delta > 0) {
                val iso = java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).apply {
                    timeZone = java.util.TimeZone.getTimeZone("UTC")
                }.format(java.util.Date())
                times.put(iso)
            } else if (times.length() > 0) {
                // remove last
                val newTimes = org.json.JSONArray()
                for (i in 0 until times.length() - 1) newTimes.put(times.get(i))
                rec.put("times", newTimes)
            }
            if (delta > 0) rec.put("times", times)

            if (foundIdx >= 0) logs.put(foundIdx, rec) else logs.put(rec)
            root.put("logs", logs)

            val ok = writeRawData(context, root.toString())
            if (!ok) return null
            val goal = computeDailyGoal(plan, logs, todayKey)
            AddSmokeResult(smoked, goal)
        } catch (_: Exception) {
            null
        }
    }
}
