import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Task, getCategoryColor } from '../types/task';
import { loadTasks, saveTasks } from '../utils/taskStore';
import { recoverAlarms, getTodayKey, getTasksForDate } from '../utils/taskLogic';
import { useAuth } from '../utils/authContext';
import { RootStackParamList } from '../navigation/AppNavigator';
import CompactCard from '../components/cards/CompactCard';
import AnalyticsRing from '../components/AnalyticsRing';
import AICoachPanel from '../components/AICoachPanel';
import ScheduleBar from '../components/ScheduleBar';
import FuturisticTimeline from '../components/FuturisticTimeline';
import ProductivityHeatmap from '../components/ProductivityHeatmap';
import DashboardGrid, { GridCell } from '../components/grid/DashboardGrid';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const TZ_KEY = 'tasktock_timezone';

function getHourInTimezone(tz: string): number {
  try {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', hour12: false }).formatToParts(new Date());
    return parseInt(parts.find((p) => p.type === 'hour')?.value || '0', 10);
  } catch { return new Date().getHours(); }
}

function getGreeting(tz: string): string {
  const h = getHourInTimezone(tz);
  if (h < 5) return 'Good Night';
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  if (h < 21) return 'Good Evening';
  return 'Good Night';
}

function getFormattedDate(tz: string): string {
  try {
    return new Date().toLocaleString('en-US', { timeZone: tz, weekday: 'short', month: 'short', day: 'numeric' });
  } catch { return new Date().toLocaleDateString(); }
}

function generateHeatmapData(tasks: Task[]): number[][] {
  const grid: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
  for (const task of tasks) {
    const d = new Date(task.due_date);
    grid[(d.getDay() + 6) % 7][d.getHours()]++;
  }
  return grid;
}

interface Props {
  onNavigate?: (view: string) => void;
}

export default function DashboardView({ onNavigate }: Props) {
  const navigation = useNavigation<Nav>();
  const { user } = useAuth();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [completedToday, setCompletedToday] = useState(0);
  const [totalToday, setTotalToday] = useState(0);
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);

  const loadAll = async () => {
    const loaded = await loadTasks();
    const recovered = recoverAlarms(loaded);
    if (recovered > 0 && Platform.OS === 'web') window.alert(`Rescheduled ${recovered} pending alarm(s).`);
    await saveTasks(loaded);
    setTasks(loaded);
    const todayKey = getTodayKey();
    const todaysTasks = getTasksForDate(loaded, todayKey);
    setCompletedToday(todaysTasks.filter((t) => t.status === 'completed').length);
    setTotalToday(todaysTasks.length);
    const tz = await AsyncStorage.getItem(TZ_KEY);
    setTimezone(tz || Intl.DateTimeFormat().resolvedOptions().timeZone);
  };

  useFocusEffect(useCallback(() => { loadAll(); }, []));

  const handleToggleComplete = async (task: Task) => {
    const dateKey = getTodayKey();
    const target = tasks.find((t) => t.task_id === task.task_id);
    if (!target) return;
    if (target.status === 'completed') {
      target.status = 'pending'; target.completed_at = null;
    } else {
      if (target.repeat !== 'none') target.instance_completions[dateKey] = 'completed';
      else { target.status = 'completed'; target.completed_at = new Date().toISOString(); }
    }
    await saveTasks(tasks);
    await loadAll();
  };

  const pendingTasks = tasks.filter((t) => t.status !== 'completed').sort((a, b) => a.due_date.localeCompare(b.due_date));
  const completedTasks = tasks.filter((t) => t.status === 'completed');
  const progress = totalToday > 0 ? completedToday / totalToday : 0;
  const focusScore = Math.round(progress * 100);
  const focusMinutes = completedTasks.length * 25;
  const heatmapData = generateHeatmapData(tasks);

  const aiSuggestions = [
    pendingTasks.length > 0 ? `Focus on "${pendingTasks[0]?.title}" next` : 'No pending tasks — great job!',
    completedToday >= 3 ? 'Take a 10-min break to recharge.' : 'Try a 25-min focus sprint.',
    pendingTasks.length > 5 ? 'Consider breaking large tasks into subtasks.' : 'Your workload looks balanced today.',
  ];

  return (
    <DashboardGrid>
      {/* Welcome Banner → Progress */}
      <GridCell span={2}>
        <CompactCard onPress={() => onNavigate?.('progress')} glowColor="#6C5CE7">
          <View style={styles.welcomeRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.greetingText}>{getGreeting(timezone)}, {user?.name || 'Student'}</Text>
              <Text style={styles.dateText}>{getFormattedDate(timezone)}</Text>
            </View>
            <View style={styles.metricsRow}>
              <View style={styles.metricItem}>
                <Text style={styles.metricValue}>{focusScore}%</Text>
                <Text style={styles.metricLabel}>Focus</Text>
              </View>
              <View style={styles.metricDivider} />
              <View style={styles.metricItem}>
                <Text style={styles.metricValue}>{completedToday}/{totalToday}</Text>
                <Text style={styles.metricLabel}>Done</Text>
              </View>
              <View style={styles.metricDivider} />
              <View style={styles.metricItem}>
                <Text style={styles.metricValue}>{focusMinutes}m</Text>
                <Text style={styles.metricLabel}>Focus Time</Text>
              </View>
            </View>
          </View>
          <Text style={styles.cardHint}>Click to view Progress →</Text>
        </CompactCard>
      </GridCell>

      {/* AI Coach → Open Chat */}
      <GridCell>
        <CompactCard glowColor="#6C5CE7" onPress={() => onNavigate?.('ai')}>
          <AICoachPanel suggestions={aiSuggestions} focusScore={focusScore} />
          <Text style={styles.cardHint}>Click to open AI Coach →</Text>
        </CompactCard>
      </GridCell>

      {/* Next Up + Pending → Tasks */}
      <GridCell>
        {pendingTasks.length > 0 ? (
          <CompactCard glowColor={getCategoryColor(pendingTasks[0].category)} onPress={() => onNavigate?.('tasks')}>
            <Text style={styles.sectionTitle}>NEXT UP</Text>
            <TouchableOpacity
              style={styles.nextUpCard}
              onPress={() => navigation.navigate('TaskDetail', { taskId: pendingTasks[0].task_id })}
              activeOpacity={0.7}
            >
              <View style={[styles.nextUpIndicator, { backgroundColor: getCategoryColor(pendingTasks[0].category) }]} />
              <View style={styles.nextUpInfo}>
                <Text style={styles.nextUpTitle}>{pendingTasks[0].title}</Text>
                <View style={styles.nextUpMeta}>
                  <View style={[styles.catPill, { backgroundColor: getCategoryColor(pendingTasks[0].category) + '20' }]}>
                    <Text style={[styles.catPillText, { color: getCategoryColor(pendingTasks[0].category) }]}>{pendingTasks[0].category}</Text>
                  </View>
                  <Text style={styles.nextUpTime}>
                    {new Date(pendingTasks[0].due_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              </View>
              <TouchableOpacity style={[styles.doneCircle, { borderColor: '#4ade80' }]} onPress={() => handleToggleComplete(pendingTasks[0])}>
                <Text style={styles.doneCheck}>✓</Text>
              </TouchableOpacity>
            </TouchableOpacity>

            {pendingTasks.length > 1 && (
              <>
                <View style={styles.separator} />
                <Text style={styles.sectionTitle}>PENDING ({pendingTasks.length - 1})</Text>
                {pendingTasks.slice(1, 4).map((task) => {
                  const catColor = getCategoryColor(task.category);
                  return (
                    <TouchableOpacity key={task.task_id} style={styles.taskRow} onPress={() => navigation.navigate('TaskDetail', { taskId: task.task_id })} activeOpacity={0.7}>
                      <TouchableOpacity style={[styles.taskCheckbox, { borderColor: catColor }]} onPress={() => handleToggleComplete(task)}>
                        <View style={[styles.taskCheckboxInner, { backgroundColor: 'transparent' }]} />
                      </TouchableOpacity>
                      <View style={styles.taskContent}>
                        <Text style={styles.taskTitle}>{task.title}</Text>
                        <View style={styles.taskMeta}>
                          <View style={[styles.catDot, { backgroundColor: catColor }]} />
                          <Text style={styles.taskCategory}>{task.category}</Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
                {pendingTasks.length > 4 && (
                  <Text style={styles.viewAllText}>View all {pendingTasks.length} tasks →</Text>
                )}
              </>
            )}
            <Text style={styles.cardHint}>Click to view all Tasks →</Text>
          </CompactCard>
        ) : (
          <CompactCard onPress={() => onNavigate?.('tasks')}>
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>✦</Text>
              <Text style={styles.emptyTitle}>All clear!</Text>
              <Text style={styles.emptySub}>No pending tasks</Text>
            </View>
            <Text style={styles.cardHint}>Click to view Tasks →</Text>
          </CompactCard>
        )}
      </GridCell>

      {/* Schedule → Schedule page */}
      <GridCell>
        <CompactCard onPress={() => onNavigate?.('schedule')} glowColor="#00D2FF">
          <Text style={styles.sectionTitle}>SCHEDULE</Text>
          <ScheduleBar tasks={tasks} />
          <Text style={styles.cardHint}>Click to view Schedule →</Text>
        </CompactCard>
      </GridCell>

      {/* Timeline → Timeline page */}
      <GridCell>
        <CompactCard onPress={() => onNavigate?.('timeline')} glowColor="#6C5CE7">
          <Text style={styles.sectionTitle}>TIMELINE</Text>
          <FuturisticTimeline tasks={tasks} onToggle={handleToggleComplete} onPress={(id) => navigation.navigate('TaskDetail', { taskId: id })} timezone={timezone} />
          <Text style={styles.cardHint}>Click to view Timeline →</Text>
        </CompactCard>
      </GridCell>

      {/* Heatmap → Analytics page */}
      <GridCell>
        <CompactCard onPress={() => onNavigate?.('analytics')} glowColor="#FF6B9D">
          <Text style={styles.sectionTitle}>ACTIVITY HEATMAP</Text>
          <ProductivityHeatmap data={heatmapData} />
          <Text style={styles.cardHint}>Click to view Analytics →</Text>
        </CompactCard>
      </GridCell>

      {/* Focus Widget → Focus */}
      <GridCell>
        <CompactCard onPress={() => onNavigate?.('focus')} glowColor="#FFD93D">
          <Text style={styles.sectionTitle}>FOCUS MODE</Text>
          <View style={styles.focusPreview}>
            <Text style={styles.focusIcon}>◒</Text>
            <View style={styles.focusInfo}>
              <Text style={styles.focusTitle}>Start a Focus Session</Text>
              <Text style={styles.focusSub}>25min work · 5min break</Text>
            </View>
          </View>
          <Text style={styles.cardHint}>Click to start Focus →</Text>
        </CompactCard>
      </GridCell>

      {/* Completed */}
      {completedTasks.length > 0 && (
        <GridCell>
          <CompactCard>
            <Text style={styles.sectionTitle}>COMPLETED ({completedTasks.length})</Text>
            {completedTasks.slice(0, 3).map((task) => (
              <TouchableOpacity key={task.task_id} style={[styles.taskRow, { opacity: 0.5 }]} onPress={() => handleToggleComplete(task)} activeOpacity={0.7}>
                <View style={[styles.taskCheckbox, { borderColor: '#4ade80', backgroundColor: '#4ade80' }]}>
                  <Text style={styles.taskCheckboxDone}>✓</Text>
                </View>
                <Text style={[styles.taskTitle, { textDecorationLine: 'line-through', color: 'rgba(255,255,255,0.3)' }]}>{task.title}</Text>
              </TouchableOpacity>
            ))}
          </CompactCard>
        </GridCell>
      )}
    </DashboardGrid>
  );
}

const styles = StyleSheet.create({
  welcomeRow: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  greetingText: { fontSize: 18, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  dateText: { fontSize: 12, color: 'rgba(255,255,255,0.4)', fontWeight: '500', marginTop: 2 },
  metricsRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  metricItem: { alignItems: 'center' },
  metricValue: { fontSize: 18, fontWeight: '800', color: '#6C5CE7' },
  metricLabel: { fontSize: 9, color: 'rgba(255,255,255,0.35)', fontWeight: '600', marginTop: 2 },
  metricDivider: { width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.06)' },

  cardHint: { fontSize: 10, color: 'rgba(255,255,255,0.2)', fontWeight: '500', marginTop: 8, textAlign: 'right' },

  sectionTitle: { fontSize: 10, fontWeight: '800', letterSpacing: 1.5, color: 'rgba(255,255,255,0.35)', marginBottom: 10 },
  separator: { height: 1, backgroundColor: 'rgba(255,255,255,0.04)', marginVertical: 10 },

  nextUpCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: 10, gap: 10 },
  nextUpIndicator: { width: 3, height: 28, borderRadius: 2 },
  nextUpInfo: { flex: 1 },
  nextUpTitle: { fontSize: 13, fontWeight: '700', color: '#fff' },
  nextUpMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  catPill: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5 },
  catPillText: { fontSize: 9, fontWeight: '700' },
  nextUpTime: { fontSize: 10, color: 'rgba(255,255,255,0.35)', fontWeight: '500' },
  doneCircle: { width: 28, height: 28, borderRadius: 14, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  doneCheck: { color: '#4ade80', fontSize: 13, fontWeight: '700' },

  taskRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.03)' },
  taskCheckbox: { width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  taskCheckboxInner: { width: 8, height: 8, borderRadius: 4 },
  taskCheckboxDone: { color: '#fff', fontSize: 9, fontWeight: '700' },
  taskContent: { flex: 1 },
  taskTitle: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.8)' },
  taskMeta: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  catDot: { width: 4, height: 4, borderRadius: 2 },
  taskCategory: { fontSize: 9, color: 'rgba(255,255,255,0.3)', fontWeight: '600' },

  viewAllText: { fontSize: 11, color: '#6C5CE7', fontWeight: '600', textAlign: 'center', paddingVertical: 8 },

  focusPreview: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(255,217,61,0.06)', borderRadius: 10, padding: 12 },
  focusIcon: { fontSize: 28, color: '#FFD93D' },
  focusInfo: { flex: 1 },
  focusTitle: { fontSize: 14, fontWeight: '700', color: '#fff' },
  focusSub: { fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 },

  emptyState: { alignItems: 'center', paddingVertical: 20 },
  emptyIcon: { fontSize: 28, color: 'rgba(108,92,231,0.4)', marginBottom: 8 },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: 'rgba(255,255,255,0.6)' },
  emptySub: { fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 4 },
});
