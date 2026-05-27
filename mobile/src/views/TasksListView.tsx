import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Platform } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Task, getCategoryColor, Category, CATEGORIES } from '../types/task';
import { loadTasks, saveTasks } from '../utils/taskStore';
import { RootStackParamList } from '../navigation/AppNavigator';
import CompactCard from '../components/cards/CompactCard';

type Nav = NativeStackNavigationProp<RootStackParamList>;

type Filter = 'all' | 'pending' | 'completed' | Category;

export default function TasksListView() {
  const navigation = useNavigation<Nav>();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<Filter>('all');

  const loadAll = async () => {
    const loaded = await loadTasks();
    setTasks(loaded);
  };

  useFocusEffect(useCallback(() => { loadAll(); }, []));

  const handleToggle = async (task: Task) => {
    if (task.status === 'completed') {
      task.status = 'pending'; task.completed_at = null;
    } else {
      task.status = 'completed'; task.completed_at = new Date().toISOString();
    }
    await saveTasks(tasks);
    await loadAll();
  };

  const handleDelete = async (task: Task) => {
    const confirmed = Platform.OS === 'web'
      ? window.confirm(`Delete "${task.title}"?`)
      : false;
    if (!confirmed) return;
    const updated = tasks.filter((t) => t.task_id !== task.task_id);
    await saveTasks(updated);
    await loadAll();
  };

  const filtered = tasks.filter((t) => {
    if (filter === 'all') return true;
    if (filter === 'pending') return t.status !== 'completed';
    if (filter === 'completed') return t.status === 'completed';
    return t.category === filter;
  }).sort((a, b) => {
    if (a.status === 'completed' && b.status !== 'completed') return 1;
    if (a.status !== 'completed' && b.status === 'completed') return -1;
    return a.due_date.localeCompare(b.due_date);
  });

  const pendingCount = tasks.filter((t) => t.status !== 'completed').length;
  const completedCount = tasks.filter((t) => t.status === 'completed').length;

  const FILTERS: { key: Filter; label: string }[] = [
    { key: 'all', label: `All (${tasks.length})` },
    { key: 'pending', label: `Pending (${pendingCount})` },
    { key: 'completed', label: `Done (${completedCount})` },
    ...CATEGORIES.map((c) => ({ key: c.value as Filter, label: c.label })),
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Tasks</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate('AddTask', {})} activeOpacity={0.7}>
          <Text style={styles.addBtnText}>+ New Task</Text>
        </TouchableOpacity>
      </View>

      {/* Filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterRow}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterPill, filter === f.key && styles.filterPillActive]}
            onPress={() => setFilter(f.key)}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterPillText, filter === f.key && styles.filterPillTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Task List */}
      <ScrollView style={styles.list} contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
        {filtered.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>☑</Text>
            <Text style={styles.emptyText}>No tasks found</Text>
          </View>
        ) : (
          filtered.map((task) => {
            const catColor = getCategoryColor(task.category);
            const isDone = task.status === 'completed';
            return (
              <TouchableOpacity
                key={task.task_id}
                style={[styles.taskRow, isDone && styles.taskRowDone]}
                onPress={() => navigation.navigate('TaskDetail', { taskId: task.task_id })}
                activeOpacity={0.7}
              >
                <TouchableOpacity
                  style={[styles.checkbox, { borderColor: isDone ? '#4ade80' : catColor }, isDone && { backgroundColor: '#4ade80' }]}
                  onPress={() => handleToggle(task)}
                >
                  {isDone && <Text style={styles.checkMark}>✓</Text>}
                </TouchableOpacity>
                <View style={styles.taskInfo}>
                  <Text style={[styles.taskTitle, isDone && styles.taskTitleDone]} numberOfLines={1}>{task.title}</Text>
                  <View style={styles.taskMeta}>
                    <View style={[styles.catDot, { backgroundColor: catColor }]} />
                    <Text style={styles.taskCat}>{task.category}</Text>
                    <Text style={styles.taskDate}>
                      {new Date(task.due_date).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      {' '}
                      {new Date(task.due_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                </View>
                {task.repeat !== 'none' && <Text style={styles.repeatIcon}>↻</Text>}
                <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(task)}>
                  <Text style={styles.deleteBtnText}>✕</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            );
          })
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  title: { fontSize: 22, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  addBtn: { backgroundColor: '#6C5CE7', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
  addBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  filterScroll: { maxHeight: 44 },
  filterRow: { paddingHorizontal: 20, gap: 6, paddingVertical: 4 },
  filterPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  filterPillActive: { backgroundColor: 'rgba(108,92,231,0.15)', borderColor: 'rgba(108,92,231,0.3)' },
  filterPillText: { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.4)' },
  filterPillTextActive: { color: '#6C5CE7' },

  list: { flex: 1 },
  listContent: { paddingHorizontal: 20, paddingTop: 8 },

  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 10,
    borderRadius: 10,
    marginBottom: 4,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  taskRowDone: { opacity: 0.45 },
  checkbox: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  checkMark: { color: '#fff', fontSize: 10, fontWeight: '700' },
  taskInfo: { flex: 1 },
  taskTitle: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.85)' },
  taskTitleDone: { textDecorationLine: 'line-through', color: 'rgba(255,255,255,0.3)' },
  taskMeta: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 },
  catDot: { width: 5, height: 5, borderRadius: 2.5 },
  taskCat: { fontSize: 10, color: 'rgba(255,255,255,0.35)', fontWeight: '600' },
  taskDate: { fontSize: 10, color: 'rgba(255,255,255,0.25)' },
  repeatIcon: { fontSize: 12, color: 'rgba(255,255,255,0.2)' },
  deleteBtn: { width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(255,71,87,0.08)', alignItems: 'center', justifyContent: 'center' },
  deleteBtnText: { color: '#ff4757', fontSize: 10, fontWeight: '700' },

  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 32, color: 'rgba(255,255,255,0.15)', marginBottom: 10 },
  emptyText: { fontSize: 14, color: 'rgba(255,255,255,0.3)', fontWeight: '500' },
});
