import React, { useState, useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { loadTasks } from '../utils/taskStore';
import { getDayStatus, getMonthStats, getTasksForDate, DayStatus } from '../utils/taskLogic';
import { RootStackParamList } from '../navigation/AppNavigator';
import { Task } from '../types/task';
import CompactCard from '../components/cards/CompactCard';
import AnalyticsRing from '../components/AnalyticsRing';
import DashboardGrid, { GridCell } from '../components/grid/DashboardGrid';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function statusColor(status: DayStatus): string {
  switch (status) {
    case 'completed': return '#4ade80';
    case 'missed': return '#ff6b6b';
    case 'mixed': return '#FFD93D';
    default: return 'rgba(255,255,255,0.04)';
  }
}

function getStreak(tasks: Task[]): number {
  const now = new Date();
  let streak = 0;
  for (let i = 0; i < 60; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const status = getDayStatus(tasks, key);
    if (status === 'completed' || status === 'mixed') streak++;
    else if (i > 0) break;
  }
  return streak;
}

export default function ProgressView() {
  const navigation = useNavigation<Nav>();
  const [tasks, setTasks] = useState<Task[]>([]);
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTasks, setSelectedTasks] = useState<Task[]>([]);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const loaded = await loadTasks();
        setTasks(loaded);
      })();
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    }, []),
  );

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const stats = getMonthStats(tasks, year, month);
  const streak = getStreak(tasks);
  const consistency = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  const goToPrevMonth = () => {
    if (month === 0) { setYear(year - 1); setMonth(11); } else setMonth(month - 1);
    setSelectedDate(null); setSelectedTasks([]);
  };
  const goToNextMonth = () => {
    if (month === 11) { setYear(year + 1); setMonth(0); } else setMonth(month + 1);
    setSelectedDate(null); setSelectedTasks([]);
  };
  const handleDayPress = (day: number) => {
    const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setSelectedDate(dateKey);
    setSelectedTasks(getTasksForDate(tasks, dateKey));
  };

  const calendarDays: (number | null)[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) calendarDays.push(null);
  for (let d = 1; d <= daysInMonth; d++) calendarDays.push(d);

  return (
    <DashboardGrid>
      {/* Stats + Streak */}
      <GridCell>
        <CompactCard>
          <Text style={styles.sectionTitle}>THIS MONTH</Text>
          <View style={styles.ringsRow}>
            <AnalyticsRing value={stats.completed} max={Math.max(stats.total, 1)} label="Completed" color="#4ade80" />
            <AnalyticsRing value={stats.missed} max={Math.max(stats.total, 1)} label="Missed" color="#ff6b6b" />
            <AnalyticsRing value={consistency} max={100} label="Consistency" unit="%" color="#6C5CE7" />
          </View>
        </CompactCard>
      </GridCell>

      <GridCell>
        <CompactCard glowColor="#FFD93D">
          <View style={styles.streakRow}>
            <View style={styles.streakIcon}><Text style={styles.streakEmoji}>🔥</Text></View>
            <View>
              <Text style={styles.streakNum}>{streak}</Text>
              <Text style={styles.streakLabel}>Day Streak</Text>
            </View>
            <View style={styles.streakBadge}>
              <Text style={styles.streakBadgeText}>
                {streak >= 7 ? 'Unstoppable!' : streak >= 3 ? 'Keep going!' : 'Start building!'}
              </Text>
            </View>
          </View>
        </CompactCard>
      </GridCell>

      {/* Calendar */}
      <GridCell span={2}>
        <CompactCard>
          <View style={styles.monthNav}>
            <TouchableOpacity onPress={goToPrevMonth} style={styles.navArrowBtn}>
              <Text style={styles.navArrow}>‹</Text>
            </TouchableOpacity>
            <Text style={styles.monthLabel}>{MONTH_NAMES[month]} {year}</Text>
            <TouchableOpacity onPress={goToNextMonth} style={styles.navArrowBtn}>
              <Text style={styles.navArrow}>›</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.dayLabelsRow}>
            {DAY_LABELS.map((label, i) => <Text key={i} style={styles.dayLabel}>{label}</Text>)}
          </View>
          <View style={styles.calendarGrid}>
            {calendarDays.map((day, i) => {
              if (day === null) return <View key={i} style={styles.dayCell} />;
              const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const dayStatus = getDayStatus(tasks, dateKey);
              const isSelected = dateKey === selectedDate;
              const isToday = dateKey === now.toISOString().slice(0, 10);
              const color = statusColor(dayStatus);
              return (
                <TouchableOpacity key={i} style={styles.dayCell} onPress={() => handleDayPress(day)}>
                  <View style={[
                    styles.dayDot,
                    { backgroundColor: dayStatus === 'none' ? 'rgba(255,255,255,0.04)' : color + '30' },
                    isSelected && { borderColor: '#6C5CE7', borderWidth: 2 },
                    isToday && { borderColor: 'rgba(255,255,255,0.3)', borderWidth: 1 },
                  ]}>
                    <Text style={[styles.dayNumber, { color: dayStatus !== 'none' ? color : 'rgba(255,255,255,0.3)' }, isSelected && { color: '#fff', fontWeight: '700' }]}>{day}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </CompactCard>
      </GridCell>

      {/* Selected Day Detail */}
      {selectedDate && (
        <GridCell>
          <Animated.View style={{ opacity: fadeAnim }}>
            <CompactCard>
              <Text style={styles.sectionTitle}>{selectedDate}</Text>
              {selectedTasks.length === 0 ? (
                <Text style={styles.emptyText}>No tasks for this day</Text>
              ) : (
                selectedTasks.map((t) => (
                  <View key={t.task_id} style={styles.taskRow}>
                    <View style={[styles.taskDot, { backgroundColor: t.status === 'completed' ? '#4ade80' : t.status === 'missed' ? '#ff6b6b' : 'rgba(255,255,255,0.2)' }]} />
                    <Text style={styles.taskTitle}>{t.title}</Text>
                    <Text style={[styles.taskStatus, { color: t.status === 'completed' ? '#4ade80' : t.status === 'missed' ? '#ff6b6b' : 'rgba(255,255,255,0.4)' }]}>{t.status}</Text>
                  </View>
                ))
              )}
            </CompactCard>
          </Animated.View>
        </GridCell>
      )}

      {/* AI Insight */}
      <GridCell>
        <CompactCard glowColor="#6C5CE7">
          <View style={styles.insightRow}>
            <Text style={styles.insightIcon}>🧠</Text>
            <Text style={styles.insightText}>
              {consistency >= 80
                ? "Your productivity is exceptional this month. Keep the momentum!"
                : consistency >= 50
                ? "You're making solid progress. Try to maintain daily consistency."
                : "Focus on completing at least one task per day to build momentum."}
            </Text>
          </View>
        </CompactCard>
      </GridCell>
    </DashboardGrid>
  );
}

const styles = StyleSheet.create({
  sectionTitle: { fontSize: 10, fontWeight: '800', letterSpacing: 1.5, color: 'rgba(255,255,255,0.35)', marginBottom: 10 },
  ringsRow: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 4 },

  streakRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  streakIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,217,61,0.15)', alignItems: 'center', justifyContent: 'center' },
  streakEmoji: { fontSize: 20 },
  streakNum: { fontSize: 24, fontWeight: '800', color: '#FFD93D' },
  streakLabel: { fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: '600' },
  streakBadge: { marginLeft: 'auto', backgroundColor: 'rgba(255,217,61,0.1)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  streakBadgeText: { fontSize: 10, color: '#FFD93D', fontWeight: '600' },

  monthNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  navArrowBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
  navArrow: { fontSize: 18, color: '#6C5CE7', fontWeight: '300' },
  monthLabel: { fontSize: 15, fontWeight: '700', color: '#fff' },

  dayLabelsRow: { flexDirection: 'row', marginBottom: 4 },
  dayLabel: { flex: 1, textAlign: 'center', fontSize: 10, fontWeight: '600', color: 'rgba(255,255,255,0.3)' },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: { width: '14.28%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  dayDot: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  dayNumber: { fontSize: 12, fontWeight: '500' },

  emptyText: { fontSize: 12, color: 'rgba(255,255,255,0.3)', textAlign: 'center', paddingVertical: 10 },
  taskRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, gap: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.03)' },
  taskDot: { width: 6, height: 6, borderRadius: 3 },
  taskTitle: { flex: 1, fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: '500' },
  taskStatus: { fontSize: 10, fontWeight: '600' },

  insightRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  insightIcon: { fontSize: 18, marginTop: 2 },
  insightText: { flex: 1, fontSize: 12, color: 'rgba(255,255,255,0.7)', lineHeight: 18, fontWeight: '500' },
});
