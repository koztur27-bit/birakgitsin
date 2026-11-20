import { AppData, AppLanguage } from '../types';
import { cigarettesAvoided, daysSinceStart, formatMoney, totalMoneySaved } from './calculations';

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

export function coachReply(
  input: string,
  quickId: CoachQuickId | null,
  data: AppData,
  locale: AppLanguage,
): string {
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

export function coachIntro(locale: AppLanguage): string {
  return locale === 'en'
    ? "Hi, I'm your personal quit coach. Tell me about your cravings, stress, or questions — I'll offer science-based, non-judgmental guidance."
    : 'Merhaba, ben kişisel bırakma koçunum. İsteğini, stresini ya da merak ettiklerini yazabilirsin; sana bilimsel ve yargılamayan öneriler sunarım.';
}
