import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import {
  elapsedDays,
  formatMoneyShort,
  fromMin,
  nextWindowInfo,
  nowMin,
  totalMoneySaved,
} from '../lib/calculations';
import {
  canPinHomeWidget,
  openWidgetPermissionSettings,
  requestPinHomeWidget,
} from '../lib/pinWidget';
import { fontSizes, radius, shadows, spacing } from '../theme';

type WidgetSize = '4x2' | '2x2';

type WidgetGalleryScreenProps = {
  visible: boolean;
  onClose: () => void;
};

type LiveValues = {
  quitText: string;
  savingsText: string;
  nextWindow: string;
};

export function WidgetGalleryScreen({ visible, onClose }: WidgetGalleryScreenProps) {
  const { colors } = useTheme();
  const { data } = useApp();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const plan = data.plan;

  const [tick, setTick] = useState(0);
  const [canPin, setCanPin] = useState<boolean | null>(null);
  const [busy, setBusy] = useState<WidgetSize | null>(null);
  const [pinned, setPinned] = useState<WidgetSize | null>(null);

  useEffect(() => {
    if (!visible) return;
    canPinHomeWidget().then(setCanPin).catch(() => setCanPin(false));
    const timer = setInterval(() => setTick((value) => value + 1), 30000);
    return () => clearInterval(timer);
  }, [visible]);

  const handleClose = () => {
    setPinned(null);
    onClose();
  };

  const live = useMemo<LiveValues>(() => {
    if (!plan) return { quitText: '0 gün 00 saat', savingsText: '0 ₺', nextWindow: '--:--' };
    // eslint-disable-next-line react-hooks/purity
    const now = Date.now();
    const elapsedMs = elapsedDays(plan, now) * 24 * 60 * 60 * 1000;
    const days = Math.floor(elapsedMs / (24 * 60 * 60 * 1000));
    const hours = Math.floor((elapsedMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    const upcoming = nextWindowInfo(plan, new Date(now));
    return {
      quitText: `${days} gün ${String(hours).padStart(2, '0')} saat`,
      savingsText: formatMoneyShort(totalMoneySaved(plan, data.logs), plan.currency),
      nextWindow: upcoming ? fromMin((nowMin(new Date(now)) + upcoming.minutes) % 1440) : '--:--',
    };
    // `tick` yalnızca canlı değerleri yeniden hesaplamak için kullanılır.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan, data.logs, tick]);

  const showPermissionHelp = (title: string, message: string) => {
    Alert.alert(title, message, [
      { text: 'Kapat', style: 'cancel' },
      {
        text: 'İzin ayarlarını aç',
        onPress: () => {
          openWidgetPermissionSettings().catch(() => {});
        },
      },
    ]);
  };

  const addWidget = async (size: WidgetSize) => {
    if (busy) return;
    setBusy(size);
    setPinned(null);
    const result = await requestPinHomeWidget(size);
    setBusy(null);
    if (result.ok) {
      setPinned(size);
      return;
    }
    if (result.reason === 'UNSUPPORTED' || result.reason === 'unsupported') {
      showPermissionHelp(
        'Widget sabitleme kapalı',
        'Bu cihazın başlatıcısı widget sabitlemeyi desteklemiyor. İzin ayarlarından "Ana ekrana kısayol ekleme" iznini açıp tekrar deneyin.',
      );
      return;
    }
    showPermissionHelp(
      'Widget eklenemedi',
      'Ana ekrana ekleme izni kapalı olabilir (özellikle MIUI/HyperOS). İzin ayarlarını açıp "Ana ekrana kısayol ekleme" iznini verin ve tekrar deneyin.',
    );
  };

  const previewWidth = Math.min(width - spacing.md * 4, 520);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={handleClose}
    >
      <View style={[styles.root, { paddingTop: insets.top + spacing.sm }]}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.title}>Ana Ekran Widget&apos;ları</Text>
            <Text style={styles.subtitle}>Canlı önizleme · tek dokunuşla ekle</Text>
          </View>
          <Pressable style={styles.closeBtn} onPress={handleClose} accessibilityRole="button">
            <Text style={styles.closeText}>Kapat</Text>
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing.xxl }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.heroCard}>
            <View style={styles.heroIcon}>
              <Text style={styles.heroIconText}>＋</Text>
            </View>
            <View style={styles.heroInfo}>
              <Text style={styles.heroTitle}>Widget menüsüne girmeden ekle</Text>
              <Text style={styles.heroText}>
                Beğendiğin kartın altındaki butona bas. Android&apos;in resmi “Ana ekrana ekle”
                penceresi açılır; onayladığında widget doğrudan ana ekranına yerleşir.
              </Text>
            </View>
          </View>

          {canPin === false ? (
            <View style={styles.warnCard}>
              <Text style={styles.warnTitle}>İzin gerekebilir</Text>
              <Text style={styles.warnText}>
                MIUI/HyperOS bazı sürümlerde widget sabitlemeyi kapatır. “İzin ayarlarını aç”
                düğmesiyle “Ana ekrana kısayol ekleme” iznini açabilirsin.
              </Text>
              <Pressable
                style={styles.warnBtn}
                onPress={() => openWidgetPermissionSettings().catch(() => {})}
                accessibilityRole="button"
              >
                <Text style={styles.warnBtnText}>İzin Ayarlarını Aç</Text>
              </Pressable>
            </View>
          ) : null}

          <WidgetPreview
            size="4x2"
            title="4×2 Büyük Kart"
            description="Sayaç, tasarruf ve sıradaki pencere"
            live={live}
            width={previewWidth}
            busy={busy === '4x2'}
            pinned={pinned === '4x2'}
            onAdd={() => addWidget('4x2')}
            styles={styles}
          />

          <WidgetPreview
            size="2x2"
            title="2×2 Kare Kart"
            description="Sayaç ve tasarruf özeti"
            live={live}
            width={previewWidth}
            busy={busy === '2x2'}
            pinned={pinned === '2x2'}
            onAdd={() => addWidget('2x2')}
            styles={styles}
          />

          <Text style={styles.footnote}>
            Widget&apos;lar telefonun ana ekranında canlı güncellenir. Aynı ekrandan dilediğin
            zaman yeniden ekleyebilir, istediğin kadar widget kullanabilirsin.
          </Text>
        </ScrollView>
      </View>
    </Modal>
  );
}

type PreviewStyles = ReturnType<typeof createStyles>;

function WidgetPreview({
  size,
  title,
  description,
  live,
  width,
  busy,
  pinned,
  onAdd,
  styles,
}: {
  size: WidgetSize;
  title: string;
  description: string;
  live: LiveValues;
  width: number;
  busy: boolean;
  pinned: boolean;
  onAdd: () => void;
  styles: PreviewStyles;
}) {
  const wide = size === '4x2';
  const surfaceWidth = width;
  const surfaceHeight = wide ? surfaceWidth / 2.27 : surfaceWidth;
  const scale = Math.max(0.86, Math.min(1.15, surfaceWidth / 320));

  return (
    <View style={styles.previewCard}>
      <View style={styles.previewHeader}>
        <View style={styles.previewHeaderText}>
          <Text style={styles.previewTitle}>{title}</Text>
          <Text style={styles.previewDescription}>{description}</Text>
        </View>
        <View style={styles.sizeChip}>
          <Text style={styles.sizeChipText}>{size.toUpperCase()}</Text>
        </View>
      </View>

      <View
        style={[
          styles.surface,
          { width: surfaceWidth, height: surfaceHeight, padding: 14 * scale },
        ]}
      >
        <View style={styles.surfaceTopRow}>
          <Text style={[styles.brand, { fontSize: 10 * scale }]}>BIRAK GİTSİN</Text>
          <View style={[styles.openPill, { paddingHorizontal: 9 * scale, paddingVertical: 3 * scale }]}>
            <Text style={[styles.openPillText, { fontSize: 10 * scale }]}>Aç →</Text>
          </View>
        </View>

        <View style={[styles.accentLine, { marginTop: 7 * scale }]} />

        <View style={styles.surfaceCenter}>
          <View style={styles.liveRow}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>canlı</Text>
          </View>
          <Text
            style={[
              styles.counter,
              { fontSize: (wide ? 25 : 23) * scale, marginTop: 2 * scale },
            ]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {live.quitText}
          </Text>
        </View>

        <View style={styles.surfaceBottom}>
          <Text style={[styles.savings, { fontSize: (wide ? 12 : 11) * scale }]}>
            Tasarruf: {live.savingsText}
          </Text>
          <Text
            style={[styles.nextWindow, { fontSize: (wide ? 9 : 9) * scale, marginTop: 2 * scale }]}
            numberOfLines={1}
          >
            Sıradaki pencere {live.nextWindow}
          </Text>
        </View>
      </View>

      <Pressable
        style={[styles.addBtn, busy && styles.addBtnBusy]}
        onPress={onAdd}
        disabled={busy}
        accessibilityRole="button"
        accessibilityLabel={`${title} widget'ını ana ekrana ekle`}
      >
        {busy ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.addBtnText}>＋  Ana Ekrana Ekle</Text>
        )}
      </Pressable>
      {pinned ? (
        <Text style={styles.pinnedText}>
          ✓ Sistem onayı verildi. Widget ana ekranına eklendi.
        </Text>
      ) : null}
    </View>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.sm,
      gap: spacing.md,
    },
    headerText: { flex: 1 },
    title: { fontSize: fontSizes.xl, fontWeight: '800', color: colors.text },
    subtitle: { marginTop: 2, fontSize: fontSizes.sm, color: colors.textMuted },
    closeBtn: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radius.round,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    closeText: { fontSize: fontSizes.sm, fontWeight: '700', color: colors.primaryDark },
    scroll: { padding: spacing.md, gap: spacing.md },
    heroCard: {
      flexDirection: 'row',
      gap: spacing.md,
      backgroundColor: colors.card,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.md,
      ...shadows.card,
    },
    heroIcon: {
      width: 42,
      height: 42,
      borderRadius: radius.md,
      backgroundColor: colors.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    heroIconText: { fontSize: 24, fontWeight: '800', color: colors.primaryDark },
    heroInfo: { flex: 1 },
    heroTitle: { fontSize: fontSizes.md, fontWeight: '800', color: colors.text },
    heroText: {
      marginTop: 3,
      fontSize: fontSizes.sm,
      lineHeight: fontSizes.md + 4,
      color: colors.textMuted,
    },
    warnCard: {
      backgroundColor: colors.accentSoft,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.accent,
      padding: spacing.md,
      gap: 4,
    },
    warnTitle: { fontSize: fontSizes.md, fontWeight: '800', color: colors.text },
    warnText: {
      fontSize: fontSizes.sm,
      lineHeight: fontSizes.md + 4,
      color: colors.textMuted,
    },
    warnBtn: {
      alignSelf: 'flex-start',
      marginTop: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radius.sm,
      backgroundColor: colors.primary,
    },
    warnBtnText: { fontSize: fontSizes.sm, fontWeight: '800', color: colors.white },
    previewCard: {
      backgroundColor: colors.card,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.md,
      gap: spacing.md,
      ...shadows.card,
    },
    previewHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
    previewHeaderText: { flex: 1 },
    previewTitle: { fontSize: fontSizes.md, fontWeight: '800', color: colors.text },
    previewDescription: { marginTop: 2, fontSize: fontSizes.sm, color: colors.textMuted },
    sizeChip: {
      paddingHorizontal: spacing.sm,
      paddingVertical: 3,
      borderRadius: radius.round,
      backgroundColor: colors.primarySoft,
    },
    sizeChipText: { fontSize: fontSizes.xs, fontWeight: '800', color: colors.primaryDark },
    surface: {
      alignSelf: 'center',
      backgroundColor: '#0B0F14',
      borderRadius: 22,
      borderWidth: 1,
      borderColor: '#1F2A44',
      justifyContent: 'space-between',
      overflow: 'hidden',
    },
    surfaceTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    brand: { color: '#93C5FD', fontWeight: '800', letterSpacing: 0.6, flexShrink: 1 },
    openPill: { backgroundColor: '#1D4ED8', borderRadius: 8, marginLeft: 8 },
    openPillText: { color: '#FFFFFF', fontWeight: '800' },
    accentLine: { height: 2, backgroundColor: '#2563EB', borderRadius: 2, opacity: 0.9 },
    surfaceCenter: { flex: 1, justifyContent: 'center' },
    liveRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    liveDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#4ADE80' },
    liveText: { fontSize: 8, fontWeight: '700', color: '#4ADE80', textTransform: 'uppercase' },
    counter: { color: '#FFFFFF', fontWeight: '800' },
    surfaceBottom: { gap: 1 },
    savings: { color: '#86EFAC', fontWeight: '800' },
    nextWindow: { color: '#CBD5E1' },
    addBtn: {
      backgroundColor: colors.primary,
      borderRadius: radius.md,
      paddingVertical: spacing.md,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 50,
    },
    addBtnBusy: { opacity: 0.75 },
    addBtnText: { fontSize: fontSizes.md, fontWeight: '800', color: colors.white },
    pinnedText: {
      fontSize: fontSizes.sm,
      fontWeight: '700',
      color: colors.success,
      textAlign: 'center',
    },
    footnote: {
      fontSize: fontSizes.xs,
      lineHeight: fontSizes.md + 2,
      color: colors.textMuted,
      textAlign: 'center',
      paddingHorizontal: spacing.sm,
    },
  });
