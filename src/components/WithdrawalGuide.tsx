import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { fontSizes, radius, spacing } from '../theme';
import { Card } from './Card';

type GuideItem = {
  period: string;
  emoji: string;
  symptoms: string[];
  tips: string[];
};

const ITEMS: GuideItem[] = [
  {
    period: 'İlk saatler (0–8 saat)',
    emoji: '⏳',
    symptoms: ['Sigara isteği dalgalar halinde artabilir', 'Huzursuzluk, odaklanmada güçlük'],
    tips: ['Su için, derin nefes al (4-7-8)', 'SOS araçlarını kullan: 60 sn baloncuk oyunu veya nefes', 'Ellerini meşgul edecek kısa bir iş bul'],
  },
  {
    period: '24 saat',
    emoji: '🌬️',
    symptoms: ['İstekler daha sık hissedilebilir', 'Sinirlilik, hafif baş ağrısı, iştah değişimi'],
    tips: ['Kısa yürüyüşler yap, bol su tüket', 'Kafein ve tetikleyici ortamları mümkünse azalt', 'Krizi “dalga” gibi düşün: gelir ve geçer'],
  },
  {
    period: '2–3 gün',
    emoji: '💪',
    symptoms: ['Nikotin vücuttan büyük ölçüde temizlenir', 'İstekler yoğun ama daha kısa sürebilir', 'Uyku ve ruh halinde dalgalanmalar'],
    tips: ['Ufak öğünler ve sağlıklı atıştırmalıklar tercih et', 'Uyku düzenine dikkat et, gevşeme rutini oluştur', 'Biriken paranı ve hedefini hatırlat kendine'],
  },
  {
    period: '1 hafta',
    emoji: '⚡',
    symptoms: ['Fiziksel yoksunluk belirtileri çoğu kişide hafifler', 'Duygu durumunda iniş çıkışlar sürebilir'],
    tips: ['Başarılarını kutla (içmediğin sigara, birikim)', 'Alışkanlık tetikleyicileri için alternatifler planla', 'Gerekirse bir yakınına destek olduğunu söyle'],
  },
  {
    period: '2–4 hafta',
    emoji: '🧘',
    symptoms: ['İsteklerin sıklığı ve şiddeti azalır', 'Enerji ve odaklanma kademeli düzelebilir'],
    tips: ['Yeni rutinlerini pekiştir (spor, hobi, yürüyüş)', 'Zor anlar için kriz planını hazır tut', 'Kendine karşı şefkatli ol; ilerleme düz bir çizgi değildir'],
  },
  {
    period: '1–3 ay',
    emoji: '🌱',
    symptoms: ['Çoğu kişi sigarasız yaşamın faydalarını daha net hisseder', 'Ara sıra tetikleyici anlarda istek olabilir'],
    tips: ['Tetikleyici durumlarda “neden bıraktığını” hatırla', 'Başarı kartını paylaşmak motivasyonunu artırabilir', 'Sağlıklı alışkanlıkları sürdür; küçük kaçamaklar pes etmek değildir'],
  },
];

type WithdrawalGuideProps = {
  compact?: boolean;
};

export function WithdrawalGuide({ compact = false }: WithdrawalGuideProps) {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.wrap}>
      {!compact ? (
        <Text style={styles.intro}>
          Bırakma sürecinde bedenin ve zihnin yeniden dengelenir. Belirtiler kişiden kişiye
          değişir; çoğu zaman zamanla hafifler. Aşağıdaki rehber bilgilendirme amaçlıdır.
        </Text>
      ) : null}

      {ITEMS.map((item) => (
        <Card key={item.period} style={styles.itemCard}>
          <Text style={styles.period}>
            {item.emoji} {item.period}
          </Text>
          <Text style={styles.sectionLabel}>Yaygın belirtiler</Text>
          {item.symptoms.map((s, i) => (
            <Text key={i} style={styles.bullet}>• {s}</Text>
          ))}
          <Text style={[styles.sectionLabel, { marginTop: spacing.sm }]}>Baş etme önerileri</Text>
          {item.tips.map((t, i) => (
            <Text key={i} style={styles.bullet}>• {t}</Text>
          ))}
        </Card>
      ))}

      <View style={styles.disclaimerBox}>
        <Text style={styles.disclaimerTitle}>Önemli not</Text>
        <Text style={styles.disclaimerText}>
          Bu içerik tıbbi tavsiye değildir ve bilgilendirme/cesaretlendirme amaçlıdır. Şiddetli,
          uzun süren veya sizi endişelendiren belirtilerde bir sağlık profesyoneline danışın.
          NRT/ilaç kullanımı için doktor veya eczacı görüşü alın.
        </Text>
      </View>
    </View>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    wrap: { gap: spacing.md },
    intro: {
      fontSize: fontSizes.sm,
      color: colors.textMuted,
      lineHeight: fontSizes.md + 4,
    },
    itemCard: { gap: 4 },
    period: {
      fontSize: fontSizes.md,
      fontWeight: '800',
      color: colors.text,
      marginBottom: 2,
    },
    sectionLabel: {
      fontSize: fontSizes.xs,
      fontWeight: '800',
      color: colors.primaryDark,
      marginTop: 2,
    },
    bullet: {
      fontSize: fontSizes.sm,
      color: colors.text,
      lineHeight: fontSizes.md + 4,
    },
    disclaimerBox: {
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.bg,
      borderRadius: radius.md,
      padding: spacing.md,
      gap: 4,
    },
    disclaimerTitle: {
      fontSize: fontSizes.sm,
      fontWeight: '800',
      color: colors.text,
    },
    disclaimerText: {
      fontSize: fontSizes.xs,
      color: colors.textMuted,
      lineHeight: 18,
    },
  });
