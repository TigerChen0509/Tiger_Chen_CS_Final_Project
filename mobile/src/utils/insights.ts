import { Task } from '../types/task';
import { getTasksForDate, getTodayKey } from './taskLogic';

export interface Insights {
  totalCompleted: number;
  totalMissed: number;
  totalPending: number;
  completionRate: number;
  bestHour: string;
  bestDay: string;
  categoryBreakdown: { category: string; completed: number; total: number; color: string }[];
  weeklyTrend: { day: string; completed: number; missed: number }[];
  avgTasksPerDay: number;
}

const CATEGORY_COLORS: Record<string, string> = {
  General: '#6c5ce7',
  Math: '#e17055',
  CS: '#00b894',
  English: '#fdcb6e',
  Science: '#0984e3',
  Language: '#e84393',
  Personal: '#00cec9',
  Work: '#636e72',
};

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function computeInsights(tasks: Task[]): Insights {
  const completed = tasks.filter((t) => t.status === 'completed');
  const missed = tasks.filter((t) => t.status === 'missed');
  const pending = tasks.filter((t) => t.status === 'pending');
  const total = completed.length + missed.length;
  const completionRate = total > 0 ? completed.length / total : 0;

  // Best hour
  const hourCounts: Record<number, number> = {};
  for (const t of completed) {
    if (t.completed_at) {
      const h = new Date(t.completed_at).getHours();
      hourCounts[h] = (hourCounts[h] || 0) + 1;
    }
  }
  let bestHour = 9;
  let maxH = 0;
  for (const [h, c] of Object.entries(hourCounts)) {
    if (c > maxH) { maxH = c; bestHour = parseInt(h); }
  }
  const ampm = bestHour >= 12 ? 'PM' : 'AM';
  const displayHour = bestHour > 12 ? bestHour - 12 : bestHour === 0 ? 12 : bestHour;
  const bestHourStr = `${displayHour}:00 ${ampm}`;

  // Best day of week
  const dayCounts: Record<number, number> = {};
  for (const t of completed) {
    if (t.completed_at) {
      const d = new Date(t.completed_at).getDay();
      dayCounts[d] = (dayCounts[d] || 0) + 1;
    }
  }
  let bestDay = 1;
  let maxD = 0;
  for (const [d, c] of Object.entries(dayCounts)) {
    if (c > maxD) { maxD = c; bestDay = parseInt(d); }
  }

  // Category breakdown
  const catMap: Record<string, { completed: number; total: number }> = {};
  for (const t of tasks) {
    const cat = t.category || 'General';
    if (!catMap[cat]) catMap[cat] = { completed: 0, total: 0 };
    catMap[cat].total++;
    if (t.status === 'completed') catMap[cat].completed++;
  }
  const categoryBreakdown = Object.entries(catMap).map(([category, data]) => ({
    category,
    ...data,
    color: CATEGORY_COLORS[category] || '#6c5ce7',
  }));

  // Weekly trend (last 7 days)
  const weeklyTrend: { day: string; completed: number; missed: number }[] = [];
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const dayTasks = getTasksForDate(tasks, dateKey);
    weeklyTrend.push({
      day: DAY_NAMES[d.getDay()],
      completed: dayTasks.filter((t) => t.status === 'completed').length,
      missed: dayTasks.filter((t) => t.status === 'missed').length,
    });
  }

  // Avg tasks per day (last 30 days)
  let totalTasks30 = 0;
  for (let i = 0; i < 30; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    totalTasks30 += getTasksForDate(tasks, dateKey).length;
  }

  return {
    totalCompleted: completed.length,
    totalMissed: missed.length,
    totalPending: pending.length,
    completionRate,
    bestHour: bestHourStr,
    bestDay: DAY_NAMES[bestDay],
    categoryBreakdown,
    weeklyTrend,
    avgTasksPerDay: Math.round((totalTasks30 / 30) * 10) / 10,
  };
}
