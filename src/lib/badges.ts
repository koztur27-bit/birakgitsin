import { AppData } from '../types';
import { cigarettesAvoided, daysSinceStart, goalStreak, todayKey } from './calculations';

export type BadgeDef = {
  id: string;
  title: string;
  emoji: string;
  desc: string;
  check: (data: AppData) => boolean;
};

export function badgeDefs(): BadgeDef[] {
  return [
    {
      id: 'b01',
      title: 'İlk gün',
      emoji: '🌱',
      desc: 'Plana başladın ve ilk gününü tamamladın.',
      check: (d) => !!d.plan && daysSinceStart(d.plan) >= 1,
    },
    {
      id: 'b02',
      title: 'İlk adım',
      emoji: '🚭',
      desc: 'İlk sigarasız geçen anın bu.',
      check: (d) => !!d.plan && d.logs.some((l) => l.smoked < dailyGoalFor(d, l.date)),
    },
    {
      id: 'b03',
      title: '3 gün seri',
      emoji: '🐣',
      desc: '3 gün üst üste hedefinin altında kaldın.',
      check: (d) => !!d.plan && goalStreak(d.plan, d.logs) >= 3,
    },
    {
      id: 'b04',
      title: '1 hafta seri',
      emoji: '💪',
      desc: '7 gün üst üste hedefini tutturdun.',
      check: (d) => !!d.plan && goalStreak(d.plan, d.logs) >= 7,
    },
    {
      id: 'b05',
      title: '3 hafta seri',
      emoji: '🔥',
      desc: '21 gün üst üste hedefinde kaldın.',
      check: (d) => !!d.plan && goalStreak(d.plan, d.logs) >= 21,
    },
    {
      id: 'b06',
      title: '1 ay seri',
      emoji: '🏅',
      desc: '30 gün üst üste hedefini tutturdun.',
      check: (d) => !!d.plan && goalStreak(d.plan, d.logs) >= 30,
    },
    {
      id: 'b07',
      title: '90 gün seri',
      emoji: '🌟',
      desc: '3 ay boyunca hedefinin altında kaldın.',
      check: (d) => !!d.plan && goalStreak(d.plan, d.logs) >= 90,
    },
    {
      id: 'b08',
      title: 'Bir yıl seri',
      emoji: '👑',
      desc: '365 gün üst üste hedefini tutturdun.',
      check: (d) => !!d.plan && goalStreak(d.plan, d.logs) >= 365,
    },
    {
      id: 'b09',
      title: '100 sigara azalt',
      emoji: '🛡️',
      desc: 'Toplam 100 sigara içilmedi.',
      check: (d) => !!d.plan && cigarettesAvoided(d.plan, d.logs) >= 100,
    },
    {
      id: 'b10',
      title: '500 sigara azalt',
      emoji: '🎯',
      desc: 'Toplam 500 sigara içilmedi.',
      check: (d) => !!d.plan && cigarettesAvoided(d.plan, d.logs) >= 500,
    },
    {
      id: 'b11',
      title: '1.000 sigara azalt',
      emoji: '🏆',
      desc: 'Toplam 1.000 sigara içilmedi.',
      check: (d) => !!d.plan && cigarettesAvoided(d.plan, d.logs) >= 1000,
    },
    {
      id: 'b12',
      title: '5.000 sigara azalt',
      emoji: '🎖️',
      desc: 'Toplam 5.000 sigara içilmedi.',
      check: (d) => !!d.plan && cigarettesAvoided(d.plan, d.logs) >= 5000,
    },
    {
      id: 'b13',
      title: '5 krize dayan',
      emoji: '🧠',
      desc: '5 kez kriz hissine rağmen içmedin.',
      check: (d) => d.cravings.filter((c) => c.resisted).length >= 5,
    },
    {
      id: 'b14',
      title: '25 krize dayan',
      emoji: '🦾',
      desc: '25 kez kriz hissine rağmen içmedin.',
      check: (d) => d.cravings.filter((c) => c.resisted).length >= 25,
    },
    {
      id: 'b15',
      title: '100 krize dayan',
      emoji: '🚀',
      desc: '100 kez kriz hissine rağmen içmedin.',
      check: (d) => d.cravings.filter((c) => c.resisted).length >= 100,
    },
    {
      id: 'b16',
      title: 'Bir aylık yolcu',
      emoji: '🗓️',
      desc: 'Planında 30 günü tamamladın.',
      check: (d) => !!d.plan && daysSinceStart(d.plan) >= 30,
    },
  ];
}

const defMap = new Map(badgeDefs().map((b) => [b.id, b]));

function dailyGoalFor(data: AppData, dateKey: string): number {
  if (!data.plan) return 0;
  const week = Math.floor(Math.max(0, daysSinceStart(data.plan, dateKey)) / 7);
  return Math.max(0, data.plan.baselinePerDay - week * data.plan.weeklyReduction);
}

export function badgeById(id: string): BadgeDef | undefined {
  return defMap.get(id);
}

export function evaluateBadges(data: AppData, existing: string[]): string[] {
  const have = new Set(existing ?? []);
  return badgeDefs().filter((b) => !have.has(b.id) && b.check(data)).map((b) => b.id);
}

export function badgeTitle(id: string): string {
  return badgeById(id)?.title ?? id;
}

export function todayIsClean(data: AppData): boolean {
  if (!data.plan || !data.logs.length) return false;
  const key = todayKey();
  const rec = data.logs.find((l) => l.date === key);
  return !!rec && rec.smoked < dailyGoalFor(data, key);
}