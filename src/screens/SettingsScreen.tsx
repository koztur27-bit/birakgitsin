import { useTheme } from '../context/ThemeContext';
import * as Clipboard from 'expo-clipboard';
import React, { useState } from 'react';
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card } from '../components/Card';
import { ScreenMapModal } from '../components/ScreenMapModal';
import { useApp } from '../context/AppContext';
import { dailyGoal, formatMoney, todayKey } from '../lib/calculations';
import { useInstallPrompt } from '../lib/install';
import { reloadApp } from '../lib/reload';
import { playAlarmFor } from '../lib/alarm';
import { debugLockStatus } from '../lib/statusNotification';
import { downloadAndInstallUpdate } from '../lib/updater';
import { pinHomeShortcut } from '../lib/shortcut';
import { pinHomeWidget } from '../lib/pinWidget';
import { fontSizes, radius, spacing } from '../theme';

type SettingsScreenProps = {
  onEditPlan: () => void;
};

export function SettingsScreen({ onEditPlan }: SettingsScreenProps) {
  const { colors, mode, setMode } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const {
    data,
    resetAll,
    setPremium,
    setPlan,
    setShowLockScreen,
    logCigarette,
    undoCigarette,
    logNrt,
    restoreData,
    exportedJson,
  } = useApp();
  const plan = data.plan;
  const [backupText, setBackupText] = useState('');
  const [mapOpen, setMapOpen] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [shortcutStatus, setShortcutStatus] = useState('');
  const [widgetStatus, setWidgetStatus] = useState('');
  const { available: canInstall, install, isWeb } = useInstallPrompt();

  if (!plan) return null;

  const goal = dailyGoal(plan, todayKey(), data.logs);
  const nrtToday = (data.nrtLogs ?? []).filter((l) => l.timestamp.slice(0, 10) === todayKey());
  const nrtCounts = {
    gum: nrtToday.filter((l) => l.kind === 'gum').reduce((s, l) => s + l.amount, 0),
    patch: nrtToday.filter((l) => l.kind === 'patch').reduce((s, l) => s + l.amount, 0),
  };

  const doUpdate = async () => {
    if (isWeb) {
      reloadApp();
      return;
    }
    if (updating) return;
    setUpdating(true);
    const result = await downloadAndInstallUpdate();
    setUpdating(false);
    if (!result.ok) {
      Alert.alert('Güncelleme', result.message);
    }
  };

  const testNotification = async () => {
    // Uyarı sesini de dene (sigara/bitiş uyarısıyla aynı ses).
    playAlarmFor(1500);
    const info = await debugLockStatus();
    try {
      await Clipboard.setStringAsync('BG-TEST ' + info);
    } catch {
      // ignore
    }
    if (info.includes('granted=false')) {
      Alert.alert('Bildirim izni kapalı', info, [
        { text: 'Tamam' },
        {
          text: 'Bildirim ayarlarını aç',
          onPress: () => {
            Linking.openSettings().catch(() => {});
          },
        },
      ]);
    } else {
      Alert.alert('Bildirim tanısı', info);
    }
  };

  const confirmReset = () => {
    Alert.alert(
      'Tüm verileri sil?',
      'Planın, kayıtların ve istatistiklerin kalıcı olarak silinir. Bu işlem geri alınamaz.',
      [
        { text: 'Vazgeç', style: 'cancel' },
        { text: 'Sil', style: 'destructive', onPress: resetAll },
      ],
    );
  };

  const doBackup = async () => {
    try {
      await Clipboard.setStringAsync(exportedJson());
      Alert.alert('Yedek kopyalandı', 'Verilerin panoya kopyalandı. Bir not uygulamasına yapıştırarak saklayabilirsin.');
    } catch {
      Alert.alert('Hata', 'Panoya kopyalanamadı.');
    }
  };

  const doBackupShare = async () => {
    try {
      await Share.share({
        title: 'Bırak Gitsin yedeği',
        message: exportedJson(),
      });
    } catch {
      Alert.alert('Paylaşılamadı', 'Yedek şu anda paylaşılamadı.');
    }
  };
  const doRestore = async () => {
    const text = backupText.trim() || (await Clipboard.getStringAsync().catch(() => ''));
    if (!text) {
      Alert.alert('Veri bulunamadı', 'Önce yukarıdaki alana yedek verisini yapıştır.');
      return;
    }
    try {
      const parsed = JSON.parse(text);
      if (!parsed || !Array.isArray(parsed.logs)) {
        Alert.alert('Geçersiz yedek', 'Bu bir Bırak Gitsin yedeği gibi görünmüyor.');
        return;
      }
      restoreData(parsed);
      Alert.alert('Geri yüklendi', 'Yedek verilerin uygulamaya geri yüklendi.');
      setBackupText('');
    } catch {
      Alert.alert('Geçersiz yedek', 'Metin okunamadı. Geçerli bir yedek yapıştırdığına emin ol.');
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top + spacing.md }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Ayarlar</Text>

        <Card style={{ borderWidth: 2, borderColor: colors.primary }}>
          <Text style={styles.cardLabel}>Widget'i ana ekrana sabitle</Text>
          <Text style={styles.planSub}>
            MIUI widget menüsünü atlayıp widget'ı doğrudan ana ekrana ekler. Butona basınca
            sistem penceresi açılır; "Ana ekrana ekle" de.
          </Text>
          <View style={styles.inlineRow}>
            <Pressable
              style={[styles.smallBtn, styles.smallBtnFill]}
              onPress={() => {
                Alert.alert('Widget boyutu seç', 'Hangi boyutta widget eklemek istersin?', [
                  { text: '1×2', onPress: async () => { const ok = await pinHomeWidget('1x2'); setWidgetStatus(ok ? 'Widget sabitlendi.' : 'Bu cihaz widget sabitlemeyi desteklemiyor.'); } },
                  { text: '2×2', onPress: async () => { const ok = await pinHomeWidget('2x2'); setWidgetStatus(ok ? 'Widget sabitlendi.' : 'Bu cihaz widget sabitlemeyi desteklemiyor.'); } },
                  { text: '2×3', onPress: async () => { const ok = await pinHomeWidget('2x3'); setWidgetStatus(ok ? 'Widget sabitlendi.' : 'Bu cihaz widget sabitlemeyi desteklemiyor.'); } },
                  { text: 'İptal', style: 'cancel' },
                ]);
              }}
            >
              <Text style={styles.smallBtnText}>Widget sabitle</Text>
            </Pressable>
          </View>
          {widgetStatus ? <Text style={styles.planSub}>{widgetStatus}</Text> : null}
        </Card>

        <Card>
          <Text style={styles.cardLabel}>Ekran Haritası</Text>
          <Text style={styles.planSub}>
            Ana sayfadaki her bölümün numarası ve adı burada. Bir bölgeyi anlatmak için
            sadece numarasını söyle (ör. “3a’yı büyüt”).
          </Text>
          <Pressable style={styles.rowBtn} onPress={() => setMapOpen(true)}>
            <Text style={styles.rowBtnText}>Haritayı Aç</Text>
          </Pressable>
        </Card>

        <Card>
          <Text style={styles.cardLabel}>Görünüm</Text>
          <Text style={styles.planSub}>Gece veya gündüz temasını seç.</Text>
          <View style={styles.inlineRow}>
            {(['system', 'light', 'dark'] as const).map((m) => (
              <Pressable
                key={m}
                style={[styles.smallBtn, mode === m && styles.smallBtnFill]}
                onPress={() => setMode(m)}
              >
                <Text style={[styles.smallBtnText, mode === m && styles.smallBtnTextActive]}>
                  {m === 'system' ? 'Sistem' : m === 'light' ? 'Gündüz' : 'Gece'}
                </Text>
              </Pressable>
            ))}
          </View>
        </Card>

        <Card>
          <Text style={styles.cardLabel}>Güncelleme</Text>
          <Text style={styles.planSub}>
            {isWeb
              ? 'Geliştirme sırasında en son düzenlemeleri görmek için uygulamayı yeniden yükle.'
              : 'Yeni sürümü indirip kurulum ekranını açar; verilerin korunur.'}
          </Text>
          <View style={styles.inlineRow}>
            <Pressable
              style={[styles.smallBtn, styles.smallBtnFill, updating && styles.smallBtnDisabled]}
              onPress={doUpdate}
              disabled={updating}
            >
              <Text style={styles.smallBtnText}>
                {updating ? 'İndiriliyor…' : isWeb ? 'Son sürümü yükle' : 'Son sürümü indir ve kur'}
              </Text>
            </Pressable>
          </View>
        </Card>

        {isWeb && (
          <Card>
            <Text style={styles.cardLabel}>Ana ekrana ekle</Text>
            <Text style={styles.planSub}>
              {canInstall
                ? 'Uygulamayı telefonunun ana ekranına ekle; tam ekran, tıpkı yüklü bir uygulama gibi açılır.'
                : 'Buton şu an hazır değil. Chrome sağ üst ⋮ menüsünden "Ana ekrana ekle" / "Uygulamayı yükle" seçeneğini kullan.'}
            </Text>
            <View style={styles.inlineRow}>
              <Pressable
                style={[styles.smallBtn, styles.smallBtnFill]}
                onPress={async () => {
                  const ok = await install();
                  if (!ok) {
                    Alert.alert(
                      'Ana ekrana ekle',
                      'Chrome sağ üst ⋮ menüsünden "Ana ekrana ekle" seçeneğini kullanabilirsin.',
                    );
                  }
                }}
              >
                <Text style={styles.smallBtnText}>Ana ekrana ekle</Text>
              </Pressable>
            </View>
          </Card>
        )}

        <Card>
          <Text style={styles.cardLabel}>Planım</Text>
          <View style={styles.planLine}>
            <Text style={styles.planValue}>
              Başlangıç: günde {plan.baselinePerDay} sigara
            </Text>
            <Text style={styles.planSub}>Haftada {plan.weeklyReduction} azalış</Text>
            <Text style={styles.planSub}>
              Bugünkü hedef: {goal} sigara · 1 paket size {formatMoney(plan.packPrice, plan.currency)}
            </Text>
            {plan.windows.length > 0 ? (
              <Text style={styles.planSub}>
                İzinli pencereler:{' '}
                {plan.windows.map((w) => `${w.start}–${w.end}`).join(', ')}
              </Text>
            ) : null}
          </View>
          <View style={styles.adaptiveRow}>
            <View style={styles.adaptiveInfo}>
              <Text style={styles.cardLabel}>Uyarlanabilir plan</Text>
              <Text style={styles.planSub}>
                Son 7 günün uyumuna göre hedefi otomatik ayarlar. Zorlandığında hızı düşürür.
              </Text>
            </View>
            <Switch
              value={plan.adaptive !== false}
              onValueChange={(value) => setPlan({ ...plan, adaptive: value })}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.white}
            />
          </View>
          <Pressable style={styles.rowBtn} onPress={onEditPlan}>
            <Text style={styles.rowBtnText}>Stratejini Düzenle</Text>
          </Pressable>
        </Card>

        <Card>
          <Text style={styles.cardLabel}>Test modu</Text>
          <Text style={styles.planSub}>
            Geliştirme aşamasında gün kaydını hızlı test etmek için:
          </Text>
          <View style={styles.inlineRow}>
            <Pressable
              style={styles.smallBtn}
              onPress={() => logCigarette({ dateKey: new Date().toISOString().slice(0, 10) })}
            >
              <Text style={styles.smallBtnText}>+1 bugün</Text>
            </Pressable>
            <Pressable
              style={styles.smallBtn}
              onPress={() => undoCigarette({ dateKey: new Date().toISOString().slice(0, 10) })}
            >
              <Text style={styles.smallBtnText}>Geri al</Text>
            </Pressable>
          </View>
        </Card>

        <Card>
          <View style={styles.switchRow}>
            <View style={styles.switchInfo}>
              <Text style={styles.cardLabel}>Kilit ekranı bildirimi</Text>
              <Text style={styles.planSub}>
                İçilen sigara sayısını ve geri sayan sayacı kilit ekranında gösterir.
                Sigara kaydettiğinde kısa bir ses ve titreşim verir; dayanma süresi
                dolunca alarm çalar.
              </Text>
            </View>
            <Switch
              value={data.showLockScreen}
              onValueChange={setShowLockScreen}
              trackColor={{ true: colors.primary, false: colors.border }}
              thumbColor={colors.white}
            />
          </View>
          <Pressable style={styles.rowBtn} onPress={testNotification}>
            <Text style={styles.rowBtnText}>Bildirimi test et</Text>
          </Pressable>
          <Pressable
            style={styles.rowBtn}
            onPress={() => {
              Linking.openSettings().catch(() => {});
            }}
          >
            <Text style={styles.rowBtnText}>Bildirim iznini aç (sistem ayarları)</Text>
          </Pressable>
        </Card>

        <Card>
          <Text style={styles.cardLabel}>Verilerini yedekle</Text>
          <Text style={styles.planSub}>
            Verilerini panoya kopyala ya da bir metin alanına yapıştır — telefonunu
            değiştirsen bile kaybın olmaz.
          </Text>
          <View style={styles.inlineRow}>
            <Pressable style={[styles.smallBtn, styles.smallBtnFill]} onPress={doBackup}>
              <Text style={styles.smallBtnText}>Yedeği panoya kopyala</Text>
            </Pressable>
            <Pressable style={styles.smallBtn} onPress={doBackupShare}>
              <Text style={styles.smallBtnText}>Paylaş / dosyaya kaydet</Text>
            </Pressable>
          </View>
          <TextInput
            style={styles.backupInput}
            value={backupText}
            onChangeText={setBackupText}
            placeholder="Geri yüklemek için yedek verisini buraya yapıştır"
            placeholderTextColor={colors.textMuted}
            multiline
            textAlignVertical="top"
          />
          <View style={styles.inlineRow}>
            <Pressable style={[styles.smallBtn, styles.smallBtnFill]} onPress={doRestore}>
              <Text style={styles.smallBtnText}>Yapıştırılan veriyi geri yükle</Text>
            </Pressable>
          </View>
        </Card>

        <Card>
          <Text style={styles.cardLabel}>Ana ekrana kısayol</Text>
          <Text style={styles.planSub}>
            Uygulamayı tek dokunuşla açan bir ikonu ana ekrana ekler. Widget yerine
            kullanılabilir.
          </Text>
          <View style={styles.inlineRow}>
            <Pressable
              style={[styles.smallBtn, styles.smallBtnFill]}
              onPress={async () => {
                const ok = await pinHomeShortcut();
                setShortcutStatus(ok ? 'Kısayol eklendi.' : 'Bu cihaz kısayol eklemeyi desteklemiyor.');
              }}
            >
              <Text style={styles.smallBtnText}>Kısayol ekle</Text>
            </Pressable>
          </View>
          {shortcutStatus ? <Text style={styles.planSub}>{shortcutStatus}</Text> : null}
        </Card>

        <Card>
          <Text style={styles.cardLabel}>NRT / ilaç günlüğü</Text>
          <Text style={styles.planSub}>
            Nikotin sakızı, bant veya ilaç dozunu kaydet. Bu kayıt tıbbi öneri değildir;
            doktorunun planına göre kullan.
          </Text>
          {plan.cessationAid && plan.cessationAid !== 'none' ? (
            <Text style={styles.planSub}>
              Onboarding tercihin: {plan.cessationAid === 'gum' ? 'sakız' : 'bant'}
            </Text>
          ) : null}
          <View style={styles.inlineRow}>
            <Pressable style={styles.smallBtn} onPress={() => logNrt('gum')}>
              <Text style={styles.smallBtnText}>Sakız +1</Text>
            </Pressable>
            <Pressable style={styles.smallBtn} onPress={() => logNrt('patch')}>
              <Text style={styles.smallBtnText}>Bant +1</Text>
            </Pressable>
          </View>
          <Text style={styles.planSub}>
            Bugün: sakız {nrtCounts.gum}, bant {nrtCounts.patch}
          </Text>
        </Card>

        <Card>
          <Text style={styles.cardLabel}>Bırak Gitsin Premium</Text>
          <Text style={styles.planSub}>
            Yakında: ana ekran widget’ı (tek dokunuşla kayıt), reklamsız deneyim,
            kişiselleştirilmiş raporlar ve tam rozet koleksiyonu. Widget; EAS ile
            derlenen gerçek uygulama sürümünde aktif olacak.
          </Text>
          <View style={styles.inlineRow}>
            <Pressable
              style={[styles.smallBtn, data.isPremium && styles.smallBtnActive]}
              onPress={() => setPremium(!data.isPremium)}
            >
              <Text style={[styles.smallBtnText, data.isPremium && styles.smallBtnTextActive]}>
                {data.isPremium ? 'Premium aktif' : 'Premium dene'}
              </Text>
            </Pressable>
          </View>
        </Card>

        <Pressable style={styles.dangerBtn} onPress={confirmReset}>
          <Text style={styles.dangerText}>Tüm Verileri Sıfırla</Text>
        </Pressable>

        <Text style={styles.footer}>Bırak Gitsin v1.0.1</Text>
      </ScrollView>

      <ScreenMapModal visible={mapOpen} onClose={() => setMapOpen(false)} />
    </View>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.md, paddingBottom: spacing.xl, gap: spacing.md },
  title: {
    fontSize: fontSizes.xl,
    fontWeight: '800',
    color: colors.text,
  },
  cardLabel: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  planLine: { gap: 2 },
  planValue: {
    fontSize: fontSizes.md,
    fontWeight: '700',
    color: colors.text,
  },
  planSub: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    marginTop: 2,
    lineHeight: fontSizes.md + 4,
  },
  rowBtn: {
    marginTop: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
  },
  rowBtnText: {
    fontSize: fontSizes.md,
    fontWeight: '800',
    color: colors.primaryDark,
  },
  inlineRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  smallBtn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  smallBtnFill: { flex: 1, alignItems: 'center' },
  smallBtnDisabled: { opacity: 0.6 },
  backupInput: {
    marginTop: spacing.sm,
    minHeight: 90,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.sm,
    fontSize: fontSizes.sm,
    color: colors.text,
    backgroundColor: colors.bg,
  },
  smallBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  smallBtnText: { fontSize: fontSizes.sm, fontWeight: '700', color: colors.textMuted },
  smallBtnTextActive: { color: colors.white },
  dangerBtn: {
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.dangerSoft,
    alignItems: 'center',
  },
  dangerText: { fontSize: fontSizes.md, fontWeight: '700', color: colors.danger },
  footer: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    textAlign: 'center',
  },
  adaptiveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  adaptiveInfo: { flex: 1 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  switchInfo: { flex: 1 },
});