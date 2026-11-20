import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import {
  FALLBACK_PRODUCTS,
  ProductId,
  ProductInfo,
  fetchProProducts,
  initBilling,
  purchasePro,
  restorePurchases,
} from '../lib/billing';
import { hasProAccess, formatUnlockRemaining, proUnlockRemainingMs } from '../lib/proAccess';
import { fontSizes, radius, spacing } from '../theme';
import { useTheme } from '../context/ThemeContext';

type Props = {
  visible: boolean;
  onClose: () => void;
};

const FEATURES = [
  'Gelişmiş Gelecek Birikim Simülatörü senaryoları',
  'Özel Başarı Kartı temaları',
  'PRO rozetin ve destekçi ayrıcalığın',
  'Gelecek güncellemelerdeki tüm PRO özellikler',
];

const FREE_FEATURES = [
  'Sayaç, plan ve günlük kayıtlar',
  'Widget’lar ve hızlı erişim',
  'Nefes egzersizi ve SOS araçları',
  'Sağlık ve yoksunluk rehberi',
];

export function ProScreen({ visible, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const { data, setPremium } = useApp();
  const [products, setProducts] = useState<ProductInfo[]>(FALLBACK_PRODUCTS);
  const [loading, setLoading] = useState(false);
  const [buying, setBuying] = useState<ProductId | null>(null);
  const [restoring, setRestoring] = useState(false);

  const isPro = hasProAccess(data);
  const remainingMs = proUnlockRemainingMs(data);

  useEffect(() => {
    if (!visible) return;
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        await initBilling();
        const list = await fetchProProducts();
        if (alive) setProducts(list);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [visible]);

  const statusText = useMemo(() => {
    if (data.isPremium) return 'PRO aktif (kalıcı). Teşekkürler!';
    if (isPro && remainingMs > 0) {
      return `Geçici PRO açık: ${formatUnlockRemaining(remainingMs)} kaldı.`;
    }
    return 'PRO ile gelişmiş özelliklerin kilidini aç.';
  }, [data.isPremium, isPro, remainingMs]);

  const onBuy = async (id: ProductId) => {
    if (buying) return;
    setBuying(id);
    try {
      const res = await purchasePro(id);
      if (res.ok) {
        // Satın alma güncellemesi dinleyicisiyle de gelebilir; iyimser aktivasyon.
        setPremium(true);
        Alert.alert('Bırak Gitsin PRO', 'Satın alma işlemi başlatıldı. Onaylandığında PRO aktif olur.');
      } else if (res.message) {
        Alert.alert('Satın alma', res.message);
      }
    } finally {
      setBuying(null);
    }
  };

  const onRestore = async () => {
    if (restoring) return;
    setRestoring(true);
    try {
      const res = await restorePurchases();
      if (res.ok && res.hasPro) {
        setPremium(true);
        Alert.alert('Satın alımlar', 'PRO erişimin geri yüklendi.');
      } else if (res.ok) {
        Alert.alert('Satın alımlar', 'Geri yüklenecek PRO satın alımı bulunamadı.');
      } else if (res.message) {
        Alert.alert('Satın alımlar', res.message);
      }
    } finally {
      setRestoring(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.root, { paddingTop: insets.top + spacing.sm }]}>
        <View style={styles.topBar}>
          <Pressable style={styles.closeBtn} onPress={onClose} accessibilityRole="button">
            <Text style={styles.closeText}>Kapat</Text>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <LinearGradient
            colors={['#0B3D2E', '#14532D', '#0B1F33']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.hero}
          >
            <View style={styles.proBadge}>
              <Text style={styles.proBadgeText}>PRO</Text>
            </View>
            <Text style={styles.heroTitle}>Bırak Gitsin PRO</Text>
            <Text style={styles.heroQuote}>
              “Günde yarım paket sigara fiyatına kendi sağlığına ve geleceğine yatırım yap.”
            </Text>
            <Text style={styles.heroStatus}>{statusText}</Text>
          </LinearGradient>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Paketini seç</Text>
            {loading ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color={colors.primary} />
                <Text style={styles.loadingText}>Paketler hazırlanıyor…</Text>
              </View>
            ) : null}
            <View style={styles.cards}>
              {products.map((p) => (
                <Pressable
                  key={p.id}
                  style={[styles.planCard, p.popular && styles.planCardPopular]}
                  onPress={() => onBuy(p.id)}
                  disabled={buying !== null}
                >
                  {p.popular ? (
                    <View style={styles.popularTag}>
                      <Text style={styles.popularTagText}>En Popüler</Text>
                    </View>
                  ) : null}
                  <View style={styles.planHead}>
                    <Text style={styles.planTitle}>{p.title}</Text>
                    <Text style={styles.planPrice}>{p.priceLabel}</Text>
                  </View>
                  <Text style={styles.planDesc}>{p.description}</Text>
                  <View style={[styles.buyBtn, p.popular && styles.buyBtnPopular]}>
                    {buying === p.id ? (
                      <ActivityIndicator color={p.popular ? '#0B3D2E' : colors.white} />
                    ) : (
                      <Text style={[styles.buyBtnText, p.popular && styles.buyBtnTextPopular]}>
                        {data.isPremium ? 'PRO Aktif' : 'Satın Al'}
                      </Text>
                    )}
                  </View>
                </Pressable>
              ))}
            </View>
            <Pressable style={styles.restoreBtn} onPress={onRestore} disabled={restoring}>
              <Text style={styles.restoreBtnText}>
                {restoring ? 'Geri yükleniyor…' : 'Satın alımları geri yükle'}
              </Text>
            </Pressable>
            <Text style={styles.billingNote}>
              Satın alma altyapısı Google Play Billing (react-native-iap) test kimlikleriyle hazırdır.
              Play Console ürün kimliklerini ve AdMob kimliklerini eklediğinde yayına hazır olur.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>PRO ile neler açılır?</Text>
            <View style={styles.featureList}>
              {FEATURES.map((f) => (
                <View key={f} style={styles.featureRow}>
                  <Text style={styles.featureIcon}>✓</Text>
                  <Text style={styles.featureText}>{f}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Herkes için ücretsiz</Text>
            <View style={styles.featureList}>
              {FREE_FEATURES.map((f) => (
                <View key={f} style={styles.featureRow}>
                  <Text style={styles.featureIconFree}>•</Text>
                  <Text style={styles.featureText}>{f}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.freeNote}>
              Temel sayaç, widget’lar, nefes egzersizi ve sağlık rehberi her zaman ücretsiz kalır.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.smallNote}>
              PRO olmayan kullanıcılar, kilitli PRO özelliklerini “Kısa Reklam İzle ve 24 Saat Aç”
              seçeneğiyle geçici olarak deneyimleyebilir. Reklam altyapısı AdMob test kimliğiyle
              yapılandırılmıştır.
            </Text>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
    topBar: { paddingHorizontal: spacing.md, paddingBottom: spacing.xs, alignItems: 'flex-end' },
    closeBtn: {
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderRadius: radius.md,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    closeText: { color: colors.text, fontWeight: '700', fontSize: fontSizes.sm },
    scroll: { padding: spacing.md, paddingBottom: spacing.xl, gap: spacing.md },
    hero: {
      borderRadius: radius.lg,
      padding: spacing.lg,
      gap: spacing.sm,
      overflow: 'hidden',
    },
    proBadge: {
      alignSelf: 'flex-start',
      backgroundColor: '#7CFFB2',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 999,
    },
    proBadgeText: { color: '#0B3D2E', fontWeight: '900', fontSize: fontSizes.sm },
    heroTitle: { color: '#FFFFFF', fontSize: 28, fontWeight: '900' },
    heroQuote: { color: '#EAFBF3', fontSize: fontSizes.md, lineHeight: 24, fontWeight: '600' },
    heroStatus: { color: '#7CFFB2', fontSize: fontSizes.sm, fontWeight: '700', marginTop: 4 },
    section: { gap: spacing.sm },
    sectionTitle: { fontSize: fontSizes.lg, fontWeight: '800', color: colors.text },
    loadingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    loadingText: { color: colors.textMuted, fontSize: fontSizes.sm },
    cards: { gap: spacing.md },
    planCard: {
      backgroundColor: colors.card,
      borderRadius: radius.lg,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 6,
    },
    planCardPopular: {
      borderColor: '#2ECC71',
      borderWidth: 2,
      backgroundColor: colors.card,
    },
    popularTag: {
      position: 'absolute',
      top: -12,
      right: 16,
      backgroundColor: '#2ECC71',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 999,
    },
    popularTagText: { color: '#062814', fontWeight: '900', fontSize: fontSizes.xs },
    planHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
    planTitle: { fontSize: fontSizes.lg, fontWeight: '800', color: colors.text },
    planPrice: { fontSize: fontSizes.md, fontWeight: '800', color: colors.primaryDark },
    planDesc: { fontSize: fontSizes.sm, color: colors.textMuted, lineHeight: 20 },
    buyBtn: {
      marginTop: 6,
      backgroundColor: colors.primary,
      borderRadius: radius.md,
      paddingVertical: spacing.sm + 2,
      alignItems: 'center',
    },
    buyBtnPopular: { backgroundColor: '#7CFFB2' },
    buyBtnText: { color: colors.white, fontWeight: '800', fontSize: fontSizes.md },
    buyBtnTextPopular: { color: '#0B3D2E' },
    restoreBtn: { alignItems: 'center', paddingVertical: spacing.sm },
    restoreBtnText: { color: colors.primaryDark, fontWeight: '700', fontSize: fontSizes.sm },
    billingNote: { fontSize: fontSizes.xs, color: colors.textMuted, lineHeight: 18 },
    featureList: { gap: 8 },
    featureRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
    featureIcon: { color: '#2ECC71', fontWeight: '900', fontSize: fontSizes.md, width: 18 },
    featureIconFree: { color: colors.textMuted, fontWeight: '900', fontSize: fontSizes.md, width: 18 },
    featureText: { flex: 1, color: colors.text, fontSize: fontSizes.sm, lineHeight: 20 },
    freeNote: { fontSize: fontSizes.sm, color: colors.textMuted, lineHeight: 20 },
    smallNote: { fontSize: fontSizes.xs, color: colors.textMuted, lineHeight: 18 },
  });
