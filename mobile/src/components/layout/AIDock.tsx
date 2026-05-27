import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Platform } from 'react-native';

interface Props {
  onOpenChat: () => void;
  onNavigate: (view: string) => void;
}

const AI_ACTIONS = [
  { key: 'chat', label: 'Ask AI', icon: '✨', color: '#6C5CE7' },
  { key: 'coach', label: 'AI Coach', icon: '🧠', color: '#00D2FF' },
  { key: 'plan', label: 'Smart Plan', icon: '◈', color: '#4ade80' },
  { key: 'analyze', label: 'Analyze', icon: '◑', color: '#FF6B9D' },
];

function DockItem({ item, onPress }: { item: typeof AI_ACTIONS[0]; onPress: () => void }) {
  const [hovered, setHovered] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: hovered ? 1.08 : 1, tension: 200, friction: 15, useNativeDriver: true }),
      Animated.timing(glowAnim, { toValue: hovered ? 1 : 0, duration: 200, useNativeDriver: false }),
    ]).start();
  }, [hovered]);

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      {...(Platform.OS === 'web' ? { onMouseEnter: () => setHovered(true), onMouseLeave: () => setHovered(false) } : {})}
    >
      <Animated.View style={[styles.dockItem, { transform: [{ scale: scaleAnim }] }]}>
        <Animated.View style={[styles.dockGlow, { backgroundColor: item.color, opacity: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.2] }) }]} />
        <View style={[styles.dockIconWrap, { backgroundColor: item.color + '15', borderColor: item.color + '30' }]}>
          <Text style={styles.dockIcon}>{item.icon}</Text>
        </View>
        {hovered && (
          <View style={styles.dockLabelWrap}>
            <Text style={[styles.dockLabel, { color: item.color }]}>{item.label}</Text>
          </View>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
}

export default function AIDock({ onOpenChat, onNavigate }: Props) {
  const [expanded, setExpanded] = useState(false);
  const expandAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    Animated.spring(expandAnim, { toValue: expanded ? 1 : 0, tension: 65, friction: 12, useNativeDriver: false }).start();
  }, [expanded]);

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.8, duration: 2000, useNativeDriver: false }),
        Animated.timing(pulseAnim, { toValue: 0.4, duration: 2000, useNativeDriver: false }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  const handleAction = (key: string) => {
    if (key === 'chat') onOpenChat();
    else if (key === 'coach') onNavigate('ai');
    else if (key === 'analyze') onNavigate('analytics');
    else if (key === 'plan') onNavigate('schedule');
    setExpanded(false);
  };

  return (
    <View style={styles.dock}>
      {/* Pulse indicator */}
      <Animated.View style={[styles.pulseRing, { opacity: pulseAnim }]} />

      {/* Toggle */}
      <TouchableOpacity
        style={styles.dockToggle}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.8}
        {...(Platform.OS === 'web' ? { onMouseEnter: () => setExpanded(true) } : {})}
      >
        <Text style={styles.dockToggleIcon}>✦</Text>
      </TouchableOpacity>

      {/* Actions */}
      {expanded && (
        <View style={styles.dockActions}>
          {AI_ACTIONS.map((action) => (
            <DockItem key={action.key} item={action} onPress={() => handleAction(action.key)} />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  dock: {
    position: 'absolute',
    right: 16,
    bottom: 24,
    alignItems: 'center',
    zIndex: 50,
  },
  pulseRing: {
    position: 'absolute',
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#6C5CE7',
    bottom: 0,
  },
  dockToggle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(108,92,231,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6C5CE7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  dockToggleIcon: { fontSize: 20, color: '#fff' },
  dockActions: {
    marginBottom: 10,
    gap: 6,
    alignItems: 'center',
  },
  dockItem: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  dockGlow: {
    position: 'absolute',
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  dockIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  dockIcon: { fontSize: 18 },
  dockLabelWrap: {
    position: 'absolute',
    right: 54,
    backgroundColor: 'rgba(20,20,40,0.95)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  dockLabel: { fontSize: 11, fontWeight: '600' },
});
