import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Task, Category, getCategoryColor } from '../types/task';
import { loadTasks } from '../utils/taskStore';
import { RootStackParamList } from '../navigation/AppNavigator';
import CompactCard from '../components/cards/CompactCard';
import FuturisticTimeline from '../components/FuturisticTimeline';
import DashboardGrid, { GridCell } from '../components/grid/DashboardGrid';

type Nav = NativeStackNavigationProp<RootStackParamList>;
const TZ_KEY = 'tasktock_timezone';

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function getDateKeyInTZ(date: Date, tz: string): string {
  try {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
    const y = parts.find((p) => p.type === 'year')?.value || '0';
    const m = parts.find((p) => p.type === 'month')?.value || '0';
    const d = parts.find((p) => p.type === 'day')?.value || '0';
    return `${y}-${m}-${d}`;
  } catch {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }
}

function getTodayKeyInTZ(tz: string): string {
  return getDateKeyInTZ(new Date(), tz);
}

export default function TimelineViewPage() {
  const navigation = useNavigation<Nav>();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<'all' | 'today' | 'week'>('all');
  const [timezone, setTimezone] = useState('UTC');

  useFocusEffect(useCallback(() => {
    (async () => {
      const loaded = await loadTasks();
      setTasks(loaded);
      const tz = await AsyncStorage.getItem(TZ_KEY);
      setTimezone(tz || Intl.DateTimeFormat().resolvedOptions().timeZone);
    })();
  }, []));

  const todayKey = getTodayKeyInTZ(timezone);

  const filteredTasks = tasks.filter((t) => {
    if (filter === 'today') {
      return getDateKeyInTZ(new Date(t.due_date), timezone) === todayKey;
    }
    if (filter === 'week') {
      const d = new Date(t.due_date);
      const diff = (Date.now() - d.getTime()) / (1000 * 60 * 60 * 24);
      return diff >= -7 && diff <= 7;
    }
    return true;
  }).sort((a, b) => a.due_date.localeCompare(b.due_date));

  const completed = filteredTasks.filter((t) => t.status === 'completed');
  const pending = filteredTasks.filter((t) => t.status !== 'completed');

  const recentActivity = tasks
    .filter((t) => t.completed_at)
    .sort((a, b) => (b.completed_at || '').localeCompare(a.completed_at || ''))
    .slice(0, 5);

  return (
    <DashboardGrid>
      {/* Header */}
      <GridCell span={2}>
        <CompactCard>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.pageTitle}>Timeline</Text>
              <Text style={styles.pageSub}>Your task flow at a glance</Text>
            </View>
            <View style={styles.filterRow}>
              {(['all', 'today', 'week'] as const).map((f) => (
                <TouchableOpacity
                  key={f}
                  style={[styles.filterPill, filter === f && styles.filterActive]}
                  onPress={() => setFilter(f)}
                >
                  <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
                    {f === 'all' ? 'All' : f === 'today' ? 'Today' : 'This Week'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{filteredTasks.length}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statValue}>{pending.length}</Text>
              <Text style={styles.statLabel}>Pending</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={[styles.statValue, { color: '#4ade80' }]}>{completed.length}</Text>
              <Text style={styles.statLabel}>Done</Text>
            </View>
          </View>
        </CompactCard>
      </GridCell>

      {/* Timeline */}
      <GridCell span={2}>
        <CompactCard>
          <Text style={styles.sectionTitle}>FLOW</Text>
          <ScrollView style={styles.timelineScroll} showsVerticalScrollIndicator={false}>
            <FuturisticTimeline
              tasks={filteredTasks}
              onToggle={async (task) => {
                const fresh = await loadTasks();
                const t = fresh.find((x) => x.task_id === task.task_id);
                if (t) {
                  t.status = t.status === 'completed' ? 'pending' : 'completed';
                  t.completed_at = t.status === 'completed' ? new Date().toISOString() : null;
                  const { saveTasks } = require('../utils/taskStore');
                  await saveTasks(fresh);
                  setTasks(fresh);
                }
              }}
              onPress={(id) => navigation.navigate('TaskDetail', { taskId: id })}
              timezone={timezone}
            />
          </ScrollView>
        </CompactCard>
      </GridCell>

      {/* Recent Activity */}
      <GridCell>
        <CompactCard>
          <Text style={styles.sectionTitle}>RECENT ACTIVITY</Text>
          {recentActivity.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>◈</Text>
              <Text style={styles.emptyText}>No recent completions</Text>
            </View>
          ) : (
            recentActivity.map((task) => (
              <View key={task.task_id} style={styles.activityRow}>
                <View style={styles.activityCheck}>
                  <Text style={styles.activityCheckText}>✓</Text>
                </View>
                <View style={styles.activityInfo}>
                  <Text style={styles.activityTitle} numberOfLines={1}>{task.title}</Text>
                  <Text style={styles.activityTime}>{getTimeAgo(task.completed_at!)}</Text>
                </View>
              </View>
            ))
          )}
        </CompactCard>
      </GridCell>

      {/* Category Breakdown */}
      <GridCell>
        <CompactCard>
          <Text style={styles.sectionTitle}>BY CATEGORY</Text>
          {(() => {
            const cats: Record<string, number> = {};
            filteredTasks.forEach((t) => { cats[t.category] = (cats[t.category] || 0) + 1; });
            return Object.entries(cats).sort((a, b) => b[1] - a[1]).map(([cat, count]) => {
              const color = getCategoryColor(cat as Category);
              return (
                <View key={cat} style={styles.catRow}>
                  <View style={[styles.catDot, { backgroundColor: color }]} />
                  <Text style={styles.catName}>{cat}</Text>
                  <View style={styles.catBarBg}>
                    <View style={[styles.catBarFill, { width: `${(count / filteredTasks.length) * 100}%`, backgroundColor: color }]} />
                  </View>
                  <Text style={styles.catCount}>{count}</Text>
                </View>
              );
            });
          })()}
        </CompactCard>
      </GridCell>
    </DashboardGrid>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  pageTitle: { fontSize: 20, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  pageSub: { fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 },
  filterRow: { flexDirection: 'row', gap: 4 },
  filterPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.04)' },
  filterActive: { backgroundColor: 'rgba(108,92,231,0.15)' },
  filterText: { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.4)' },
  filterTextActive: { color: '#6C5CE7' },

  statsRow: { flexDirection: 'row', alignItems: 'center', gap: 20, marginTop: 4 },
  stat: { alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '800', color: '#6C5CE7' },
  statLabel: { fontSize: 9, color: 'rgba(255,255,255,0.35)', fontWeight: '600', marginTop: 2 },
  statDivider: { width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.06)' },

  sectionTitle: { fontSize: 10, fontWeight: '800', letterSpacing: 1.5, color: 'rgba(255,255,255,0.35)', marginBottom: 12 },
  timelineScroll: { maxHeight: 400 },

  activityRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.03)' },
  activityCheck: { width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(74,222,128,0.15)', alignItems: 'center', justifyContent: 'center' },
  activityCheckText: { color: '#4ade80', fontSize: 11, fontWeight: '700' },
  activityInfo: { flex: 1 },
  activityTitle: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.7)' },
  activityTime: { fontSize: 10, color: 'rgba(255,255,255,0.25)', marginTop: 1 },

  emptyState: { alignItems: 'center', paddingVertical: 24 },
  emptyIcon: { fontSize: 24, color: 'rgba(255,255,255,0.12)', marginBottom: 6 },
  emptyText: { fontSize: 11, color: 'rgba(255,255,255,0.3)' },

  catRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  catDot: { width: 6, height: 6, borderRadius: 3 },
  catName: { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.6)', width: 60 },
  catBarBg: { flex: 1, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.05)' },
  catBarFill: { height: 4, borderRadius: 2 },
  catCount: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.4)', width: 20, textAlign: 'right' },
});
