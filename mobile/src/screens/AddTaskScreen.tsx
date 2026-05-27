import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Modal, Platform, Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Task, RepeatType, Category, CATEGORIES, getCategoryColor } from '../types/task';
import { loadTasks, saveTasks } from '../utils/taskStore';
import { addTask } from '../utils/taskLogic';
import { scheduleTaskAlarm } from '../utils/notifications';
import { RootStackParamList } from '../navigation/AppNavigator';
import GlowCard from '../components/GlowCard';

type Nav = NativeStackNavigationProp<RootStackParamList, 'AddTask'>;
type Route = RouteProp<RootStackParamList, 'AddTask'>;

const REPEAT_OPTIONS: { label: string; value: RepeatType; icon: string }[] = [
  { label: 'None', value: 'none', icon: '◯' },
  { label: 'Daily', value: 'daily', icon: '↻' },
  { label: 'Weekly', value: 'weekly', icon: '⟳' },
];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const FULL_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function pad(n: number): string { return n.toString().padStart(2, '0'); }

function showAlert(title: string, message: string) {
  if (Platform.OS === 'web') window.alert(`${title}\n\n${message}`);
  else Alert.alert(title, message);
}

export default function AddTaskScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const editTask = route.params?.task;

  const [title, setTitle] = useState(editTask?.title ?? '');
  const [notes, setNotes] = useState(editTask?.notes ?? '');
  const [repeat, setRepeat] = useState<RepeatType>(editTask?.repeat ?? 'none');
  const [category, setCategory] = useState<Category>(editTask?.category ?? 'General');

  const now = new Date();
  const initial = editTask ? new Date(editTask.due_date) : new Date(now.getTime() + 30 * 60000);
  const [year, setYear] = useState(initial.getFullYear());
  const [month, setMonth] = useState(initial.getMonth());
  const [day, setDay] = useState(initial.getDate());
  const [hour, setHour] = useState(initial.getHours());
  const [minute, setMinute] = useState(initial.getMinutes());
  const [pickerMode, setPickerMode] = useState<'none' | 'date' | 'time'>('none');

  const daysInCurrentMonth = new Date(year, month + 1, 0).getDate();
  const clampedDay = Math.min(day, daysInCurrentMonth);

  const handleSave = async () => {
    if (!title.trim()) { showAlert('Error', 'Task title cannot be empty.'); return; }
    try {
      const dueDateISO = `${year}-${pad(month + 1)}-${pad(clampedDay)}T${pad(hour)}:${pad(minute)}:00`;
      const tasks = await loadTasks();
      if (editTask) {
        const existing = tasks.find((t) => t.task_id === editTask.task_id);
        if (existing) {
          existing.title = title.trim();
          existing.notes = notes;
          if (existing.due_date !== dueDateISO) { existing.due_date = dueDateISO; existing.status = 'pending'; existing.completed_at = null; }
          existing.repeat = repeat;
          existing.category = category;
        }
        await saveTasks(tasks);
      } else {
        const newTask = addTask(tasks, title, dueDateISO, repeat, notes, category);
        if (newTask) {
          try { await scheduleTaskAlarm(newTask); } catch (e) { /* skip */ }
          await saveTasks(tasks);
        } else { showAlert('Error', 'Failed to create task.'); return; }
      }
      navigation.goBack();
    } catch (e) { showAlert('Error', 'Something went wrong.'); }
  };

  const dateDisplay = `${FULL_MONTHS[month]} ${clampedDay}, ${year}`;
  const timeDisplay = `${pad(hour)}:${pad(minute)}`;
  const setToday = () => { const n = new Date(); setYear(n.getFullYear()); setMonth(n.getMonth()); setDay(n.getDate()); };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backArrow}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.header}>{editTask ? 'Edit Task' : 'New Task'}</Text>
          <View style={styles.backBtn} />
        </View>

        {/* Title */}
        <GlowCard>
          <Text style={styles.fieldLabel}>TITLE</Text>
          <TextInput
            style={styles.titleInput}
            value={title}
            onChangeText={setTitle}
            placeholder="What needs to be done?"
            placeholderTextColor="rgba(255,255,255,0.25)"
            autoFocus
          />
        </GlowCard>

        {/* Notes */}
        <GlowCard>
          <Text style={styles.fieldLabel}>NOTES</Text>
          <TextInput
            style={styles.notesInput}
            value={notes}
            onChangeText={setNotes}
            placeholder="Add details..."
            placeholderTextColor="rgba(255,255,255,0.25)"
            multiline
            numberOfLines={3}
          />
        </GlowCard>

        {/* Category */}
        <GlowCard>
          <Text style={styles.fieldLabel}>CATEGORY</Text>
          <View style={styles.catGrid}>
            {CATEGORIES.map((cat) => {
              const isActive = category === cat.value;
              return (
                <TouchableOpacity
                  key={cat.value}
                  style={[styles.catBtn, { borderColor: cat.color + '40' }, isActive && { backgroundColor: cat.color + '20', borderColor: cat.color }]}
                  onPress={() => setCategory(cat.value)}
                >
                  <View style={[styles.catDot, { backgroundColor: cat.color }]} />
                  <Text style={[styles.catText, { color: isActive ? cat.color : 'rgba(255,255,255,0.5)' }]}>{cat.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </GlowCard>

        {/* Date & Time */}
        <GlowCard>
          <Text style={styles.fieldLabel}>SCHEDULE</Text>
          <View style={styles.scheduleRow}>
            <TouchableOpacity style={styles.scheduleBtn} onPress={() => setPickerMode('date')}>
              <Text style={styles.scheduleIcon}>📅</Text>
              <Text style={styles.scheduleText}>{dateDisplay}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.todayChip} onPress={setToday}>
              <Text style={styles.todayChipText}>Today</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.scheduleRow}>
            <TouchableOpacity style={styles.scheduleBtn} onPress={() => setPickerMode('time')}>
              <Text style={styles.scheduleIcon}>⏰</Text>
              <Text style={styles.scheduleText}>{timeDisplay}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.todayChip} onPress={() => { const n = new Date(); setHour(n.getHours()); setMinute(n.getMinutes()); }}>
              <Text style={styles.todayChipText}>Now</Text>
            </TouchableOpacity>
          </View>
        </GlowCard>

        {/* Repeat */}
        <GlowCard>
          <Text style={styles.fieldLabel}>REPEAT</Text>
          <View style={styles.repeatRow}>
            {REPEAT_OPTIONS.map((opt) => {
              const isActive = repeat === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.repeatBtn, isActive && styles.repeatBtnActive]}
                  onPress={() => setRepeat(opt.value)}
                >
                  <Text style={[styles.repeatIcon, isActive && { color: '#fff' }]}>{opt.icon}</Text>
                  <Text style={[styles.repeatText, isActive && { color: '#fff', fontWeight: '700' }]}>{opt.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </GlowCard>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
            <Text style={styles.saveBtnText}>{editTask ? 'Update Task' : 'Create Task'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Date Modal */}
      <Modal visible={pickerMode === 'date'} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Date</Text>
              <TouchableOpacity onPress={() => setPickerMode('none')}>
                <Text style={styles.modalDone}>Done</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.pickerSection}>
              <Text style={styles.pickerLabel}>Year</Text>
              <View style={styles.pillRow}>
                {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1, now.getFullYear() + 2].map((y) => (
                  <TouchableOpacity key={y} style={[styles.pill, y === year && styles.pillActive]} onPress={() => setYear(y)}>
                    <Text style={[styles.pillText, y === year && styles.pillTextActive]}>{y}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={styles.pickerSection}>
              <Text style={styles.pickerLabel}>Month</Text>
              <View style={styles.pillRow}>
                {MONTHS.slice(0, 6).map((m, i) => (
                  <TouchableOpacity key={m} style={[styles.pill, i === month && styles.pillActive]} onPress={() => setMonth(i)}>
                    <Text style={[styles.pillText, i === month && styles.pillTextActive]}>{m}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={[styles.pillRow, { marginTop: 6 }]}>
                {MONTHS.slice(6).map((m, i) => {
                  const mi = i + 6;
                  return (
                    <TouchableOpacity key={m} style={[styles.pill, mi === month && styles.pillActive]} onPress={() => setMonth(mi)}>
                      <Text style={[styles.pillText, mi === month && styles.pillTextActive]}>{m}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
            <View style={styles.pickerSection}>
              <Text style={styles.pickerLabel}>Day</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.pillRow}>
                  {Array.from({ length: daysInCurrentMonth }, (_, i) => i + 1).map((d) => (
                    <TouchableOpacity key={d} style={[styles.pill, styles.dayPill, d === clampedDay && styles.pillActive]} onPress={() => setDay(d)}>
                      <Text style={[styles.pillText, d === clampedDay && styles.pillTextActive]}>{d}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
          </View>
        </View>
      </Modal>

      {/* Time Modal */}
      <Modal visible={pickerMode === 'time'} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Time</Text>
              <TouchableOpacity onPress={() => setPickerMode('none')}>
                <Text style={styles.modalDone}>Done</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.pickerSection}>
              <Text style={styles.pickerLabel}>Hour</Text>
              <View style={styles.pillRow}>
                {Array.from({ length: 12 }, (_, i) => i).map((h) => (
                  <TouchableOpacity key={h} style={[styles.pill, h === hour && styles.pillActive]} onPress={() => setHour(h)}>
                    <Text style={[styles.pillText, h === hour && styles.pillTextActive]}>{pad(h)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={[styles.pillRow, { marginTop: 6 }]}>
                {Array.from({ length: 12 }, (_, i) => i + 12).map((h) => (
                  <TouchableOpacity key={h} style={[styles.pill, h === hour && styles.pillActive]} onPress={() => setHour(h)}>
                    <Text style={[styles.pillText, h === hour && styles.pillTextActive]}>{pad(h)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={styles.pickerSection}>
              <Text style={styles.pickerLabel}>Minute</Text>
              <View style={styles.pillRow}>
                {Array.from({ length: 12 }, (_, i) => i * 5).map((m) => (
                  <TouchableOpacity key={m} style={[styles.pill, m === minute && styles.pillActive]} onPress={() => setMinute(m)}>
                    <Text style={[styles.pillText, m === minute && styles.pillTextActive]}>{pad(m)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a1a' },
  scroll: { paddingHorizontal: 18, paddingTop: 56 },

  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  backArrow: { fontSize: 28, color: '#6C5CE7', fontWeight: '300' },
  header: { flex: 1, fontSize: 20, fontWeight: '700', color: '#fff', textAlign: 'center' },

  fieldLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1.5, color: 'rgba(255,255,255,0.35)', marginBottom: 10 },
  titleInput: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  notesInput: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    color: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    height: 80,
    textAlignVertical: 'top',
  },

  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  catDot: { width: 7, height: 7, borderRadius: 3.5 },
  catText: { fontSize: 12, fontWeight: '600' },

  scheduleRow: { flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 10 },
  scheduleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  scheduleIcon: { fontSize: 16 },
  scheduleText: { fontSize: 14, color: 'rgba(255,255,255,0.8)' },
  todayChip: {
    backgroundColor: '#6C5CE7',
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 12,
  },
  todayChipText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  repeatRow: { flexDirection: 'row', gap: 8 },
  repeatBtn: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  repeatBtnActive: { backgroundColor: 'rgba(108,92,231,0.2)', borderColor: '#6C5CE7' },
  repeatIcon: { fontSize: 16, color: 'rgba(255,255,255,0.4)' },
  repeatText: { fontSize: 12, color: 'rgba(255,255,255,0.5)', fontWeight: '500' },

  actions: { marginTop: 20, gap: 10 },
  saveBtn: { backgroundColor: '#6C5CE7', padding: 16, borderRadius: 14, alignItems: 'center', shadowColor: '#6C5CE7', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  cancelBtn: { padding: 14, borderRadius: 14, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  cancelBtnText: { color: 'rgba(255,255,255,0.5)', fontSize: 14, fontWeight: '500' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: '#14142a', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 30, maxHeight: '75%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 18, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  modalDone: { fontSize: 16, fontWeight: '600', color: '#6C5CE7' },
  pickerSection: { paddingHorizontal: 18, paddingTop: 14 },
  pickerLabel: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.35)', marginBottom: 8, letterSpacing: 0.5 },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pill: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: 20, minWidth: 48, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)' },
  pillActive: { backgroundColor: '#6C5CE7' },
  pillText: { fontSize: 13, color: 'rgba(255,255,255,0.6)' },
  pillTextActive: { color: '#fff', fontWeight: '700' },
  dayPill: { minWidth: 38 },
});
