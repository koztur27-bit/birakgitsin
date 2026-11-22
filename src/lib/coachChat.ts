import { AppData, AppLanguage } from '../types';
import { cigarettesAvoided, daysSinceStart, formatMoney, totalMoneySaved, topTriggerCounts } from './calculations';

export type CoachQuickId = 'urge' | 'stress' | 'trigger' | 'slip' | 'motivate';

function personalStats(data: AppData, locale: AppLanguage): string {
  const plan = data.plan;
  if (!plan) {
    return locale === 'en'
      ? "Once you start your plan, I'll personalize my guidance with your progress."
      : 'Planını başlattığında ilerlemene göre sana özel rehberlik sunacağım.';
  }
  const days = Math.max(0, daysSinceStart(plan));
  const avoided = Math.max(0, Math.round(cigarettesAvoided(plan, data.logs)));
  const saved = formatMoney(totalMoneySaved(plan, data.logs), plan.currency);
  const goal = data.savingsGoal?.title ? (locale === 'en' ? ` · Goal: ${data.savingsGoal.title}` : ` · Hedefin: ${data.savingsGoal.title}`) : '';
  const heavy = plan.heavySmokerMode && (plan.baselinePerDay ?? 0) >= 20 ? (locale === 'en' ? ' · Heavy Smoker Mode on' : ' · Ağır Tiryaki Modu açık') : '';
  if (locale === 'en') {
    return `Your status: ${days} days on your plan · ${avoided} cigarettes avoided · ${saved} saved${goal}${heavy}.`;
  }
  return `Durumun: ${days} gündür plandasın · ${avoided} sigara içmedin · ${saved} biriktirdin${goal}${heavy}.`;
}

function detectIntent(text: string): CoachQuickId | 'sleep' | 'cough' | 'money' | 'dizzy' | 'default' {
  const s = (text || '').toLowerCase();
  if (/uyku|sleep|insomnia|uyuyam/.test(s)) return 'sleep';
  if (/öksür|oksur|cough|balgam|phlegm/.test(s)) return 'cough';
  if (/para|money|tasarruf|birik|savings|budget|₺|tl|dolar|euro/.test(s)) return 'money';
  if (/baş dön|bas don|dizzy|sersem|vertigo/.test(s)) return 'dizzy';
  if (/1 dal|kaçamak|kacak|slip|relapse|moralim|içtim|ictim|smoked one|had one/.test(s)) return 'slip';
  if (/kahve|coffee|yemek|meal|food|çay|cay|after/.test(s) && /kriz|crav|istek|canım|canim|çekiyor|cekiyor|trigger|sonra/.test(s)) return 'trigger';
  if (/kahve|coffee|yemek|meal|food|çay|cay/.test(s)) return 'trigger';
  if (/sinir|gergin|stres|stress|angry|tense|öfke|ofke|anx/.test(s)) return 'stress';
  if (/motiv|moral|destek|support|güç ver|guc ver|encourag/.test(s)) return 'motivate';
  if (/sigara|crav|istek|canım|canim|çekiyor|cekiyor|elim gidiyor|urge|want to smoke|reach/.test(s)) return 'urge';
  return 'default';
}


function safetyGuardrail(input: string, locale: AppLanguage): string | null {
  const s = (input || '').toLowerCase();
  // Self-harm / severe depression signals
  if (/intihar|kendime zarar|ölmek ist|olmek ist|suicide|self.harm|kill myself|end my life|depresyon|depresyondayim/.test(s)) {
    return locale === 'en'
      ? 'I\'m really sorry you\'re feeling this way. Please reach out for immediate help: emergency services 112, mental health support line 183 (ALO 183), or ALO 171. You are not alone — a professional can support you right now. If you are in immediate danger, call 112.'
      : 'Bu duyguları taşıyor olman çok zor. Lütfen hemen yardım al: acil servis 112, ruh sağlığı destek hattı 183 (ALO 183) veya ALO 171. Yalnız değilsin — bir uzman şu an seni destekleyebilir. Acil bir tehlike varsa 112\'yi ara.';
  }
  // Pregnancy
  if (/hamile|gebelik|pregnant|pregnancy/.test(s)) {
    return locale === 'en'
      ? 'Pregnancy changes how nicotine replacement and medications should be used. Please consult your obstetrician/gynecologist before using any nicotine product or medication. You can also contact ALO 171 for free professional support.'
      : 'Hamilelik, nikotin replasmanı ve ilaçların kullanımını değiştirir. Herhangi bir nikotin ürünü veya ilaç kullanmadan önce kadın doğum uzmanınıza/hekiminize danışın. Ayrıca ücretsiz profesyonel destek için ALO 171\'i arayabilirsiniz.';
  }
  // Chronic illness / medication
  if (/kronik|diyabet|diabetes|kalp hast|heart disease|hipertansiyon|hypertension|ilac|ilaç|medication|doktorum|hekimim/.test(s)) {
    return locale === 'en'
      ? 'With chronic conditions or medications, please consult your physician before changing nicotine intake or starting cessation aids. ALO 171 can connect you with free professional support.'
      : 'Kronik hastalığınız veya kullandığınız ilaçlar varsa, nikotin alımınızı değiştirmeden veya bırakma yardımcılarına başlamadan önce hekiminize danışın. Ücretsiz profesyonel destek için ALO 171\'i arayabilirsiniz.';
  }
  // Medication dosage requests
  if (/doz|dozaj|mg |miligram|nicorette|nikotin bandi|nikotin sakizi|patch|gum|ilac oner|ilaç öner|hangi ilac|hangi ilaç/.test(s)) {
    return locale === 'en'
      ? 'I cannot recommend specific medications or dosages. Nicotine replacement and other cessation medications should be chosen with a healthcare professional based on your health profile. Please consult a doctor or pharmacist, or contact ALO 171 for free support.'
      : 'Belirli ilaç veya doz öneremem. Nikotin replasmanı ve diğer bırakma ilaçları, sağlık profilinize göre bir sağlık uzmanı ile seçilmelidir. Lütfen bir doktor veya eczacıya danışın ya da ücretsiz destek için ALO 171\'i arayın.';
  }
  return null;
}

export function coachReply(
  input: string,
  quickId: CoachQuickId | null,
  data: AppData,
  locale: AppLanguage,
): string {
  const guard = safetyGuardrail(input, locale);
  if (guard) return guard;
  const intent = quickId ?? detectIntent(input);
  const personal = personalStats(data, locale);

  const tr: Record<string, string> = {
    urge: `Şu anki istek bir dalga gibidir: genelde 3–5 dakikada yükselir ve azalır. 60 saniyelik nefes egzersizi yap, bir bardak su iç ya da ellerini meşgul et. ${personal} Bu anı ertelemek bile büyük bir kazanımdır.`,
    stress: `Stres ve gerginlik sigara isteğini tetikleyebilir; bu çok normal. 4-7-8 nefesi dene (4 sn al, 7 sn tut, 8 sn ver), omuzlarını gevşet ve kısa bir yürüyüş yap. ${personal} Duyguyu bastırmak yerine üzerinden geçmesine izin vermek işe yarar.`,
    trigger: `Kahve ve yemek sonrası anlar güçlü tetikleyicilerdir. Rutini küçük bir değişiklikle kır: farklı bir bardak kullan, masadan kalk, dişlerini fırçala ya da 60 sn baloncuk oyunu oyna. ${personal} Tetikleyiciyi fark etmen zaten kontrolü ele almanın ilk adımı.`,
    slip: `Bir dal içmen bırakma yolculuğunun sonu değil. Bu bir öğrenme anı: neyin tetiklediğini fark et ve kaldığın yerden devam et. Serin ve kazandıkların korunuyor. ${personal} Kendine nazik ol; ilerleme mükemmel olmak değil, devam etmektir.`,
    motivate: `Her içmediğin sigara bedenine ve bütçene iyi geliyor. ${personal} Küçük adımlar birikir; bugün attığın her adım yarının daha kolay olmasını sağlar. Sen bunu yapabilirsin.`,
    sleep: `Bırakma sürecinde uyku geçici olarak dalgalanabilir; nikotin düzeni değiştiğinde bu yaygındır. Yatmadan önce ekran süresini azalt, kafeini erken kes ve gevşeme rutini dene. Belirtiler genelde zamanla düzelir; şikayetlerin sürerse bir uzmana danışabilirsin. ${personal}`,
    cough: `Bıraktıktan sonra öksürük veya balgam artışı geçici olabilir; akciğerler kendini temizlemeye başlar. Bol su iç ve temiz hava al. Nefes darlığı, göğüs ağrısı veya kanlı balgam gibi belirtilerde mutlaka bir sağlık uzmanına başvur. ${personal}`,
    money: `Bırakmanın maddi kazanımı somut bir motivasyondur. ${personal} Biriktirdiğin tutarı tasarruf hedefinle ilişkilendirmek, isteği ertelemeyi kolaylaştırabilir.`,
    dizzy: `Baş dönmesi, huzursuzluk veya odaklanma güçlüğü nikotin azalmasına bağlı geçici belirtiler olabilir. Bol su iç, yavaş hareket et ve düzenli beslen. Belirtiler şiddetlenir veya uzun sürerse bir sağlık uzmanına danış. ${personal}`,
    default: `Seni duyuyorum. İstekler ve zor anlar geçicidir; derin nefes al, su iç ve dikkatin dağıt. ${personal} İstersen yaşadığın durumu biraz daha anlat, sana daha özel bir öneri sunayım.`,
  };

  const en: Record<string, string> = {
    urge: `This craving is like a wave: it usually rises and fades within 3–5 minutes. Try 60 seconds of breathing, drink a glass of water, or keep your hands busy. ${personal} Even delaying the urge is a real win.`,
    stress: `Stress and tension can trigger cravings — that's completely normal. Try 4-7-8 breathing (inhale 4s, hold 7s, exhale 8s), relax your shoulders, and take a short walk. ${personal} Letting the feeling pass works better than fighting it.`,
    trigger: `Coffee and after-meal moments are strong triggers. Break the routine with a small change: use a different cup, step away from the table, brush your teeth, or play the 60s bubble game. ${personal} Noticing the trigger is the first step to taking control.`,
    slip: `Having one cigarette doesn't end your quit journey. It's a learning moment: notice what triggered it and continue from where you left off. Your streak and progress are preserved. ${personal} Be kind to yourself — progress means continuing, not being perfect.`,
    motivate: `Every cigarette you skip benefits your body and your budget. ${personal} Small steps add up; every choice you make today makes tomorrow easier. You can do this.`,
    sleep: `Sleep can be temporarily unsettled during quitting; this is common as your nicotine routine changes. Reduce screen time before bed, cut caffeine earlier, and try a relaxation routine. It usually improves over time — see a professional if symptoms persist. ${personal}`,
    cough: `Coughing or more mucus can be temporary after quitting as your lungs begin to clear. Drink water and get fresh air. If you have shortness of breath, chest pain, or blood in mucus, seek medical advice. ${personal}`,
    money: `The financial gain of quitting is a powerful motivator. ${personal} Linking what you've saved to your savings goal can make it easier to delay a craving.`,
    dizzy: `Dizziness, restlessness, or trouble focusing can be temporary effects of reducing nicotine. Drink water, move slowly, and eat regularly. If symptoms worsen or persist, consult a health professional. ${personal}`,
    default: `I hear you. Cravings and tough moments are temporary — take a deep breath, drink water, and distract yourself. ${personal} If you'd like, tell me more about what's happening and I'll give a more specific suggestion.`,
  };

  const dict = locale === 'en' ? en : tr;
  return dict[intent] || dict.default;
}

export async function coachReplyAsync(
  input: string,
  quickId: CoachQuickId | null,
  data: AppData,
  locale: AppLanguage,
): Promise<string> {
  const apiUrl = (typeof process !== 'undefined' && (process as any).env?.EXPO_PUBLIC_AI_API_URL) || '';
  const apiKey = (typeof process !== 'undefined' && (process as any).env?.EXPO_PUBLIC_AI_API_KEY) || '';
  const guard = safetyGuardrail(input, locale);
  if (guard) return guard;
  if (!apiUrl) {
    return coachReply(input, quickId, data, locale);
  }
  const plan = data.plan;
  const days = plan ? Math.max(0, daysSinceStart(plan)) : 0;
  const avoided = plan ? Math.max(0, Math.round(cigarettesAvoided(plan, data.logs))) : 0;
  const saved = plan ? formatMoney(totalMoneySaved(plan, data.logs), plan.currency) : '';
  const triggers = (data.cravings || []).length
    ? topTriggerCounts(data.cravings, 3).map((t) => t.trigger).join(', ')
    : (locale === 'en' ? 'none yet' : 'henüz yok');
  const context =
    locale === 'en'
      ? `User quit-smoking context: days on plan=${days}, cigarettes avoided=${avoided}, money saved=${saved}, top triggers=${triggers}. Be supportive, non-judgmental, concise, science-based. IMPORTANT SAFETY RULES: Never recommend medications or dosages. For pregnancy, chronic illness, or medication questions, direct the user to a healthcare professional and ALO 171. If self-harm or severe depression is mentioned, provide crisis lines (112, 183, ALO 171) and encourage immediate help.`
      : `Kullanici sigara birakma baglami: planda gun=${days}, icilmeyen sigara=${avoided}, biriken para=${saved}, en sik tetikleyiciler=${triggers}. Destekleyici, yargilamayan, kisa ve bilimsel ol. ONEMLI GUVENLIK KURALLARI: Hicbir zaman ilac veya doz onerme. Hamilelik, kronik hastalik veya ilac sorularinda kullaniciyi saglik uzmanina ve ALO 171'e yonlendir. Kendine zarar verme veya agir depresyon belirtilerinde acil hatlari (112, 183, ALO 171) goster ve acil yardim almaya tesvik et.`;
  try {
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { Authorization: 'Bearer ' + apiKey } : {}),
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: context + '\n\nUser: ' + input }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 256 },
      }),
    });
    if (!res.ok) throw new Error('http ' + res.status);
    const json = await res.json();
    const text =
      json?.candidates?.[0]?.content?.parts?.[0]?.text ||
      json?.text ||
      json?.reply ||
      json?.choices?.[0]?.message?.content;
    if (typeof text === 'string' && text.trim()) return text.trim();
  } catch {
    // fallback below
  }
  return coachReply(input, quickId, data, locale);
}

export function coachIntro(locale: AppLanguage): string {
  return locale === 'en'
    ? "Hi, I'm your personal quit coach. Tell me about your cravings, stress, or questions — I'll offer science-based, non-judgmental guidance."
    : 'Merhaba, ben kişisel bırakma koçunum. İsteğini, stresini ya da merak ettiklerini yazabilirsin; sana bilimsel ve yargılamayan öneriler sunarım.';
}
