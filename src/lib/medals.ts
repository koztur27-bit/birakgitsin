import { AppData } from '../types';
import { cigarettesAvoided, daysSinceStart, goalStreak, totalMoneySaved } from './calculations';

export type MedalId = 'm24h' | 'm100cigs' | 'm7days' | 'm500money' | 'm30days' | 'm1000cigs';

export type MedalProgress = {
  id: MedalId;
  current: number;
  target: number;
  progress: number; // 0..1
  earned: boolean;
};

export function computeMedals(data: AppData): MedalProgress[] {
  const plan = data.plan;
  const days = plan ? Math.max(0, daysSinceStart(plan)) : 0;
  const avoided = plan ? Math.max(0, Math.floor(cigarettesAvoided(plan, data.logs))) : 0;
  const saved = plan ? Math.max(0, totalMoneySaved(plan, data.logs)) : 0;
  const streak = plan ? Math.max(0, goalStreak(plan, data.logs)) : 0;

  const defs: { id: MedalId; current: number; target: number }[] = [
    { id: 'm24h', current: Math.min(days, 1), target: 1 },
    { id: 'm100cigs', current: Math.min(avoided, 100), target: 100 },
    { id: 'm7days', current: Math.min(streak, 7), target: 7 },
    { id: 'm500money', current: Math.min(saved, 500), target: 500 },
    { id: 'm30days', current: Math.min(days, 30), target: 30 },
    { id: 'm1000cigs', current: Math.min(avoided, 1000), target: 1000 },
  ];

  return defs.map((d) => {
    const progress = d.target > 0 ? Math.min(1, Math.max(0, d.current / d.target)) : 0;
    return { ...d, progress, earned: progress >= 1 };
  });
}
