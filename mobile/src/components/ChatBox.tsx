import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  Animated,
  Dimensions,
} from 'react-native';
import { useTheme } from '../utils/theme';
import { loadTasks, saveTasks } from '../utils/taskStore';
import { addTask } from '../utils/taskLogic';
import { Category } from '../types/task';

interface Message {
  id: string;
  role: 'user' | 'bot';
  text: string;
  createdTask?: { title: string; due_date: string } | null;
  timestamp: Date;
}

interface Props {
  onTaskCreated?: () => void;
  open?: boolean;
  onClose?: () => void;
}

const API_URL = Platform.OS === 'web'
  ? 'http://localhost:3001/chat'
  : 'http://10.0.2.2:3001/chat';

const QUICK_ACTIONS = [
  { label: 'What\'s due today?', icon: '📋' },
  { label: 'Help me focus', icon: '🎯' },
  { label: 'Add a task', icon: '➕' },
  { label: 'Productivity tips', icon: '💡' },
];

const SCREEN_HEIGHT = Dimensions.get('window').height;

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function TypingIndicator() {
  const dot1 = useRef(new Animated.Value(0.3)).current;
  const dot2 = useRef(new Animated.Value(0.3)).current;
  const dot3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animate = (dot: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: 1, duration: 300, useNativeDriver: false }),
          Animated.timing(dot, { toValue: 0.3, duration: 300, useNativeDriver: false }),
        ])
      );
    };
    const a1 = animate(dot1, 0);
    const a2 = animate(dot2, 200);
    const a3 = animate(dot3, 400);
    a1.start(); a2.start(); a3.start();
    return () => { a1.stop(); a2.stop(); a3.stop(); };
  }, []);

  return (
    <View style={styles.typingRow}>
      <View style={styles.typingAvatar}>
        <Text style={styles.typingAvatarText}>AI</Text>
      </View>
      <View style={styles.typingBubble}>
        <View style={styles.typingDots}>
          <Animated.View style={[styles.typingDot, { opacity: dot1 }]} />
          <Animated.View style={[styles.typingDot, { opacity: dot2 }]} />
          <Animated.View style={[styles.typingDot, { opacity: dot3 }]} />
        </View>
      </View>
    </View>
  );
}

export default function ChatBox({ onTaskCreated, open: externalOpen, onClose: externalOnClose }: Props) {
  const { colors } = useTheme();
  const [internalOpen, setInternalOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(400)).current;

  const open = externalOpen !== undefined ? externalOpen : internalOpen;
  const setOpen = externalOnClose ? (v: boolean) => { if (!v) externalOnClose(); } : setInternalOpen;

  useEffect(() => {
    if (open) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, tension: 65, friction: 12, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 400, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [open]);

  useEffect(() => {
    if (scrollRef.current) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages, loading]);

  const sendMessage = async (text?: string) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', text: msg, timestamp: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const tasks = await loadTasks();
      const taskContext = tasks.map((t) => ({
        title: t.title,
        status: t.status,
        due_date: t.due_date,
        category: t.category,
      }));

      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, tasks: taskContext }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(err.error || 'Something went wrong');
      }

      const data = await res.json();
      let createdTaskInfo: { title: string; due_date: string } | null = null;

      if (data.action && data.action.action === 'create_task' && data.action.title) {
        const freshTasks = await loadTasks();
        const category = (data.action.category || 'General') as Category;
        const newTask = addTask(
          freshTasks,
          data.action.title,
          data.action.due_date || new Date().toISOString().slice(0, 10) + 'T09:00',
          'none',
          data.action.notes || '',
          category,
        );
        if (newTask) {
          await saveTasks(freshTasks);
          createdTaskInfo = { title: newTask.title, due_date: newTask.due_date };
          if (onTaskCreated) onTaskCreated();
        }
      }

      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'bot',
        text: data.reply || "I couldn't process that. Try again?",
        createdTask: createdTaskInfo,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      const errMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'bot',
        text: err.message || "Couldn't reach the server. Is the backend running?",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setLoading(false);
    }
  };

  const styles = makeStyles(colors);

  // FAB Button
  if (!open) {
    return (
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setOpen(true)}
        activeOpacity={0.85}
      >
        <View style={styles.fabInner}>
          <Text style={styles.fabIcon}>✨</Text>
          <Text style={styles.fabLabel}>AI</Text>
        </View>
        <View style={styles.fabPulse} />
      </TouchableOpacity>
    );
  }

  return (
    <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
      <TouchableOpacity style={styles.overlayBg} activeOpacity={1} onPress={() => setOpen(false)} />
      <Animated.View style={[styles.chatPanel, { transform: [{ translateY: slideAnim }] }]}>
        {/* Header */}
        <View style={styles.chatHeader}>
          <View style={styles.headerLeft}>
            <View style={styles.aiAvatar}>
              <Text style={styles.aiAvatarText}>AI</Text>
            </View>
            <View>
              <Text style={styles.headerTitle}>TaskBot</Text>
              <Text style={styles.headerSub}>Powered by Doubao</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.closeBtn} onPress={() => setOpen(false)}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Messages or Welcome */}
        {messages.length === 0 ? (
          <View style={styles.welcomeArea}>
            <View style={styles.welcomeIcon}>
              <Text style={styles.welcomeEmoji}>✨</Text>
            </View>
            <Text style={styles.welcomeTitle}>Hi! I'm TaskBot</Text>
            <Text style={styles.welcomeSub}>
              Your AI assistant for managing tasks.{'\n'}Ask me anything or try a quick action below.
            </Text>
            <View style={styles.quickActions}>
              {QUICK_ACTIONS.map((action) => (
                <TouchableOpacity
                  key={action.label}
                  style={styles.quickChip}
                  onPress={() => sendMessage(action.label)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.quickChipIcon}>{action.icon}</Text>
                  <Text style={styles.quickChipText}>{action.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : (
          <ScrollView
            ref={scrollRef}
            style={styles.messageList}
            contentContainerStyle={styles.messageContent}
            showsVerticalScrollIndicator={false}
          >
            {messages.map((msg) => (
              <View key={msg.id} style={styles.messageRow}>
                {msg.role === 'bot' && (
                  <View style={styles.botAvatar}>
                    <Text style={styles.botAvatarText}>AI</Text>
                  </View>
                )}
                <View style={styles.messageCol}>
                  <View
                    style={[
                      styles.bubble,
                      msg.role === 'user' ? styles.userBubble : styles.botBubble,
                    ]}
                  >
                    <Text style={[
                      styles.bubbleText,
                      { color: msg.role === 'user' ? '#fff' : colors.text },
                    ]}>
                      {msg.text}
                    </Text>
                    {msg.createdTask && (
                      <View style={styles.taskBadge}>
                        <View style={styles.taskBadgeDot} />
                        <Text style={styles.taskBadgeText}>
                          Task created: {msg.createdTask.title}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.timestamp, { color: colors.textMuted }]}>
                    {formatTime(msg.timestamp)}
                  </Text>
                </View>
              </View>
            ))}
            {loading && <TypingIndicator />}
          </ScrollView>
        )}

        {/* Input */}
        <View style={styles.inputArea}>
          <View style={[styles.inputWrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <TextInput
              style={[styles.textInput, { color: colors.text }]}
              placeholder="Ask TaskBot anything..."
              placeholderTextColor={colors.textMuted}
              value={input}
              onChangeText={setInput}
              onSubmitEditing={() => sendMessage()}
              returnKeyType="send"
              editable={!loading}
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              style={[styles.sendBtn, { backgroundColor: input.trim() ? colors.primary : colors.border }]}
              onPress={() => sendMessage()}
              disabled={!input.trim() || loading}
              activeOpacity={0.7}
            >
              <Text style={styles.sendIcon}>↑</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // FAB
  fab: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#6C5CE7',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 2,
    shadowColor: '#6C5CE7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  fabIcon: { fontSize: 16 },
  fabLabel: { fontSize: 13, fontWeight: '800', color: '#fff' },
  fabPulse: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#6C5CE7',
    opacity: 0.15,
  },

  // Overlay
  overlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 100,
  },
  overlayBg: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },

  // Panel
  chatPanel: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: 400,
    backgroundColor: '#fff',
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: -4, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 12,
  },

  // Header
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#fafafa',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  aiAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#6C5CE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiAvatarText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#1a1a2e' },
  headerSub: { fontSize: 11, color: '#999', marginTop: 1 },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: { fontSize: 14, color: '#999', fontWeight: '600' },

  // Welcome
  welcomeArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  welcomeIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#f0edff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  welcomeEmoji: { fontSize: 32 },
  welcomeTitle: { fontSize: 22, fontWeight: '700', color: '#1a1a2e', marginBottom: 8 },
  welcomeSub: { fontSize: 14, color: '#888', textAlign: 'center', lineHeight: 21, marginBottom: 28 },
  quickActions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  quickChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#f5f3ff',
    borderWidth: 1,
    borderColor: '#e8e4ff',
  },
  quickChipIcon: { fontSize: 14 },
  quickChipText: { fontSize: 13, fontWeight: '500', color: '#6C5CE7' },

  // Messages
  messageList: { flex: 1 },
  messageContent: { padding: 16, paddingBottom: 8 },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 8,
  },
  botAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#6C5CE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  botAvatarText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  messageCol: { flex: 1 },
  bubble: {
    maxWidth: '88%',
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 18,
  },
  userBubble: {
    backgroundColor: '#6C5CE7',
    alignSelf: 'flex-end',
    borderBottomRightRadius: 6,
  },
  botBubble: {
    backgroundColor: '#f5f3ff',
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 6,
  },
  bubbleText: { fontSize: 14.5, lineHeight: 21 },
  timestamp: { fontSize: 10, marginTop: 4, marginLeft: 4 },

  // Task badge
  taskBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(108,92,231,0.15)',
  },
  taskBadgeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#4ade80' },
  taskBadgeText: { color: '#4ade80', fontSize: 12, fontWeight: '600' },

  // Typing
  typingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 16, paddingBottom: 4 },
  typingAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#6C5CE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  typingAvatarText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  typingBubble: {
    backgroundColor: '#f5f3ff',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomLeftRadius: 6,
  },
  typingDots: { flexDirection: 'row', gap: 5 },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#6C5CE7',
  },

  // Input
  inputArea: {
    padding: 12,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    backgroundColor: '#fff',
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderRadius: 24,
    borderWidth: 1,
    paddingLeft: 16,
    paddingRight: 6,
    paddingVertical: 6,
    gap: 6,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    maxHeight: 80,
    paddingVertical: 6,
  },
  sendBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendIcon: { color: '#fff', fontSize: 16, fontWeight: '700' },
});

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    ...styles,
    chatPanel: {
      ...styles.chatPanel,
      backgroundColor: colors.background,
    },
    chatHeader: {
      ...styles.chatHeader,
      backgroundColor: colors.surface,
      borderBottomColor: colors.border,
    },
    headerTitle: { ...styles.headerTitle, color: colors.text },
    headerSub: { ...styles.headerSub, color: colors.textMuted },
    closeBtn: { ...styles.closeBtn, backgroundColor: colors.border },
    welcomeTitle: { ...styles.welcomeTitle, color: colors.text },
    welcomeSub: { ...styles.welcomeSub, color: colors.textMuted },
    quickChip: {
      ...styles.quickChip,
      backgroundColor: colors.primary + '15',
      borderColor: colors.primary + '30',
    },
    quickChipText: { ...styles.quickChipText, color: colors.primary },
    botBubble: { ...styles.botBubble, backgroundColor: colors.surface },
    timestamp: { ...styles.timestamp, color: colors.textMuted },
    typingBubble: { ...styles.typingBubble, backgroundColor: colors.surface },
    inputArea: { ...styles.inputArea, borderTopColor: colors.border, backgroundColor: colors.background },
    inputWrap: { ...styles.inputWrap, backgroundColor: colors.surface, borderColor: colors.border },
  });
}
