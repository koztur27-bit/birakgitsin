// Yasal belgeler için tek kaynak (single source of truth).
// Canlı web sayfaları GitHub Pages (docs/) üzerinden yayınlanır.
// Uygulama içi LegalModal, internet olmadan da okunabilsin diye aynı metni içerir.

import { RELEASE_CONFIG } from '../config/releaseConfig';

export const PRIVACY_POLICY_URL =
  'https://koztur27-bit.github.io/birakgitsin/privacy-policy.html';
export const TERMS_OF_USE_URL =
  'https://koztur27-bit.github.io/birakgitsin/terms-of-use.html';
export const SUPPORT_EMAIL = 'k27dijital@gmail.com';
export const DEVELOPER_NAME = RELEASE_CONFIG.developerName;
export const DATA_CONTROLLER_NAME = RELEASE_CONFIG.dataController.name;
export const DATA_CONTROLLER_EMAIL = RELEASE_CONFIG.dataController.email;
export const DATA_CONTROLLER_ADDRESS = RELEASE_CONFIG.dataController.address;

export type LegalDocId = 'privacy' | 'terms';
export type LegalLang = 'tr' | 'en';

export type LegalSection = {
  heading?: string;
  body?: string[];
  bullets?: string[];
};

export type LegalDocument = {
  title: string;
  updated: string;
  intro?: string;
  sections: LegalSection[];
};

export const LEGAL_DOCS: Record<LegalDocId, Record<LegalLang, LegalDocument>> = {
  privacy: {
    tr: {
      title: 'Gizlilik Politikası',
      updated: 'Son güncelleme: 26 Kasım 2026',
      intro: `Bırak Gitsin ("Uygulama"), sigarayı azaltma ve bırakma sürecinde kullanıcılara destek olmayı amaçlayan bir mobil uygulamadır. Bu gizlilik politikası, uygulamanın hangi verileri işleyebileceğini, bu verilerin nasıl kullanıldığını ve kullanıcı haklarını açıklar.`,
      sections: [
        {
          heading: '1. Sağlık Bilgisi ve Tıbbi Sorumluluk Reddi',
          body: [
            `Uygulama; sayaçlar, hedefler, istatistikler, motivasyon araçları, kriz desteği içerikleri ve bilgilendirici metinler sunar. Uygulama tıbbi tavsiye, teşhis veya tedavi sağlamaz ve profesyonel sağlık hizmetinin yerine geçmez. Sağlık durumunuz, ilaç/nikotin replasman tedavisi (NRT) kullanımı veya bırakma süreciyle ilgili kararlar için lütfen bir doktora veya yetkili sağlık uzmanına danışın. Acil bir durumda yerel acil yardım hatlarını arayın.`,
          ],
        },
        {
          heading: '2. Toplanan ve İşlenen Veriler',
          bullets: [
            `Kullanıcı tarafından girilen veriler (cihazda saklanır): Sigara kayıtları, hedef/plan bilgileri, tasarruf ve ilerleme verileri, tetikleyici/not benzeri uygulama içi kayıtlar, bildirim tercihleri ve ayarlar. Bu veriler varsayılan olarak cihazınızda yerel olarak saklanır.`,
            `Satın alma bilgileri: Uygulama içi satın alma/abonelik işlemleri Google Play üzerinden yürütülür. Ödeme bilgilerinizi (kart numarası vb.) biz görmeyiz veya saklamayız; işlem Google Play altyapısı tarafından yönetilir.`,
            `Reklam ve cihaz tanımlayıcıları: Uygulama Google AdMob reklam hizmetlerini kullanabilir. AdMob ve Google, reklam sunumu, ölçümleme, dolandırıcılığın önlenmesi ve (izniniz/ayarlarınıza bağlı olarak) kişiselleştirme amacıyla cihaz tanımlayıcıları (ör. Reklam Kimliği), IP adresi, yaklaşık konum ve uygulama etkileşim bilgileri gibi verileri işleyebilir.`,
            `Bildirimler ve izinler: Hatırlatma, hedef ve kriz bildirimleri gibi özellikler için bildirim izni istenebilir. İzinler yalnızca ilgili özelliği sağlamak amacıyla kullanılır.`,
          ],
        },
        {
          heading: '3. Verilerin Kullanım Amaçları',
          bullets: [
            `Uygulama işlevlerini sağlamak (sayaç, hedef, istatistik, bildirim, widget vb.).`,
            `Uygulama içi satın alma durumunu doğrulamak ve premium özellikleri sağlamak.`,
            `Reklam gösterimi ve performans ölçümü (AdMob/Google politikalarına tabi).`,
            `Hata önleme, güvenlik ve kötüye kullanımın önlenmesi (üçüncü taraf hizmetler tarafından).`,
          ],
        },
        {
          heading: '3a. AI Koç ve Anonim Bağlam',
          body: [
            `Uygulama isteğe bağlı bir AI koç sunar. Mesaj gönderdiğinizde sizin yazdığınız serbest metin ve anonim ilerleme bağlamı (sigarasız gün, içilmeyen sigara, tasarruf, tetikleyici kategorileri) yanıt üretmek için AI sağlayıcısına gönderilir. Ad/telefon/e-posta istenmez; ancak sohbete kimlik bilgisi yazmayın. İstemcide API anahtarı saklanmaz; üretimde sunucu proxy'si gerekir. AI yanıtları hatalı olabilir ve uygulama içinden bildirilebilir.`,
          ],
        },
        {
          heading: '3b. Motivasyon Fotoğrafı',
          body: [
            `Kullanıcı isteğe bağlı olarak kişisel bir motivasyon fotoğrafı seçebilir. Fotoğraf yalnızca cihazda saklanır ve hiçbir sunucuya gönderilmez.`,
          ],
        },
        {
          heading: '3c. Acil Destek Hatları',
          body: [
            `Uygulama ALO 171 ve YEDAM (115) gibi harici destek hatlarına kısayol sunar; bu hizmetler üçüncü taraflarca işletilir.`,
          ],
        },
        {
          heading: '4. Üçüncü Taraf Hizmetler',
          body: [
            `Uygulama aşağıdaki üçüncü taraf hizmetleri kullanabilir. Bu hizmetlerin veri işleme uygulamaları kendi gizlilik politikalarına tabidir:`,
          ],
          bullets: [
            `Google Gizlilik Politikası`,
            `Google AdMob`,
            `Google Play Hizmetleri / Faturalandırma`,
          ],
        },
        {
          heading: '5. Veri Saklama ve Paylaşım',
          bullets: [
            `Uygulama içi kayıtlarınız çoğunlukla cihazınızda tutulur. Uygulamayı kaldırmanız veya uygulama verilerini temizlemeniz bu yerel verilerin silinmesine yol açabilir.`,
            `Kişisel verilerinizi satmayız. Veriler, yalnızca yukarıda belirtilen amaçlar ve üçüncü taraf hizmet sağlayıcıların işleyişi kapsamında (ör. reklam/satın alma altyapısı) işlenebilir.`,
          ],
        },
        {
          heading: '6. Çocukların Gizliliği',
          body: [
            `Uygulama genel kitleye yönelik bir sigarayı bırakma destek aracıdır ve çocuklara yönelik özel olarak tasarlanmamıştır. 18 yaşın altındaki kişilerden bilerek kişisel veri toplamayız. Bir ebeveyn/veli, çocuğuna ait verilerin işlendiğini düşünüyorsa bizimle iletişime geçebilir.`,
          ],
        },
        {
          heading: '7. Haklarınız ve Tercihleriniz',
          bullets: [
            `Cihaz ayarlarından bildirim ve reklam/izleme tercihlerinizi yönetebilirsiniz.`,
            `Google Reklam Kimliği ve kişiselleştirilmiş reklam ayarlarını Android ayarlarından değiştirebilirsiniz.`,
            `Yerel uygulama verilerini, uygulama içi sıfırlama seçenekleri (varsa) veya cihazın uygulama verilerini temizleme özelliği ile silebilirsiniz.`,
          ],
        },
        {
          heading: '8. Güvenlik',
          body: [
            `Verilerin korunması için makul teknik ve idari önlemler uygulanmaya çalışılır. Ancak internet üzerinden iletim veya elektronik saklama yöntemlerinin hiçbiri %100 güvenli değildir.`,
          ],
        },
        {
          heading: '9. Değişiklikler',
          body: [
            `Bu gizlilik politikası zaman zaman güncellenebilir. Güncellemeler bu sayfada "Son güncelleme" tarihi değiştirilerek yayımlanır.`,
          ],
        },
        {
          heading: '10. İletişim',
          body: [
            `Gizlilikle ilgili sorularınız için: ${SUPPORT_EMAIL}`,
            `Veri sorumlusu: ${DATA_CONTROLLER_NAME} — ${DATA_CONTROLLER_EMAIL} — ${DATA_CONTROLLER_ADDRESS}`,
          ],
        },
        {
          heading: '11. Play Uyum Ek Maddesi',
          body: [
            `Bu uygulama bir tıbbi cihaz değildir ve herhangi bir tıbbi durumu teşhis etmez, tedavi etmez, iyileştirmez veya önlemez. Tıbbi tavsiye, tanı veya tedavi için bir sağlık uzmanına danışın. Sağlık yüzdeleri genel bilgilendirme amaçlı tahminlerdir, tıbbi ölçüm değildir. Android yedekleme kapalıdır, kilit ekranı bildirimleri gizlidir. AI koç yanıtları hatalı olabilir; her yanıtın altından bildirilebilir. Veri sorumlusu: ${DATA_CONTROLLER_NAME} — ${DATA_CONTROLLER_EMAIL} — ${DATA_CONTROLLER_ADDRESS}.`,
          ],
        },
      ],
    },
    en: {
      title: 'Privacy Policy',
      updated: 'Last updated: 26 November 2026',
      intro: `Let It Go (Bırak Gitsin) (the "App") is a mobile application designed to support users in reducing and quitting smoking. This Privacy Policy explains what data may be processed, how it is used, and your rights.`,
      sections: [
        {
          heading: '1. Health Information and Medical Disclaimer',
          body: [
            `The App provides trackers, goals, statistics, motivational tools, craving support content, and general informational text. The App does not provide medical advice, diagnosis, or treatment; it is intended for general motivation and personal tracking. Consult a qualified healthcare professional for health-related decisions. In an emergency, contact your local emergency services.`,
          ],
        },
        {
          heading: '2. Data We Collect and Process',
          bullets: [
            `User-provided data (stored on device): Smoking logs, goals/plans, savings and progress data, triggers/notes and other in-app records, notification preferences, and settings. By default, this data is stored locally on your device.`,
            `Purchase information: In-app purchases/subscriptions are processed through Google Play. We do not see or store your payment card details; transactions are handled by Google Play.`,
            `Ads and device identifiers: The App may use Google AdMob. AdMob/Google may process device identifiers (e.g., Advertising ID), IP address, approximate location, and app interaction data for ad delivery, measurement, fraud prevention, and (depending on your consent/settings) personalization.`,
            `Notifications and permissions: Notification permission may be requested for reminders, goals, and craving/support notifications. Permissions are used only to provide the related features.`,
          ],
        },
        {
          heading: '3. How We Use Data',
          bullets: [
            `To provide app functionality (tracking, goals, statistics, notifications, widgets, etc.).`,
            `To verify purchases and enable premium features.`,
            `To serve and measure ads (subject to AdMob/Google policies).`,
            `For security, fraud prevention, and abuse prevention (by third-party providers where applicable).`,
          ],
        },
        {
          heading: '3a. AI Coach and Anonymized Context',
          body: [
            `The app offers an optional AI coach. When you send a message, your free-text message and anonymized progress context (days smoke-free, cigarettes avoided, savings, trigger categories) are sent to an AI provider to generate a reply. We do not ask for your name, phone, or email, but do not type identifying information into the chat. No API key is stored in the app; a server-side proxy is required for production. AI replies may be inaccurate and can be reported in-app.`,
          ],
        },
        {
          heading: '3b. Motivation Photo',
          body: [
            `Users may optionally select a personal motivation photo. The photo is stored on the device only and is never uploaded to any server.`,
          ],
        },
        {
          heading: '3c. Emergency Support Lines',
          body: [
            `The app provides shortcuts to external support lines such as ALO 171 and YEDAM (115); these services are operated by third parties.`,
          ],
        },
        {
          heading: '4. Third-Party Services',
          body: [
            `The App may use third-party services whose data practices are governed by their own privacy policies:`,
          ],
          bullets: [
            `Google Privacy Policy`,
            `Google AdMob`,
            `Google Play Services / Billing`,
          ],
        },
        {
          heading: '5. Data Retention and Sharing',
          bullets: [
            `Your in-app records are primarily stored on your device. Uninstalling the App or clearing app data may delete this local data.`,
            `We do not sell your personal data. Data may be processed only for the purposes described above and through third-party providers (e.g., ads/billing infrastructure).`,
          ],
        },
        {
          heading: "6. Children's Privacy",
          body: [
            `The App is a smoking cessation support tool intended for a general audience and is not directed to children. We do not knowingly collect personal data from persons under 18. If you believe a child has provided data, please contact us.`,
          ],
        },
        {
          heading: '7. Your Choices and Rights',
          bullets: [
            `You can manage notification and ad/tracking preferences in your device settings.`,
            `You can reset or manage your Google Advertising ID and ad personalization settings on Android.`,
            `You can delete local app data via in-app reset options (if available) or by clearing the app's storage on your device.`,
          ],
        },
        {
          heading: '8. Security',
          body: [
            `We take reasonable measures to protect data; however, no method of transmission or electronic storage is 100% secure.`,
          ],
        },
        {
          heading: '9. Changes to This Policy',
          body: [
            `We may update this Privacy Policy from time to time. Updates will be posted on this page with a revised "Last updated" date.`,
          ],
        },
        {
          heading: '10. Contact',
          body: [
            `If you have questions about this Privacy Policy, contact: ${SUPPORT_EMAIL}`,
            `Data controller: ${DATA_CONTROLLER_NAME} — ${DATA_CONTROLLER_EMAIL} — ${DATA_CONTROLLER_ADDRESS}`,
          ],
        },
        {
          heading: '11. Google Play Compliance Supplement',
          body: [
            `This app is not a medical device and does not diagnose, treat, cure, or prevent any medical condition. Consult a healthcare professional for medical advice, diagnosis, or treatment. Health percentages are general informational estimates, not medical measurements. Android backup is disabled and lock-screen notifications are private. AI coach replies may be inaccurate and can be reported in-app. Data controller: ${DATA_CONTROLLER_NAME} — ${DATA_CONTROLLER_EMAIL} — ${DATA_CONTROLLER_ADDRESS}.`,
          ],
        },
      ],
    },
  },

  terms: {
    tr: {
      title: 'Kullanım Koşulları',
      updated: 'Son güncelleme: 24 Kasım 2026',
      intro: `Bu uygulamayı kullanarak aşağıdaki koşulları kabul etmiş olursunuz.`,
      sections: [
        {
          heading: '1. Hizmetin Amacı',
          body: [
            `Bırak Gitsin, sigara bırakma yolculuğunda kişisel takip ve motivasyon desteği sunar. Uygulama tıbbi tavsiye, teşhis veya tedavi yerine geçmez. Sağlıkla ilgili kararlar için yetkili bir sağlık uzmanına danışın.`,
          ],
        },
        {
          heading: '1a. Yaş Sınırı',
          body: [
            `Bırak Gitsin, tütün ürünleri kullanımına ilişkin yasal yaş sınırı gereği yerel yasal tütün yaş sınırının (genellikle 18+, ABD'de 21+) üzerindeki yetişkinlere yöneliktir. 18 yaşın altındaki kişiler uygulamayı kullanmamalıdır.`,
          ],
        },
        {
          heading: '1b. AI Koç ve Veri İşleme',
          body: [
            `Uygulama isteğe bağlı bir AI koç sunar. Mesaj gönderdiğinizde sizin yazdığınız serbest metin ve anonim ilerleme bağlamı (sigarasız gün, içilmeyen sigara, tasarruf, tetikleyici kategorileri) yanıt üretmek için AI sağlayıcısına gönderilir. Ad/telefon/e-posta istenmez; ancak sohbete kimlik bilgisi yazmayın. İstemcide API anahtarı saklanmaz; üretimde sunucu proxy'si gerekir. AI yanıtları hatalı olabilir ve uygulama içinden bildirilebilir.`
          ],
        },
        {
          heading: '1c. Acil Destek Hatları',
          body: [
            `Uygulama ALO 171 Sigara Bırakma Danışma Hattı ve YEDAM (115) gibi profesyonel destek hatlarına kısayol sunar. Bu hatlar üçüncü taraflarca işletilir; uygulama bu hizmetlerin içeriğinden sorumlu değildir.`,
          ],
        },
        {
          heading: '2. Abonelikler ve Satın Almalar',
          body: [
            `PRO özellikleri Google Play üzerinden satın alınabilir. Abonelikler, dönem bitiminden en az 24 saat önce iptal edilmediği sürece otomatik olarak yenilenir. Aboneliklerinizi Google Play Hesap Ayarları üzerinden istediğiniz zaman yönetebilir veya iptal edebilirsiniz.`,
          ],
        },
        {
          heading: '3. Kullanıcı Sorumluluğu',
          body: [
            `Uygulamaya girdiğiniz verilerin doğruluğundan siz sorumlusunuz. Uygulamayı yasa dışı amaçlarla kullanamazsınız.`,
          ],
        },
        {
          heading: '4. Fikri Mülkiyet',
          body: [
            `Uygulama içeriği, tasarımı ve markası ilgili hak sahiplerine aittir; izinsiz kopyalanamaz veya dağıtılamaz.`,
          ],
        },
        {
          heading: '5. Sorumluluk Sınırı',
          body: [
            `Uygulama "olduğu gibi" sunulur. Genel bilgilendirme ve motivasyon amaçlıdır; doğrudan veya dolaylı zararlardan geliştirici, yasaların izin verdiği ölçüde sorumlu tutulamaz.`,
          ],
        },
        {
          heading: '6. İletişim',
          body: [`Sorularınız için: ${SUPPORT_EMAIL}`],
        },
        {
          heading: '7. Play Uyum Ek Maddesi',
          body: [
            `Bu uygulama bir tıbbi cihaz değildir; tıbbi durumu teşhis etmez, tedavi etmez, iyileştirmez veya önlemez. Tıbbi tavsiye için sağlık uzmanına danışın. PRO abonelikleri otomatik yenilenir; iptal ve iade Google Play politikasına tabidir. 18 yaşın altındakiler uygulamayı kullanamaz.`,
          ],
        },
      ],
    },
    en: {
      title: 'Terms of Use',
      updated: 'Last updated: November 24, 2026',
      intro: `By using this app, you agree to these terms.`,
      sections: [
        {
          heading: '1. Purpose of the Service',
          body: [
            `Let It Go (Bırak Gitsin) provides personal tracking and motivation support for your quit-smoking journey. The app does not replace medical advice, diagnosis, or treatment. Consult a qualified healthcare professional for health-related decisions.`,
          ],
        },
        {
          heading: '1a. Age Limit',
          body: [
            `Let It Go (Bırak Gitsin) is intended for adults above the local legal tobacco age (18+, 21+ in the US) in accordance with legal age limits for tobacco products. Persons under 18 should not use the app.`,
          ],
        },
        {
          heading: '1b. AI Coach and Data Processing',
          body: [
            `The app offers an optional AI coach. When you send a message, your free-text message and anonymized progress context (days smoke-free, cigarettes avoided, savings, trigger categories) are sent to an AI provider to generate a reply. We do not ask for your name, phone, or email, but do not type identifying information into the chat. No API key is stored in the app; a server-side proxy is required for production. AI replies may be inaccurate and can be reported in-app.`,
          ],
        },
        {
          heading: '1c. Emergency Support Lines',
          body: [
            `The app provides shortcuts to professional support lines such as ALO 171 and YEDAM (115). These services are operated by third parties; the app is not responsible for their content.`,
          ],
        },
        {
          heading: '2. Subscriptions and Purchases',
          body: [
            `PRO features may be purchased through Google Play. Subscriptions automatically renew unless canceled at least 24 hours before the end of the current period. You can manage or cancel subscriptions anytime in your Google Play account settings.`,
          ],
        },
        {
          heading: '3. User Responsibility',
          body: [
            `You are responsible for the accuracy of the data you enter into the app. You may not use the app for unlawful purposes.`,
          ],
        },
        {
          heading: '4. Intellectual Property',
          body: [
            `App content, design, and branding belong to their respective owners and may not be copied or distributed without permission.`,
          ],
        },
        {
          heading: '5. Limitation of Liability',
          body: [
            `The app is provided "as is" for general information and motivation. To the extent permitted by law, the developer is not liable for direct or indirect damages.`,
          ],
        },
        {
          heading: '6. Contact',
          body: [`For questions: ${SUPPORT_EMAIL}`],
        },
        {
          heading: '7. Google Play Compliance Supplement',
          body: [
            `This app is not a medical device and does not diagnose, treat, cure, or prevent any medical condition. Consult a healthcare professional for medical advice. PRO subscriptions auto-renew; cancellation and refunds follow Google Play policy. Users under 18 must not use the app.`,
          ],
        },
      ],
    },
  },
};

export function legalUrl(id: LegalDocId): string {
  return id === 'privacy' ? PRIVACY_POLICY_URL : TERMS_OF_USE_URL;
}
