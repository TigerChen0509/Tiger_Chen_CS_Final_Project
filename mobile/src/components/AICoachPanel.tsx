import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';

interface Props {
  suggestions: string[];
  focusScore: number;
}

export default function AICoachPanel({ suggestions, focusScore }: Props) {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 2000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  const getCoachMessage = () => {
    if (focusScore >= 80) return "You're in the zone! Keep it up.";
    if (focusScore >= 60) return "Good momentum. Try a 10-min focus sprint.";
    if (focusScore >= 40) return "Consider tackling your top priority first.";
    return "Let's start small. Pick one task and go.";
  };

  return (
    <View style={styles.container}>
      {/* AI Orb */}
      <View style={styles.orbSection}>
        <Animated.View style={[styles.orbOuter, { transform: [{ scale: pulseAnim }] }]}>
          <View style={styles.orbMiddle}>
            <View style={styles.orbInner}>
              <Text style={styles.orbIcon}>🧠</Text>
            </View>
          </View>
        </Animated.View>
        <View style={styles.orbLabel}>
          <Text style={styles.orbTitle}>AI Coach</Text>
          <Text style={styles.orbStatus}>● Active</Text>
        </View>
      </View>

      {/* Message */}
      <View style={styles.messageBox}>
        <Text style={styles.coachMessage}>{getCoachMessage()}</Text>
      </View>

      {/* Suggestions */}
      <View style={styles.suggestionsList}>
        {suggestions.map((s, i) => (
          <View key={i} style={styles.suggestionItem}>
            <View style={styles.suggestionDot} />
            <Text style={styles.suggestionText}>{s}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 14 },
  orbSection: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  orbOuter: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(108,92,231,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbMiddle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(108,92,231,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbInner: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#6C5CE7',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6C5CE7',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
  },
  orbIcon: { fontSize: 14 },
  orbLabel: { gap: 2 },
  orbTitle: { fontSize: 15, fontWeight: '700', color: '#fff' },
  orbStatus: { fontSize: 10, color: '#4ade80', fontWeight: '600' },
  messageBox: {
    backgroundColor: 'rgba(108,92,231,0.08)',
    borderRadius: 12,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#6C5CE7',
  },
  coachMessage: { fontSize: 13, color: 'rgba(255,255,255,0.8)', lineHeight: 20, fontWeight: '500' },
  suggestionsList: { gap: 8 },
  suggestionItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  suggestionDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#00D2FF' },
  suggestionText: { fontSize: 12, color: 'rgba(255,255,255,0.6)', fontWeight: '500', flex: 1 },
});
