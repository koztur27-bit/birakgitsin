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

/** Bölgeye göre doğrulanmış kriz/acil hatları. Yalnızca metin içinde gösterilir. */
export function crisisMessage(locale: AppLanguage): string {
  return locale === 'en'
    ? "I'm really sorry you're feeling this way. Please reach out for immediate help: emergency services 112 (EU/UK) or 911 (US). Suicide & Crisis Lifeline 988 (US), Samaritans 116 123 (UK), ALO 182 mental health support (Turkey). Free quit support: ALO 171 (Turkey), 1-800-QUIT-NOW (US). You are not alone — a professional can support you right now. If you are in immediate danger, call your local emergency number."
    : 'Bu duyguları taşıyor olman çok zor. Lütfen hemen yardım al: acil servis 112 (AB/İngiltere) veya 911 (ABD). Ruh sağlığı destek hatları: ALO 182 (Türkiye), 988 (ABD), Samaritans 116 123 (İngiltere). Ücretsiz sigara bırakma desteği: ALO 171 (Türkiye), 1-800-QUIT-NOW (ABD). Yalnız değilsin — bir uzman şu an seni destekleyebilir. Acil bir tehlike varsa yerel acil numaranı ara.';
}

const SELF_HARM_RE = /intihar|intiharı|kendime zarar|kendini öldür|canıma kıy|canima kiy|ölmek ist|olmek ist|suicide|self.?harm|kill myself|end my life|depresyondayim|depresyonda|severely depressed/;

function safetyGuardrail(input: string, locale: AppLanguage): string | null {
  const s = (input || '').toLowerCase();
  if (SELF_HARM_RE.test(s)) return crisisMessage(locale);
  if (/hamile|gebelik|pregnant|pregnancy/.test(s)) {
    return locale === 'en'
      ? 'Pregnancy changes how nicotine replacement and medications should be used. Please consult your obstetrician/gynecologist before using any nicotine product or medication. You can also contact your local quit line (ALO 171 in Turkey, 1-800-QUIT-NOW in the US, NHS Smokefree 0300 123 1044 in the UK). This is general information, not medical advice.'
      : 'Hamilelik, nikotin replasmanı ve ilaçların kullanımını değiştirir. Herhangi bir nikotin ürünü veya ilaç kullanmadan önce kadın doğum uzmanınıza/hekiminize danışın. Ayrıca ücretsiz profesyonel destek için yerel hattınızı arayabilirsiniz (Türkiye ALO 171, ABD 1-800-QUIT-NOW, İngiltere NHS Smokefree 0300 123 1044). Bu genel bilgidir, tıbbi tavsiye değildir.';
  }
  if (/kronik|diyabet|diabetes|kalp hast|heart disease|hipertansiyon|hypertension|ilac|ilaç|medication|doktorum|hekimim/.test(s)) {
    return locale === 'en'
      ? 'With chronic conditions or medications, please consult your physician before changing nicotine intake or starting cessation aids. Your local quit line can connect you with free professional support. This is general information, not medical advice.'
      : 'Kronik hastalığınız veya kullandığınız ilaçlar varsa, nikotin alımınızı değiştirmeden veya bırakma yardımcılarına başlamadan önce hekiminize danışın. Ücretsiz profesyonel destek için yerel bırakma hattınızı arayabilirsiniz. Bu genel bilgidir, tıbbi tavsiye değildir.';
  }
  if (/doz|dozaj|mg |miligram|nicorette|nikotin bandi|nikotin sakizi|patch|gum|ilac oner|ilaç öner|hangi ilac|hangi ilaç/.test(s)) {
    return locale === 'en'
      ? 'I cannot recommend specific medications or dosages. Nicotine replacement and other cessation medications should be chosen with a healthcare professional based on your health profile. Please consult a doctor or pharmacist, or contact your local quit line for free support.'
      : 'Belirli ilaç veya doz öneremem. Nikotin replasmanı ve diğer bırakma ilaçları, sağlık profilinize göre bir sağlık uzmanı ile seçilmelidir. Lütfen bir doktor veya eczacıya danışın ya da ücretsiz destek için yerel bırakma hattınızı arayın.';
  }
  return null;
}

/** Model çıktısında tıbbi/ilac/tehlikeli talimat varsa güvenli yerel yanıta düş. */
function unsafeOutput(text: string): boolean {
  return /(?:mg\b|miligram|dozaj|dosage|reçete|recete|prescri|tanı koy|diagnos|tedavi eder|cures? (?:cancer|disease)|you should take|mutlaka almalısın|ilaç öner|ilac oner)/i.test(text);
}

const AI_DISCLAIMER = {
  en: '\n\nAI-generated, may be inaccurate. Not medical advice; consult a healthcare professional.',
  tr: '\n\nYapay zeka üretti, hatalı olabilir. Tıbbi tavsiye değildir; bir sağlık uzmanına danışın.',
};

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
    urge: `Şu anki istek bir dalga gibidir; genelde 3–5 dakikada yükselip azalır. 60 saniyelik nefes egzersizi yap, bir bardak su iç ya da ellerini meşgul et. ${personal} Bu anı ertelemek bile bir kazanımdır.`,
    stress: `Stres ve gerginlik sigara isteğini tetikleyebilir; bu çok normal. 4-7-8 nefesi dene (4 sn al, 7 sn tut, 8 sn ver), omuzlarını gevşet ve kısa bir yürüyüş yap. ${personal} Duyguyu bastırmak yerine üzerinden geçmesine izin vermek işe yarayabilir.`,
    trigger: `Kahve ve yemek sonrası anlar güçlü tetikleyicilerdir. Rutini küçük bir değişiklikle kır: farklı bir bardak kullan, masadan kalk, dişlerini fırçala ya da 60 sn baloncuk oyunu oyna. ${personal} Tetikleyiciyi fark etmen, kontrolü ele almanın ilk adımıdır.`,
    slip: `Bir dal içmen bırakma yolculuğunun sonu değil. Bu bir öğrenme anı: neyin tetiklediğini fark et ve kaldığın yerden devam et. ${personal} Kendine nazik ol; ilerleme mükemmel olmak değil, devam etmektir.`,
    motivate: `Her içmediğin sigara bütçene iyi gelebilir; bedensel etkiler kişiden kişiye değişir. ${personal} Küçük adımlar birikir; bugün attığın her adım yarının daha kolay olmasını sağlayabilir.`,
    sleep: `Bırakma sürecinde uyku geçici olarak dalgalanabilir; nikotin düzeni değiştiğinde bu yaygındır. Yatmadan önce ekran süresini azalt, kafeini erken kes ve gevşeme rutini dene. Şikayetlerin sürerse bir uzmana danışabilirsin. ${personal}`,
    cough: `Bıraktıktan sonra öksürük veya balgam artışı geçici olabilir. Bol su iç ve temiz hava al. Nefes darlığı, göğüs ağrısı veya kanlı balgam gibi belirtilerde mutlaka bir sağlık uzmanına başvur. ${personal}`,
    money: `Bırakmanın maddi kazanımı somut bir motivasyondur. ${personal} Biriktirdiğin tutarı tasarruf hedefinle ilişkilendirmek, isteği ertelemeyi kolaylaştırabilir.`,
    dizzy: `Baş dönmesi, huzursuluk veya odaklanma güçlüğü nikotin azalmasına bağlı geçici belirtiler olabilir. Bol su iç, yavaş hareket et ve düzenli beslen. Belirtiler şiddetlenir veya uzun sürerse bir sağlık uzmanına danış. ${personal}`,
    default: `Seni duyuyorum. İstekler ve zor anlar geçicidir; derin nefes al, su iç ve dikkatin dağıt. ${personal} İstersen yaşadığın durumu biraz daha anlat, sana genel bir öneri sunayım.`,
  };

  const en: Record<string, string> = {
    urge: `This craving is like a wave: it usually rises and fades within 3–5 minutes. Try 60 seconds of breathing, drink a glass of water, or keep your hands busy. ${personal} Even delaying the urge is a real win.`,
    stress: `Stress and tension can trigger cravings — that's completely normal. Try 4-7-8 breathing (inhale 4s, hold 7s, exhale 8s), relax your shoulders, and take a short walk. ${personal} Letting the feeling pass works better than fighting it.`,
    trigger: `Coffee and after-meal moments are strong triggers. Break the routine with a small change: use a different cup, step away from the table, brush your teeth, or play the 60s bubble game. ${personal} Noticing the trigger is the first step to taking control.`,
    slip: `Having one cigarette doesn't end your quit journey. It's a learning moment: notice what triggered it and continue from where you left off. ${personal} Be kind to yourself — progress means continuing, not being perfect.`,
    motivate: `Every cigarette you skip can help your budget; physical effects vary from person to person. ${personal} Small steps add up; every choice you make today may make tomorrow easier. You can do this.`,
    sleep: `Sleep can be temporarily unsettled during quitting; this is common as your nicotine routine changes. Reduce screen time before bed, cut caffeine earlier, and try a relaxation routine. See a professional if symptoms persist. ${personal}`,
    cough: `Coughing or more mucus can be temporary after quitting. Drink water and get fresh air. If you have shortness of breath, chest pain, or blood in mucus, seek medical advice. ${personal}`,
    money: `The financial gain of quitting is a powerful motivator. ${personal} Linking what you've saved to your savings goal can make it easier to delay a craving.`,
    dizzy: `Dizziness, restlessness, or trouble focusing can be temporary effects of reducing nicotine. Drink water, move slowly, and eat regularly. If symptoms worsen or persist, consult a health professional. ${personal}`,
    default: `I hear you. Cravings and tough moments are temporary — take a deep breath, drink water, and distract yourself. ${personal} If you'd like, tell me more about what's happening and I'll offer general guidance.`,
  };

  const dict = locale === 'en' ? en : tr;
  return dict[intent] || dict.default;
}

function aiContext(data: AppData, locale: AppLanguage): string {
  const plan = data.plan;
  const days = plan ? Math.max(0, daysSinceStart(plan)) : 0;
  const avoided = plan ? Math.max(0, Math.round(cigarettesAvoided(plan, data.logs))) : 0;
  const saved = plan ? formatMoney(totalMoneySaved(plan, data.logs), plan.currency) : '';
  const triggers = (data.cravings || []).length
    ? topTriggerCounts(data.cravings, 3).map((t) => t.trigger).join(', ')
    : (locale === 'en' ? 'none yet' : 'henüz yok');
  // Yalnızca anonim toplu sayılar gönderilir: isim, e-posta, serbest metin kaydı, konum yok.
  return locale === 'en'
    ? `Anonymous quit-smoking context: days on plan=${days}, cigarettes avoided=${avoided}, money saved=${saved}, top trigger categories=${triggers}. Be supportive, non-judgmental, concise. SAFETY RULES: Never recommend medications or dosages. For pregnancy, chronic illness, or medication questions, direct the user to a healthcare professional and their local quit line. For self-harm or severe depression, give emergency numbers: 112, 911, 988 (US), 116 123 (UK), ALO 182 (TR), ALO 171 (TR). State that you are an AI and not a doctor. Do not diagnose or promise medical outcomes.`
    : `Anonim sigara birakma baglami: planda gun=${days}, icilmeyen sigara=${avoided}, biriken para=${saved}, en sik tetikleyici kategorileri=${triggers}. Destekleyici, yargilamayan, kisa ol. GUVENLIK KURALLARI: Hicbir zaman ilac veya doz onerme. Hamilelik, kronik hastalik veya ilac sorularinda kullaniciyi saglik uzmanina ve yerel birakma hattina yonlendir. Kendine zarar verme veya agir depresyonda acil numaralari ver: 112, 911, 988 (ABD), 116 123 (IK), ALO 182 (TR), ALO 171 (TR). Yapay zeka oldugunu ve doktor olmadigini belirt. Tani koyma veya tibbi sonuc vaat etme.`;
}

export async function coachReplyAsync(
  input: string,
  quickId: CoachQuickId | null,
  data: AppData,
  locale: AppLanguage,
): Promise<string> {
  // İstemcide API anahtarı tutulmaz. Sunucu tarafı proxy (EXPO_PUBLIC_AI_PROXY_URL)
  // olmadan yerel, kurallı yanıtlar kullanılır.
  const proxyUrl = (typeof process !== 'undefined' &&
    ((process as any).env?.EXPO_PUBLIC_AI_PROXY_URL || (process as any).env?.EXPO_PUBLIC_AI_API_URL)) || '';
  const guard = safetyGuardrail(input, locale);
  if (guard) return guard;
  if (!proxyUrl) return coachReply(input, quickId, data, locale);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(proxyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        context: aiContext(data, locale),
        message: input,
        locale,
      }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error('http ' + res.status);
    const json = await res.json();
    const text =
      json?.reply ||
      json?.text ||
      json?.candidates?.[0]?.content?.parts?.[0]?.text ||
      json?.choices?.[0]?.message?.content;
    if (typeof text === 'string' && text.trim() && !unsafeOutput(text) && !SELF_HARM_RE.test(text)) {
      return text.trim() + AI_DISCLAIMER[locale];
    }
  } catch {
    // Zaman aşımı / ağ hatası → güvenli yerel yanıt
  } finally {
    clearTimeout(timeout);
  }
  return coachReply(input, quickId, data, locale);
}

export function coachIntro(locale: AppLanguage): string {
  return locale === 'en'
    ? "Hi, I'm your AI-assisted quit coach. I can offer general, non-judgmental guidance about cravings and motivation, but I'm not a doctor and I don't diagnose or treat conditions. For medical questions, consult a healthcare professional."
    : 'Merhaba, ben AI destekli bırakma koçunum. İstekler ve motivasyon konusunda genel, yargılamayan öneriler sunabilirim; doktor değilim, tanı koymam veya tedavi önermem. Tıbbi sorular için bir sağlık uzmanına danışın.';
}
