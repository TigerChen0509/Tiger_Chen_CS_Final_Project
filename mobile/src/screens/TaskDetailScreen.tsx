import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Alert } from 'react-native';
import { useNavigation, useRoute, useFocusEffect, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Task, getCategoryColor } from '../types/task';
import { loadTasks, saveTasks } from '../utils/taskStore';
import { completeTask, checkMissedPattern } from '../utils/taskLogic';
import { RootStackParamList } from '../navigation/AppNavigator';
import ScreenShell from '../components/ScreenShell';
import GlowCard from '../components/GlowCard';

type Nav = NativeStackNavigationProp<RootStackParamList, 'TaskDetail'>;
type Route = RouteProp<RootStackParamList, 'TaskDetail'>;

export default function TaskDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { taskId } = route.params;
  const [task, setTask] = useState<Task | null>(null);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const tasks = await loadTasks();
        setTask(tasks.find((t) => t.task_id === taskId) ?? null);
      })();
    }, [taskId]),
  );

  const handleComplete = async () => {
    if (!task) return;
    const tasks = await loadTasks();
    completeTask(tasks, task.task_id);
    await saveTasks(tasks);
    navigation.goBack();
  };

  const doDelete = async () => {
    if (!task) return;
    const tasks = await loadTasks();
    await saveTasks(tasks.filter((t) => t.task_id !== task.task_id));
    navigation.goBack();
  };

  const handleDelete = () => {
    if (!task) return;
    if (Platform.OS === 'web') { if (window.confirm(`Delete '${task.title}'?`)) doDelete(); }
    else Alert.alert('Delete Task', `Delete '${task.title}'?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: doDelete },
    ]);
  };

  if (!task) {
    return (
      <ScreenShell title="Task Detail">
        <Text style={styles.errorText}>Task not found</Text>
      </ScreenShell>
    );
  }

  const pattern = checkMissedPattern([task], task.task_id);
  const catColor = getCategoryColor(task.category);
  const isDone = task.status === 'completed';

  return (
    <ScreenShell title="Task Detail">
      {/* Main Card */}
      <GlowCard glowColor={catColor}>
        <View style={styles.statusRow}>
          <View style={[styles.statusDot, { backgroundColor: isDone ? '#4ade80' : task.status === 'missed' ? '#ff6b6b' : '#6C5CE7' }]} />
          <Text style={[styles.statusText, { color: isDone ? '#4ade80' : task.status === 'missed' ? '#ff6b6b' : '#6C5CE7' }]}>
            {task.status.toUpperCase()}
          </Text>
        </View>

        <Text style={styles.title}>{task.title}</Text>

        <View style={styles.catBadge}>
          <View style={[styles.catDot, { backgroundColor: catColor }]} />
          <Text style={[styles.catLabel, { color: catColor }]}>{task.category}</Text>
        </View>

        {task.notes ? <Text style={styles.notes}>{task.notes}</Text> : null}
      </GlowCard>

      {/* Details */}
      <GlowCard>
        <Text style={styles.sectionTitle}>DETAILS</Text>

        <View style={styles.detailRow}>
          <Text style={styles.detailIcon}>📅</Text>
          <Text style={styles.detailLabel}>Due Date</Text>
          <Text style={styles.detailValue}>
            {new Date(task.due_date).toLocaleString([], { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailIcon}>↻</Text>
          <Text style={styles.detailLabel}>Repeat</Text>
          <Text style={styles.detailValue}>{task.repeat}</Text>
        </View>

        {task.snooze_count > 0 && (
          <View style={styles.detailRow}>
            <Text style={styles.detailIcon}>⏰</Text>
            <Text style={styles.detailLabel}>Snoozed</Text>
            <Text style={styles.detailValue}>{task.snooze_count} time(s)</Text>
          </View>
        )}

        {task.alarm_enabled && (
          <View style={styles.detailRow}>
            <Text style={styles.detailIcon}>🔔</Text>
            <Text style={styles.detailLabel}>Alarm</Text>
            <Text style={[styles.detailValue, { color: '#4ade80' }]}>Enabled</Text>
          </View>
        )}
      </GlowCard>

      {/* Warning */}
      {pattern.flagged && (
        <GlowCard glowColor="#FFD93D">
          <View style={styles.warningRow}>
            <Text style={styles.warningIcon}>⚠️</Text>
            <Text style={styles.warningText}>{pattern.message}</Text>
          </View>
        </GlowCard>
      )}

      {/* AI Insight */}
      <GlowCard glowColor="#FF6B9D">
        <View style={styles.aiRow}>
          <Text style={styles.aiIcon}>🧠</Text>
          <Text style={styles.aiText}>
            {isDone
              ? "Great job completing this task! Keep the momentum going."
              : task.status === 'missed'
              ? "This task was missed. Consider rescheduling or breaking it into smaller steps."
              : "Focus on this task during your peak productivity hours for best results."}
          </Text>
        </View>
      </GlowCard>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.editBtn} onPress={() => navigation.navigate('AddTask', { task })}>
          <Text style={styles.editBtnText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
          <Text style={styles.deleteBtnText}>Delete</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.completeBtn} onPress={handleComplete}>
          <Text style={styles.completeBtnText}>{isDone ? 'Undo' : 'Complete'}</Text>
        </TouchableOpacity>
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  errorText: { fontSize: 14, color: 'rgba(255,255,255,0.3)', textAlign: 'center', marginTop: 40 },

  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 10, fontWeight: '800', letterSpacing: 1.5 },

  title: { fontSize: 22, fontWeight: '700', color: '#fff', marginBottom: 10 },
  catBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  catDot: { width: 8, height: 8, borderRadius: 4 },
  catLabel: { fontSize: 12, fontWeight: '600' },
  notes: { fontSize: 14, color: 'rgba(255,255,255,0.6)', lineHeight: 21 },

  sectionTitle: { fontSize: 10, fontWeight: '800', letterSpacing: 1.5, color: 'rgba(255,255,255,0.35)', marginBottom: 14 },
  detailRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)', gap: 10 },
  detailIcon: { fontSize: 16, width: 24, textAlign: 'center' },
  detailLabel: { fontSize: 13, color: 'rgba(255,255,255,0.5)', fontWeight: '500', flex: 1 },
  detailValue: { fontSize: 13, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },

  warningRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  warningIcon: { fontSize: 16 },
  warningText: { flex: 1, fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 20, fontWeight: '500' },

  aiRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  aiIcon: { fontSize: 16 },
  aiText: { flex: 1, fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 20, fontWeight: '500' },

  actions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  editBtn: { flex: 1, padding: 14, borderRadius: 14, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  editBtnText: { color: '#6C5CE7', fontSize: 14, fontWeight: '600' },
  deleteBtn: { flex: 1, padding: 14, borderRadius: 14, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,71,87,0.2)' },
  deleteBtnText: { color: '#ff4757', fontSize: 14, fontWeight: '600' },
  completeBtn: { flex: 1, padding: 14, borderRadius: 14, alignItems: 'center', backgroundColor: '#4ade80', shadowColor: '#4ade80', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  completeBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
