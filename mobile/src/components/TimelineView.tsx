import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Task, getCategoryColor } from '../types/task';
import { useTheme } from '../utils/theme';

interface Props {
  tasks: Task[];
  onToggle: (task: Task) => void;
  onPress: (taskId: string) => void;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);

function formatHour(h: number): string {
  if (h === 0) return '12 AM';
  if (h === 12) return '12 PM';
  if (h > 12) return `${h - 12} PM`;
  return `${h} AM`;
}

function getTaskHour(dateStr: string): number {
  const t = dateStr.indexOf('T');
  if (t >= 0) {
    const timePart = dateStr.slice(t + 1, t + 3);
    return parseInt(timePart, 10);
  }
  return new Date(dateStr).getHours();
}

function getTaskMinute(dateStr: string): number {
  const t = dateStr.indexOf('T');
  if (t >= 0) {
    const timePart = dateStr.slice(t + 4, t + 6);
    return parseInt(timePart, 10);
  }
  return new Date(dateStr).getMinutes();
}

export default function TimelineView({ tasks, onToggle, onPress }: Props) {
  const { colors } = useTheme();
  const currentHour = new Date().getHours();

  // Group tasks by hour
  const tasksByHour: Record<number, Task[]> = {};
  for (const task of tasks) {
    const h = getTaskHour(task.due_date);
    if (!tasksByHour[h]) tasksByHour[h] = [];
    tasksByHour[h].push(task);
  }

  const styles = makeStyles(colors);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      <Text style={[styles.timelineTitle, { color: colors.text }]}>Today's Timeline</Text>
      <Text style={[styles.timelineSub, { color: colors.textMuted }]}>
        {tasks.length} task{tasks.length !== 1 ? 's' : ''} scheduled
      </Text>

      <View style={styles.timeline}>
        {HOURS.map((hour) => {
          const hourTasks = tasksByHour[hour] || [];
          const isCurrentHour = hour === currentHour;
          const isPast = hour < currentHour;

          return (
            <View key={hour} style={styles.hourRow}>
              {/* Time label */}
              <View style={styles.timeCol}>
                <Text style={[styles.hourText, { color: isCurrentHour ? colors.primary : isPast ? colors.textMuted : colors.textSecondary }]}>
                  {formatHour(hour)}
                </Text>
              </View>

              {/* Line */}
              <View style={styles.lineCol}>
                <View style={[styles.lineSegment, {
                  backgroundColor: isCurrentHour ? colors.primary : isPast ? colors.border : colors.border,
                }]} />
                {isCurrentHour && (
                  <View style={[styles.currentDot, { backgroundColor: colors.primary }]} />
                )}
              </View>

              {/* Tasks */}
              <View style={styles.taskCol}>
                {hourTasks.map((task) => {
                  const catColor = getCategoryColor(task.category);
                  const isCompleted = task.status === 'completed';
                  const minute = getTaskMinute(task.due_date);

                  return (
                    <TouchableOpacity
                      key={task.task_id}
                      style={[styles.timelineCard, {
                        backgroundColor: colors.surface,
                        borderLeftColor: catColor,
                        opacity: isCompleted ? 0.5 : 1,
                      }]}
                      onPress={() => onPress(task.task_id)}
                    >
                      <View style={styles.cardHeader}>
                        <TouchableOpacity
                          style={[styles.miniCheckbox, { borderColor: catColor }, isCompleted && { backgroundColor: catColor }]}
                          onPress={() => onToggle(task)}
                        >
                          {isCompleted && <Text style={styles.miniCheck}>✓</Text>}
                        </TouchableOpacity>
                        <Text style={[styles.minuteText, { color: colors.textMuted }]}>
                          :{String(minute).padStart(2, '0')}
                        </Text>
                        <View style={[styles.catDot, { backgroundColor: catColor }]} />
                        <Text style={[styles.cardTitle, { color: isCompleted ? colors.textMuted : colors.text }, isCompleted && { textDecorationLine: 'line-through' }]} numberOfLines={1}>
                          {task.title}
                        </Text>
                      </View>
                      {task.notes ? (
                        <Text style={[styles.cardNotes, { color: colors.textMuted }]} numberOfLines={1}>{task.notes}</Text>
                      ) : null}
                    </TouchableOpacity>
                  );
                })}
                {hourTasks.length === 0 && isCurrentHour && (
                  <View style={[styles.emptySlot, { borderColor: colors.border }]}>
                    <Text style={[styles.emptySlotText, { color: colors.textMuted }]}>Now</Text>
                  </View>
                )}
              </View>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    container: { flex: 1 },
    scroll: { paddingBottom: 40 },
    timelineTitle: { fontSize: 20, fontWeight: '700', marginBottom: 4 },
    timelineSub: { fontSize: 13, marginBottom: 20 },
    timeline: {},
    hourRow: { flexDirection: 'row', minHeight: 40 },
    timeCol: { width: 56, alignItems: 'flex-end', paddingRight: 12, paddingTop: 2 },
    hourText: { fontSize: 12, fontWeight: '500' },
    lineCol: { width: 20, alignItems: 'center' },
    lineSegment: { width: 2, flex: 1 },
    currentDot: { width: 10, height: 10, borderRadius: 5, position: 'absolute', top: 0 },
    taskCol: { flex: 1, paddingLeft: 8, paddingBottom: 8 },
    timelineCard: { padding: 10, borderRadius: 10, marginBottom: 4, borderLeftWidth: 3 },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    miniCheckbox: { width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
    miniCheck: { color: '#fff', fontSize: 10, fontWeight: '700' },
    minuteText: { fontSize: 11, width: 24 },
    catDot: { width: 6, height: 6, borderRadius: 3 },
    cardTitle: { fontSize: 13, fontWeight: '600', flex: 1 },
    cardNotes: { fontSize: 11, marginTop: 4, marginLeft: 54 },
    emptySlot: { borderWidth: 1, borderStyle: 'dashed', borderRadius: 8, padding: 8, alignItems: 'center' },
    emptySlotText: { fontSize: 11 },
  });
}
