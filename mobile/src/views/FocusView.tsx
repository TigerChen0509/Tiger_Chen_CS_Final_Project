import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Modal, Dimensions, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { playAlarm, stopAlarm, ALARM_SOUNDS } from '../utils/sounds';
import ParticleBackground from '../components/ParticleBackground';

const SETTINGS_KEY = 'tasktock_pomodoro';
const DURATION_OPTIONS = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60];
const BREAK_OPTIONS = [3, 5, 10, 15, 20];

interface PomodoroSettings {
  focusMin: number;
  breakMin: number;
  longBreakMin: number;
  soundId: string;
}

const DEFAULT_SETTINGS: PomodoroSettings = { focusMin: 25, breakMin: 5, longBreakMin: 15, soundId: 'bell' };
const SCREEN_W = Dimensions.get('window').width;
const SCREEN_H = Dimensions.get('window').height;
const RING_SIZE = Math.min(SCREEN_W, SCREEN_H) * 0.3;

function formatTime(s: number): string {
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

export default function FocusView() {
  const [settings, setSettings] = useState<PomodoroSettings>(DEFAULT_SETTINGS);
  const [showSettings, setShowSettings] = useState(false);
  const [mode, setMode] = useState<'work' | 'break' | 'longBreak'>('work');
  const [secondsLeft, setSecondsLeft] = useState(DEFAULT_SETTINGS.focusMin * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [sessions, setSessions] = useState(0);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const glowAnim = useRef(new Animated.Value(0.3)).current;
  const modeRef = useRef(mode);
  const sessionsRef = useRef(sessions);
  const settingsRef = useRef(settings);

  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { sessionsRef.current = sessions; }, [sessions]);
  useEffect(() => { settingsRef.current = settings; }, [settings]);

  const totalSeconds = mode === 'work' ? settings.focusMin * 60 : mode === 'break' ? settings.breakMin * 60 : settings.longBreakMin * 60;
  const progress = totalSeconds > 0 ? 1 - secondsLeft / totalSeconds : 0;

  const modeColor = mode === 'work' ? '#6C5CE7' : mode === 'break' ? '#4ade80' : '#FFD93D';
  const modeLabel = mode === 'work' ? 'FOCUS TIME' : mode === 'break' ? 'SHORT BREAK' : 'LONG BREAK';

  useEffect(() => {
    (async () => {
      const stored = await AsyncStorage.getItem(SETTINGS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setSettings(parsed);
        setSecondsLeft(parsed.focusMin * 60);
      }
    })();
  }, []);

  const handleTimerEnd = async () => {
    const s = settingsRef.current;
    const m = modeRef.current;
    await playAlarm(s.soundId);

    if (m === 'work') {
      const next = sessionsRef.current + 1;
      setSessions(next);
      if (next % 4 === 0) {
        setMode('longBreak');
        setSecondsLeft(s.longBreakMin * 60);
      } else {
        setMode('break');
        setSecondsLeft(s.breakMin * 60);
      }
    } else {
      setMode('work');
      setSecondsLeft(s.focusMin * 60);
    }
  };

  useEffect(() => {
    if (isRunning) {
      const breathe = Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, { toValue: 0.7, duration: 2000, useNativeDriver: false }),
          Animated.timing(glowAnim, { toValue: 0.3, duration: 2000, useNativeDriver: false }),
        ])
      );
      breathe.start();

      intervalRef.current = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            clearInterval(intervalRef.current!);
            setIsRunning(false);
            handleTimerEnd();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => { breathe.stop(); if (intervalRef.current) clearInterval(intervalRef.current); };
    }
  }, [isRunning]);

  const toggleTimer = async () => {
    if (isRunning) await stopAlarm();
    setIsRunning(!isRunning);
  };

  const resetTimer = async () => {
    await stopAlarm();
    setIsRunning(false);
    setSecondsLeft(totalSeconds);
  };

  const skipToNext = async () => {
    await stopAlarm();
    setIsRunning(false);
    setMode('work');
    setSecondsLeft(settings.focusMin * 60);
  };

  const saveSettings = async (updated: PomodoroSettings) => {
    setSettings(updated);
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
    if (!isRunning) {
      setSecondsLeft(mode === 'work' ? updated.focusMin * 60 : mode === 'break' ? updated.breakMin * 60 : updated.longBreakMin * 60);
    }
  };

  const content = (
    <>
      {/* Mode Label */}
      <View style={styles.modeArea}>
        <View style={[styles.modeDot, { backgroundColor: modeColor }]} />
        <Text style={[styles.modeLabel, { color: modeColor }]}>{modeLabel}</Text>
      </View>

      {/* Timer Ring */}
      <View style={styles.timerArea}>
        <View style={[styles.ringOuter, { width: RING_SIZE, height: RING_SIZE, borderRadius: RING_SIZE / 2 }]}>
          <Animated.View style={[styles.ringGlow, {
            width: RING_SIZE + 20, height: RING_SIZE + 20, borderRadius: (RING_SIZE + 20) / 2,
            backgroundColor: modeColor, opacity: isRunning ? glowAnim : 0.12,
          }]} />
          <View style={[styles.ringBg, { width: RING_SIZE - 12, height: RING_SIZE - 12, borderRadius: (RING_SIZE - 12) / 2 }]} />
          <View style={[styles.ringProgressWrap, { width: RING_SIZE, height: RING_SIZE, borderRadius: RING_SIZE / 2 }]}>
            <View style={[styles.ringProgress, {
              width: RING_SIZE, height: RING_SIZE, borderRadius: RING_SIZE / 2,
              borderWidth: 6, borderColor: 'transparent',
              borderTopColor: progress > 0 ? modeColor : 'transparent',
              borderRightColor: progress > 0.25 ? modeColor : 'transparent',
              borderBottomColor: progress > 0.5 ? modeColor : 'transparent',
              borderLeftColor: progress > 0.75 ? modeColor : 'transparent',
              transform: [{ rotate: '-45deg' }],
            }]} />
          </View>
          <View style={styles.timerCenter}>
            <Text style={styles.timeText}>{formatTime(secondsLeft)}</Text>
            <Text style={styles.timeSub}>{mode === 'work' ? 'Stay focused' : 'Take a breath'}</Text>
          </View>
        </View>
      </View>

      {/* Session Dots */}
      <View style={styles.sessionDots}>
        {[0, 1, 2, 3].map((i) => (
          <View key={i} style={[styles.sessionDot, { backgroundColor: i < (sessions % 4) ? modeColor : 'rgba(255,255,255,0.08)' }]} />
        ))}
        <Text style={styles.sessionLabel}>{sessions} sessions</Text>
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity style={styles.ctrlBtn} onPress={resetTimer}>
          <Text style={styles.ctrlText}>Reset</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.mainBtn, { backgroundColor: modeColor }]} onPress={toggleTimer}>
          <Text style={styles.mainBtnText}>{isRunning ? 'PAUSE' : 'START'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.ctrlBtn} onPress={skipToNext}>
          <Text style={styles.ctrlText}>Skip</Text>
        </TouchableOpacity>
      </View>

      {/* Quick Info */}
      <View style={styles.infoRow}>
        <TouchableOpacity style={styles.infoChip} onPress={() => setShowSettings(true)}>
          <Text style={[styles.infoChipNum, { color: '#6C5CE7' }]}>{settings.focusMin}m</Text>
          <Text style={styles.infoChipLabel}>Focus</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.infoChip} onPress={() => setShowSettings(true)}>
          <Text style={[styles.infoChipNum, { color: '#4ade80' }]}>{settings.breakMin}m</Text>
          <Text style={styles.infoChipLabel}>Break</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.infoChip} onPress={() => setShowSettings(true)}>
          <Text style={[styles.infoChipNum, { color: '#FFD93D' }]}>{settings.longBreakMin}m</Text>
          <Text style={styles.infoChipLabel}>Long</Text>
        </TouchableOpacity>
      </View>

      {/* AI Message */}
      <View style={styles.aiMessage}>
        <Text style={styles.aiText}>
          {isRunning
            ? mode === 'work' ? "You're in the zone. Stay locked in." : "Rest well. Your next sprint is coming."
            : "Tap START to begin your focus session."}
        </Text>
      </View>
    </>
  );

  // Immersive mode overlay
  if (isRunning) {
    return (
      <View style={styles.immersive}>
        <ParticleBackground />
        <View style={styles.immersiveProgress}>
          <View style={[styles.immersiveProgressBar, { width: `${Math.round(progress * 100)}%`, backgroundColor: modeColor }]} />
        </View>

        {/* Mode Label */}
        <View style={styles.modeArea}>
          <View style={[styles.modeDot, { backgroundColor: modeColor }]} />
          <Text style={[styles.modeLabel, { color: modeColor }]}>{modeLabel}</Text>
        </View>

        {/* Timer Ring */}
        <View style={styles.timerArea}>
          <View style={[styles.ringOuter, { width: RING_SIZE, height: RING_SIZE, borderRadius: RING_SIZE / 2 }]}>
            <Animated.View style={[styles.ringGlow, {
              width: RING_SIZE + 20, height: RING_SIZE + 20, borderRadius: (RING_SIZE + 20) / 2,
              backgroundColor: modeColor, opacity: glowAnim,
            }]} />
            <View style={[styles.ringBg, { width: RING_SIZE - 12, height: RING_SIZE - 12, borderRadius: (RING_SIZE - 12) / 2 }]} />
            <View style={[styles.ringProgressWrap, { width: RING_SIZE, height: RING_SIZE, borderRadius: RING_SIZE / 2 }]}>
              <View style={[styles.ringProgress, {
                width: RING_SIZE, height: RING_SIZE, borderRadius: RING_SIZE / 2,
                borderWidth: 6, borderColor: 'transparent',
                borderTopColor: progress > 0 ? modeColor : 'transparent',
                borderRightColor: progress > 0.25 ? modeColor : 'transparent',
                borderBottomColor: progress > 0.5 ? modeColor : 'transparent',
                borderLeftColor: progress > 0.75 ? modeColor : 'transparent',
                transform: [{ rotate: '-45deg' }],
              }]} />
            </View>
            <View style={styles.timerCenter}>
              <Text style={styles.timeText}>{formatTime(secondsLeft)}</Text>
              <Text style={styles.timeSub}>{mode === 'work' ? 'Stay focused' : 'Take a breath'}</Text>
            </View>
          </View>
        </View>

        {/* Session Dots */}
        <View style={styles.sessionDots}>
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={[styles.sessionDot, { backgroundColor: i < (sessions % 4) ? modeColor : 'rgba(255,255,255,0.08)' }]} />
          ))}
          <Text style={styles.sessionLabel}>{sessions} sessions</Text>
        </View>

        {/* Controls */}
        <View style={styles.immersiveControls}>
          <TouchableOpacity style={styles.ctrlBtn} onPress={resetTimer}>
            <Text style={styles.ctrlText}>Reset</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.mainBtn, { backgroundColor: modeColor }]} onPress={toggleTimer}>
            <Text style={styles.mainBtnText}>{isRunning ? 'PAUSE' : 'START'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.ctrlBtn} onPress={skipToNext}>
            <Text style={styles.ctrlText}>Skip</Text>
          </TouchableOpacity>
        </View>

        {/* Settings Modal */}
        <Modal visible={showSettings} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalBox}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Timer Settings</Text>
                <TouchableOpacity onPress={() => setShowSettings(false)}>
                  <Text style={styles.modalDone}>Done</Text>
                </TouchableOpacity>
              </View>
              <SettingsContent settings={settings} saveSettings={saveSettings} />
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  // Normal mode (inside the shell)
  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>Focus Mode</Text>
          <TouchableOpacity style={styles.settingsBtn} onPress={() => setShowSettings(true)}>
            <Text style={styles.settingsBtnIcon}>⚙</Text>
          </TouchableOpacity>
        </View>
        {content}
      </ScrollView>

      <Modal visible={showSettings} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Timer Settings</Text>
              <TouchableOpacity onPress={() => setShowSettings(false)}>
                <Text style={styles.modalDone}>Done</Text>
              </TouchableOpacity>
            </View>
            <SettingsContent settings={settings} saveSettings={saveSettings} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

function SettingsContent({ settings, saveSettings }: { settings: PomodoroSettings; saveSettings: (s: PomodoroSettings) => void }) {
  return (
    <View>
      <View style={styles.settingSection}>
        <Text style={styles.settingLabel}>Focus Duration</Text>
        <View style={styles.pillRow}>
          {DURATION_OPTIONS.map((m) => (
            <TouchableOpacity key={m} style={[styles.pill, settings.focusMin === m && styles.pillActive]} onPress={() => saveSettings({ ...settings, focusMin: m })}>
              <Text style={[styles.pillText, settings.focusMin === m && styles.pillTextActive]}>{m}m</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      <View style={styles.settingSection}>
        <Text style={styles.settingLabel}>Short Break</Text>
        <View style={styles.pillRow}>
          {BREAK_OPTIONS.map((m) => (
            <TouchableOpacity key={m} style={[styles.pill, settings.breakMin === m && { backgroundColor: '#4ade80' }]} onPress={() => saveSettings({ ...settings, breakMin: m })}>
              <Text style={[styles.pillText, settings.breakMin === m && styles.pillTextActive]}>{m}m</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      <View style={styles.settingSection}>
        <Text style={styles.settingLabel}>Long Break</Text>
        <View style={styles.pillRow}>
          {[15, 20, 25, 30].map((m) => (
            <TouchableOpacity key={m} style={[styles.pill, settings.longBreakMin === m && { backgroundColor: '#FFD93D' }]} onPress={() => saveSettings({ ...settings, longBreakMin: m })}>
              <Text style={[styles.pillText, settings.longBreakMin === m && styles.pillTextActive]}>{m}m</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      <View style={styles.settingSection}>
        <Text style={styles.settingLabel}>Alarm Sound</Text>
        <View style={styles.pillRow}>
          {ALARM_SOUNDS.map((s) => (
            <TouchableOpacity key={s.id} style={[styles.pill, settings.soundId === s.id && styles.pillActive]} onPress={() => { saveSettings({ ...settings, soundId: s.id }); playAlarm(s.id); }}>
              <Text style={[styles.pillText, settings.soundId === s.id && styles.pillTextActive]}>{s.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingBottom: 40 },

  // Immersive
  immersive: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: '#0a0a1a',
    zIndex: 1000,
  },
  immersiveProgress: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginTop: 20,
    marginHorizontal: 40,
    borderRadius: 2,
    overflow: 'hidden',
  },
  immersiveProgressBar: {
    height: 3,
    borderRadius: 2,
  },
  immersiveContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  immersiveControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
    marginTop: 32,
    zIndex: 10,
  },

  // Header
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  settingsBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
  settingsBtnIcon: { fontSize: 16, color: 'rgba(255,255,255,0.4)' },

  modeArea: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 10 },
  modeDot: { width: 8, height: 8, borderRadius: 4 },
  modeLabel: { fontSize: 12, fontWeight: '800', letterSpacing: 2 },

  timerArea: { alignItems: 'center', justifyContent: 'center', marginTop: 30 },
  ringOuter: { alignItems: 'center', justifyContent: 'center' },
  ringGlow: { position: 'absolute' },
  ringBg: { position: 'absolute', borderWidth: 2, borderColor: 'rgba(255,255,255,0.06)' },
  ringProgressWrap: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  ringProgress: { position: 'absolute' },
  timerCenter: { alignItems: 'center' },
  timeText: { fontSize: 50, fontWeight: '200', fontVariant: ['tabular-nums'], color: '#fff' },
  timeSub: { fontSize: 12, color: 'rgba(255,255,255,0.35)', fontWeight: '500', marginTop: 4 },

  sessionDots: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 24 },
  sessionDot: { width: 10, height: 10, borderRadius: 5 },
  sessionLabel: { fontSize: 11, color: 'rgba(255,255,255,0.3)', fontWeight: '600', marginLeft: 4 },

  controls: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 20, marginTop: 32 },
  ctrlBtn: { width: 60, height: 48, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  ctrlText: { fontSize: 13, color: 'rgba(255,255,255,0.5)', fontWeight: '600' },
  mainBtn: { width: 120, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 8 },
  mainBtnText: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 2 },

  infoRow: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginTop: 28 },
  infoChip: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  infoChipNum: { fontSize: 14, fontWeight: '700' },
  infoChipLabel: { fontSize: 9, color: 'rgba(255,255,255,0.35)', fontWeight: '600', marginTop: 2 },

  aiMessage: { marginHorizontal: 28, marginTop: 24, backgroundColor: 'rgba(108,92,231,0.08)', borderRadius: 10, padding: 12, borderLeftWidth: 3, borderLeftColor: '#6C5CE7' },
  aiText: { fontSize: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 18, fontWeight: '500' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: '#14142a', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 30, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  modalTitle: { fontSize: 16, fontWeight: '700', color: '#fff' },
  modalDone: { fontSize: 14, fontWeight: '600', color: '#6C5CE7' },
  settingSection: { paddingHorizontal: 16, paddingTop: 16 },
  settingLabel: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.4)', marginBottom: 8, letterSpacing: 0.5 },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pill: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 16, minWidth: 44, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)' },
  pillActive: { backgroundColor: '#6C5CE7' },
  pillText: { fontSize: 12, color: 'rgba(255,255,255,0.6)' },
  pillTextActive: { color: '#fff', fontWeight: '700' },
});
