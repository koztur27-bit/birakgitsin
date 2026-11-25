import { useTheme } from '../context/ThemeContext';
import * as Clipboard from 'expo-clipboard';
import * as FileSystem from 'expo-file-system/legacy';
import * as DocumentPicker from 'expo-document-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { readErrorLog, clearErrorLog } from '../lib/errorLog';
import React, { useEffect, useMemo, useState } from 'react';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import {
  Alert,
  Linking,
  Platform,
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
import { MapBadge } from '../components/MapBadge';
import { ScreenMapModal } from '../components/ScreenMapModal';
import { LegalModal } from '../components/LegalModal';
import { StatusPopup } from '../components/StatusPopup';
import { WidgetGalleryScreen } from './WidgetGalleryScreen';
import { ProScreen } from './ProScreen';
import { useApp } from '../context/AppContext';
import { useI18n } from '../i18n';
import { formatUnlockRemaining, hasProAccess, proUnlockRemainingMs } from '../lib/proAccess';
import { CrisisReminder } from '../types';
import { dailyGoal, elapsedDays, formatMoney, todayKey, totalMoneySaved } from '../lib/calculations';
import { useInstallPrompt } from '../lib/install';
import { reloadApp } from '../lib/reload';
import { playAlarmFor } from '../lib/alarm';
import { debugLockStatus } from '../lib/statusNotification';
import { downloadAndInstallUpdate } from '../lib/updater';
import { IS_USER_RELEASE } from '../lib/buildFlags';
import type { LegalDocId } from '../lib/legalContent';
import { pinHomeShortcut } from '../lib/shortcut';
import { syncWidgetsAndCheckUpdate } from '../lib/syncUpdate';

import { fontSizes, radius, spacing } from '../theme';

type SettingsScreenProps = {
  onEditPlan: () => void;
};

export function SettingsScreen({ onEditPlan }: SettingsScreenProps) {
  const { colors, mode, setMode } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const {
    data,
    resetAll,
    setPlan,
    setShowLockScreen,
    setLanguage,
    logCigarette,
    undoCigarette,
    restoreData,
    exportedJson,
    setCrisisReminders,
    redeemInviteCode,
  } = useApp();
  const plan = data.plan;
  const [backupText, setBackupText] = useState('');
  const [backupDirUri, setBackupDirUri] = useState<string | null>(null);
  const [backupAdvancedOpen, setBackupAdvancedOpen] = useState(false);
  const [legalDoc, setLegalDoc] = useState<LegalDocId | null>(null);
  const [mapOpen, setMapOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [shortcutStatus, setShortcutStatus] = useState('');
  const [widgetsOpen, setWidgetsOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [proOpen, setProOpen] = useState(false);
  const [inviteInput, setInviteInput] = useState('');

  const defaultCrisis = useMemo<CrisisReminder[]>(
    () => [
      { id: 'crisis-1', time: '09:00', label: 'Kahve molası', enabled: false },
      { id: 'crisis-2', time: '13:00', label: 'Yemek sonrası', enabled: false },
      { id: 'crisis-3', time: '18:30', label: 'İş çıkışı', enabled: false },
    ],
    [],
  );
  const crisisReminders: CrisisReminder[] = useMemo(() => {
    const existing = Array.isArray(data.crisisReminders) ? data.crisisReminders : [];
    const byId = new Map(existing.map((r) => [r.id, r]));
    return defaultCrisis.map((d) => byId.get(d.id) || d);
  }, [data.crisisReminders, defaultCrisis]);
  const [pickerFor, setPickerFor] = useState<string | null>(null);

  const parseTime = (t: string) => {
    const m = /^([0-9]{1,2}):([0-9]{2})$/.exec(t || '');
    const d = new Date();
    d.setSeconds(0, 0);
    d.setHours(m ? Math.min(23, parseInt(m[1], 10)) : 9);
    d.setMinutes(m ? Math.min(59, parseInt(m[2], 10)) : 0);
    return d;
  };
  const fmtTime = (d: Date) =>
    `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

  const updateCrisis = async (id: string, patch: Partial<CrisisReminder>) => {
    const next = crisisReminders.map((r) => (r.id === id ? { ...r, ...patch } : r));
    const enabledCount = next.filter((r) => r.enabled).length;
    if (enabledCount > 3) {
      Alert.alert('Kriz bildirimleri', 'En fazla 3 kriz saati seçebilirsin.');
      return;
    }
    try {
      await setCrisisReminders(next);
    } catch (e: any) {
      Alert.alert('Kriz bildirimleri', e?.message || 'Bildirimler ayarlanamadı.');
    }
  };

  const onPickTime = async (event: DateTimePickerEvent, date?: Date) => {
    const id = pickerFor;
    if (Platform.OS !== 'ios') setPickerFor(null);
    if (!id || event.type === 'dismissed' || !date) return;
    await updateCrisis(id, { time: fmtTime(date) });
    if (Platform.OS === 'ios') setPickerFor(null);
  };

  useEffect(() => {
    AsyncStorage.getItem('@birakgitsin/backupDirUri').then((v) => {
      if (v) setBackupDirUri(v);
    }).catch(() => {});
  }, []);

  const myInviteCode = data.inviteCode || 'BG';
  const shareInvite = async () => {
    const days = plan ? Math.max(0, Math.floor(elapsedDays(plan))) : 0;
    const savedText = plan ? formatMoney(totalMoneySaved(plan, data.logs), plan.currency) : (data.language === 'en' ? '$0' : '0 ₺');
    const msg = t('invite.shareMessage', { days, saved: savedText, code: myInviteCode });
    const waUrl = `whatsapp://send?text=${encodeURIComponent(msg)}`;
    try {
      const canWa = await Linking.canOpenURL(waUrl);
      if (canWa) {
        await Linking.openURL(waUrl);
        return;
      }
    } catch {}
    try {
      await Share.share({ message: msg });
    } catch {}
  };

  const copyInviteCode = async () => {
    try {
      await Clipboard.setStringAsync(myInviteCode);
      Alert.alert(t('invite.yourCode'), t('invite.copied'));
    } catch {}
  };

  const onRedeemInvite = () => {
    const res = redeemInviteCode(inviteInput);
    if (res.ok) {
      Alert.alert(t('common.ok'), t('invite.redeemSuccess'));
      setInviteInput('');
      return;
    }
    const map: Record<string, string> = {
      already: t('invite.redeemAlready'),
      self: t('invite.redeemSelf'),
      invalid: t('invite.redeemInvalid'),
      empty: t('invite.redeemEmpty'),
    };
    Alert.alert(t('invite.enterTitle'), map[res.message || ''] || t('invite.redeemInvalid'));
  };
  const { available: canInstall, install, isWeb } = useInstallPrompt();

  if (!plan) return null;

  const goal = dailyGoal(plan, todayKey(), data.logs);

  const handleSyncAndUpdate = async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      await syncWidgetsAndCheckUpdate();
    } finally {
      setSyncing(false);
    }
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

  const shareErrorLog = async () => {
    const log = await readErrorLog();
    if (!log.trim()) {
      Alert.alert('Hata günlüğü boş', 'Henüz kaydedilmiş bir hata yok.');
      return;
    }
    try {
      await Share.share({ title: 'Bırak Gitsin hata günlüğü', message: log });
    } catch {
      Alert.alert('Paylaşılamadı', 'Hata günlüğü paylaşılamadı.');
    }
  };
  const clearErrorLogBtn = async () => {
    await clearErrorLog();
    Alert.alert('Temizlendi', 'Hata günlüğü silindi.');
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

  const BACKUP_DIR_KEY = '@birakgitsin/backupDirUri';

  const pickBackupDir = async () => {
    try {
      if (Platform.OS !== 'android' || !(FileSystem as any).StorageAccessFramework) {
        Alert.alert('Desteklenmiyor', 'Bu özellik Android Storage Access Framework gerektirir. iOS için Paylaş seçeneğini kullanın.');
        return;
      }
      const SAF = (FileSystem as any).StorageAccessFramework;
      const perm = await SAF.requestDirectoryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('İzin verilmedi', 'Klasör seçimi iptal edildi.');
        return;
      }
      setBackupDirUri(perm.directoryUri);
      await AsyncStorage.setItem(BACKUP_DIR_KEY, perm.directoryUri);
      Alert.alert('Klasör seçildi', 'Yedekler bu klasöre kaydedilecek.');
    } catch (e: any) {
      Alert.alert('Hata', e?.message || 'Klasör seçilemedi.');
    }
  };

  const doBackupToDir = async () => {
    try {
      let dir = backupDirUri;
      if (!dir) {
        await pickBackupDir();
        dir = (await AsyncStorage.getItem(BACKUP_DIR_KEY)) || null;
        setBackupDirUri(dir);
        if (!dir) return;
      }
      const SAF = (FileSystem as any).StorageAccessFramework;
      const date = new Date().toISOString().slice(0, 10);
      const fileName = `birakgitsin-yedek-${date}.json`;
      const fileUri = await SAF.createFileAsync(dir, fileName, 'application/json');
      await FileSystem.writeAsStringAsync(fileUri, exportedJson());
      Alert.alert('Yedek kaydedildi', `Yedek seçtiğiniz klasöre başarıyla kaydedildi: ${fileName}`);
    } catch (e: any) {
      Alert.alert('Hata', e?.message || 'Yedek kaydedilemedi.');
    }
  };

  const doImportFile = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({ type: 'application/json', copyToCacheDirectory: true });
      if (res.canceled) return;
      const asset = res.assets?.[0];
      if (!asset?.uri) return;
      const content = await FileSystem.readAsStringAsync(asset.uri);
      const parsed = JSON.parse(content);
      if (!parsed || !Array.isArray(parsed.logs)) {
        Alert.alert('Geçersiz yedek', 'Bu bir Bırak Gitsin yedeği gibi görünmüyor.');
        return;
      }
      Alert.alert('Geri yükle', 'Seçilen yedek geri yüklensin mi? Mevcut verilerin üzerine yazılacak.', [
        { text: 'Vazgeç', style: 'cancel' },
        { text: 'Geri Yükle', onPress: async () => {
            try {
              await restoreData(parsed);
              setBackupText('');
              Alert.alert('Başarılı', 'Veriler geri yüklendi.');
            } catch (e: any) {
              Alert.alert('Hata', e?.message || 'Geri yüklenemedi.');
            }
          } },
      ]);
    } catch (e: any) {
      Alert.alert('Hata', e?.message || 'Dosya seçilemedi.');
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top + spacing.md }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.titleRow}><MapBadge code="10" /><Text style={styles.title}>{t('settings.title')}</Text></View>

        {!IS_USER_RELEASE && (
        <Card>
          <Text style={styles.cardLabel}>{(data.language || 'tr') === 'en' ? 'Quick Tools' : 'Hızlı Araçlar'}</Text>
          <Text style={styles.planSub}>
            {(data.language || 'tr') === 'en'
              ? 'Map, status, update, and refresh — moved here from the home screen for a cleaner layout.'
              : 'Ana ekrandan taşınan Harita, Durum, Güncelle ve Yenile araçları burada.'}
          </Text>
          <View style={styles.toolGrid}>
            <Pressable style={styles.toolBtn} onPress={() => setMapOpen(true)}>
              <Text style={styles.toolBtnText}>{(data.language || 'tr') === 'en' ? 'Map' : 'Harita'}</Text>
            </Pressable>
            <Pressable style={styles.toolBtn} onPress={() => setStatusOpen(true)}>
              <Text style={styles.toolBtnText}>{(data.language || 'tr') === 'en' ? 'Status' : 'Durum'}</Text>
            </Pressable>
            <Pressable
              style={[styles.toolBtn, updating && styles.smallBtnDisabled]}
              onPress={doUpdate}
              disabled={updating}
            >
              <Text style={styles.toolBtnText}>
                {updating
                  ? ((data.language || 'tr') === 'en' ? 'Updating…' : 'Güncelleniyor…')
                  : ((data.language || 'tr') === 'en' ? 'Update' : 'Güncelle')}
              </Text>
            </Pressable>
            <Pressable style={styles.toolBtn} onPress={reloadApp}>
              <Text style={styles.toolBtnText}>{(data.language || 'tr') === 'en' ? 'Refresh' : 'Yenile'}</Text>
            </Pressable>
          </View>
        </Card>
        )}


        <Card>
          <Text style={styles.cardLabel}>{t('settings.languageTitle')}</Text>
          <Text style={styles.planSub}>{t('settings.languageSub')}</Text>
          <View style={styles.inlineRow}>
            <Pressable
              style={[styles.smallBtn, (data.language || 'tr') === 'tr' && styles.smallBtnFill]}
              onPress={() => setLanguage('tr')}
              accessibilityRole="button"
            >
              <Text style={[styles.smallBtnText, (data.language || 'tr') === 'tr' && styles.smallBtnTextActive]}>
                {t('settings.turkish')}
              </Text>
            </Pressable>
            <Pressable
              style={[styles.smallBtn, data.language === 'en' && styles.smallBtnFill]}
              onPress={() => setLanguage('en')}
              accessibilityRole="button"
            >
              <Text style={[styles.smallBtnText, data.language === 'en' && styles.smallBtnTextActive]}>
                {t('settings.english')}
              </Text>
            </Pressable>
          </View>
        </Card>

        {!IS_USER_RELEASE && (
        <Card style={{ borderWidth: 2, borderColor: colors.primary }}>
          <Text style={styles.cardLabel}>Ana Ekran Widget&apos;ları</Text>
          <Text style={styles.planSub}>
            Ana ekranına sayaç widget&apos;ı ekleyerek ilerlemeni her an takip et.
          </Text>
          <Pressable style={styles.rowBtn} onPress={() => setWidgetsOpen(true)}>
            <Text style={styles.rowBtnText}>Widget Galerisini Aç</Text>
          </Pressable>
        </Card>
        )}

        {!IS_USER_RELEASE && (
        <Card>
          <Text style={styles.cardLabel}>Güncelle / Senkronize Et</Text>
          <Text style={styles.planSub}>
            Tüm ana ekran widget&apos;larını zorla yeniler ve GitHub üzerinden yeni uygulama sürümü olup olmadığını kontrol eder.
          </Text>
          <Pressable
            style={[styles.rowBtn, { backgroundColor: colors.primary }]}
            onPress={handleSyncAndUpdate}
            disabled={syncing}
          >
            <Text style={[styles.rowBtnText, { color: colors.white }]}>
              {syncing ? 'Güncelleniyor…' : 'Güncelle / Senkronize Et'}
            </Text>
          </Pressable>
        </Card>
        )}

        {!IS_USER_RELEASE && (
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
        )}

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

        {!IS_USER_RELEASE && (
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
        )}

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
            {plan.heavySmokerMode ? (
              <Text style={styles.planSub}>Mod: Ağır Tiryaki (kademeli destek)</Text>
            ) : null}
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
          <View style={styles.adaptiveRow}>
            <View style={styles.adaptiveInfo}>
              <Text style={styles.cardLabel}>Ağır Tiryaki Modu</Text>
              <Text style={styles.planSub}>
                Günlük 20+ sigara için daha kademeli/gerçekçi hedefler, yargılamayan yönlendirme ve
                daha görünür kriz desteği sunar.
              </Text>
            </View>
            <Switch
              value={!!plan.heavySmokerMode}
              onValueChange={(value) => setPlan({ ...plan, heavySmokerMode: value })}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.white}
            />
          </View>
          <Pressable style={styles.rowBtn} onPress={onEditPlan}>
            <Text style={styles.rowBtnText}>Stratejini Düzenle</Text>
          </Pressable>
        </Card>

        {!IS_USER_RELEASE && (
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
        )}

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
          {!IS_USER_RELEASE && (
          <Pressable style={styles.rowBtn} onPress={testNotification}>
            <Text style={styles.rowBtnText}>Bildirimi test et</Text>
          </Pressable>
          )}
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
            Yedeği telefonundaki bir klasöre kaydet veya dosyadan geri yükle.
          </Text>
          <Pressable style={styles.backupMainBtn} onPress={doBackupToDir}>
            <Text style={styles.backupMainBtnText}>Yedek Al</Text>
          </Pressable>
          <Pressable style={styles.backupSecondaryBtn} onPress={doImportFile}>
            <Text style={styles.backupSecondaryBtnText}>Yedeği Geri Çağır</Text>
          </Pressable>

          <Pressable
            style={styles.advancedToggle}
            onPress={() => setBackupAdvancedOpen((v) => !v)}
          >
            <Text style={styles.advancedToggleText}>
              {backupAdvancedOpen ? 'Gelişmiş seçenekler ▴' : 'Gelişmiş seçenekler ▾'}
            </Text>
          </Pressable>

          {backupAdvancedOpen ? (
            <>
              <View style={styles.inlineRow}>
                <Pressable style={[styles.smallBtn, styles.smallBtnFill]} onPress={pickBackupDir}>
                  <Text style={styles.smallBtnText}>Klasörü Değiştir</Text>
                </Pressable>
              </View>
              {backupDirUri ? (
                <Text style={{fontSize:11,color:colors.textMuted,marginTop:4}} numberOfLines={1}>{backupDirUri}</Text>
              ) : null}
              <View style={styles.inlineRow}>
                <Pressable style={styles.smallBtn} onPress={doBackup}>
                  <Text style={styles.smallBtnText}>Panoya kopyala</Text>
                </Pressable>
                <Pressable style={styles.smallBtn} onPress={doBackupShare}>
                  <Text style={styles.smallBtnText}>Paylaş / Dosyaya Kaydet</Text>
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
                  <Text style={styles.smallBtnText}>Yapıştırılan Veriyi Geri Yükle</Text>
                </Pressable>
              </View>
            </>
          ) : null}
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
          <Text style={styles.cardLabel}>Akıllı Kriz Bildirimleri</Text>
          <Text style={styles.planSub}>
            Gün içinde zorlandığın 1–3 saati seç. Seçtiğin saatlerde biriken paranı ve hedefini
            hatırlatan, yargılamayan kısa motivasyon bildirimleri gönderilir.
          </Text>
          <View style={styles.crisisList}>
            {crisisReminders.map((r) => (
              <View key={r.id} style={styles.crisisRow}>
                <View style={styles.crisisInfo}>
                  <Text style={styles.crisisLabel}>{r.label || 'Hatırlatıcı'}</Text>
                  <Pressable
                    style={styles.timeBtn}
                    onPress={() => setPickerFor(r.id)}
                    accessibilityRole="button"
                    accessibilityLabel={`${r.label} saatini seç`}
                  >
                    <Text style={styles.timeBtnText}>{r.time}</Text>
                  </Pressable>
                </View>
                <Switch
                  value={!!r.enabled}
                  onValueChange={(v) => updateCrisis(r.id, { enabled: v })}
                  trackColor={{ false: colors.border, true: colors.primarySoft }}
                  thumbColor={r.enabled ? colors.primary : colors.textMuted}
                />
              </View>
            ))}
          </View>
          {pickerFor ? (
            <DateTimePicker
              value={parseTime(crisisReminders.find((x) => x.id === pickerFor)?.time || '09:00')}
              mode="time"
              is24Hour
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onPickTime}
            />
          ) : null}
          <Text style={styles.planSub}>En fazla 3 saat seçebilirsin. Bildirim izni gerekebilir.</Text>
        </Card>

        <Card>
          <Text style={styles.cardLabel}>{t('invite.title')}</Text>
          <Text style={styles.planSub}>{t('invite.subtitle')}</Text>
          <View style={styles.inviteCodeBox}>
            <Text style={styles.inviteCodeLabel}>{t('invite.yourCode')}</Text>
            <Text style={styles.inviteCodeValue}>{myInviteCode}</Text>
          </View>
          <View style={styles.inlineRow}>
            <Pressable style={styles.smallBtn} onPress={copyInviteCode}>
              <Text style={styles.smallBtnText}>{t('invite.copyCode')}</Text>
            </Pressable>
            <Pressable style={[styles.smallBtn, styles.smallBtnFill, styles.smallBtnActive]} onPress={shareInvite}>
              <Text style={[styles.smallBtnText, styles.smallBtnTextActive]}>{t('invite.shareWhatsApp')}</Text>
            </Pressable>
          </View>
          <View style={{ marginTop: spacing.md }}>
            <Text style={styles.cardLabel}>{t('invite.enterTitle')}</Text>
            <View style={styles.inlineRow}>
              <TextInput
                style={styles.inviteInput}
                value={inviteInput}
                onChangeText={setInviteInput}
                onSubmitEditing={onRedeemInvite}
                returnKeyType="done"
                blurOnSubmit
                placeholder={t('invite.enterPlaceholder')}
                placeholderTextColor={colors.textMuted}
                autoCapitalize="characters"
                autoCorrect={false}
              />
            </View>
            <View style={styles.inlineRow}>
              <Pressable
                style={[styles.smallBtn, styles.smallBtnFill, styles.smallBtnActive, data.inviteRedeemed && styles.smallBtnDisabled]}
                onPress={onRedeemInvite}
                disabled={!!data.inviteRedeemed}
              >
                <Text style={[styles.smallBtnText, styles.smallBtnTextActive]}>
                  {data.inviteRedeemed ? t('invite.redeemSuccess') : t('invite.redeem')}
                </Text>
              </Pressable>
            </View>
          </View>
        </Card>

        <Card>
          <Text style={styles.cardLabel}>Bırak Gitsin PRO</Text>
          <Text style={styles.planSub}>
            {data.isPremium
              ? 'PRO aktif. Gelişmiş simülatör senaryoları ve özel başarı kartı temaları açık.'
              : hasProAccess(data)
                ? `Geçici PRO açık (${formatUnlockRemaining(proUnlockRemainingMs(data))} kaldı). Gelişmiş özellikleri deneyebilirsin.`
                : 'İlk açılışta 15 günlük PRO hediyen var. Sonrasında haftada bir reklam izleyerek 1 gün PRO kazanabilir, ya da aylık/yıllık paketle devam edebilirsin.'}
          </Text>
          <View style={styles.inlineRow}>
            <Pressable
              style={[styles.smallBtn, styles.smallBtnFill, styles.smallBtnActive]}
              onPress={() => setProOpen(true)}
            >
              <Text style={[styles.smallBtnText, styles.smallBtnTextActive]}>
                {hasProAccess(data) ? 'PRO Durumunu Gör' : "PRO'yu Görüntüle"}
              </Text>
            </Pressable>
          </View>
        </Card>

        {!IS_USER_RELEASE && (
        <View style={styles.inlineRow}>
          <Pressable style={styles.smallBtn} onPress={shareErrorLog}>
            <Text style={styles.smallBtnText}>Hata günlüğünü paylaş</Text>
          </Pressable>
          <Pressable style={styles.smallBtn} onPress={clearErrorLogBtn}>
            <Text style={styles.smallBtnText}>Günlüğü temizle</Text>
          </Pressable>
        </View>
        )}

        <Card>
          <Text style={styles.cardLabel}>Yasal ve Destek</Text>
          <View style={styles.inlineRow}>
            <Pressable style={styles.smallBtn} onPress={() => setLegalDoc('privacy')}>
              <Text style={styles.smallBtnText}>Gizlilik Politikası</Text>
            </Pressable>
            <Pressable style={styles.smallBtn} onPress={() => setLegalDoc('terms')}>
              <Text style={styles.smallBtnText}>Kullanım Koşulları</Text>
            </Pressable>
          </View>
          <Pressable style={styles.smallBtn} onPress={() => Linking.openURL('mailto:koztur.27@gmail.com')}>
            <Text style={styles.smallBtnText}>Destek: koztur.27@gmail.com</Text>
          </Pressable>
        </Card>

        <Pressable style={styles.dangerBtn} onPress={confirmReset}>
          <Text style={styles.dangerText}>Tüm Verileri Sıfırla</Text>
        </Pressable>

        <Text style={styles.footer}>Bırak Gitsin v2.5.0</Text>
      </ScrollView>

      <LegalModal
        visible={legalDoc !== null}
        doc={legalDoc ?? 'privacy'}
        onClose={() => setLegalDoc(null)}
      />

      {!IS_USER_RELEASE && (
        <>
          <ScreenMapModal visible={mapOpen} onClose={() => setMapOpen(false)} />
          <StatusPopup visible={statusOpen} onClose={() => setStatusOpen(false)} />
        </>
      )}
      {!IS_USER_RELEASE && (
        <WidgetGalleryScreen visible={widgetsOpen} onClose={() => setWidgetsOpen(false)} />
      )}
      <ProScreen visible={proOpen} onClose={() => setProOpen(false)} />
    </View>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.md, paddingBottom: spacing.xl, gap: spacing.md },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: {
    fontSize: fontSizes.xl,
    fontWeight: '800',
    color: colors.text,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
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
  toolGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  toolBtn: {
    flexGrow: 1,
    flexBasis: '47%',
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolBtnText: { fontSize: fontSizes.sm, fontWeight: '800', color: colors.primaryDark },
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
  backupMainBtn: {
    marginTop: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  backupMainBtnText: {
    fontSize: fontSizes.md,
    fontWeight: '800',
    color: colors.white,
  },
  backupSecondaryBtn: {
    marginTop: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.primary,
    alignItems: 'center',
  },
  backupSecondaryBtnText: {
    fontSize: fontSizes.md,
    fontWeight: '800',
    color: colors.primaryDark,
  },
  advancedToggle: {
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  advancedToggleText: {
    fontSize: fontSizes.sm,
    fontWeight: '700',
    color: colors.textMuted,
  },
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
  inviteCodeBox: {
    marginTop: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primary,
    alignItems: 'center',
  },
  inviteCodeLabel: { fontSize: fontSizes.xs, color: colors.primaryDark, fontWeight: '700' },
  inviteCodeValue: { fontSize: fontSizes.xl, fontWeight: '900', color: colors.primaryDark, letterSpacing: 2, marginTop: 4 },
  inviteInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSizes.md,
    color: colors.text,
    backgroundColor: colors.bg,
    fontWeight: '700',
    letterSpacing: 1,
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
  crisisList: { marginTop: spacing.md, gap: spacing.sm },
  crisisRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  crisisInfo: { flex: 1, gap: 4 },
  crisisLabel: { fontSize: fontSizes.sm, fontWeight: '700', color: colors.text },
  timeBtn: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
  },
  timeBtnText: { fontSize: fontSizes.md, fontWeight: '800', color: colors.primaryDark },
});