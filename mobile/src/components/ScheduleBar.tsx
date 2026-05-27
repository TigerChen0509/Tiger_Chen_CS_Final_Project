import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Task, getCategoryColor } from '../types/task';

interface Props {
  tasks: Task[];
}

const HOURS = Array.from({ length: 18 }, (_, i) => i + 6); // 6 AM to 11 PM

export default function ScheduleBar({ tasks }: Props) {
  const currentHour = new Date().getHours();

  const tasksByHour: Record<number, Task[]> = {};
  for (const task of tasks) {
    const t = task.due_date.indexOf('T');
    const h = t >= 0 ? parseInt(task.due_date.slice(t + 1, t + 3), 10) : new Date(task.due_date).getHours();
    if (!tasksByHour[h]) tasksByHour[h] = [];
    tasksByHour[h].push(task);
  }

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
      {HOURS.map((hour) => {
        const hourTasks = tasksByHour[hour] || [];
        const isCurrent = hour === currentHour;
        const hasTask = hourTasks.length > 0;

        return (
          <View key={hour} style={styles.hourBlock}>
            <View style={[
              styles.bar,
              isCurrent && styles.barCurrent,
              hasTask && { backgroundColor: getCategoryColor(hourTasks[0].category) + '30' },
            ]}>
              {hasTask && (
                <View style={[styles.barFill, { backgroundColor: getCategoryColor(hourTasks[0].category) }]} />
              )}
              {isCurrent && <View style={styles.nowLine} />}
            </View>
            <Text style={[styles.hourLabel, isCurrent && styles.hourLabelCurrent]}>
              {hour === 0 ? '12a' : hour < 12 ? `${hour}a` : hour === 12 ? '12p' : `${hour - 12}p`}
            </Text>
            {hasTask && (
              <Text style={[styles.taskCount, { color: getCategoryColor(hourTasks[0].category) }]}>
                {hourTasks.length}
              </Text>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { gap: 3, paddingHorizontal: 4 },
  hourBlock: { alignItems: 'center', gap: 4, width: 30 },
  bar: {
    width: 22,
    height: 50,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.04)',
    overflow: 'hidden',
    position: 'relative',
  },
  barCurrent: { borderWidth: 1, borderColor: '#6C5CE7' },
  barFill: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '70%',
    borderRadius: 5,
    opacity: 0.6,
  },
  nowLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#6C5CE7',
  },
  hourLabel: { fontSize: 8, color: 'rgba(255,255,255,0.25)', fontWeight: '600' },
  hourLabelCurrent: { color: '#6C5CE7', fontWeight: '700' },
  taskCount: { fontSize: 9, fontWeight: '700' },
});
