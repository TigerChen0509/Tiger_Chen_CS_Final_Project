import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Task, getCategoryColor } from '../types/task';
import { loadTasks } from '../utils/taskStore';
import { RootStackParamList } from '../navigation/AppNavigator';
import CompactCard from '../components/cards/CompactCard';
import DashboardGrid, { GridCell } from '../components/grid/DashboardGrid';

type Nav = NativeStackNavigationProp<RootStackParamList>;
const TZ_KEY = 'tasktock_timezone';

const HOURS = Array.from({ length: 17 }, (_, i) => i + 6); // 6AM-10PM
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function getDatePartsInTZ(date: Date, tz: string): { year: number; month: number; day: number } {
  try {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, year: 'numeric', month: 'numeric', day: 'numeric' }).formatToParts(date);
    return {
      year: parseInt(parts.find((p) => p.type === 'year')?.value || '0', 10),
      month: parseInt(parts.find((p) => p.type === 'month')?.value || '0', 10),
      day: parseInt(parts.find((p) => p.type === 'day')?.value || '0', 10),
    };
  } catch {
    return { year: date.getFullYear(), month: date.getMonth() + 1, day: date.getDate() };
  }
}

function getDateInTZ(tz: string, offsetDays = 0): Date {
  const { year, month, day } = getDatePartsInTZ(new Date(), tz);
  const d = new Date(year, month - 1, day);
  d.setDate(d.getDate() + offsetDays);
  return d;
}

function dateToKey(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function getTodayKeyInTZ(tz: string): string {
  const { year, month, day } = getDatePartsInTZ(new Date(), tz);
  return dateToKey(year, month, day);
}

function getWeekDates(tz: string): { key: string; label: string; day: string; isToday: boolean }[] {
  const todayParts = getDatePartsInTZ(new Date(), tz);
  const today = new Date(todayParts.year, todayParts.month - 1, todayParts.day);
  const dow = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((dow + 6) % 7));
  const todayKey = dateToKey(todayParts.year, todayParts.month, todayParts.day);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const key = dateToKey(d.getFullYear(), d.getMonth() + 1, d.getDate());
    return { key, label: String(d.getDate()), day: DAYS[i], isToday: key === todayKey };
  });
}

function getTaskHourInTZ(dueDate: string, tz: string): number {
  try {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', hour12: false }).formatToParts(new Date(dueDate));
    return parseInt(parts.find((p) => p.type === 'hour')?.value || '0', 10);
  } catch { return new Date(dueDate).getHours(); }
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

function getTasksForHour(tasks: Task[], dateKey: string, hour: number, tz: string): Task[] {
  return tasks.filter((t) => getDateKeyInTZ(new Date(t.due_date), tz) === dateKey && getTaskHourInTZ(t.due_date, tz) === hour);
}

export default function ScheduleView() {
  const navigation = useNavigation<Nav>();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedDay, setSelectedDay] = useState('');
  const [viewMode, setViewMode] = useState<'week' | 'day'>('day');
  const [timezone, setTimezone] = useState('UTC');

  useFocusEffect(useCallback(() => {
    (async () => {
      const loaded = await loadTasks();
      setTasks(loaded);
      const tz = await AsyncStorage.getItem(TZ_KEY);
      const resolvedTz = tz || Intl.DateTimeFormat().resolvedOptions().timeZone;
      setTimezone(resolvedTz);
      setSelectedDay(getTodayKeyInTZ(resolvedTz));
    })();
  }, []));

  const weekDates = getWeekDates(timezone);
  const todayKey = getTodayKeyInTZ(timezone);

  const dayTasks = tasks.filter((t) => getDateKeyInTZ(new Date(t.due_date), timezone) === selectedDay)
    .sort((a, b) => a.due_date.localeCompare(b.due_date));

  const currentHour = (() => {
    try {
      const parts = new Intl.DateTimeFormat('en-US', { timeZone: timezone, hour: 'numeric', hour12: false }).formatToParts(new Date());
      return parseInt(parts.find((p) => p.type === 'hour')?.value || '0', 10);
    } catch { return new Date().getHours(); }
  })();

  return (
    <DashboardGrid>
      {/* Header Controls */}
      <GridCell span={2}>
        <CompactCard>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.pageTitle}>Schedule</Text>
              <Text style={styles.pageSub}>Plan and manage your time</Text>
            </View>
            <View style={styles.viewToggle}>
              {(['day', 'week'] as const).map((m) => (
                <TouchableOpacity
                  key={m}
                  style={[styles.toggleBtn, viewMode === m && styles.toggleActive]}
                  onPress={() => setViewMode(m)}
                >
                  <Text style={[styles.toggleText, viewMode === m && styles.toggleTextActive]}>{m === 'day' ? 'Day' : 'Week'}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </CompactCard>
      </GridCell>

      {/* Week Strip */}
      <GridCell span={2}>
        <CompactCard>
          <View style={styles.weekStrip}>
            {weekDates.map((d) => (
              <TouchableOpacity
                key={d.key}
                style={[styles.dayCell, d.isToday && styles.dayCellToday, selectedDay === d.key && styles.dayCellSelected]}
                onPress={() => setSelectedDay(d.key)}
              >
                <Text style={[styles.dayLabel, selectedDay === d.key && styles.dayLabelSelected]}>{d.day}</Text>
                <Text style={[styles.dayNum, selectedDay === d.key && styles.dayNumSelected]}>{d.label}</Text>
                {d.isToday && <View style={styles.todayDot} />}
              </TouchableOpacity>
            ))}
          </View>
        </CompactCard>
      </GridCell>

      {/* Timeline */}
      <GridCell span={2}>
        <CompactCard>
          <ScrollView style={styles.timelineScroll} showsVerticalScrollIndicator={false}>
            {HOURS.map((hour) => {
              const hourTasks = getTasksForHour(tasks, selectedDay, hour, timezone);
              const isNow = selectedDay === todayKey && hour === currentHour;
              const isPast = selectedDay === todayKey && hour < currentHour;
              return (
                <View key={hour} style={styles.hourRow}>
                  <View style={styles.hourLabel}>
                    <Text style={[styles.hourText, isPast && styles.hourTextPast]}>
                      {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
                    </Text>
                  </View>
                  <View style={[styles.hourSlot, isNow && styles.hourSlotNow]}>
                    {isNow && <View style={styles.nowLine} />}
                    {hourTasks.length === 0 ? (
                      <View style={styles.emptySlot} />
                    ) : (
                      hourTasks.map((task) => (
                        <TouchableOpacity
                          key={task.task_id}
                          style={[styles.taskBlock, { backgroundColor: getCategoryColor(task.category) + '20', borderLeftColor: getCategoryColor(task.category) }]}
                          onPress={() => navigation.navigate('TaskDetail', { taskId: task.task_id })}
                        >
                          <Text style={[styles.taskBlockTitle, { color: getCategoryColor(task.category) }]}>{task.title}</Text>
                          <Text style={styles.taskBlockTime}>
                            {new Date(task.due_date).toLocaleTimeString('en-US', { timeZone: timezone, hour: '2-digit', minute: '2-digit' })}
                          </Text>
                        </TouchableOpacity>
                      ))
                    )}
                  </View>
                </View>
              );
            })}
          </ScrollView>
        </CompactCard>
      </GridCell>

      {/* Upcoming Sidebar */}
      <GridCell>
        <CompactCard>
          <Text style={styles.sectionTitle}>UPCOMING</Text>
          {dayTasks.filter((t) => t.status !== 'completed').slice(0, 5).map((task) => (
            <TouchableOpacity
              key={task.task_id}
              style={styles.upcomingRow}
              onPress={() => navigation.navigate('TaskDetail', { taskId: task.task_id })}
            >
              <View style={[styles.upcomingDot, { backgroundColor: getCategoryColor(task.category) }]} />
              <View style={styles.upcomingInfo}>
                <Text style={styles.upcomingTitle}>{task.title}</Text>
                <Text style={styles.upcomingTime}>
                  {new Date(task.due_date).toLocaleTimeString('en-US', { timeZone: timezone, hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
          {dayTasks.filter((t) => t.status !== 'completed').length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>▦</Text>
              <Text style={styles.emptyText}>No tasks scheduled</Text>
            </View>
          )}
        </CompactCard>
      </GridCell>

      {/* AI Suggestions */}
      <GridCell>
        <CompactCard glowColor="#6C5CE7">
          <Text style={styles.sectionTitle}>AI SUGGESTIONS</Text>
          <View style={styles.aiItem}>
            <Text style={styles.aiIcon}>◈</Text>
            <Text style={styles.aiText}>Best focus window: 9-11 AM based on your patterns</Text>
          </View>
          <View style={styles.aiItem}>
            <Text style={styles.aiIcon}>◑</Text>
            <Text style={styles.aiText}>Consider 15-min buffer between deep work sessions</Text>
          </View>
          <View style={styles.aiItem}>
            <Text style={styles.aiIcon}>✦</Text>
            <Text style={styles.aiText}>Schedule creative tasks in the morning for best results</Text>
          </View>
        </CompactCard>
      </GridCell>
    </DashboardGrid>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pageTitle: { fontSize: 20, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  pageSub: { fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 },
  viewToggle: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 8, padding: 2 },
  toggleBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 6 },
  toggleActive: { backgroundColor: '#6C5CE7' },
  toggleText: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.4)' },
  toggleTextActive: { color: '#fff' },

  weekStrip: { flexDirection: 'row', gap: 4 },
  dayCell: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 10, gap: 2 },
  dayCellToday: { backgroundColor: 'rgba(108,92,231,0.06)' },
  dayCellSelected: { backgroundColor: 'rgba(108,92,231,0.15)' },
  dayLabel: { fontSize: 10, fontWeight: '600', color: 'rgba(255,255,255,0.35)' },
  dayLabelSelected: { color: '#6C5CE7' },
  dayNum: { fontSize: 16, fontWeight: '700', color: 'rgba(255,255,255,0.6)' },
  dayNumSelected: { color: '#fff' },
  todayDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#6C5CE7', marginTop: 2 },

  timelineScroll: { maxHeight: 480 },
  hourRow: { flexDirection: 'row', minHeight: 48 },
  hourLabel: { width: 52, paddingTop: 2 },
  hourText: { fontSize: 10, fontWeight: '600', color: 'rgba(255,255,255,0.3)', textAlign: 'right', paddingRight: 10 },
  hourTextPast: { color: 'rgba(255,255,255,0.15)' },
  hourSlot: { flex: 1, borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.04)', paddingLeft: 10, position: 'relative' },
  hourSlotNow: { borderLeftColor: '#6C5CE7' },
  nowLine: { position: 'absolute', left: -1, top: 0, width: 2, height: '100%', backgroundColor: '#6C5CE7' },
  emptySlot: { height: 48 },

  taskBlock: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 6, borderLeftWidth: 3, marginBottom: 4 },
  taskBlockTitle: { fontSize: 12, fontWeight: '600' },
  taskBlockTime: { fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 2 },

  sectionTitle: { fontSize: 10, fontWeight: '800', letterSpacing: 1.5, color: 'rgba(255,255,255,0.35)', marginBottom: 12 },
  upcomingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.03)' },
  upcomingDot: { width: 6, height: 6, borderRadius: 3 },
  upcomingInfo: { flex: 1 },
  upcomingTitle: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.8)' },
  upcomingTime: { fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 1 },

  emptyState: { alignItems: 'center', paddingVertical: 20 },
  emptyIcon: { fontSize: 24, color: 'rgba(255,255,255,0.15)', marginBottom: 6 },
  emptyText: { fontSize: 11, color: 'rgba(255,255,255,0.3)' },

  aiItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 10 },
  aiIcon: { fontSize: 14, color: '#6C5CE7', marginTop: 1 },
  aiText: { fontSize: 12, color: 'rgba(255,255,255,0.6)', flex: 1, lineHeight: 17 },
});
