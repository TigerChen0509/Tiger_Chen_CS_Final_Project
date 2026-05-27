import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Task, getCategoryColor } from '../types/task';

interface Props {
  tasks: Task[];
  onToggle: (task: Task) => void;
  onPress: (taskId: string) => void;
  timezone?: string;
}

function getTimeInTZ(date: Date, tz: string): { hour: number; minute: number } {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', minute: 'numeric', hour12: false });
    const parts = formatter.formatToParts(date);
    const hour = parseInt(parts.find((p) => p.type === 'hour')?.value || '0', 10);
    const minute = parseInt(parts.find((p) => p.type === 'minute')?.value || '0', 10);
    return { hour, minute };
  } catch {
    return { hour: date.getHours(), minute: date.getMinutes() };
  }
}

function formatHour(h: number): string {
  if (h === 0) return '12 AM';
  if (h === 12) return '12 PM';
  if (h > 12) return `${h - 12} PM`;
  return `${h} AM`;
}

const HOURS = Array.from({ length: 18 }, (_, i) => i + 6); // 6 AM to 11 PM

export default function FuturisticTimeline({ tasks, onToggle, onPress, timezone = 'UTC' }: Props) {
  const { hour: currentHour } = getTimeInTZ(new Date(), timezone);

  const tasksByHour: Record<number, Task[]> = {};
  for (const task of tasks) {
    const { hour: h } = getTimeInTZ(new Date(task.due_date), timezone);
    if (!tasksByHour[h]) tasksByHour[h] = [];
    tasksByHour[h].push(task);
  }

  return (
    <View style={styles.container}>
      {HOURS.map((hour) => {
        const hourTasks = tasksByHour[hour] || [];
        const isCurrent = hour === currentHour;
        const isPast = hour < currentHour;

        return (
          <View key={hour} style={styles.hourBlock}>
            {/* Time */}
            <View style={styles.timeCol}>
              <Text style={[styles.timeText, isCurrent && styles.timeTextActive, isPast && styles.timeTextPast]}>
                {formatHour(hour)}
              </Text>
            </View>

            {/* Line */}
            <View style={styles.lineCol}>
              <View style={[styles.lineSegment, isPast && styles.linePast, isCurrent && styles.lineActive]} />
              {isCurrent && <View style={styles.nowDot} />}
              {hourTasks.length > 0 && (
                <View style={[styles.taskDot, { backgroundColor: getCategoryColor(hourTasks[0].category) }]} />
              )}
            </View>

            {/* Tasks */}
            <View style={styles.taskCol}>
              {hourTasks.length === 0 && isCurrent && (
                <View style={styles.nowIndicator}>
                  <Text style={styles.nowText}>NOW</Text>
                </View>
              )}
              {hourTasks.map((task) => {
                const isDone = task.status === 'completed';
                const catColor = getCategoryColor(task.category);
                return (
                  <TouchableOpacity
                    key={task.task_id}
                    style={[styles.taskCard, { borderLeftColor: catColor }, isDone && styles.taskDone]}
                    onPress={() => onPress(task.task_id)}
                    activeOpacity={0.7}
                  >
                    <TouchableOpacity
                      style={[styles.checkbox, { borderColor: catColor }, isDone && { backgroundColor: catColor }]}
                      onPress={() => onToggle(task)}
                    >
                      {isDone && <Text style={styles.checkMark}>✓</Text>}
                    </TouchableOpacity>
                    <View style={styles.taskInfo}>
                      <Text style={[styles.taskTitle, isDone && styles.taskTitleDone]} numberOfLines={1}>
                        {task.title}
                      </Text>
                      <Text style={styles.taskTime}>
                        :{String(getTimeInTZ(new Date(task.due_date), timezone).minute).padStart(2, '0')}
                      </Text>
                    </View>
                    <View style={[styles.priorityBar, { backgroundColor: catColor + '40' }]}>
                      <View style={[styles.priorityFill, { backgroundColor: catColor, height: isDone ? '100%' : '60%' }]} />
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 0 },
  hourBlock: { flexDirection: 'row', minHeight: 36 },
  timeCol: { width: 50, alignItems: 'flex-end', paddingRight: 10, paddingTop: 2 },
  timeText: { fontSize: 10, color: 'rgba(255,255,255,0.3)', fontWeight: '600' },
  timeTextActive: { color: '#6C5CE7', fontWeight: '700' },
  timeTextPast: { color: 'rgba(255,255,255,0.15)' },
  lineCol: { width: 16, alignItems: 'center', position: 'relative' },
  lineSegment: { width: 1, flex: 1, backgroundColor: 'rgba(255,255,255,0.06)' },
  linePast: { backgroundColor: 'rgba(108,92,231,0.2)' },
  lineActive: { backgroundColor: '#6C5CE7', width: 2 },
  nowDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#6C5CE7',
    position: 'absolute',
    top: 0,
    shadowColor: '#6C5CE7',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
  taskDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    position: 'absolute',
    top: 12,
  },
  taskCol: { flex: 1, paddingLeft: 10, paddingBottom: 6 },
  nowIndicator: {
    backgroundColor: 'rgba(108,92,231,0.15)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  nowText: { fontSize: 9, color: '#6C5CE7', fontWeight: '800', letterSpacing: 1 },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 10,
    padding: 10,
    marginBottom: 4,
    borderLeftWidth: 3,
    gap: 8,
  },
  taskDone: { opacity: 0.4 },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMark: { color: '#fff', fontSize: 10, fontWeight: '700' },
  taskInfo: { flex: 1 },
  taskTitle: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.9)' },
  taskTitleDone: { textDecorationLine: 'line-through', color: 'rgba(255,255,255,0.3)' },
  taskTime: { fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 2 },
  priorityBar: { width: 4, height: 28, borderRadius: 2, overflow: 'hidden' },
  priorityFill: { width: 4, borderRadius: 2, position: 'absolute', bottom: 0 },
});
