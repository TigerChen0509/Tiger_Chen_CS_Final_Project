import React, { useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Platform } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Task } from '../types/task';
import { loadTasks } from '../utils/taskStore';
import { getTodayKey, getTasksForDate } from '../utils/taskLogic';
import CompactCard from '../components/cards/CompactCard';
import DashboardGrid, { GridCell } from '../components/grid/DashboardGrid';

const API_URL = Platform.OS === 'web' ? 'http://localhost:3001/chat' : 'http://10.0.2.2:3001/chat';

const COACH_TOPICS = [
  { key: 'prioritize', label: 'Help me prioritize', icon: '◈', desc: 'AI ranks your tasks by urgency and impact' },
  { key: 'focus', label: 'Focus strategies', icon: '◒', desc: 'Personalized tips for deep work sessions' },
  { key: 'balance', label: 'Work-life balance', icon: '◑', desc: 'Analyze workload and suggest breaks' },
  { key: 'motivation', label: 'Get motivated', icon: '✦', desc: 'Coaching for when you feel stuck' },
  { key: 'planning', label: 'Weekly planning', icon: '▦', desc: 'AI-assisted schedule optimization' },
  { key: 'habits', label: 'Build habits', icon: '◉', desc: 'Strategies for consistent productivity' },
];

export default function AICoachView() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [messages, setMessages] = useState<{ role: 'user' | 'coach'; text: string }[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  useFocusEffect(useCallback(() => { loadTasks().then(setTasks); }, []));

  const todayKey = getTodayKey();
  const todayTasks = getTasksForDate(tasks, todayKey);
  const completedToday = todayTasks.filter((t) => t.status === 'completed').length;
  const pendingTasks = tasks.filter((t) => t.status !== 'completed');

  const sendMessage = async (text?: string) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;

    setMessages((prev) => [...prev, { role: 'user', text: msg }]);
    setInput('');
    setLoading(true);

    try {
      const taskContext = tasks.map((t) => ({
        title: t.title, status: t.status, due_date: t.due_date, category: t.category,
      }));

      const coachPrompt = `You are TaskTock AI Coach, a productivity expert. Be encouraging, specific, and actionable. Keep responses concise (2-3 sentences max). Context: ${completedToday} tasks completed today, ${pendingTasks.length} pending. User asks: ${msg}`;

      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: coachPrompt, tasks: taskContext }),
      });

      if (!res.ok) throw new Error('Failed to get response');
      const data = await res.json();
      setMessages((prev) => [...prev, { role: 'coach', text: data.reply || 'Try breaking your next task into smaller steps.' }]);
    } catch {
      const fallbacks = [
        'Focus on one task at a time. Start with the smallest one to build momentum.',
        'Take a 5-minute break, then tackle your highest-priority task with full focus.',
        'Great progress! Keep going — consistency beats intensity.',
      ];
      setMessages((prev) => [...prev, { role: 'coach', text: fallbacks[Math.floor(Math.random() * fallbacks.length)] }]);
    } finally {
      setLoading(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  const handleTopic = async (topic: typeof COACH_TOPICS[0]) => {
    const prompts: Record<string, string> = {
      prioritize: `Here are my pending tasks: ${pendingTasks.map((t) => t.title).join(', ')}. Help me prioritize them for today.`,
      focus: `I've completed ${completedToday} tasks today. Give me a focus strategy for my remaining ${pendingTasks.length} tasks.`,
      balance: `I have ${pendingTasks.length} pending tasks. Am I overloaded? Help me plan a balanced schedule.`,
      motivation: `I have ${pendingTasks.length} tasks pending. Give me a quick motivational boost.`,
      planning: `Help me plan my week. I have ${pendingTasks.length} tasks pending across different categories.`,
      habits: `I want to build better productivity habits. What's one habit I should focus on this week?`,
    };
    await sendMessage(prompts[topic.key]);
  };

  return (
    <DashboardGrid>
      {/* Header */}
      <GridCell span={2}>
        <CompactCard>
          <View style={styles.headerRow}>
            <View style={styles.coachAvatar}>
              <Text style={styles.coachAvatarText}>AI</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.pageTitle}>AI Coach</Text>
              <Text style={styles.pageSub}>Your personal productivity advisor</Text>
            </View>
            <View style={styles.statusBadge}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>Online</Text>
            </View>
          </View>
        </CompactCard>
      </GridCell>

      {/* Quick Topics */}
      <GridCell span={2}>
        <CompactCard>
          <Text style={styles.sectionTitle}>COACHING TOPICS</Text>
          <View style={styles.topicsGrid}>
            {COACH_TOPICS.map((topic) => (
              <TouchableOpacity key={topic.key} style={styles.topicCard} onPress={() => handleTopic(topic)}>
                <Text style={styles.topicIcon}>{topic.icon}</Text>
                <Text style={styles.topicLabel}>{topic.label}</Text>
                <Text style={styles.topicDesc}>{topic.desc}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </CompactCard>
      </GridCell>

      {/* Chat */}
      <GridCell span={2}>
        <CompactCard>
          <Text style={styles.sectionTitle}>CONVERSATION</Text>
          <ScrollView ref={scrollRef} style={styles.chatScroll} showsVerticalScrollIndicator={false}>
            {messages.length === 0 ? (
              <View style={styles.emptyChat}>
                <Text style={styles.emptyIcon}>✦</Text>
                <Text style={styles.emptyTitle}>Start a conversation</Text>
                <Text style={styles.emptySub}>Pick a topic above or type your own question</Text>
              </View>
            ) : (
              messages.map((msg, i) => (
                <View key={i} style={[styles.msgRow, msg.role === 'user' && styles.msgRowUser]}>
                  {msg.role === 'coach' && (
                    <View style={styles.msgAvatar}>
                      <Text style={styles.msgAvatarText}>AI</Text>
                    </View>
                  )}
                  <View style={[styles.msgBubble, msg.role === 'user' ? styles.msgBubbleUser : styles.msgBubbleCoach]}>
                    <Text style={[styles.msgText, msg.role === 'user' && styles.msgTextUser]}>{msg.text}</Text>
                  </View>
                </View>
              ))
            )}
            {loading && (
              <View style={styles.msgRow}>
                <View style={styles.msgAvatar}>
                  <Text style={styles.msgAvatarText}>AI</Text>
                </View>
                <View style={[styles.msgBubble, styles.msgBubbleCoach]}>
                  <Text style={styles.typingText}>Thinking...</Text>
                </View>
              </View>
            )}
          </ScrollView>

          <View style={styles.inputRow}>
            <TextInput
              style={styles.textInput}
              placeholder="Ask your AI coach..."
              placeholderTextColor="rgba(255,255,255,0.25)"
              value={input}
              onChangeText={setInput}
              onSubmitEditing={() => sendMessage()}
              returnKeyType="send"
              editable={!loading}
            />
            <TouchableOpacity style={[styles.sendBtn, !input.trim() && styles.sendBtnDisabled]} onPress={() => sendMessage()} disabled={!input.trim() || loading}>
              <Text style={styles.sendText}>↑</Text>
            </TouchableOpacity>
          </View>
        </CompactCard>
      </GridCell>

      {/* Today's Summary */}
      <GridCell>
        <CompactCard>
          <Text style={styles.sectionTitle}>TODAY'S SUMMARY</Text>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Completed</Text>
            <Text style={styles.summaryValue}>{completedToday}/{todayTasks.length}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Pending</Text>
            <Text style={styles.summaryValue}>{pendingTasks.length}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Progress</Text>
            <Text style={styles.summaryValue}>{todayTasks.length > 0 ? Math.round((completedToday / todayTasks.length) * 100) : 0}%</Text>
          </View>
        </CompactCard>
      </GridCell>

      {/* Tips */}
      <GridCell>
        <CompactCard>
          <Text style={styles.sectionTitle}>QUICK TIPS</Text>
          {[
            { icon: '◈', tip: 'Use the 2-minute rule: if it takes less than 2 minutes, do it now' },
            { icon: '◒', tip: 'Batch similar tasks together to reduce context switching' },
            { icon: '◑', tip: 'Review your progress every evening to plan tomorrow' },
          ].map((t, i) => (
            <View key={i} style={styles.tipRow}>
              <Text style={styles.tipIcon}>{t.icon}</Text>
              <Text style={styles.tipText}>{t.tip}</Text>
            </View>
          ))}
        </CompactCard>
      </GridCell>
    </DashboardGrid>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  coachAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#6C5CE7', alignItems: 'center', justifyContent: 'center' },
  coachAvatarText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  pageTitle: { fontSize: 20, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  pageSub: { fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(74,222,128,0.1)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#4ade80' },
  statusText: { fontSize: 10, fontWeight: '600', color: '#4ade80' },

  sectionTitle: { fontSize: 10, fontWeight: '800', letterSpacing: 1.5, color: 'rgba(255,255,255,0.35)', marginBottom: 12 },

  topicsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  topicCard: { width: '31%', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  topicIcon: { fontSize: 18, color: '#6C5CE7', marginBottom: 6 },
  topicLabel: { fontSize: 12, fontWeight: '700', color: '#fff', marginBottom: 3 },
  topicDesc: { fontSize: 10, color: 'rgba(255,255,255,0.35)', lineHeight: 14 },

  chatScroll: { maxHeight: 300, marginBottom: 12 },
  emptyChat: { alignItems: 'center', paddingVertical: 30 },
  emptyIcon: { fontSize: 28, color: 'rgba(108,92,231,0.3)', marginBottom: 8 },
  emptyTitle: { fontSize: 14, fontWeight: '700', color: 'rgba(255,255,255,0.5)' },
  emptySub: { fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: 4 },

  msgRow: { flexDirection: 'row', gap: 8, marginBottom: 10, alignItems: 'flex-end' },
  msgRowUser: { justifyContent: 'flex-end' },
  msgAvatar: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#6C5CE7', alignItems: 'center', justifyContent: 'center' },
  msgAvatarText: { color: '#fff', fontSize: 9, fontWeight: '800' },
  msgBubble: { maxWidth: '75%', paddingHorizontal: 12, paddingVertical: 9, borderRadius: 14 },
  msgBubbleUser: { backgroundColor: '#6C5CE7', borderBottomRightRadius: 4 },
  msgBubbleCoach: { backgroundColor: 'rgba(255,255,255,0.06)', borderBottomLeftRadius: 4 },
  msgText: { fontSize: 13, lineHeight: 19, color: 'rgba(255,255,255,0.8)' },
  msgTextUser: { color: '#fff' },
  typingText: { fontSize: 13, color: 'rgba(255,255,255,0.4)', fontStyle: 'italic' },

  inputRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  textInput: { flex: 1, height: 40, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 20, paddingHorizontal: 16, fontSize: 13, color: '#fff', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  sendBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#6C5CE7', alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { opacity: 0.4 },
  sendText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  summaryItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.03)' },
  summaryLabel: { fontSize: 12, color: 'rgba(255,255,255,0.5)' },
  summaryValue: { fontSize: 12, fontWeight: '700', color: '#6C5CE7' },

  tipRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  tipIcon: { fontSize: 14, color: '#6C5CE7', marginTop: 1 },
  tipText: { fontSize: 11, color: 'rgba(255,255,255,0.5)', flex: 1, lineHeight: 16 },
});
