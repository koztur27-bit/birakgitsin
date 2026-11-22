import { useTheme } from '../context/ThemeContext';
import * as ImagePicker from 'expo-image-picker';
import { persistMotivationPhoto } from '../lib/motivationPhoto';
import React, { useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card } from '../components/Card';
import { Stepper } from '../components/Stepper';
import { WindowEditor } from '../components/WindowEditor';
import { useApp } from '../context/AppContext';
import { useI18n } from '../i18n';
import { currencySymbols, fontSizes, radius, spacing } from '../theme';
import { CessationAid, Plan, SmokeWindow } from '../types';

const STEPS = 6;

const defaultWindows: SmokeWindow[] = [
  { start: '08:00', end: '09:00' },
  { start: '18:00', end: '20:00' },
];

type Draft = {
  baselinePerDay: number;
  weeklyReduction: number;
  packPrice: number;
  cigarettesPerPack: number;
  currency: string;
  useWindows: boolean;
  windows: SmokeWindow[];
  cessationAid: CessationAid;
  heavySmokerMode: boolean;
};

const defaultDraft: Draft = {
  baselinePerDay: 20,
  weeklyReduction: 5,
  packPrice: 60,
  cigarettesPerPack: 20,
  currency: '₺',
  useWindows: true,
  windows: defaultWindows,
  cessationAid: 'none',
  heavySmokerMode: false,
};

function gentleReduction(baselinePerDay: number): number {
  return baselinePerDay >= 30 ? 1 : 2;
}

type OnboardingProps = {
  initial?: Plan;
  onComplete: (plan: Plan) => void;
  onCancel?: () => void;
};

export function Onboarding({ initial, onComplete, onCancel }: OnboardingProps) {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const { t, locale } = useI18n();
  const { data, setQuitMotivation } = useApp();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>(() =>
    initial
      ? {
          baselinePerDay: initial.baselinePerDay,
          weeklyReduction: initial.weeklyReduction,
          packPrice: initial.packPrice,
          cigarettesPerPack: initial.cigarettesPerPack,
          currency: initial.currency,
          useWindows: (initial.windows?.length ?? 0) > 0,
          windows:
            initial.windows?.length > 0 ? initial.windows : defaultWindows,
          cessationAid: initial.cessationAid ?? 'none',
          heavySmokerMode: initial.heavySmokerMode ?? false,
        }
      : defaultDraft,
  );
  const [motivationText, setMotivationText] = useState(data.quitMotivation?.text || '');
  const [motivationPhoto, setMotivationPhoto] = useState<string | undefined>(data.quitMotivation?.photoUri);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const pickMotivationPhoto = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) return;
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });
      if (!res.canceled && res.assets?.[0]?.uri) {
        const persisted = await persistMotivationPhoto(res.assets[0].uri);
        setMotivationPhoto(persisted);
      }
    } catch {
      // ignore picker errors
    }
  };

  const finish = () => {
    setQuitMotivation({
      text: motivationText.trim(),
      photoUri: motivationPhoto,
    });
    onComplete({
      startDate: initial?.startDate ?? new Date().toISOString().slice(0, 10),
      baselinePerDay: draft.baselinePerDay,
      weeklyReduction: draft.weeklyReduction,
      packPrice: draft.packPrice,
      cigarettesPerPack: draft.cigarettesPerPack,
      currency: draft.currency,
      windows: draft.useWindows ? draft.windows : [],
      adaptive: initial?.adaptive ?? true,
      cessationAid: draft.cessationAid,
      heavySmokerMode: draft.heavySmokerMode,
    });
  };

  return (
    <KeyboardAvoidingView
      style={[styles.root, { paddingTop: insets.top + spacing.lg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <Text style={styles.brand}>Bırak Gitsin</Text>
        <Text style={styles.subtitle}>
          {initial ? 'Planını düzenle' : 'Sigarayı azaltarak bırak'}
        </Text>
        {onCancel ? (
          <Pressable style={styles.cancelBtn} onPress={onCancel}>
            <Text style={styles.cancelText}>İptal</Text>
          </Pressable>
        ) : null}
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.progress}>
          {Array.from({ length: STEPS }).map((_, i) => (
            <View key={i} style={[styles.progressSegment, i <= step && styles.progressActive]} />
          ))}
        </View>

        {step === 0 && (
          <Card>
            <Text style={styles.title}>Nasıl çalışır?</Text>
            <Text style={styles.paragraph}>
              Her gün içtiğin sigarayı anlık olarak takip edersin. Uygulama sana günlük hedefini
              belirler; hedefini aşmadığın her sigara, para ve sağlık kazancı demek.
            </Text>
            <Text style={styles.paragraph}>
              Azaltma temponu kendin seçersin: hafta hafta günde kaç sigara azaltacağına
              planına göre hedefin otomatik düşer. Sıfıra ulaştığında bırakmış olursun.
            </Text>
          </Card>
        )}

        {step === 1 && (
          <StepperScreen
            title="Sigara tempon ve azaltma hızın"
            child={
              <>
                <Stepper
                  label="Günlük sigara"
                  value={draft.baselinePerDay}
                  onChange={(v) => {
                    setDraft((d) => {
                      const baselinePerDay = v;
                      const suggested = gentleReduction(baselinePerDay);
                      const weeklyReduction =
                        d.heavySmokerMode && baselinePerDay >= 20
                          ? Math.min(d.weeklyReduction, suggested)
                          : d.weeklyReduction;
                      return { ...d, baselinePerDay, weeklyReduction };
                    });
                  }}
                  min={1}
                  max={60}
                  suffix="adet"
                  hint="Azaltma planı bu sayıdan başlar."
                />

                <Pressable
                  style={[styles.modeToggle, draft.heavySmokerMode && styles.modeToggleActive]}
                  onPress={() => {
                    setDraft((d) => {
                      const next = !d.heavySmokerMode;
                      const suggested = gentleReduction(d.baselinePerDay);
                      return {
                        ...d,
                        heavySmokerMode: next,
                        weeklyReduction:
                          next && d.baselinePerDay >= 20
                            ? Math.min(d.weeklyReduction, suggested)
                            : d.weeklyReduction,
                      };
                    });
                  }}
                >
                  <View style={styles.modeToggleTextWrap}>
                    <Text
                      style={[
                        styles.modeToggleTitle,
                        draft.heavySmokerMode && styles.modeToggleTitleActive,
                      ]}
                    >
                      Ağır Tiryaki Modu {draft.heavySmokerMode ? 'Açık' : 'Kapalı'}
                    </Text>
                    <Text
                      style={[
                        styles.modeToggleHint,
                        draft.heavySmokerMode && styles.modeToggleHintActive,
                      ]}
                    >
                      Günlük 20+ sigarada daha kademeli azaltma ve yargılamayan destek için önerilir.
                    </Text>
                  </View>
                  <View style={[styles.modeBadge, draft.heavySmokerMode && styles.modeBadgeActive]}>
                    <Text style={styles.modeBadgeText}>{draft.heavySmokerMode ? '✓' : '+'}</Text>
                  </View>
                </Pressable>
                {draft.heavySmokerMode ? (
                  <Text style={styles.heavyNote}>
                    Önerilen tempo: haftada en fazla {gentleReduction(draft.baselinePerDay)} sigara azaltma.
                    Hedefine tam uyamasan da ilerliyorsun; plan seni zorlamak için değil desteklemek için var.
                  </Text>
                ) : draft.baselinePerDay >= 20 ? (
                  <Text style={styles.heavyNote}>
                    Günlük {draft.baselinePerDay} sigara için Ağır Tiryaki Modu’nu açarsan daha gerçekçi,
                    kademeli bir plan ve ek destek alırsın.
                  </Text>
                ) : null}

                <Stepper
                  label="Haftalık azalış"
                  value={draft.weeklyReduction}
                  onChange={(v) => set('weeklyReduction', v)}
                  min={0}
                  max={draft.baselinePerDay}
                  suffix="adet/gün"
                  hint={
                    draft.heavySmokerMode
                      ? 'Ağır modda daha yumuşak azaltma önerilir (genelde haftada 1–2).'
                      : 'Her hafta günlük hedefin bu kadar düşer. 0 = sabit tempo.'
                  }
                />
                <Text style={styles.preview}>
                  1. hafta hedefin: {draft.baselinePerDay} adet
                </Text>
                <Text style={styles.preview}>
                  2. hafta hedefin:{' '}
                  {Math.max(0, draft.baselinePerDay - draft.weeklyReduction)} adet
                </Text>
              </>
            }
          />
        )}

        {step === 2 && (
          <StepperScreen
            title="Sigara sana neye mal oluyor?"
            child={
              <>
                <Stepper
                  label="1 paket fiyatı"
                  value={draft.packPrice}
                  onChange={(v) => set('packPrice', v)}
                  min={0}
                  max={1000}
                  suffix={draft.currency}
                  hint="Aklına en yakın fiyatı yaz, sonra düzenleyebilirsin."
                />
                <Stepper
                  label="Paketteki adet"
                  value={draft.cigarettesPerPack}
                  onChange={(v) => set('cigarettesPerPack', v)}
                  min={1}
                  max={40}
                  suffix="adet"
                />
                <Text style={styles.paragraph}>Para birimi</Text>
                <View style={styles.currencyRow}>
                  {currencySymbols.map((c) => (
                    <Pressable
                      key={c}
                      onPress={() => set('currency', c)}
                      style={[styles.currencyBtn, draft.currency === c && styles.currencyBtnActive]}
                    >
                      <Text
                        style={[
                          styles.currencyText,
                          draft.currency === c && styles.currencyTextActive,
                        ]}
                      >
                        {c}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </>
            }
          />
        )}

        {step === 3 && (
          <Card>
            <Text style={styles.title}>İzinli pencereler ve özet</Text>
            <Text style={styles.paragraph}>
              Sigara içmeyi planladığın saat aralıklarını belirle. Bugünkü hedefin bu
              pencerelere dağıtılır.
            </Text>
            <View style={styles.stepperWrap}>
              <WindowEditor
                useWindows={draft.useWindows}
                windows={draft.windows}
                onChange={(useWindows, windows) => {
                  setDraft((d) => ({ ...d, useWindows, windows }));
                }}
              />
            </View>
            <View style={{ marginTop: spacing.md }}>
              <SummaryRow label="Başlangıç" value={`günde ${draft.baselinePerDay} sigara`} />
              <SummaryRow label="Azaltma" value={`haftada ${draft.weeklyReduction} sigara`} />
              <SummaryRow
                label="Mod"
                value={draft.heavySmokerMode ? 'Ağır Tiryaki (kademeli)' : 'Standart'}
              />
              <SummaryRow
                label="1 paket"
                value={`${draft.packPrice} ${draft.currency} / ${draft.cigarettesPerPack} adet`}
              />
              <SummaryRow
                label="Tek sigara"
                value={`${Number((draft.packPrice / draft.cigarettesPerPack).toFixed(2))} ${draft.currency}`}
              />
              <Text style={[styles.paragraph, { marginTop: spacing.md }]}>
                Plan başladığında bugünkü günlük hedefin {draft.baselinePerDay} sigara olacak.
                {draft.heavySmokerMode
                  ? ' Ağır Tiryaki Modu açık: tempo daha kademeli ilerler ve zorlandığında yargılamayan destek sunulur.'
                  : ' Uyarlanabilir plan açık; son haftanın uyumuna göre tempo kendini ayarlar.'}
              </Text>
            </View>
          </Card>
        )}
        {step === 4 && (
          <Card>
            <Text style={styles.title}>{t('motivation.title')}</Text>
            <Text style={styles.paragraph}>{t('motivation.subtitle')}</Text>
            <TextInput
              style={styles.motivationInput}
              value={motivationText}
              onChangeText={setMotivationText}
              placeholder={t('motivation.placeholder')}
              placeholderTextColor={colors.textMuted}
              multiline
              maxLength={200}
            />
            <View style={styles.motivationPhotoRow}>
              {motivationPhoto ? (
                <Image source={{ uri: motivationPhoto }} style={styles.motivationPhotoPreview} />
              ) : (
                <View style={styles.motivationPhotoPlaceholder}>
                  <Text style={styles.motivationPhotoPlaceholderText}>💙</Text>
                </View>
              )}
              <View style={{ flex: 1, gap: spacing.sm }}>
                <Pressable style={styles.smallActionBtn} onPress={pickMotivationPhoto}>
                  <Text style={styles.smallActionText}>
                    {motivationPhoto ? t('motivation.changePhoto') : t('motivation.addPhoto')}
                  </Text>
                </Pressable>
                {motivationPhoto ? (
                  <Pressable style={styles.smallActionBtnGhost} onPress={() => setMotivationPhoto(undefined)}>
                    <Text style={styles.smallActionTextGhost}>{t('motivation.removePhoto')}</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          </Card>
        )}
        {step === 5 && (
          <Card>
            <Text style={styles.title}>Hangi yöntemle ilerlemek istersin?</Text>
            <Text style={styles.paragraph}>
              Planını seçtiğin yönteme göre şekillendireceğiz. İstediğin zaman
              Ayarlar’dan değiştirebilirsin.
            </Text>
            <View style={{ gap: spacing.sm, marginTop: spacing.md }}>
              {[
                { key: 'none', label: 'Sadece azaltarak bırak' },
                { key: 'gum', label: 'Nikotin sakızı ile' },
                { key: 'patch', label: 'Nikotin bandı ile' },
              ].map((opt) => (
                <Pressable
                  key={opt.key}
                  style={[
                    styles.currencyBtn,
                    draft.cessationAid === opt.key && styles.currencyBtnActive,
                  ]}
                  onPress={() => set('cessationAid', opt.key as CessationAid)}
                >
                  <Text
                    style={[
                      styles.currencyText,
                      draft.cessationAid === opt.key && styles.currencyTextActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </Card>
        )}
      </ScrollView>

      <Text style={{fontSize:11,color:'#64748B',textAlign:'center',paddingHorizontal:16,paddingBottom:4}}>
        {locale==='en' ? 'This app is intended for adults 18+. It is not medical advice.' : 'Bu uygulama 18 yaş ve üzeri yetişkinlere yöneliktir. Tıbbi tavsiye değildir.'}
      </Text>
      <Text style={{fontSize:11,color:'#64748B',textAlign:'center',paddingHorizontal:16,paddingBottom:4}}>
        {locale==='en' ? 'The app does not replace medical advice; consult a doctor for health decisions.' : 'Uygulama tibbi tavsiyenin yerini tutmaz; saglik kararlariniz icin doktorunuza danisin.'}
      </Text>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        {step > 0 && (
          <Pressable style={styles.backBtn} onPress={() => setStep((s) => s - 1)}>
            <Text style={styles.backText}>Geri</Text>
          </Pressable>
        )}
        <Pressable
          style={[styles.nextBtn, step === STEPS - 1 && styles.nextBtnWide]}
          onPress={() => (step === STEPS - 1 ? finish() : setStep((s) => s + 1))}
        >
          <Text style={styles.nextText}>
            {step === STEPS - 1 ? 'Planı Başlat' : 'Devam'}
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

function StepperScreen({ title, child }: { title: string; child: React.ReactNode }) {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  return (
    <Card>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.stepperWrap}>{child}</View>
    </Card>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  brand: {
    fontSize: fontSizes.xl,
    fontWeight: '800',
    color: colors.primaryDark,
  },
  subtitle: { fontSize: fontSizes.sm, color: colors.textMuted, marginTop: 2 },
  cancelBtn: {
    position: 'absolute',
    top: 0,
    right: spacing.lg,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    backgroundColor: colors.card,
  },
  cancelText: { fontSize: fontSizes.sm, fontWeight: '700', color: colors.textMuted },
  body: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, gap: spacing.md },
  progress: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  progressSegment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
  },
  progressActive: { backgroundColor: colors.primary },
  title: {
    fontSize: fontSizes.lg,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  paragraph: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    lineHeight: fontSizes.md + 6,
    marginTop: spacing.xs,
  },
  stepperWrap: { marginTop: spacing.sm },
  preview: {
    fontSize: fontSizes.sm,
    fontWeight: '600',
    color: colors.primaryDark,
    marginTop: spacing.sm,
  },
  currencyRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  currencyBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.bg,
    alignItems: 'center',
  },
  currencyBtnActive: {
    backgroundColor: colors.primaryDark,
  },
  currencyText: {
    fontSize: fontSizes.xl,
    fontWeight: '700',
    color: colors.textMuted,
  },
  currencyTextActive: { color: colors.white },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  summaryLabel: { fontSize: fontSizes.sm, color: colors.textMuted },
  summaryValue: {
    fontSize: fontSizes.sm,
    fontWeight: '700',
    color: colors.text,
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    backgroundColor: colors.bg,
  },
  backBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: { fontSize: fontSizes.md, color: colors.textMuted, fontWeight: '600' },
  nextBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextBtnWide: { flex: 1 },
  nextText: { fontSize: fontSizes.md, color: colors.white, fontWeight: '700' },
  motivationInput: {
    marginTop: spacing.md,
    minHeight: 90,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: fontSizes.md,
    color: colors.text,
    backgroundColor: colors.bg,
    textAlignVertical: 'top',
  },
  motivationPhotoRow: {
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  motivationPhotoPreview: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: colors.bg,
  },
  motivationPhotoPlaceholder: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  motivationPhotoPlaceholderText: { fontSize: 34 },
  smallActionBtn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primary,
    alignItems: 'center',
  },
  smallActionText: { fontSize: fontSizes.sm, fontWeight: '800', color: colors.primaryDark },
  smallActionBtnGhost: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  smallActionTextGhost: { fontSize: fontSizes.sm, fontWeight: '700', color: colors.textMuted },
  modeToggle: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  modeToggleActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  modeToggleTextWrap: { flex: 1, gap: 4 },
  modeToggleTitle: {
    fontSize: fontSizes.sm,
    fontWeight: '800',
    color: colors.text,
  },
  modeToggleTitleActive: { color: colors.primaryDark },
  modeToggleHint: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    lineHeight: 18,
  },
  modeToggleHintActive: { color: colors.text },
  modeBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.border,
  },
  modeBadgeActive: { backgroundColor: colors.primary },
  modeBadgeText: { color: colors.white, fontWeight: '800', fontSize: fontSizes.md },
  heavyNote: {
    marginTop: spacing.sm,
    fontSize: fontSizes.xs,
    color: colors.primaryDark,
    lineHeight: 18,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.sm,
    padding: spacing.sm,
  },
});