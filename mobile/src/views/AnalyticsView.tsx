import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Task, Category, getCategoryColor } from '../types/task';
import { loadTasks } from '../utils/taskStore';
import { getTodayKey } from '../utils/taskLogic';
import CompactCard from '../components/cards/CompactCard';
import AnalyticsRing from '../components/AnalyticsRing';
import ProductivityHeatmap from '../components/ProductivityHeatmap';
import DashboardGrid, { GridCell } from '../components/grid/DashboardGrid';

function generateHeatmapData(tasks: Task[]): number[][] {
  const grid: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
  for (const task of tasks) {
    const d = new Date(task.due_date);
    grid[(d.getDay() + 6) % 7][d.getHours()]++;
  }
  return grid;
}

function getBestHours(tasks: Task[]): { hour: string; count: number }[] {
  const hours: Record<number, number> = {};
  tasks.filter((t) => t.status === 'completed').forEach((t) => {
    const h = new Date(t.completed_at || t.due_date).getHours();
    hours[h] = (hours[h] || 0) + 1;
  });
  return Object.entries(hours)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([h, count]) => ({
      hour: `${Number(h) < 12 ? `${h} AM` : Number(h) === 12 ? '12 PM' : `${Number(h) - 12} PM`}`,
      count,
    }));
}

export default function AnalyticsView() {
  const [tasks, setTasks] = useState<Task[]>([]);

  useFocusEffect(useCallback(() => { loadTasks().then(setTasks); }, []));

  const completed = tasks.filter((t) => t.status === 'completed');
  const pending = tasks.filter((t) => t.status !== 'completed');
  const completionRate = tasks.length > 0 ? completed.length / tasks.length : 0;

  const todayKey = getTodayKey();
  const todayTasks = tasks.filter((t) => {
    const d = new Date(t.due_date);
    const tKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return tKey === todayKey;
  });
  const todayDone = todayTasks.filter((t) => t.status === 'completed').length;

  // Streak calculation
  let streak = 0;
  const now = new Date();
  for (let i = 0; i < 60; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const dayTasks = tasks.filter((t) => {
      const td = new Date(t.due_date);
      const tk = `${td.getFullYear()}-${String(td.getMonth() + 1).padStart(2, '0')}-${String(td.getDate()).padStart(2, '0')}`;
      return tk === key;
    });
    if (dayTasks.length > 0 && dayTasks.some((t) => t.status === 'completed')) streak++;
    else if (i > 0) break;
  }

  const heatmapData = generateHeatmapData(tasks);
  const bestHours = getBestHours(tasks);

  // Category breakdown
  const cats: Record<string, { total: number; done: number }> = {};
  tasks.forEach((t) => {
    if (!cats[t.category]) cats[t.category] = { total: 0, done: 0 };
    cats[t.category].total++;
    if (t.status === 'completed') cats[t.category].done++;
  });

  return (
    <DashboardGrid>
      {/* Header */}
      <GridCell span={2}>
        <CompactCard>
          <Text style={styles.pageTitle}>Analytics</Text>
          <Text style={styles.pageSub}>Insights into your productivity patterns</Text>
        </CompactCard>
      </GridCell>

      {/* Overview Rings */}
      <GridCell>
        <CompactCard>
          <Text style={styles.sectionTitle}>OVERVIEW</Text>
          <View style={styles.ringsRow}>
            <AnalyticsRing value={completionRate} max={1} size={64} color="#6C5CE7" label="Done" />
            <AnalyticsRing value={todayTasks.length > 0 ? todayDone / todayTasks.length : 0} max={1} size={64} color="#4ade80" label="Today" />
            <AnalyticsRing value={Math.min(streak / 7, 1)} max={1} size={64} color="#FFD93D" label="Streak" />
          </View>
          <View style={styles.statsRow}>
            <View style={styles.miniStat}>
              <Text style={styles.miniStatVal}>{tasks.length}</Text>
              <Text style={styles.miniStatLabel}>Total</Text>
            </View>
            <View style={styles.miniStat}>
              <Text style={[styles.miniStatVal, { color: '#4ade80' }]}>{completed.length}</Text>
              <Text style={styles.miniStatLabel}>Completed</Text>
            </View>
            <View style={styles.miniStat}>
              <Text style={[styles.miniStatVal, { color: '#FFD93D' }]}>{streak}</Text>
              <Text style={styles.miniStatLabel}>Streak</Text>
            </View>
          </View>
        </CompactCard>
      </GridCell>

      {/* Best Hours */}
      <GridCell>
        <CompactCard glowColor="#00D2FF">
          <Text style={styles.sectionTitle}>PEAK HOURS</Text>
          {bestHours.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>Complete more tasks to see patterns</Text>
            </View>
          ) : (
            bestHours.map((h, i) => (
              <View key={h.hour} style={styles.hourRow}>
                <Text style={styles.hourRank}>#{i + 1}</Text>
                <Text style={styles.hourName}>{h.hour}</Text>
                <View style={styles.hourBarBg}>
                  <View style={[styles.hourBarFill, { width: `${(h.count / bestHours[0].count) * 100}%` }]} />
                </View>
                <Text style={styles.hourCount}>{h.count} tasks</Text>
              </View>
            ))
          )}
        </CompactCard>
      </GridCell>

      {/* Heatmap */}
      <GridCell span={2}>
        <CompactCard>
          <Text style={styles.sectionTitle}>ACTIVITY HEATMAP</Text>
          <ProductivityHeatmap data={heatmapData} />
        </CompactCard>
      </GridCell>

      {/* Categories */}
      <GridCell>
        <CompactCard>
          <Text style={styles.sectionTitle}>CATEGORIES</Text>
          {Object.entries(cats).sort((a, b) => b[1].total - a[1].total).map(([cat, data]) => {
            const rate = data.total > 0 ? data.done / data.total : 0;
            const color = getCategoryColor(cat as Category);
            return (
              <View key={cat} style={styles.catRow}>
                <View style={[styles.catDot, { backgroundColor: color }]} />
                <Text style={styles.catName}>{cat}</Text>
                <View style={styles.catBarBg}>
                  <View style={[styles.catBarFill, { width: `${rate * 100}%`, backgroundColor: color }]} />
                </View>
                <Text style={styles.catRate}>{Math.round(rate * 100)}%</Text>
              </View>
            );
          })}
        </CompactCard>
      </GridCell>

      {/* AI Insights */}
      <GridCell>
        <CompactCard glowColor="#6C5CE7">
          <Text style={styles.sectionTitle}>AI INSIGHTS</Text>
          <View style={styles.insightItem}>
            <Text style={styles.insightIcon}>◈</Text>
            <Text style={styles.insightText}>
              {completionRate > 0.7
                ? 'Great consistency! You complete most tasks on time.'
                : 'Try breaking large tasks into smaller subtasks for better completion rates.'}
            </Text>
          </View>
          <View style={styles.insightItem}>
            <Text style={styles.insightIcon}>◑</Text>
            <Text style={styles.insightText}>
              {streak >= 3
                ? `${streak}-day streak! Keep the momentum going.`
                : 'Build consistency by completing at least one task daily.'}
            </Text>
          </View>
          <View style={styles.insightItem}>
            <Text style={styles.insightIcon}>✦</Text>
            <Text style={styles.insightText}>
              {bestHours.length > 0
                ? `Your most productive time is ${bestHours[0].hour}. Schedule deep work then.`
                : 'Complete more tasks to unlock productivity time analysis.'}
            </Text>
          </View>
        </CompactCard>
      </GridCell>
    </DashboardGrid>
  );
}

const styles = StyleSheet.create({
  pageTitle: { fontSize: 20, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  pageSub: { fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 },
  sectionTitle: { fontSize: 10, fontWeight: '800', letterSpacing: 1.5, color: 'rgba(255,255,255,0.35)', marginBottom: 12 },

  ringsRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 12 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 4 },
  miniStat: { alignItems: 'center' },
  miniStatVal: { fontSize: 16, fontWeight: '800', color: '#6C5CE7' },
  miniStatLabel: { fontSize: 9, color: 'rgba(255,255,255,0.35)', fontWeight: '600', marginTop: 2 },

  hourRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  hourRank: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.25)', width: 24 },
  hourName: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.7)', width: 50 },
  hourBarBg: { flex: 1, height: 6, borderRadius: 3, backgroundColor: 'rgba(0,210,255,0.1)' },
  hourBarFill: { height: 6, borderRadius: 3, backgroundColor: '#00D2FF' },
  hourCount: { fontSize: 10, fontWeight: '600', color: 'rgba(255,255,255,0.35)', width: 50, textAlign: 'right' },

  catRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  catDot: { width: 6, height: 6, borderRadius: 3 },
  catName: { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.6)', width: 70 },
  catBarBg: { flex: 1, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.05)' },
  catBarFill: { height: 5, borderRadius: 3 },
  catRate: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.4)', width: 30, textAlign: 'right' },

  insightItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 10 },
  insightIcon: { fontSize: 14, color: '#6C5CE7', marginTop: 1 },
  insightText: { fontSize: 12, color: 'rgba(255,255,255,0.6)', flex: 1, lineHeight: 17 },

  emptyState: { alignItems: 'center', paddingVertical: 20 },
  emptyText: { fontSize: 11, color: 'rgba(255,255,255,0.3)' },
});
