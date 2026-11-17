import { useTheme } from '../context/ThemeContext';
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card } from '../components/Card';
import { Stepper } from '../components/Stepper';
import { WindowEditor } from '../components/WindowEditor';
import { currencySymbols, fontSizes, radius, spacing } from '../theme';
import { CessationAid, Plan, SmokeWindow } from '../types';

const STEPS = 5;

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
};

type OnboardingProps = {
  initial?: Plan;
  onComplete: (plan: Plan) => void;
  onCancel?: () => void;
};

export function Onboarding({ initial, onComplete, onCancel }: OnboardingProps) {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
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
        }
      : defaultDraft,
  );

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const finish = () => {
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
                  onChange={(v) => set('baselinePerDay', v)}
                  min={1}
                  max={60}
                  suffix="adet"
                  hint="Azaltma planı bu sayıdan başlar."
                />
                <Stepper
                  label="Haftalık azalış"
                  value={draft.weeklyReduction}
                  onChange={(v) => set('weeklyReduction', v)}
                  min={0}
                  max={draft.baselinePerDay}
                  suffix="adet/gün"
                  hint="Her hafta günlük hedefin bu kadar düşer. 0 = sabit tempo."
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
                label="1 paket"
                value={`${draft.packPrice} ${draft.currency} / ${draft.cigarettesPerPack} adet`}
              />
              <SummaryRow
                label="Tek sigara"
                value={`${Number((draft.packPrice / draft.cigarettesPerPack).toFixed(2))} ${draft.currency}`}
              />
              <Text style={[styles.paragraph, { marginTop: spacing.md }]}>
                Plan başladığında bugünkü günlük hedefin {draft.baselinePerDay} sigara olacak.
                Uyarlanabilir plan açık; son haftanın uyumuna göre tempo kendini ayarlar.
              </Text>
            </View>
          </Card>
        )}
        {step === 4 && (
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
});